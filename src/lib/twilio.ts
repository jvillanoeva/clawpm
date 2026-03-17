/**
 * Twilio WhatsApp messaging utility
 * Uses raw fetch API to minimize dependencies
 */

interface TwilioSendResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Send a WhatsApp message via Twilio
 * @param to - Recipient number in format whatsapp:+1234567890
 * @param body - Message body (max 1600 characters)
 * @returns Promise with success status and optional message SID
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<TwilioSendResponse> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.error("Missing Twilio credentials in environment variables");
    return {
      success: false,
      error: "Missing Twilio configuration",
    };
  }

  if (!to || !body) {
    console.error("Missing required parameters: to or body");
    return {
      success: false,
      error: "Missing required parameters",
    };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const formData = new URLSearchParams();
    formData.append("From", from);
    formData.append("To", to);
    formData.append("Body", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Twilio API error:", errorData);
      return {
        success: false,
        error: `Twilio error: ${response.status}`,
      };
    }

    const data = await response.json() as { sid?: string };
    return {
      success: true,
      messageSid: data.sid,
    };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
