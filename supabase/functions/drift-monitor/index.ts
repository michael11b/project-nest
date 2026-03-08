import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function mapModel(provider: string, model: string): string {
  if (model.includes("/")) return model;
  const mapping: Record<string, Record<string, string>> = {
    openai: {
      "gpt-4o": "openai/gpt-5",
      "gpt-4o-mini": "openai/gpt-5-mini",
      "gpt-4": "openai/gpt-5",
      "gpt-3.5-turbo": "openai/gpt-5-nano",
    },
    anthropic: {
      "claude-3-opus-20240229": "google/gemini-2.5-pro",
      "claude-3-sonnet-20240229": "google/gemini-2.5-flash",
      "claude-3-haiku-20240307": "google/gemini-2.5-flash-lite",
      "claude-3.5-sonnet": "google/gemini-2.5-pro",
    },
    google: {
      "gemini-pro": "google/gemini-2.5-pro",
      "gemini-1.5-pro": "google/gemini-2.5-pro",
      "gemini-1.5-flash": "google/gemini-2.5-flash",
    },
  };
  return mapping[provider]?.[model] ?? "google/gemini-3-flash-preview";
}

function interpolateTemplate(content: string, inputs: Record<string, unknown>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = inputs[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

interface CheckResult {
  type: string;
  passed: boolean;
  detail?: string;
}

function runCheck(
  check: { type: string; config: Record<string, unknown> },
  output: string
): CheckResult {
  const { type, config } = check;
  switch (type) {
    case "json_valid": {
      try { JSON.parse(output); return { type, passed: true }; }
      catch (e) { return { type, passed: false, detail: `Invalid JSON: ${(e as Error).message}` }; }
    }
    case "json_schema": {
      try {
        const parsed = JSON.parse(output);
        const schema = typeof config.schema === "string" ? JSON.parse(config.schema) : config.schema;
        if (schema.required && Array.isArray(schema.required)) {
          const missing = schema.required.filter((k: string) => !(k in parsed));
          if (missing.length) return { type, passed: false, detail: `Missing keys: ${missing.join(", ")}` };
        }
        return { type, passed: true };
      } catch (e) { return { type, passed: false, detail: `Schema check failed: ${(e as Error).message}` }; }
    }
    case "required_keys": {
      try {
        const parsed = JSON.parse(output);
        const keys = typeof config.keys === "string" ? config.keys.split(",").map((k: string) => k.trim()) : [];
        const missing = keys.filter((k: string) => !(k in parsed));
        if (missing.length) return { type, passed: false, detail: `Missing keys: ${missing.join(", ")}` };
        return { type, passed: true };
      } catch { return { type, passed: false, detail: "Output is not valid JSON" }; }
    }
    case "regex": {
      const pattern = String(config.pattern ?? "");
      try {
        const re = new RegExp(pattern);
        const match = re.test(output);
        return { type, passed: match, detail: match ? undefined : `No match for /${pattern}/` };
      } catch (e) { return { type, passed: false, detail: `Invalid regex: ${(e as Error).message}` }; }
    }
    case "banned_phrases": {
      const phrases = typeof config.phrases === "string" ? config.phrases.split(",").map((p: string) => p.trim().toLowerCase()) : [];
      const lower = output.toLowerCase();
      const found = phrases.filter((p: string) => lower.includes(p));
      if (found.length) return { type, passed: false, detail: `Found banned phrases: ${found.join(", ")}` };
      return { type, passed: true };
    }
    case "max_length": {
      const max = Number(config.max ?? 0);
      if (max > 0 && output.length > max) return { type, passed: false, detail: `Length ${output.length} exceeds max ${max}` };
      return { type, passed: true };
    }
    case "contains": {
      const text = String(config.text ?? "");
      const found = output.toLowerCase().includes(text.toLowerCase());
      return { type, passed: found, detail: found ? undefined : `"${text}" not found in output` };
    }
    default:
      return { type, passed: false, detail: `Unknown check type: ${type}` };
  }
}

function determineSeverity(threshold: number, score: number): "low" | "medium" | "high" | "critical" {
  const gap = threshold - score;
  if (gap >= 0.5) return "critical";
  if (gap >= 0.3) return "high";
  if (gap >= 0.15) return "medium";
  return "low";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all enabled drift policies
    const { data: policies, error: polErr } = await supabase
      .from("drift_policies")
      .select("*")
      .eq("enabled", true);

    if (polErr) throw new Error(`Failed to fetch policies: ${polErr.message}`);
    if (!policies?.length) {
      return new Response(JSON.stringify({ message: "No enabled drift policies", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${policies.length} drift policies`);

    const results: { policy_id: string; score: number; alert_created: boolean; error?: string }[] = [];

    for (const policy of policies) {
      try {
        // Get the latest release for this policy's environment + prompt
        const { data: release, error: relErr } = await supabase
          .from("releases")
          .select("prompt_version_id")
          .eq("environment_id", policy.environment_id)
          .eq("prompt_id", policy.prompt_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (relErr) throw new Error(`Release lookup failed: ${relErr.message}`);
        if (!release) {
          console.log(`Policy ${policy.id}: No release found, skipping`);
          results.push({ policy_id: policy.id, score: -1, alert_created: false, error: "No release found" });
          continue;
        }

        const versionId = release.prompt_version_id;

        // Fetch prompt version template
        const { data: version, error: vErr } = await supabase
          .from("prompt_versions")
          .select("content_json, settings_json")
          .eq("id", versionId)
          .single();
        if (vErr || !version) throw new Error("Prompt version not found");

        const templateMessages = version.content_json as { role: string; content: string }[];
        const settings = (version.settings_json ?? {}) as Record<string, unknown>;
        const temperature = settings.temperature != null ? Number(settings.temperature) : 0.7;
        const maxTokens = settings.max_tokens != null ? Number(settings.max_tokens) : 1024;

        // Fetch test cases
        const { data: testCases, error: tcErr } = await supabase
          .from("test_cases")
          .select("*")
          .eq("suite_id", policy.test_suite_id)
          .order("created_at", { ascending: true });
        if (tcErr) throw new Error(`Failed to fetch test cases: ${tcErr.message}`);
        if (!testCases?.length) {
          results.push({ policy_id: policy.id, score: -1, alert_created: false, error: "No test cases" });
          continue;
        }

        // Create an eval run for tracking
        const { data: evalRun, error: erErr } = await supabase
          .from("eval_runs")
          .insert({
            workspace_id: policy.workspace_id,
            prompt_version_id: versionId,
            test_suite_id: policy.test_suite_id,
            provider: "openai",
            model: "gpt-4o",
            status: "running",
            started_at: new Date().toISOString(),
            created_by: "00000000-0000-0000-0000-000000000000",
          })
          .select("id")
          .single();
        if (erErr) throw new Error(`Failed to create eval run: ${erErr.message}`);

        const gatewayModel = mapModel("openai", "gpt-4o");
        let totalPassed = 0;
        let criticalFailed = false;

        // Run each test case
        for (const tc of testCases) {
          const inputs = (tc.inputs_json ?? {}) as Record<string, unknown>;
          const checks = (tc.checks_json ?? []) as { type: string; config: Record<string, unknown> }[];

          const messages = templateMessages.map((m) => ({
            role: m.role,
            content: interpolateTemplate(m.content, inputs),
          }));

          let outputText = "";
          let latencyMs = 0;
          let tokenUsage = null;
          let checkResults: CheckResult[] = [];
          let passed = false;

          try {
            const startTime = Date.now();
            const aiResponse = await fetch(AI_GATEWAY_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
          body: JSON.stringify({
            model: gatewayModel,
            messages,
            temperature,
            max_completion_tokens: maxTokens,
            stream: false,
          }),
            });
            latencyMs = Date.now() - startTime;

            if (!aiResponse.ok) {
              const errText = await aiResponse.text();
              throw new Error(`AI gateway error (${aiResponse.status}): ${errText}`);
            }

            const aiData = await aiResponse.json();
            outputText = aiData.choices?.[0]?.message?.content ?? "";
            tokenUsage = aiData.usage ?? null;

            if (checks.length > 0) {
              checkResults = checks.map((check) => runCheck(check, outputText));
              passed = checkResults.every((cr) => cr.passed);
            } else {
              passed = true;
            }
          } catch (e) {
            outputText = `ERROR: ${(e as Error).message}`;
            passed = false;
            checkResults = [{ type: "execution", passed: false, detail: (e as Error).message }];
          }

          if (passed) totalPassed++;
          if (!passed && tc.critical) criticalFailed = true;

          await supabase.from("eval_results").insert({
            eval_run_id: evalRun.id,
            test_case_id: tc.id,
            output_text: outputText,
            passed,
            latency_ms: latencyMs,
            check_results_json: checkResults,
            token_usage_json: tokenUsage,
          });
        }

        const score = testCases.length > 0 ? totalPassed / testCases.length : 0;

        // Update eval run
        await supabase.from("eval_runs").update({
          status: "succeeded",
          score,
          critical_failed: criticalFailed,
          completed_at: new Date().toISOString(),
        }).eq("id", evalRun.id);

        // Check if score is below threshold → create alert
        let alertCreated = false;
        if (score < policy.threshold) {
          const severity = determineSeverity(policy.threshold, score);

          // Get previous best score as baseline
          const { data: prevRuns } = await supabase
            .from("eval_runs")
            .select("score")
            .eq("prompt_version_id", versionId)
            .eq("test_suite_id", policy.test_suite_id)
            .eq("status", "succeeded")
            .neq("id", evalRun.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const baselineScore = prevRuns?.[0]?.score ?? null;

          await supabase.from("drift_alerts").insert({
            drift_policy_id: policy.id,
            workspace_id: policy.workspace_id,
            eval_run_id: evalRun.id,
            severity,
            status: "open",
            baseline_score: baselineScore,
            current_score: score,
            message: `Score ${(score * 100).toFixed(1)}% is below threshold ${(policy.threshold * 100).toFixed(1)}%. ${criticalFailed ? "Critical test cases failed." : ""}`,
          });

          alertCreated = true;
          console.log(`Policy ${policy.id}: Alert created — score ${score} < threshold ${policy.threshold}`);
        } else {
          console.log(`Policy ${policy.id}: Score ${score} meets threshold ${policy.threshold}`);
        }

        results.push({ policy_id: policy.id, score, alert_created: alertCreated });
      } catch (e) {
        console.error(`Policy ${policy.id} failed:`, (e as Error).message);
        results.push({ policy_id: policy.id, score: -1, alert_created: false, error: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("drift-monitor error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
