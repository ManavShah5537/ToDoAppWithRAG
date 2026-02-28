// Utility: Calculate days until deadline
export const calculateDaysUntilDeadline = (deadline: Date): number => {
  const now = new Date();
  const timeDiff = deadline.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Utility: Format date
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Utility: Get time of day
export const getTimeOfDay = (
  date: Date
): "morning" | "afternoon" | "evening" | "night" => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

// Utility: Validation helper
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Utility: Sleep function for retries
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Utility: Batch array
export const batchArray = <T>(arr: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
};
