// Event Types
export type EventType = "Quiz" | "Assignment" | "Event" | "Custom";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface Event {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: EventType;
  deadline: Date;
  daysUntilDeadline: number;
  source: "gmail" | "classroom" | "custom" | "calendar";
  sourceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isEmbedded: boolean;
}

export interface PriorityOutput {
  priority_score: number;
  urgency_level: UrgencyLevel;
  reasoning_summary: string;
  recommended_focus_sessions: number;
  recommended_study_time_of_day: TimeOfDay;
}

export interface RAGMemoryEntry {
  id: string;
  userId: string;
  eventId?: string;
  content: string;
  type: "event" | "syllabus" | "study_summary" | "reflection";
  embedding: number[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface FocusSession {
  id: string;
  userId: string;
  eventId: string;
  taskName: string;
  microTasks: string[];
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  status: "scheduled" | "active" | "completed" | "skipped";
  calendarEventId?: string;
  createdAt: Date;
}

export interface DailyPlan {
  id: string;
  userId: string;
  planDate: Date;
  focusSessions: FocusSession[];
  prioritizedEvents: Event[];
  notes?: string;
  createdAt: Date;
}

export interface ContextSuggestion {
  id: string;
  userId: string;
  eventId: string;
  context: string;
  suggestion: string;
  taskCategory: string;
  recommendedTimeOfDay: TimeOfDay;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  googleId: string;
  name: string;
  refreshToken: string;
  lastEmailSync: Date;
  lastLlmCall: Date;
  lastEmbedding: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailMessage {
  id: string;
  userId: string;
  googleMessageId: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
  processed: boolean;
  createdAt: Date;
}

export interface ExtractionInput {
  emails: EmailMessage[];
  classroomAnnouncements: ClassroomAnnouncement[];
  existingEvents: Event[];
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  courseName: string;
  text: string;
  createdTime: Date;
  materials?: any[];
}

export interface UserContext {
  currentTime: Date;
  location?: string;
  currentTask?: string;
  recentlyAccessedApps?: string[];
  calendarBusy: boolean;
  workloadLevel: "low" | "medium" | "high";
}
