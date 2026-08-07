import type {
  AIProvider,
  AIModelDescriptor,
  CostEstimate,
  GenerateOptions,
  GenerateResult,
  GenerateStructuredOptions,
  GenerateStructuredResult,
  ProviderCapabilities,
} from "@/lib/ai/types";
import { AppError } from "@/lib/ai/errors";
import { providerFetch } from "@/lib/ai/providers/http";
import { parseStructured } from "@/lib/ai/structured";
import { computeCost, type PriceLookup } from "@/lib/ai/cost";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Google Gemini adapter (§16). Uses generateContent with JSON response mime type. */
export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  readonly displayName = "Gemini";

  constructor(
    private readonly apiKey: string,
    private readonly priceLookup: PriceLookup = () => undefined,
  ) {}

  countTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }

  capabilities(): ProviderCapabilities {
    return { streaming: true, structuredOutput: true, vision: true, webSearch: false };
  }

  estimateCost(input: { modelId: string; inputTokens: number; outputTokens: number }): CostEstimate {
    return computeCost(this.priceLookup(input.modelId), input.inputTokens, input.outputTokens);
  }

  async getAvailableModels(): Promise<AIModelDescriptor[]> {
    return [];
  }

  async healthCheck() {
    try {
      const res = await providerFetch(`${BASE}/models?key=${this.apiKey}`, { method: "GET" });
      return { ok: res.ok };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : "error" };
    }
  }

  async generateText(opts: GenerateOptions): Promise<GenerateResult> {
    const json = await this.call(opts, false);
    return { text: this.textOf(json), modelId: opts.modelId, usage: this.usage(json) };
  }

  async generateStructured<T>(
    opts: GenerateStructuredOptions<T>,
  ): Promise<GenerateStructuredResult<T>> {
    const json = await this.call(opts, true);
    const raw = this.textOf(json);
    const data = parseStructured(raw, opts.schema);
    return { data, raw, modelId: opts.modelId, usage: this.usage(json) };
  }

  async *streamText(opts: GenerateOptions): AsyncIterable<string> {
    const { text } = await this.generateText(opts);
    yield text;
  }

  private async call(opts: GenerateOptions, jsonMode: boolean): Promise<GeminiResponse> {
    if (!this.apiKey) throw new AppError("PROVIDER_AUTH_FAILED");
    const systemInstruction = opts.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents = opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const res = await providerFetch(
      `${BASE}/models/${encodeURIComponent(opts.modelId)}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(systemInstruction
            ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
            : {}),
          contents,
          generationConfig: {
            temperature: opts.temperature ?? 0.7,
            maxOutputTokens: opts.maxOutputTokens ?? 4096,
            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
      opts.signal,
    );
    return (await res.json()) as GeminiResponse;
  }

  private textOf(json: GeminiResponse): string {
    return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  }

  private usage(json: GeminiResponse) {
    const u = json.usageMetadata;
    return {
      inputTokens: u?.promptTokenCount ?? 0,
      cachedInputTokens: u?.cachedContentTokenCount ?? 0,
      outputTokens: u?.candidatesTokenCount ?? 0,
      reasoningTokens: 0,
    };
  }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
}
