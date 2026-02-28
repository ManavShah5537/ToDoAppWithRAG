import axios from "axios";
import { Event, EventType, ExtractionInput } from "../types";

export class LLMService {
  private apiKey: string;
  private provider: string;

  constructor() {
    this.apiKey = process.env.LLM_API_KEY || "";
    this.provider = process.env.LLM_PROVIDER || "openai";
  }

  async extractEventsFromEmails(
    input: ExtractionInput
  ): Promise<Partial<Event>[]> {
    const prompt = this.buildExtractionPrompt(input);

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an academic event extraction assistant. Extract quizzes, assignments, and events from emails and classroom announcements.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const events = this.parseExtractedEvents(content);

      return events;
    } catch (error) {
      console.error("Error extracting events from LLM:", error);
      throw error;
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
Extract all academic events from the following emails and classroom announcements.
For each event, extract:
- Title (concise name)
- Type (Quiz | Assignment | Event | Custom)
- Deadline (ISO date format)
- Description (2-3 sentences)

Return as JSON array.

EMAILS:
${emailsText}

CLASSROOM ANNOUNCEMENTS:
${announcementsText}

EXISTING EVENTS (do not duplicate):
${JSON.stringify(input.existingEvents.map((e) => e.title))}

Return ONLY valid JSON array, no markdown code blocks.
`;
  }

  private parseExtractedEvents(content: string): Partial<Event>[] {
    try {
      // Clean the response
      let cleaned = content.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      const parsed = JSON.parse(cleaned);
      const events: Partial<Event>[] = [];

      for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
        events.push({
          title: item.title || "Untitled",
          description: item.description || "",
          type: this.validateEventType(item.type),
          deadline: new Date(item.deadline || Date.now()),
          source: "gmail",
        });
      }

      return events;
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      return [];
    }
  }

  private validateEventType(type: string): EventType {
    const validTypes: EventType[] = ["Quiz", "Assignment", "Event", "Custom"];
    return validTypes.includes(type as EventType)
      ? (type as EventType)
      : "Custom";
  }

  async generateContextualReasoning(
    eventTitle: string,
    category: EventType,
    daysUntilDeadline: number,
    userContext: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a study priority advisor. Provide concise reasoning for task priority.",
            },
            {
              role: "user",
              content: `
Event: ${eventTitle}
Type: ${category}
Days until deadline: ${daysUntilDeadline}
User context: ${userContext}

Provide 1-2 sentence reasoning for this task's priority.
`,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Error generating contextual reasoning:", error);
      return "Priority calculated based on deadline and category weight.";
    }
  }
}
