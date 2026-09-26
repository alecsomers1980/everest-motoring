import { Resend } from "resend";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const to = process.argv[2];
const resend = new Resend(env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: env.RESEND_FROM_EMAIL,
  to,
  replyTo: env.RESEND_REPLY_TO,
  subject: "Everest Motoring — Resend test ✅",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f1723">
      <h2 style="color:#d32f2f;margin:0 0 12px">Resend is connected 🎉</h2>
      <p>This is a test email from the Everest Motoring platform.</p>
      <ul style="line-height:1.8">
        <li><strong>From:</strong> ${env.RESEND_FROM_EMAIL}</li>
        <li><strong>Reply-To:</strong> ${env.RESEND_REPLY_TO}</li>
      </ul>
      <p>If you can reply to this and it lands in <strong>${env.RESEND_REPLY_TO}</strong>, everything is wired correctly.</p>
    </div>`,
});

console.log(JSON.stringify({ to, from: env.RESEND_FROM_EMAIL, replyTo: env.RESEND_REPLY_TO, data, error }, null, 2));
if (error) process.exit(1);
