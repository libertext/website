import { getEnv } from "@/lib/config/env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Email provider abstraction (§98). Console transport in dev; Resend in prod.
 * Never include secrets in email bodies.
 */
export async function sendMail(msg: MailMessage): Promise<void> {
  const env = getEnv();
  switch (env.EMAIL_PROVIDER) {
    case "resend": {
      if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        }),
      });
      return;
    }
    case "console":
    default:
      // Dev: log so flows work without an SMTP provider.
      console.log(`\n[email:console] To: ${msg.to}\nSubject: ${msg.subject}\n${msg.text}\n`);
      return;
  }
}
