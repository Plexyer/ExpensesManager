export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_HINT_LENGTH = 100;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface HintValidationResult {
  isValid: boolean;
  warnings: string[];
}

/**
 * Validate password meets minimum requirements.
 * Note: Strength check is separate (see passwordStrength.ts)
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate password confirmation matches.
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, errors: ["Please confirm your password"] };
  }

  if (password !== confirmPassword) {
    return { isValid: false, errors: ["Passwords do not match"] };
  }

  return { isValid: true, errors: [] };
};

/**
 * Validate password hint (optional field).
 * Warns if hint contains password.
 */
export const validateHint = (
  hint: string,
  password: string
): HintValidationResult => {
  const warnings: string[] = [];

  if (!hint) {
    // Hint is optional, empty is fine
    return { isValid: true, warnings: [] };
  }

  if (hint.length > MAX_HINT_LENGTH) {
    return {
      isValid: false,
      warnings: [`Hint must be at most ${MAX_HINT_LENGTH} characters`],
    };
  }

  // Check if hint contains password (case-insensitive)
  if (
    password &&
    password.length >= 4 &&
    hint.toLowerCase().includes(password.toLowerCase())
  ) {
    warnings.push("Your hint should not contain your password");
  }

  // Check if password contains hint (reverse check for short passwords)
  if (
    hint.length >= 4 &&
    password &&
    password.toLowerCase().includes(hint.toLowerCase())
  ) {
    warnings.push("Your hint is too similar to your password");
  }

  return { isValid: true, warnings };
};

/**
 * Get password requirements checklist status.
 */
export const getPasswordRequirements = (
  password: string
): { label: string; met: boolean }[] => {
  return [
    {
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      label: "Contains lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Contains number",
      met: /\d/.test(password),
    },
    {
      label: "Contains special character",
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    },
  ];
};
