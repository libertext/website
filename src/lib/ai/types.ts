import type { z } from "zod";

/** A single chat message passed to a provider. */
export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIModelDescriptor {
  externalModelId: string;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsStructured: boolean;
  supportsVision: boolean;
  supportsWebSearch: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export interface GenerateOptions {
  modelId: string;
  messages: AIMessage[];
  /** Capability-aware; providers ignore unsupported knobs (§216). */
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface GenerateStructuredOptions<T> extends GenerateOptions {
  // Input type left unconstrained (any) so schemas using .default() — whose input
  // and output types differ — bind T to the OUTPUT (parsed) type.
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  /** Human name of the schema, sent to providers that support named JSON output. */
  schemaName?: string;
}

export interface GenerateResult {
  text: string;
  usage: TokenUsage;
  modelId: string;
}

export interface GenerateStructuredResult<T> {
  data: T;
  raw: string;
  usage: TokenUsage;
  modelId: string;
}

export interface ProviderCapabilities {
  streaming: boolean;
  structuredOutput: boolean;
  vision: boolean;
  webSearch: boolean;
}

/** USD micro-units (1e-6 USD). Integer-safe cost accounting (§161). */
export interface CostEstimate {
  inputMicroUsd: number;
  outputMicroUsd: number;
  totalMicroUsd: number;
}

/**
 * The single seam between business logic and any LLM vendor (§14).
 * New vendors (Mistral, Groq, Bedrock, ...) implement this without touching callers.
 */
export interface AIProvider {
  readonly id: string; // "mock" | "openai" | "anthropic" | "gemini"
  readonly displayName: string;

  generateText(opts: GenerateOptions): Promise<GenerateResult>;
  generateStructured<T>(opts: GenerateStructuredOptions<T>): Promise<GenerateStructuredResult<T>>;
  streamText(opts: GenerateOptions): AsyncIterable<string>;
  countTokens(text: string): number;
  getAvailableModels(): Promise<AIModelDescriptor[]>;
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
  estimateCost(input: { modelId: string; inputTokens: number; outputTokens: number }): CostEstimate;
  capabilities(modelId: string): ProviderCapabilities;
}
