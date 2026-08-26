export type PasswordSignal = {
  id: "minimum" | "length" | "variety" | "symbol";
  label: string;
  met: boolean;
};

export function passwordSignals(password: string): PasswordSignal[] {
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return [
    { id: "minimum", label: "At least 10 characters", met: password.length >= 10 },
    { id: "length", label: "14+ characters is stronger", met: password.length >= 14 },
    { id: "variety", label: "Mix letters and numbers", met: hasLetter && hasNumber },
    { id: "symbol", label: "Add a symbol for extra strength", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function passwordStrength(password: string): { score: number; label: "Too short" | "Okay" | "Good" | "Strong" } {
  const signals = passwordSignals(password);
  if (!signals[0].met) return { score: Math.min(20, password.length * 2), label: "Too short" };
  const score = Math.min(100, 40 + signals.slice(1).filter((item) => item.met).length * 20);
  if (score >= 100) return { score, label: "Strong" };
  if (score >= 80) return { score, label: "Good" };
  return { score, label: "Okay" };
}

export function accountJourneyCopy(mode: "register" | "login" | "forgot") {
  if (mode === "register") {
    return {
      eyebrow: "Create your learning identity",
      title: "Keep your progress when you switch devices.",
      description: "Your current guest progress is upgraded into the account instead of being thrown away.",
      action: "Create account",
    } as const;
  }
  if (mode === "login") {
    return {
      eyebrow: "Welcome back",
      title: "Continue exactly where you left off.",
      description: "Signing in hydrates the account's server-side progress and Boss Fight evidence.",
      action: "Sign in",
    } as const;
  }
  return {
    eyebrow: "Account recovery",
    title: "Reset your password safely.",
    description: "For privacy, the response is the same whether or not an account exists for that email.",
    action: "Send reset link",
  } as const;
}
