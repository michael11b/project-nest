import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

async function hashKey(plaintext: string): Promise<string> {
  const encoded = new TextEncoder().encode(plaintext);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept API key from X-API-Key header or Authorization: Bearer <key>
    let apiKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      null;

    // Also accept from JSON body
    if (!apiKey && req.method === "POST") {
      try {
        const body = await req.json();
        apiKey = body.api_key || null;
      } catch {
        // no body or invalid JSON
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing API key. Provide via X-API-Key header, Authorization: Bearer <key>, or POST body { api_key }." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keyHash = await hashKey(apiKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, workspace_id, expires_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (error) {
      console.error("DB error:", error.message);
      return new Response(
        JSON.stringify({ valid: false, error: "Internal error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "API key expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_used_at (fire-and-forget)
    supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => {});

    return new Response(
      JSON.stringify({
        valid: true,
        workspace_id: data.workspace_id,
        key_name: data.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ valid: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
