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

const BRAND_NAME = "Fixido";
const BRAND_URL = "https://getfixido.com";
const SUPPORT_EMAIL = "support@getfixido.com";
const TEAL = "#0FB39A";
const INK = "#0E1B2C";
const MUTED = "#5b6470";
const BG = "#f4efe4";

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildConfirmUrl(payload: AuthHookPayload, useNew = false) {
  const { site_url, token_hash, token_hash_new, email_action_type, redirect_to } =
    payload.email_data;
  const hash = useNew ? token_hash_new || token_hash : token_hash;
  const base = site_url.replace(/\/$/, "");
  // Verify on the app via supabase.auth.verifyOtp(token_hash) — avoids
  // hitting Supabase's /auth/v1/verify endpoint directly (which requires apikey).
  const params = new URLSearchParams({
    token_hash: hash,
    type: email_action_type,
    next: redirect_to || BRAND_URL,
  });
  return `${base}/auth/confirm?${params.toString()}`;
}

function copyFor(action: AuthHookPayload["email_data"]["email_action_type"]) {
  switch (action) {
    case "signup":
      return {
        subject: `Confirm your ${BRAND_NAME} account`,
        heading: `Welcome to ${BRAND_NAME}`,
        intro: `Thanks for signing up. Confirm your email to activate your account and start finding trusted service providers.`,
        cta: "Confirm email",
      };
    case "recovery":
      return {
        subject: `Reset your ${BRAND_NAME} password`,
        heading: "Reset your password",
        intro: `We received a request to reset your ${BRAND_NAME} password. Click the button below to choose a new one. If you didn't request this, you can safely ignore this email.`,
        cta: "Reset password",
      };
    case "magiclink":
      return {
        subject: `Your ${BRAND_NAME} sign-in link`,
        heading: "Sign in to Fixido",
        intro: `Use the button below to sign in to your ${BRAND_NAME} account. This link will expire shortly for your security.`,
        cta: "Sign in",
      };
    case "invite":
      return {
        subject: `You've been invited to ${BRAND_NAME}`,
        heading: "You're invited",
        intro: `You've been invited to join ${BRAND_NAME}. Accept your invitation to get started.`,
        cta: "Accept invitation",
      };
    case "email_change":
    case "email_change_new":
      return {
        subject: `Confirm your new ${BRAND_NAME} email`,
        heading: "Confirm your email change",
        intro: `Please confirm this email address to finish updating your ${BRAND_NAME} account.`,
        cta: "Confirm new email",
      };
  }
}

function shell(opts: { heading: string; intro: string; cta: string; url: string; token: string }) {
  const { heading, intro, cta, url, token } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(14,27,44,0.06);">
        <tr><td style="padding:32px 36px 8px;">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.4px;color:${INK};">${BRAND_NAME}</div>
        </td></tr>
        <tr><td style="padding:8px 36px 0;">
          <h1 style="margin:16px 0 12px;font-size:24px;line-height:1.25;color:${INK};font-weight:700;">${escape(heading)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${MUTED};">${escape(intro)}</p>
        </td></tr>
        <tr><td style="padding:0 36px 8px;" align="left">
          <a href="${escape(url)}" style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 22px;border-radius:10px;">${escape(cta)}</a>
        </td></tr>
        <tr><td style="padding:20px 36px 0;">
          <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">Or copy and paste this link into your browser:</p>
          <p style="margin:0 0 18px;font-size:13px;color:${INK};word-break:break-all;"><a href="${escape(url)}" style="color:${INK};">${escape(url)}</a></p>
          <p style="margin:0 0 4px;font-size:13px;color:${MUTED};">If the button above doesn't work, you can also use this one-time code:</p>
          <p style="margin:0 0 24px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:18px;letter-spacing:2px;color:${INK};">${escape(token)}</p>
        </td></tr>
        <tr><td style="padding:24px 36px 32px;border-top:1px solid #eee;">
          <p style="margin:0 0 6px;font-size:12px;color:${MUTED};">If you didn't request this email, you can safely ignore it.</p>
          <p style="margin:0;font-size:12px;color:${MUTED};">${BRAND_NAME} · <a href="${BRAND_URL}" style="color:${MUTED};">getfixido.com</a> · <a href="mailto:${SUPPORT_EMAIL}" style="color:${MUTED};">${SUPPORT_EMAIL}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function plain(opts: { heading: string; intro: string; cta: string; url: string; token: string }) {
  return `${opts.heading}\n\n${opts.intro}\n\n${opts.cta}: ${opts.url}\n\nOne-time code: ${opts.token}\n\nIf you didn't request this email, you can ignore it.\n\n${BRAND_NAME} — ${BRAND_URL}`;
}

export function renderAuthEmail(payload: AuthHookPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const action = payload.email_data.email_action_type;
  const copy = copyFor(action);
  const useNew = action === "email_change" || action === "email_change_new";
  const url = buildConfirmUrl(payload, useNew);
  const token =
    useNew && payload.email_data.token_new
      ? payload.email_data.token_new
      : payload.email_data.token;
  return {
    subject: copy.subject,
    html: shell({ heading: copy.heading, intro: copy.intro, cta: copy.cta, url, token }),
    text: plain({ heading: copy.heading, intro: copy.intro, cta: copy.cta, url, token }),
  };
}
