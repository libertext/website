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

const BASE = "https://api.openai.com/v1";

/** OpenAI Chat Completions adapter (§16). Structured output via JSON response format. */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI";

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
    // The DB registry is the source of truth (§15); remote listing is best-effort.
    return [];
  }

  async healthCheck() {
    try {
      const res = await providerFetch(`${BASE}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return { ok: res.ok };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : "error" };
    }
  }

  async generateText(opts: GenerateOptions): Promise<GenerateResult> {
    const json = await this.call(opts);
    const text = json.choices?.[0]?.message?.content ?? "";
    return { text, modelId: opts.modelId, usage: this.usage(json) };
  }

  async generateStructured<T>(
    opts: GenerateStructuredOptions<T>,
  ): Promise<GenerateStructuredResult<T>> {
    const json = await this.call(opts, true);
    const raw = json.choices?.[0]?.message?.content ?? "";
    const data = parseStructured(raw, opts.schema);
    return { data, raw, modelId: opts.modelId, usage: this.usage(json) };
  }

  async *streamText(opts: GenerateOptions): AsyncIterable<string> {
    // Non-streaming fallback keeps the pipeline reliable (§61).
    const { text } = await this.generateText(opts);
    yield text;
  }

  private async call(opts: GenerateOptions, jsonMode = false): Promise<OpenAIResponse> {
    if (!this.apiKey) throw new AppError("PROVIDER_AUTH_FAILED");
    const res = await providerFetch(
      `${BASE}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: opts.modelId,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxOutputTokens ?? 4096,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      },
      opts.signal,
    );
    return (await res.json()) as OpenAIResponse;
  }

  private usage(json: OpenAIResponse) {
    const u = json.usage;
    return {
      inputTokens: u?.prompt_tokens ?? 0,
      cachedInputTokens: u?.prompt_tokens_details?.cached_tokens ?? 0,
      outputTokens: u?.completion_tokens ?? 0,
      reasoningTokens: u?.completion_tokens_details?.reasoning_tokens ?? 0,
    };
  }
}

interface OpenAIResponse {
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}
