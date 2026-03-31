import { Resend } from "resend";

export type SendEmailInput = {
    to: string;
    subject: string;
    html?: string;
    text?: string;
};

export type SendEmailResult = {
    id: string;
};

/**
 * Sends email through Resend when configured.
 * Falls back to console output in development if no API key is present.
 */
export async function sendEmail({
    to,
    subject,
    html,
    text,
}: SendEmailInput): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "Muscle Buddy <noreply@komoda.app>";

    if (!apiKey) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Missing RESEND_API_KEY in production environment");
        }

        console.log("[Email:dev]", {
            from,
            to,
            subject,
            html: html ?? null,
            text: text ?? null,
        });

        return { id: "dev-mode" };
    }

    const resend = new Resend(apiKey);
    const content = html
        ? { html, ...(text ? { text } : {}) }
        : text
            ? { text }
            : null;

    if (!content) {
        throw new Error("Email body is required: provide html or text");
    }

    const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        ...content,
    });

    if (error) {
        throw new Error(error.message || "Resend request failed");
    }

    if (!data?.id) {
        throw new Error("Resend request failed: missing email id");
    }

    return { id: data.id };
}
