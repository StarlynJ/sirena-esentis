import { TEXT_SKIN_SYSTEM_PROMPT } from "./skin-prompts";

export type SkinProfileKey = "seca" | "grasa" | "mixta" | "sensible" | "normal";

type LanguageSession = { prompt: (input: string) => Promise<string>; destroy?: () => void };
type LanguageModelApi = {
  availability: (options?: object) => Promise<string>;
  create: (options?: object) => Promise<LanguageSession>;
};

function isProfile(value: unknown): value is SkinProfileKey {
  return value === "seca" || value === "grasa" || value === "mixta" || value === "sensible" || value === "normal";
}

export async function analyzeDescriptionWithBrowserAI(description: string): Promise<SkinProfileKey | null> {
  const languageModel = (globalThis as unknown as { LanguageModel?: LanguageModelApi }).LanguageModel;
  if (!languageModel) return null;

  const options = {
    expectedInputs: [{ type: "text", languages: ["es"] }],
    expectedOutputs: [{ type: "text", languages: ["es"] }],
  };

  try {
    const availability = await languageModel.availability(options);
    if (availability === "unavailable") return null;
    const session = await languageModel.create(options);
    const response = await Promise.race([
      session.prompt(`${TEXT_SKIN_SYSTEM_PROMPT}\n\nDESCRIPCIÓN DE LA PERSONA:\n${description}`),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("El análisis local tardó demasiado.")), 4000)),
    ]);
    session.destroy?.();
    const jsonText = response.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonText) as { probable_type?: unknown };
    return isProfile(parsed.probable_type) ? parsed.probable_type : null;
  } catch {
    return null;
  }
}
