export function passwordValidationMessage(password: string): string | undefined {
  const length = Array.from(password).length;
  if (length < 12 || length > 128)
    return "Password must be between 12 and 128 characters.";
  if (!/\p{Ll}/u.test(password)) return "Password must include a lowercase letter.";
  if (!/\p{Lu}/u.test(password)) return "Password must include an uppercase letter.";
  if (!/\p{N}/u.test(password)) return "Password must include a number.";
  if (!/[^\p{L}\p{N}]/u.test(password)) return "Password must include a symbol.";
  return undefined;
}

export function isStrongPassword(password: string): boolean {
  return passwordValidationMessage(password) === undefined;
}

export type PasswordChecklist = {
  minLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
};

export function getPasswordChecklist(password: string): PasswordChecklist {
  const length = Array.from(password).length;
  return {
    minLength: length >= 12 && length <= 128,
    hasLower: /\p{Ll}/u.test(password),
    hasUpper: /\p{Lu}/u.test(password),
    hasNumber: /\p{N}/u.test(password),
    hasSymbol: /[^\p{L}\p{N}]/u.test(password),
  };
}

export function getPasswordStrength(password: string): {
  score: number; // 0 - 4
  label: "Weak" | "Fair" | "Good" | "Strong";
  color: string;
} {
  const checklist = getPasswordChecklist(password);
  const passedCount = Object.values(checklist).filter(Boolean).length;
  if (!password || passedCount <= 1) {
    return { score: 1, label: "Weak", color: "bg-red-500" };
  }
  if (passedCount <= 3) {
    return { score: 2, label: "Fair", color: "bg-amber-500" };
  }
  if (passedCount === 4) {
    return { score: 3, label: "Good", color: "bg-lime-500" };
  }
  return { score: 4, label: "Strong", color: "bg-emerald-600" };
}
