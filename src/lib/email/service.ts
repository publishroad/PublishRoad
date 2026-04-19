import { Resend } from "resend";
import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import React from "react";
import { db } from "@/lib/db";
import { decryptField } from "@/lib/server-utils";

export type ActiveEmailProvider = "resend" | "smtp" | "sendgrid" | "ses";

type EmailConfigRow = {
  provider: ActiveEmailProvider;
  from_address: string;
  api_key: string | null;
  host: string | null;
  port: number | null;
  username: string | null;
  password: string | null;
  use_tls: boolean;
};

export class UnsupportedEmailProviderError extends Error {
  constructor(public provider: ActiveEmailProvider) {
    super(`Configured email provider (${provider}) is not yet enabled for this flow.`);
    this.name = "UnsupportedEmailProviderError";
  }
}

function maskEmail(email: string): string {
  const [localPart = "", domain = ""] = email.split("@");
  if (!domain) return email;
  if (localPart.length <= 2) return `${localPart.charAt(0) || "*"}***@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

async function getEmailConfigRow(): Promise<EmailConfigRow | null> {
  const rows = await db.$queryRaw<EmailConfigRow[]>`
    SELECT provider, from_address, api_key, host, port, username, password, use_tls
    FROM email_provider_config
    WHERE id = 'default'
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getActiveEmailProvider(): Promise<ActiveEmailProvider> {
  const config = await getEmailConfigRow();
  return config?.provider ?? "resend";
}

/** Renders a React email element to an HTML string, deferred via setImmediate to avoid blocking the event loop. */
async function renderEmailHtml(element: React.ReactElement): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    setImmediate(() => {
      render(element).then(resolve).catch(reject);
    });
  });
}

export async function sendEmailWithActiveProvider({
  to,
  subject,
  react,
  text,
}: {
  to: string;
  subject: string;
  react?: React.ReactElement;
  text?: string;
}): Promise<void> {
  const config = await getEmailConfigRow();
  const provider = config?.provider ?? "resend";
  const fromAddress = config?.from_address ?? "PublishRoad <noreply@publishroad.com>";
  const maskedRecipient = maskEmail(to);

  if (provider === "smtp") {
    const host = config?.host;
    const port = config?.port ?? 587;
    const username = config?.username;
    const dbPassword = config?.password ? decryptField(config.password) : null;

    if (!host) throw new Error("SMTP host is not configured");
    if (!username) throw new Error("SMTP username is not configured");
    if (!dbPassword) throw new Error("SMTP password is not configured");

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: config.use_tls && port === 465,
      requireTLS: config.use_tls && port !== 465,
      auth: { user: username, pass: dbPassword },
    });

    // Defer CPU-intensive React rendering to avoid blocking the event loop
    const html = react ? await renderEmailHtml(react) : undefined;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });

    console.info("[Email] Sent via SMTP", {
      provider,
      to: maskedRecipient,
      subject,
      messageId: info?.messageId ?? null,
      accepted: info?.accepted ?? [],
      rejected: info?.rejected ?? [],
    });

    return;
  }

  if (provider !== "resend") {
    throw new UnsupportedEmailProviderError(provider);
  }

  const dbApiKey = config?.api_key ? decryptField(config.api_key) : null;
  const apiKey = dbApiKey ?? process.env.RESEND_API_KEY;

  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new Error("No API key configured for Resend");
  }

  const resend = new Resend(apiKey.trim());
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    react,
    text,
  });

  if (error) {
    throw new Error(error.message ?? "Failed to send email");
  }

  console.info("[Email] Sent via Resend", {
    provider,
    to: maskedRecipient,
    subject,
    messageId: data?.id ?? null,
  });
}
