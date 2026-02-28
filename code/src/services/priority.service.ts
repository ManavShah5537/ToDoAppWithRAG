import pool from "../config/database";
import { PriorityOutput, UrgencyLevel, TimeOfDay, Event } from "../types";
import { EmbeddingService } from "./embedding.service";
import { LLMService } from "./llm.service";

const categoryWeights: Record<string, number> = {
  Quiz: 5,
  Assignment: 4,
  Event: 2,
  Custom: 1,
};

export class PriorityEngine {
  private embeddingService: EmbeddingService;
  private llmService: LLMService;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.llmService = new LLMService();
  }

  async computePriority(
    userId: string,
    event: Event,
    ragContext?: string
  ): Promise<PriorityOutput> {
    try {
      // Deterministic base score
      const baseScore = this.computeBaseScore(event);

      let priority_score = baseScore;
      let reasoning = "Priority calculated using deterministic scoring model";
      let recommended_focus_sessions = this.calculateFocusSessions(
        event.daysUntilDeadline,
        event.type
      );
      let recommended_study_time_of_day = this.getOptimalStudyTime(
        event.type
      );

      // Try RAG-based enhancement if context available
      if (ragContext) {
        try {
          const enhanced = await this.enhanceWithRAG(
            event,
            ragContext,
            baseScore
          );
          priority_score = enhanced.score;
          reasoning = enhanced.reasoning;
          recommended_focus_sessions = enhanced.focus_sessions;
          recommended_study_time_of_day = enhanced.optimal_time;
        } catch (ragError) {
          console.warn("RAG enhancement failed, using base score:", ragError);
        }
      }

      const urgency_level = this.scoreToUrgencyLevel(priority_score);

      return {
        priority_score: Math.min(10, priority_score),
        urgency_level,
        reasoning_summary: reasoning,
        recommended_focus_sessions,
        recommended_study_time_of_day,
      };
    } catch (error) {
      console.error("Error computing priority:", error);
      // Fail-safe: return base priority
      return this.getFailSafePriority(event);
    }
  }

  private computeBaseScore(event: Event): number {
    const weight = categoryWeights[event.type] || 1;

    const deadlineScore =
      event.daysUntilDeadline <= 1
        ? 5
        : event.daysUntilDeadline <= 3
        ? 4
        : event.daysUntilDeadline <= 7
        ? 3
        : 1;

    return weight * deadlineScore;
  }

  private async enhanceWithRAG(
    event: Event,
    context: string,
    baseScore: number
  ): Promise<{
    score: number;
    reasoning: string;
    focus_sessions: number;
    optimal_time: TimeOfDay;
  }> {
    // Retrieve similar memories
    const similarMemories = await this.embeddingService.retrieveSimilarMemories(
      event.userId,
      event.title,
      3
    );

    let contextBoost = 0;
    if (similarMemories.length > 0) {
      contextBoost = 0.5; // Boost score based on contextual relevance
    }

    const reasoning = await this.llmService.generateContextualReasoning(
      event.title,
      event.type,
      event.daysUntilDeadline,
      context
    );

    const finalScore = Math.min(
      10,
      baseScore + contextBoost
    );
    const focus_sessions = this.calculateFocusSessions(
      event.daysUntilDeadline,
      event.type
    );
    const optimal_time = this.getOptimalStudyTime(event.type);

    return {
      score: finalScore,
      reasoning,
      focus_sessions,
      optimal_time,
    };
  }

  private calculateFocusSessions(
    daysUntilDeadline: number,
    eventType: string
  ): number {
    if (daysUntilDeadline <= 1) return 4;
    if (daysUntilDeadline <= 3) return 3;
    if (daysUntilDeadline <= 7) return 2;
    return 1;
  }

  private getOptimalStudyTime(eventType: string): TimeOfDay {
    // Quiz and Assignment: prefer morning/afternoon
    // Event, Custom: flexible
    const timeOfDay: Record<string, TimeOfDay> = {
      Quiz: "morning",
      Assignment: "afternoon",
      Event: "evening",
      Custom: "afternoon",
    };
    return timeOfDay[eventType] || "afternoon";
  }

  private scoreToUrgencyLevel(score: number): UrgencyLevel {
    if (score >= 8) return "critical";
    if (score >= 6) return "high";
    if (score >= 4) return "medium";
    return "low";
  }

  private getFailSafePriority(event: Event): PriorityOutput {
    const baseScore = this.computeBaseScore(event);
    return {
      priority_score: Math.min(10, baseScore),
      urgency_level: this.scoreToUrgencyLevel(baseScore),
      reasoning_summary:
        "Priority calculated using deterministic scoring model (RAG unavailable)",
      recommended_focus_sessions: this.calculateFocusSessions(
        event.daysUntilDeadline,
        event.type
      ),
      recommended_study_time_of_day: this.getOptimalStudyTime(event.type),
    };
  }
}
