import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKey =
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !secretKey) {
  throw new Error("Supabase function environment is not configured.");
}

const adminClient = createClient(supabaseUrl, secretKey);
const expoPushUrl = "https://exp.host/--/api/v2/push/send";
const maxMessagesPerRequest = 100;

type PushRequest = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data?: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function isExpoPushToken(value: unknown): value is string {
  return typeof value === "string" && /^(Expo|Exponent)PushToken\[.+\]$/.test(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Unauthorized" }, 401);

  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } =
    await adminClient.auth.getUser(accessToken);
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const { data: caller, error: callerError } = await adminClient
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (callerError || caller?.role !== "admin") return json({ error: "Forbidden" }, 403);

  let payload: PushRequest;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!payload.title?.trim() || !payload.body?.trim()) {
    return json({ error: "title and body are required" }, 400);
  }

  const { data: users, error: usersError } = await adminClient
    .from("users")
    .select("id, expo_push_token, notification_prefs")
    .not("expo_push_token", "is", null);
  if (usersError) return json({ error: usersError.message }, 500);

  const messages: PushMessage[] = (users ?? [])
    .filter((user) => user.notification_prefs?.push !== false)
    .map((user) => ({ token: user.expo_push_token }))
    .filter(({ token }) => isExpoPushToken(token))
    .map(({ token }) => ({
      to: token,
      title: payload.title.trim(),
      body: payload.body.trim(),
      sound: "default",
      ...(payload.data ? { data: payload.data } : {}),
    }));

  let sent = 0;
  const invalidTokens: string[] = [];

  for (let index = 0; index < messages.length; index += maxMessagesPerRequest) {
    const batch = messages.slice(index, index + maxMessagesPerRequest);
    const response = await fetch(expoPushUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const details = await response.text();
      return json({ error: `Expo push request failed: ${details}` }, 502);
    }

    const result = await response.json();
    const tickets = Array.isArray(result.data) ? result.data : [];
    sent += tickets.filter((ticket: { status?: string }) => ticket.status === "ok").length;

    tickets.forEach((ticket: { status?: string; details?: { error?: string } }, ticketIndex: number) => {
      if (ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(batch[ticketIndex].to);
      }
    });
  }

  if (invalidTokens.length > 0) {
    await adminClient
      .from("users")
      .update({ expo_push_token: null })
      .in("expo_push_token", invalidTokens);
  }

  return json({ ok: true, targeted: messages.length, sent, removedTokens: invalidTokens.length });
});
