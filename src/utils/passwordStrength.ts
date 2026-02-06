import zxcvbn from "zxcvbn";

export type StrengthScore = 0 | 1 | 2 | 3 | 4;
export type StrengthLabel = "Weak" | "Fair" | "Good" | "Strong";

export interface PasswordStrength {
  score: StrengthScore;
  label: StrengthLabel;
  feedback: string[];
  crackTimeDisplay: string;
  color: string;
  barWidth: string;
}

const STRENGTH_CONFIG: Record<StrengthScore, { label: StrengthLabel; color: string; barWidth: string }> = {
  0: { label: "Weak", color: "bg-red-500", barWidth: "w-1/4" },
  1: { label: "Weak", color: "bg-red-500", barWidth: "w-1/4" },
  2: { label: "Fair", color: "bg-amber-500", barWidth: "w-2/4" },
  3: { label: "Good", color: "bg-emerald-400", barWidth: "w-3/4" },
  4: { label: "Strong", color: "bg-emerald-500", barWidth: "w-full" },
};

/**
 * Calculate password strength using zxcvbn.
 * Returns score 0-4, label, feedback, and crack time estimate.
 */
export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return {
      score: 0,
      label: "Weak",
      feedback: [],
      crackTimeDisplay: "",
      color: "bg-slate-600",
      barWidth: "w-0",
    };
  }

  const result = zxcvbn(password);
  const config = STRENGTH_CONFIG[result.score as StrengthScore];

  return {
    score: result.score as StrengthScore,
    label: config.label,
    feedback: result.feedback.suggestions || [],
    crackTimeDisplay: result.crack_times_display.offline_slow_hashing_1e4_per_second as string,
    color: config.color,
    barWidth: config.barWidth,
  };
};

/**
 * Check if password strength is acceptable for file creation.
 * Blocks score 0-1 (Weak).
 */
export const isStrengthAcceptable = (score: StrengthScore): boolean => {
  return score >= 2;
};
