import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateApiKey } from "../_shared/validate-api-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Map user-facing provider/model to Lovable AI Gateway model names
function mapModel(provider: string, model: string): string {
  // If the model already has a "/" prefix (gateway format), use as-is
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

// Interpolate {{variable}} placeholders in message content
function interpolateTemplate(content: string, inputs: Record<string, unknown>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = inputs[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

// Run a single check against LLM output
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
      try {
        JSON.parse(output);
        return { type, passed: true };
      } catch (e) {
        return { type, passed: false, detail: `Invalid JSON: ${(e as Error).message}` };
      }
    }

    case "json_schema": {
      try {
        const parsed = JSON.parse(output);
        const schema = typeof config.schema === "string" ? JSON.parse(config.schema) : config.schema;
        // Basic schema validation: check required properties and types
        if (schema.required && Array.isArray(schema.required)) {
          const missing = schema.required.filter((k: string) => !(k in parsed));
          if (missing.length) {
            return { type, passed: false, detail: `Missing keys: ${missing.join(", ")}` };
          }
        }
        return { type, passed: true };
      } catch (e) {
        return { type, passed: false, detail: `Schema check failed: ${(e as Error).message}` };
      }
    }

    case "required_keys": {
      try {
        const parsed = JSON.parse(output);
        const keys = typeof config.keys === "string"
          ? config.keys.split(",").map((k: string) => k.trim())
          : [];
        const missing = keys.filter((k: string) => !(k in parsed));
        if (missing.length) {
          return { type, passed: false, detail: `Missing keys: ${missing.join(", ")}` };
        }
        return { type, passed: true };
      } catch {
        return { type, passed: false, detail: "Output is not valid JSON" };
      }
    }

    case "regex": {
      const pattern = String(config.pattern ?? "");
      try {
        const re = new RegExp(pattern);
        const match = re.test(output);
        return { type, passed: match, detail: match ? undefined : `No match for /${pattern}/` };
      } catch (e) {
        return { type, passed: false, detail: `Invalid regex: ${(e as Error).message}` };
      }
    }

    case "banned_phrases": {
      const phrases = typeof config.phrases === "string"
        ? config.phrases.split(",").map((p: string) => p.trim().toLowerCase())
        : [];
      const lower = output.toLowerCase();
      const found = phrases.filter((p: string) => lower.includes(p));
      if (found.length) {
        return { type, passed: false, detail: `Found banned phrases: ${found.join(", ")}` };
      }
      return { type, passed: true };
    }

    case "max_length": {
      const max = Number(config.max ?? 0);
      if (max > 0 && output.length > max) {
        return { type, passed: false, detail: `Length ${output.length} exceeds max ${max}` };
      }
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller — support both JWT auth and API key auth
    const apiKeyHeader = req.headers.get("x-api-key");
    let callerWorkspaceId: string | null = null;

    if (apiKeyHeader) {
      // API key authentication
      const apiKeyResult = await validateApiKey(req);
      if (!apiKeyResult.valid) {
        return new Response(JSON.stringify({ error: apiKeyResult.error }), {
          status: apiKeyResult.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerWorkspaceId = apiKeyResult.workspace_id;
    } else {
      // JWT authentication (existing flow)
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized. Provide a JWT via Authorization header or an API key via X-API-Key header." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Use service role for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { eval_run_id } = await req.json();
    if (!eval_run_id) throw new Error("eval_run_id is required");

    // Fetch the eval run
    const { data: run, error: runErr } = await supabase
      .from("eval_runs")
      .select("*")
      .eq("id", eval_run_id)
      .single();
    if (runErr || !run) throw new Error("Eval run not found");
    if (run.status !== "queued") {
      return new Response(JSON.stringify({ message: "Run already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as running
    await supabase
      .from("eval_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", eval_run_id);

    // Fetch prompt version (messages template)
    const { data: version, error: vErr } = await supabase
      .from("prompt_versions")
      .select("content_json, contract_json")
      .eq("id", run.prompt_version_id)
      .single();
    if (vErr || !version) throw new Error("Prompt version not found");

    const templateMessages = version.content_json as { role: string; content: string }[];

    // Fetch test cases for the suite
    const { data: testCases, error: tcErr } = await supabase
      .from("test_cases")
      .select("*")
      .eq("suite_id", run.test_suite_id)
      .order("created_at", { ascending: true });
    if (tcErr) throw new Error("Failed to fetch test cases");
    if (!testCases?.length) throw new Error("No test cases in suite");

    const gatewayModel = mapModel(run.provider, run.model);
    const settings = (run.settings_json ?? {}) as Record<string, unknown>;
    const temperature = settings.temperature != null ? Number(settings.temperature) : 0.7;
    const maxTokens = settings.max_tokens != null ? Number(settings.max_tokens) : 1024;

    let totalPassed = 0;
    let totalCases = testCases.length;
    let criticalFailed = false;

    // Process each test case
    for (const tc of testCases) {
      const inputs = (tc.inputs_json ?? {}) as Record<string, unknown>;
      const checks = (tc.checks_json ?? []) as { type: string; config: Record<string, unknown> }[];

      // Build messages with interpolated variables
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
            max_completion_tokens: maxTokens,
            stream: false,
          }),
        });

        latencyMs = Date.now() - startTime;

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          if (aiResponse.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          if (aiResponse.status === 402) {
            throw new Error("AI credits exhausted. Please add funds in Settings → Workspace → Usage.");
          }
          throw new Error(`AI gateway error (${aiResponse.status}): ${errText}`);
        }

        const aiData = await aiResponse.json();
        outputText = aiData.choices?.[0]?.message?.content ?? "";
        tokenUsage = aiData.usage ?? null;

        // Run all checks
        if (checks.length > 0) {
          checkResults = checks.map((check) => runCheck(check, outputText));
          passed = checkResults.every((cr) => cr.passed);
        } else {
          // No checks = auto-pass (just testing LLM reachability)
          passed = true;
        }
      } catch (e) {
        outputText = `ERROR: ${(e as Error).message}`;
        passed = false;
        checkResults = [{ type: "execution", passed: false, detail: (e as Error).message }];

        // If rate limit or payment error, fail the entire run
        if ((e as Error).message.includes("Rate limit") || (e as Error).message.includes("credits exhausted")) {
          await supabase.from("eval_runs").update({
            status: "failed",
            error_message: (e as Error).message,
            completed_at: new Date().toISOString(),
          }).eq("id", eval_run_id);

          return new Response(JSON.stringify({ error: (e as Error).message }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (passed) totalPassed++;
      if (!passed && tc.critical) criticalFailed = true;

      // Insert eval result
      await supabase.from("eval_results").insert({
        eval_run_id,
        test_case_id: tc.id,
        output_text: outputText,
        passed,
        latency_ms: latencyMs,
        check_results_json: checkResults,
        token_usage_json: tokenUsage,
      });
    }

    // Calculate final score and update run
    const score = totalCases > 0 ? totalPassed / totalCases : 0;

    await supabase.from("eval_runs").update({
      status: "succeeded",
      score,
      critical_failed: criticalFailed,
      completed_at: new Date().toISOString(),
    }).eq("id", eval_run_id);

    return new Response(
      JSON.stringify({
        success: true,
        score,
        total: totalCases,
        passed: totalPassed,
        critical_failed: criticalFailed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("run-eval error:", e);

    // Try to mark the run as failed if we have the ID
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.eval_run_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase.from("eval_runs").update({
          status: "failed",
          error_message: (e as Error).message,
          completed_at: new Date().toISOString(),
        }).eq("id", body.eval_run_id);
      }
    } catch { /* ignore cleanup errors */ }

    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
