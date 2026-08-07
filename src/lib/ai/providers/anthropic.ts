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

const BASE = "https://api.anthropic.com/v1";
const API_VERSION = "2023-06-01";

/** Anthropic Messages API adapter (§16). System prompt is a top-level field. */
export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly displayName = "Claude";

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
    // A minimal ping keeps test cost negligible (§213).
    try {
      const res = await this.raw({
        modelId: "claude-3-5-haiku-latest",
        messages: [{ role: "user", content: "ping" }],
        maxOutputTokens: 1,
      });
      return { ok: Boolean(res) };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : "error" };
    }
  }

  async generateText(opts: GenerateOptions): Promise<GenerateResult> {
    const json = await this.raw(opts);
    const text = (json.content ?? []).map((b) => b.text ?? "").join("");
    return { text, modelId: opts.modelId, usage: this.usage(json) };
  }

  async generateStructured<T>(
    opts: GenerateStructuredOptions<T>,
  ): Promise<GenerateStructuredResult<T>> {
    // Instruct JSON-only; parse + validate defensively (§32).
    const messages = [...opts.messages];
    messages.push({
      role: "user",
      content: "Yalnızca geçerli JSON döndür. Açıklama, kod bloğu işareti veya ek metin ekleme.",
    });
    const json = await this.raw({ ...opts, messages });
    const raw = (json.content ?? []).map((b) => b.text ?? "").join("");
    const data = parseStructured(raw, opts.schema);
    return { data, raw, modelId: opts.modelId, usage: this.usage(json) };
  }

  async *streamText(opts: GenerateOptions): AsyncIterable<string> {
    const { text } = await this.generateText(opts);
    yield text;
  }

  private async raw(opts: GenerateOptions): Promise<AnthropicResponse> {
    if (!this.apiKey) throw new AppError("PROVIDER_AUTH_FAILED");
    const system = opts.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const messages = opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    const res = await providerFetch(
      `${BASE}/messages`,
      {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: opts.modelId,
          system: system || undefined,
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxOutputTokens ?? 4096,
        }),
      },
      opts.signal,
    );
    return (await res.json()) as AnthropicResponse;
  }

  private usage(json: AnthropicResponse) {
    const u = json.usage;
    return {
      inputTokens: u?.input_tokens ?? 0,
      cachedInputTokens: u?.cache_read_input_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      reasoningTokens: 0,
    };
  }
}

interface AnthropicResponse {
  content?: { type?: string; text?: string }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
}
