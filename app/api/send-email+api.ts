import { sendEmail } from "@/lib/send-email";

type SendEmailPayload = {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
};

// ToDo: Add authentication and rate limiting to this endpoint before using in production
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SendEmailPayload;
    const { to, subject, html, text } = payload;

    if (!to || !subject || (!html && !text)) {
      return Response.json(
        {
          error: "Missing required fields: to, subject, and html or text",
        },
        { status: 400 }
      );
    }

    const result = await sendEmail({ to, subject, html, text });

    return Response.json({ success: true, id: result.id }, { status: 200 });
  } catch (error) {
    console.error("/api/send-email failed", error);

    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
