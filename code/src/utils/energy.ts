export type EnergyLevel = "high" | "medium" | "low" | "very_low";

export function getEnergyLevel(date: Date = new Date()): EnergyLevel {
  const hour = date.getHours();

  if (hour >= 6 && hour < 12) return "high";
  if (hour >= 12 && hour < 18) return "medium";
  if (hour >= 18 && hour < 23) return "low";
  return "very_low";
}