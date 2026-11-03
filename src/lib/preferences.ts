import type { Division, Language } from "@/lib/types";

export const PROGRAMMING_LANGUAGES: Record<Language, string> = { python: "Python", cpp: "C++", java: "Java" };
export const DEFAULT_PREFERENCES = { division: "Junior" as Division, preferredLanguage: "python" as Language };

export function programmingLanguageLabel(language: string) { return PROGRAMMING_LANGUAGES[language as Language] ?? language; }

export function validatePreferences(division: unknown, language: unknown) {
  if (!["Junior", "Intermediate", "Senior"].includes(String(division))) throw new Error("Choose a division.");
  if (!Object.hasOwn(PROGRAMMING_LANGUAGES, String(language))) throw new Error("Choose a programming language.");
  return { division: division as Division, preferredLanguage: language as Language };
}

export function profilePreferences(row?: { division?: unknown; preferred_language?: unknown } | null) {
  try { return validatePreferences(row?.division, row?.preferred_language); }
  catch { return DEFAULT_PREFERENCES; }
}
