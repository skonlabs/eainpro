import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { renderAuthEmail } from "@/lib/email/auth-templates";

// Standard Webhooks (used by Supabase Auth "Send Email" hook) verification.
// Secret stored in Supabase looks like: v1,whsec_<base64>
function verifyStandardWebhook(opts: {
  secret: string;
  id: string;
  timestamp: string;
  signatureHeader: string;
  body: string;
}): boolean {
  const { secret, id, timestamp, signatureHeader, body } = opts;
  if (!secret || !id || !timestamp || !signatureHeader) return false;

  const cleanedSecret = secret.startsWith("v1,whsec_")
    ? secret.slice("v1,whsec_".length)
    : secret.startsWith("whsec_")
      ? secret.slice("whsec_".length)
      : secret;

  let key: Buffer;
  try {
    key = Buffer.from(cleanedSecret, "base64");
  } catch {
    return false;
  }

  const signed = `${id}.${timestamp}.${body}`;
  const expected = createHmac("sha256", key).update(signed).digest("base64");

  // Header may contain multiple space-separated `v1,<sig>` entries.
  const candidates = signatureHeader.split(" ");
  for (const cand of candidates) {
    const [version, sig] = cand.split(",");
    if (version !== "v1" || !sig) continue;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

type AuthHookPayload = {
  user: { email: string; new_email?: string | null };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "recovery"
      | "magiclink"
      | "invite"
      | "email_change"
      | "email_change_new";
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

async function sendViaResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "Fixido <no-reply@getfixido.com>",
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: "support@getfixido.com",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

export const Route = createFileRoute("/api/public/auth-email-hook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SEND_EMAIL_HOOK_SECRET;
        if (!secret) {
          console.error("SEND_EMAIL_HOOK_SECRET not configured");
          return new Response("Server misconfigured", { status: 500 });
        }

        const body = await request.text();
        const id = request.headers.get("webhook-id") ?? "";
        const timestamp = request.headers.get("webhook-timestamp") ?? "";
        const signatureHeader = request.headers.get("webhook-signature") ?? "";

        const ok = verifyStandardWebhook({
          secret,
          id,
          timestamp,
          signatureHeader,
          body,
        });
        if (!ok) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: AuthHookPayload;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        try {
          const rendered = renderAuthEmail(payload);
          const recipient =
            payload.email_data.email_action_type === "email_change_new"
              ? payload.user.new_email || payload.user.email
              : payload.user.email;

          await sendViaResend({
            to: recipient,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("auth-email-hook send failed", err);
          return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
