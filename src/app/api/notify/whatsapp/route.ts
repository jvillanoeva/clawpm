/**
 * Send a WhatsApp message endpoint
 * Route: POST /api/notify/whatsapp
 * Protected by CRON_SECRET bearer token
 * Used by scheduled tasks to send reminders, daily prompts, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/twilio";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to, message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const recipient = to || process.env.COACH_WHATSAPP_TO;
    if (!recipient) {
      return NextResponse.json({ error: "No recipient configured" }, { status: 400 });
    }

    const result = await sendWhatsAppMessage(recipient, message);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to send", details: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageSid: result.messageSid });
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
