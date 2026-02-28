interface TaskInput {
  category: "Quiz" | "Assignment" | "Event" | "Custom";
  daysUntilDeadline: number;
}

const categoryWeights: Record<string, number> = {
  Quiz: 5,
  Assignment: 4,
  Event: 2,
  Custom: 1
};

export const computePriority = (task: TaskInput) => {
  const weight = categoryWeights[task.category] || 1;

  const deadlineScore =
    task.daysUntilDeadline <= 1
      ? 5
      : task.daysUntilDeadline <= 3
      ? 4
      : task.daysUntilDeadline <= 7
      ? 3
      : 1;

  const priority = weight * deadlineScore;

  return {
    priority_score: Math.min(10, priority),
    urgency_level:
      priority >= 15
        ? "critical"
        : priority >= 10
        ? "high"
        : priority >= 5
        ? "medium"
        : "low",
    reasoning_summary:
      "Priority calculated using deterministic scoring model."
  };
};