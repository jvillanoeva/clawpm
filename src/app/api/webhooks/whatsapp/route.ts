/**
 * WhatsApp webhook endpoint for Twilio
 * Receives messages, processes them with Claude, and replies
 * Route: POST /api/webhooks/whatsapp
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/twilio";
import type { Project, Task, AiNote } from "@/lib/types";

interface TwilioWebhookBody {
  Body?: string;
  From?: string;
  To?: string;
  MessageSid?: string;
  [key: string]: string | undefined;
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  error?: {
    message: string;
  };
}

/**
 * Parse form-urlencoded body from Twilio webhook
 */
function parseFormData(body: string): TwilioWebhookBody {
  const params = new URLSearchParams(body);
  return {
    Body: params.get("Body") ?? undefined,
    From: params.get("From") ?? undefined,
    To: params.get("To") ?? undefined,
    MessageSid: params.get("MessageSid") ?? undefined,
  };
}

/**
 * Call Claude API with coaching context
 */
async function callClaudeAPI(
  userMessage: string,
  systemPrompt: string,
  context: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY");
    return null;
  }

  const messages: ClaudeMessage[] = [
    {
      role: "user",
      content: `${context}\n\nUser message: ${userMessage}`,
    },
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", response.status, error);
      return null;
    }

    const data = (await response.json()) as ClaudeResponse;
    if (data.error) {
      console.error("Claude error:", data.error.message);
      return null;
    }

    const textContent = data.content.find((c) => c.type === "text");
    return textContent?.text ?? null;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return null;
  }
}

/**
 * Build coaching context from project data
 */
function buildCoachingContext(
  project: Project,
  tasks: Task[],
  aiNotes: AiNote[]
): string {
  let context = "";

  if (project.description) {
    context += `Project Context: ${project.description}\n\n`;
  }

  if (tasks.length > 0) {
    context += "Recent Tasks:\n";
    tasks.slice(0, 5).forEach((task) => {
      context += `- [${task.status}] ${task.title} (Priority: ${task.priority}${task.deadline ? `, Due: ${new Date(task.deadline).toLocaleDateString()}` : ""})\n`;
      if (task.description) {
        context += `  ${task.description}\n`;
      }
    });
    context += "\n";
  }

  if (aiNotes.length > 0) {
    context += "Recent Coach Notes:\n";
    aiNotes.slice(0, 3).forEach((note) => {
      context += `- ${note.note}\n`;
    });
    context += "\n";
  }

  return context;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/x-www-form-urlencoded")) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    const body = await request.text();
    const data = parseFormData(body);

    const { Body: userMessage, From: fromNumber } = data;

    if (!userMessage || !fromNumber) {
      console.warn("Missing userMessage or fromNumber in webhook");
      return new NextResponse("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // Initialize Supabase client
    const supabase = createServerClient();

    // Find Personal Trainer project
    const { data: projects, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .ilike("name", "%personal%trainer%")
      .limit(1)
      .returns<Project[]>();

    if (projectError) {
      console.error("Error fetching project:", projectError);
      return new NextResponse("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    const project = projects?.[0];
    if (!project) {
      console.warn("Personal Trainer project not found");
      return new NextResponse("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // Fetch recent tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", project.id)
      .order("deadline", { ascending: true })
      .limit(10)
      .returns<Task[]>();

    // Fetch recent AI notes (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: aiNotes } = await supabase
      .from("ai_notes")
      .select("*")
      .eq("project_id", project.id)
      .gt("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<AiNote[]>();

    // Build context and get coach response
    const coachingContext = buildCoachingContext(
      project,
      tasks ?? [],
      aiNotes ?? []
    );

    const systemPrompt = `You are Coach, a personal trainer and life coach communicating via WhatsApp. You are warm, direct, and adaptive. You know the user's training history and current plan from the context provided. Keep responses concise (WhatsApp-friendly - under 500 chars when possible). Ask follow-up questions. Adapt plans based on how the user is feeling. Be encouraging but honest.`;

    const coachResponse = await callClaudeAPI(
      userMessage,
      systemPrompt,
      coachingContext
    );

    if (!coachResponse) {
      console.error("Failed to generate coach response");
      return new NextResponse("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // Save exchange as AI notes
    const { error: userNoteError } = await supabase
      .from("ai_notes")
      .insert({
        project_id: project.id,
        note: `User: ${userMessage}`,
        user_id: project.user_id,
      });

    if (userNoteError) {
      console.error("Error saving user message note:", userNoteError);
    }

    const { error: coachNoteError } = await supabase
      .from("ai_notes")
      .insert({
        project_id: project.id,
        note: `Coach: ${coachResponse}`,
        user_id: project.user_id,
      });

    if (coachNoteError) {
      console.error("Error saving coach response note:", coachNoteError);
    }

    // Send response back via WhatsApp
    const sendResult = await sendWhatsAppMessage(fromNumber, coachResponse);
    if (!sendResult.success) {
      console.error("Failed to send WhatsApp reply:", sendResult.error);
    }

    // Return empty TwiML response (Twilio expects this)
    return new NextResponse("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
    // Return empty TwiML response even on error
    return new NextResponse("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
  }
}
