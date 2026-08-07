# AI Providers

ArticlePilot talks to every LLM vendor through one abstraction, the **`AIProvider`** interface. Business logic (the generation pipeline, services) never imports a vendor SDK directly — it receives an `AIProvider` from the registry. Adding a vendor is a self-contained change.

Current adapters: `mock`, `openai`, `anthropic`, `gemini` (`src/lib/ai/providers/`).

---

## The `AIProvider` interface

Defined in `src/lib/ai/types.ts`. A provider implements:

| Method | Purpose |
| --- | --- |
| `generateText(opts)` | Plain text completion → `{ text, usage, modelId }`. |
| `generateStructured<T>(opts)` | JSON completion validated against a Zod schema → `{ data, raw, usage, modelId }`. |
| `streamText(opts)` | Async iterable of text chunks for streaming. |
| `countTokens(text)` | Approximate token count for a string. |
| `getAvailableModels()` | The model descriptors this provider can serve. |
| `healthCheck()` | `{ ok, detail? }` — used by admin health and provider status. |
| `estimateCost({ modelId, inputTokens, outputTokens })` | Cost in integer USD micro-units (`CostEstimate`). |
| `capabilities(modelId)` | `{ streaming, structuredOutput, vision, webSearch }`. |

Providers also expose `readonly id` and `readonly displayName`. `GenerateOptions` carries `modelId`, `messages`, and optional `temperature`, `maxOutputTokens`, and an `AbortSignal`. Providers ignore knobs a model doesn't support.

---

## Adding a new provider (step by step)

Suppose you're adding **Mistral**.

### 1. Implement the interface

Create `src/lib/ai/providers/mistral.ts` and implement `AIProvider`. Follow an existing adapter (e.g. `openai.ts`) closely, especially:

- Map the platform's `AIMessage[]` to the vendor's request shape.
- Return a `TokenUsage` (`inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningTokens`) from the vendor response.
- For `generateStructured`, request JSON, then run the raw text through `parseStructured` (see below) rather than parsing yourself.
- Use `estimateCost` backed by the injected price lookup so cost accounting stays consistent.
- Translate vendor HTTP errors into the shared taxonomy (`src/lib/ai/errors.ts`), e.g. via `classifyHttpStatus` — 429 → retryable `PROVIDER_RATE_LIMIT`, 5xx → retryable `PROVIDER_UNAVAILABLE`.

The constructor should take the resolved API key and a `PriceLookup` (as the other adapters do), so it closes over the key server-side and never exposes it.

### 2. Register it in the factory

In `src/lib/ai/registry.ts`:

- Add `"mistral"` to the `ProviderId` union.
- In `getProvider`, add a `case "mistral": return new MistralProvider(apiKey, priceLookup);` and extend the BYOK/env key resolution so `MISTRAL_API_KEY` is read as the platform fallback.
- Add `mistral` to `availableProviders` so the UI knows when it is usable.

### 3. Register models in the `AIModel` table

A provider is only useful once it has models. Each usable model is a row in **`AIModel`**, keyed by `(provider, externalModelId)`. Fields:

- `provider`, `externalModelId` (the id sent to the vendor API), `displayName`, `description`
- capability flags: `supportsStreaming`, `supportsStructured`, `supportsVision`, `supportsWebSearch`
- `contextWindow`, `maxOutputTokens`
- pricing: `inputPricePerMTok`, `outputPricePerMTok` (**integer USD micro-units per 1M tokens**), `currency`
- `qualityTier` (`ECONOMY`/`BALANCED`/`PREMIUM`), `speedTier` (`SLOW`/`MEDIUM`/`FAST`)
- `defaultForArticle`, `defaultForResearch`, `active`, `deprecated`, `sortOrder`

Add rows via the admin surface or a seed/migration. The registry reads pricing from this table, so cost accounting works with no code change. Toggle a provider on/off (and its concurrency) via `AIProviderConfig`.

### 4. Set the env key

Add `MISTRAL_API_KEY` to `.env.example`, the Zod schema in `src/lib/config/env.ts`, and the availability helpers. Absent key = provider disabled unless a workspace supplies BYOK.

---

## Platform-managed keys vs BYOK

Key resolution in `getProvider` has a clear precedence:

1. **Workspace BYOK** — an active `UserProviderCredential` for `(workspaceId, provider)`. The stored key is AES-256-GCM encrypted and decrypted server-side only.
2. **Platform-managed** — the env key (`OPENAI_API_KEY`, etc.).

If neither exists, `getProvider` throws `PROVIDER_AUTH_FAILED`. Keys are never returned to callers; the provider closes over them. BYOK lets an agency or advanced plan bill AI usage to their own vendor account while still going through the same pipeline and metering.

---

## Structured output and Zod validation

The pipeline relies on **structured** (JSON) output, not free text. Vendors sometimes wrap JSON in prose or ```` ```json ```` fences, so `src/lib/ai/structured.ts` provides `parseStructured(raw, schema)`:

1. Extract the JSON — strip code fences, else grab the outermost `{...}`/`[...]` block.
2. `JSON.parse` it; on failure throw a **retryable** `INVALID_RESPONSE`.
3. Validate against the **Zod schema**; on failure throw a retryable `INVALID_RESPONSE` with the field-level issues.

Because the error is retryable, BullMQ retries the job with backoff — a "repair" loop for occasional malformed output. Schemas for each pipeline stage (`briefSchema`, `outlineSchema`, `articleSchema`, `metaSchema`) live in `src/lib/ai/schemas.ts`. Always route a provider's JSON through `parseStructured` so validation and repair behavior stay uniform.

---

## The Mock provider (tests)

`MockAIProvider` (`src/lib/ai/providers/mock.ts`) implements the full `AIProvider` interface and returns deterministic, schema-valid output with **no network and no key**. It is always available (`availableProviders().mock === true`).

Because of it:

- the entire generation pipeline (`normalize → brief → outline → draft → meta`) is unit-testable offline,
- `GenerationService`, credit charging/refunding, and usage recording can be exercised without a real vendor,
- `pnpm test` runs green with an empty `.env` (beyond the required core secrets).

When adding a new provider, mirror the mock's response shapes in your tests so the pipeline assertions stay provider-agnostic.
