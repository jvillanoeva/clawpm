/**
 * Morning check-in cron job
 * Sends a personalized coaching message each morning
 * Route: GET /api/cron/morning-checkin
 * Protected by CRON_SECRET bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/twilio";
import type { Project, Task, AiNote } from "@/lib/types";

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
 * Verify CRON_SECRET bearer token
 */
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    console.warn("Missing authorization header");
    return false;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    console.warn("Invalid authorization scheme");
    return false;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || token !== cronSecret) {
    console.warn("Invalid CRON_SECRET token");
    return false;
  }

  return true;
}

/**
 * Call Claude API for morning message generation
 */
async function callClaudeAPI(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY");
    return null;
  }

  const messages: ClaudeMessage[] = [
    {
      role: "user",
      content: userPrompt,
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
 * Build morning check-in context from project data
 */
function buildMorningContext(
  project: Project,
  todaysTasks: Task[],
  overdueTasks: Task[],
  completedYesterday: Task[],
  recentNotes: AiNote[]
): string {
  let context = `## Morning Check-In Context\n\n`;

  if (project.description) {
    context += `**Project:** ${project.description}\n\n`;
  }

  if (todaysTasks.length > 0) {
    context += `**Today's Tasks (${todaysTasks.length}):**\n`;
    todaysTasks.forEach((task) => {
      context += `- [${task.status}] ${task.title} (${task.priority} priority${task.deadline ? `, due today` : ""})\n`;
    });
    context += "\n";
  }

  if (overdueTasks.length > 0) {
    context += `**Overdue Tasks (${overdueTasks.length}):**\n`;
    overdueTasks.forEach((task) => {
      context += `- ${task.title}\n`;
    });
    context += "\n";
  }

  if (completedYesterday.length > 0) {
    context += `**Completed Yesterday (${completedYesterday.length}):**\n`;
    completedYesterday.forEach((task) => {
      context += `- ${task.title}\n`;
    });
    context += "\n";
  }

  if (recentNotes.length > 0) {
    context += `**Recent Notes:**\n`;
    recentNotes.slice(0, 3).forEach((note) => {
      context += `- ${note.note}\n`;
    });
    context += "\n";
  }

  return context;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify CRON_SECRET
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
      return NextResponse.json(
        { error: "Failed to fetch project" },
        { status: 500 }
      );
    }

    const project = projects?.[0];
    if (!project) {
      return NextResponse.json(
        { error: "Personal Trainer project not found" },
        { status: 404 }
      );
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get yesterday's date range
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

    // Fetch today's tasks
    const { data: todaysTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", project.id)
      .gte("deadline", today.toISOString())
      .lt("deadline", tomorrow.toISOString())
      .returns<Task[]>();

    // Fetch overdue tasks
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", project.id)
      .lt("deadline", today.toISOString())
      .in("status", ["todo", "in_progress"])
      .returns<Task[]>();

    // Fetch tasks completed yesterday
    const { data: completedYesterday } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", project.id)
      .eq("status", "done")
      .gte("updated_at", yesterday.toISOString())
      .lt("updated_at", yesterdayEnd.toISOString())
      .returns<Task[]>();

    // Fetch recent AI notes (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentNotes } = await supabase
      .from("ai_notes")
      .select("*")
      .eq("project_id", project.id)
      .gt("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<AiNote[]>();

    // Build morning context
    const morningContext = buildMorningContext(
      project,
      todaysTasks ?? [],
      overdueTasks ?? [],
      completedYesterday ?? [],
      recentNotes ?? []
    );

    // Create morning check-in prompt
    const systemPrompt = `You are Coach, a personal trainer and life coach. Generate a brief, energizing morning check-in message for your client. Keep it under 300 characters. Reference their day ahead and any accomplishments from yesterday. Be encouraging and motivational. Use WhatsApp-friendly formatting.`;

    const userPrompt = morningContext;

    // Generate morning message
    const morningMessage = await callClaudeAPI(systemPrompt, userPrompt);

    if (!morningMessage) {
      return NextResponse.json(
        { error: "Failed to generate morning message" },
        { status: 500 }
      );
    }

    // Get recipient WhatsApp number
    const toNumber = process.env.COACH_WHATSAPP_TO;
    if (!toNumber) {
      console.error("Missing COACH_WHATSAPP_TO environment variable");
      return NextResponse.json(
        { error: "Missing WhatsApp configuration" },
        { status: 500 }
      );
    }

    // Send morning message
    const sendResult = await sendWhatsAppMessage(toNumber, morningMessage);
    if (!sendResult.success) {
      console.error("Failed to send morning message:", sendResult.error);
      return NextResponse.json(
        { error: "Failed to send message", details: sendResult.error },
        { status: 500 }
      );
    }

    // Save morning message as AI note
    const { error: noteError } = await supabase
      .from("ai_notes")
      .insert({
        project_id: project.id,
        note: `Morning Check-In: ${morningMessage}`,
        user_id: project.user_id,
      });

    if (noteError) {
      console.error("Error saving morning message note:", noteError);
    }

    return NextResponse.json({
      success: true,
      message: "Morning check-in sent successfully",
      messageSid: sendResult.messageSid,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing morning check-in:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
