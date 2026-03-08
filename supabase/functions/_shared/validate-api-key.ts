import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ApiKeyValidation {
  valid: true;
  workspace_id: string;
  key_name: string;
  key_id: string;
}

export interface ApiKeyError {
  valid: false;
  error: string;
  status: number;
}

export type ApiKeyResult = ApiKeyValidation | ApiKeyError;

async function hashKey(plaintext: string): Promise<string> {
  const encoded = new TextEncoder().encode(plaintext);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Extract API key from request headers.
 * Checks X-API-Key header first, then Authorization: Bearer <key>.
 */
function extractApiKey(req: Request): string | null {
  return (
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null
  );
}

/**
 * Validate an API key against the database.
 * Returns workspace info on success or an error object on failure.
 *
 * Usage in an edge function:
 * ```ts
 * import { validateApiKey } from "../_shared/validate-api-key.ts";
 *
 * const result = await validateApiKey(req);
 * if (!result.valid) {
 *   return new Response(JSON.stringify({ error: result.error }), { status: result.status });
 * }
 * // result.workspace_id, result.key_name, result.key_id are available
 * ```
 */
export async function validateApiKey(req: Request): Promise<ApiKeyResult> {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    return {
      valid: false,
      error: "Missing API key. Provide via X-API-Key header or Authorization: Bearer <key>.",
      status: 401,
    };
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
    console.error("API key validation DB error:", error.message);
    return { valid: false, error: "Internal error", status: 500 };
  }

  if (!data) {
    return { valid: false, error: "Invalid API key", status: 401 };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "API key expired", status: 401 };
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return {
    valid: true,
    workspace_id: data.workspace_id,
    key_name: data.name,
    key_id: data.id,
  };
}
