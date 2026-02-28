import axios from "axios";
import { Event, EventType, ExtractionInput } from "../types";

export class LLMService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.LLM_API_KEY || "";

    if (!this.apiKey) {
      console.warn("⚠️ LLM_API_KEY is not set.");
    }
  }

  // =========================================================
  // 1️⃣  EVENT EXTRACTION
  // =========================================================
  async extractEventsFromEmails(
    input: ExtractionInput
  ): Promise<Partial<Event>[]> {
    const prompt = this.buildExtractionPrompt(input);

    try {
      const response = await this.callOpenAI(prompt, 0.3, 2000);

      const events = this.parseJSONResponse(response);
      return events.map((item: any) => ({
        title: item.title || "Untitled",
        description: item.description || "",
        type: this.validateEventType(item.type),
        deadline: new Date(item.deadline || Date.now()),
        source: "gmail",
      }));
    } catch (error) {
      console.error("❌ Error extracting events:", error);
      return [];
    }
  }

  private buildExtractionPrompt(input: ExtractionInput): string {
    const emailsText = input.emails
      .map((e) => `From: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body}`)
      .join("\n---\n");

    const announcementsText = input.classroomAnnouncements
      .map((a) => `Course: ${a.courseName}\nText: ${a.text}`)
      .join("\n---\n");

    return `
Extract all academic events from the following data.

Return STRICT JSON array.

Each object must contain:
- title
- type (Quiz | Assignment | Event | Custom)
- deadline (ISO format)
- description

EMAILS:
${emailsText}

ANNOUNCEMENTS:
${announcementsText}

EXISTING EVENTS:
${JSON.stringify(input.existingEvents.map((e) => e.title))}
`;
  }

  // =========================================================
  // 2️⃣  CONTEXTUAL REASONING
  // =========================================================
  async generateContextualReasoning(
    eventTitle: string,
    category: EventType,
    daysUntilDeadline: number,
    userContext: string
  ): Promise<string> {
    const prompt = `
Event: ${eventTitle}
Type: ${category}
Days until deadline: ${daysUntilDeadline}
User context: ${userContext}

Provide short reasoning (1-2 sentences).
`;

    try {
      const response = await this.callOpenAI(prompt, 0.6, 150);
      return response;
    } catch (error) {
      console.error("❌ Context reasoning failed:", error);
      return "Priority based on urgency and category weight.";
    }
  }

  // =========================================================
  // 3️⃣  TIE RESOLUTION USING LLM + MEMORY
  // =========================================================
  async resolveTie(
    events: Event[],
    memories: string[]
  ): Promise<string> {
    const prompt = `
Two tasks have equal calculated priority.

Events:
${events
  .map(
    (e, i) => `
Event ${i + 1}:
Title: ${e.title}
Type: ${e.type}
Days until deadline: ${e.daysUntilDeadline}
Difficulty: ${e.metadata?.difficulty ?? 3}
Enjoyment: ${e.metadata?.enjoyment ?? 3}
`
  )
  .join("\n")}

User Past Performance Context:
${
  memories.length > 0
    ? memories.join("\n")
    : "No past performance data available."
}

Choose which event should be prioritized.

Return STRICT JSON:
{
  "chosenTitle": "Exact Event Title",
  "reason": "Short explanation"
}
`;

    try {
      const response = await this.callOpenAI(prompt, 0.2, 300);

      const parsed = this.parseJSONResponse(response);

      return parsed.chosenTitle || events[0].title;
    } catch (error) {
      console.error("❌ Tie resolution failed:", error);
      return events[0].title; // safe fallback
    }
  }

  async chooseBestEvent(
    events: Event[],
    memories: string[],
    energyLevel?: string
  ): Promise<string> {
    const prompt = `
Pick the best next event to focus on right now.

Current energy level: ${energyLevel || "unknown"}

Candidate events:
${events
  .map(
    (e, i) => `
Event ${i + 1}:
ID: ${e.id}
Title: ${e.title}
Type: ${e.type}
Days until deadline: ${e.daysUntilDeadline}
Difficulty: ${e.metadata?.difficulty ?? 3}
Enjoyment: ${e.metadata?.enjoyment ?? 3}
`
  )
  .join("\n")}

Relevant past context:
${
  memories.length > 0
    ? memories.join("\n")
    : "No past performance data available."
}

Return STRICT JSON:
{
  "chosenId": "Exact Event ID",
  "reason": "Short explanation"
}
`;

    try {
      const response = await this.callOpenAI(prompt, 0.2, 300);
      const parsed = this.parseJSONResponse(response);
      return parsed.chosenId || events[0].id;
    } catch (error) {
      console.error("❌ Best-event selection failed:", error);
      return events[0].id;
    }
  }

  // =========================================================
  // 4️⃣  SHARED OPENAI CALL METHOD
  // =========================================================
  private async callOpenAI(
    prompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a precise academic assistant. Always follow formatting instructions strictly.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  // =========================================================
  // 5️⃣  SAFE JSON PARSER
  // =========================================================
  private parseJSONResponse(content: string): any {
    try {
      let cleaned = content.trim();

      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      return JSON.parse(cleaned);
    } catch (error) {
      console.error("❌ JSON parse error:", error);
      return {};
    }
  }

  // =========================================================
  // 6️⃣  VALIDATE EVENT TYPE
  // =========================================================
  private validateEventType(type: string): EventType {
    const validTypes: EventType[] = ["Quiz", "Assignment", "Event", "Custom"];
    return validTypes.includes(type as EventType)
      ? (type as EventType)
      : "Custom";
  }
}