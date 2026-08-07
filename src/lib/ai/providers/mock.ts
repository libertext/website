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
import { slugify } from "@/lib/utils/slug";

/**
 * Deterministic provider for development, tests and CI (§136).
 * Returns believable Turkish content shaped to whatever `schemaName` the pipeline
 * requests — so brief/outline/draft/meta/SEO all work with no API key and no cost.
 */
export class MockAIProvider implements AIProvider {
  readonly id = "mock";
  readonly displayName = "Mock (Test)";

  countTokens(text: string): number {
    // Rough heuristic: ~4 chars per token.
    return Math.max(1, Math.ceil(text.length / 4));
  }

  async getAvailableModels(): Promise<AIModelDescriptor[]> {
    return [
      {
        externalModelId: "mock-standard",
        displayName: "Mock Standard",
        contextWindow: 128000,
        maxOutputTokens: 8192,
        supportsStreaming: true,
        supportsStructured: true,
        supportsVision: false,
        supportsWebSearch: false,
      },
    ];
  }

  async healthCheck() {
    return { ok: true, detail: "mock always healthy" };
  }

  capabilities(): ProviderCapabilities {
    return { streaming: true, structuredOutput: true, vision: false, webSearch: false };
  }

  estimateCost(): CostEstimate {
    return { inputMicroUsd: 0, outputMicroUsd: 0, totalMicroUsd: 0 };
  }

  async generateText(opts: GenerateOptions): Promise<GenerateResult> {
    const topic = this.topicFrom(opts);
    const text = `# ${topic}\n\nBu, ${topic} konusuna dair mock içeriktir. Gerçek bir sağlayıcı yapılandırıldığında yerini alacaktır.`;
    return {
      text,
      modelId: opts.modelId,
      usage: {
        inputTokens: this.countTokens(opts.messages.map((m) => m.content).join(" ")),
        cachedInputTokens: 0,
        outputTokens: this.countTokens(text),
        reasoningTokens: 0,
      },
    };
  }

  async *streamText(opts: GenerateOptions): AsyncIterable<string> {
    const { text } = await this.generateText(opts);
    for (const word of text.split(" ")) {
      yield word + " ";
    }
  }

  async generateStructured<T>(
    opts: GenerateStructuredOptions<T>,
  ): Promise<GenerateStructuredResult<T>> {
    const topic = this.topicFrom(opts);
    const payload = this.buildPayload(opts.schemaName ?? "", topic);
    const parsed = opts.schema.safeParse(payload);
    if (!parsed.success) {
      // Should not happen — mock payloads are built to match. Surface loudly in tests.
      throw new AppError("INVALID_RESPONSE", {
        message: `Mock payload did not match schema ${opts.schemaName}: ${parsed.error.message}`,
      });
    }
    const raw = JSON.stringify(payload);
    return {
      data: parsed.data,
      raw,
      modelId: opts.modelId,
      usage: {
        inputTokens: this.countTokens(opts.messages.map((m) => m.content).join(" ")),
        cachedInputTokens: 0,
        outputTokens: this.countTokens(raw),
        reasoningTokens: 0,
      },
    };
  }

  private topicFrom(opts: GenerateOptions): string {
    const lastUser = [...opts.messages].reverse().find((m) => m.role === "user");
    const raw = lastUser?.content ?? "Örnek Konu";
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    // The prompt engine emits a "Konu: <topic>" line — prefer it so the mock echoes
    // the real topic, not the task instruction.
    const konuLine = lines.find((l) => /^(konu|topic)\s*[:：]/i.test(l));
    const line = konuLine ?? lines[0] ?? raw;
    return line.replace(/^(konu|topic)\s*[:：]/i, "").trim().slice(0, 120) || "Örnek Konu";
  }

  private buildPayload(schemaName: string, topic: string): unknown {
    const kw = topic.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
    switch (schemaName) {
      case "brief":
        return {
          primaryKeyword: kw,
          secondaryKeywords: [`${kw} nedir`, `${kw} nasıl`],
          synonyms: [kw],
          entities: [topic],
          searchIntent: "INFORMATIONAL",
          audience: "Konuyu araştıran genel okuyucu",
          questionsToAnswer: [`${topic} nedir?`, `${topic} nasıl yapılır?`],
          likelySubtopics: ["Tanım", "Adımlar", "Örnekler"],
          recommendedAngle: "Pratik, uygulanabilir bir rehber",
          differentiation: "Somut örnekler ve net adımlar",
          pitfalls: ["Aşırı genel ifadeler", "Doğrulanmamış iddialar"],
          claimsRequiringSources: [],
          ctaSuggestion: "Sorularınız için bize ulaşın.",
        };
      case "titles":
        return {
          titles: Array.from({ length: 6 }, (_, i) => ({
            title: `${topic} — Kapsamlı Rehber ${i + 1}`,
            intentFit: 80 - i * 3,
            clarity: 85,
            keywordRelevance: 90 - i * 2,
            clickAppeal: 70 + i,
            sensationalismRisk: 10 + i,
          })),
        };
      case "outline":
        return {
          h1: topic,
          sections: [
            { heading: `${topic} Nedir?`, level: 2, children: [] },
            {
              heading: "Temel Kavramlar",
              level: 2,
              children: [{ heading: "Öne Çıkan Noktalar", level: 3 }],
            },
            { heading: "Adım Adım Uygulama", level: 2, children: [] },
            { heading: "Sık Yapılan Hatalar", level: 2, children: [] },
          ],
          faq: [`${topic} ne kadar sürer?`, `${topic} için nelere dikkat etmeliyim?`],
        };
      case "meta":
        return {
          metaTitle: `${topic} | Rehber`.slice(0, 60),
          metaDescription: `${topic} hakkında bilmeniz gereken her şey: tanım, adımlar ve pratik ipuçları.`.slice(
            0,
            155,
          ),
          slug: slugify(topic),
          excerpt: `${topic} konusunu sade ve uygulanabilir şekilde anlatan kısa bir özet.`,
        };
      case "seo_review":
        return {
          score: 82,
          checks: [
            { id: "primary_keyword_in_title", label: "Anahtar kelime başlıkta", passed: true, weight: 10 },
            { id: "meta_description", label: "Meta açıklama mevcut", passed: true, weight: 8 },
          ],
          semanticNotes: "İçerik arama niyetini karşılıyor; giriş biraz kısaltılabilir.",
        };
      case "quality_review":
        return {
          status: "PASS",
          answersUserQuestion: true,
          hasOriginalSynthesis: true,
          unnecessaryRepetition: false,
          unsupportedClaims: [],
          likelyHallucination: false,
          misleadingTitle: false,
          addsValue: true,
          templatedFeel: false,
          notes: "İçerik kullanıcının sorusunu doğrudan yanıtlıyor.",
        };
      case "article":
      default:
        return {
          title: topic,
          slug: slugify(topic),
          excerpt: `${topic} konusunu ele alan, sade ve uygulanabilir bir yazı.`,
          metaTitle: `${topic} | Rehber`.slice(0, 60),
          metaDescription: `${topic} hakkında pratik bir rehber.`.slice(0, 155),
          primaryKeyword: kw,
          secondaryKeywords: [`${kw} nedir`],
          sections: [
            {
              heading: `${topic} Nedir?`,
              level: 2,
              html: `<p>${topic}, üzerinde durmaya değer bir konudur. Bu bölümde temel tanımı ele alıyoruz.</p><p>Kısaca, konunun neden önemli olduğunu ve kimleri ilgilendirdiğini açıklıyoruz.</p>`,
            },
            {
              heading: "Adım Adım Uygulama",
              level: 2,
              html: `<p>Aşağıdaki adımlar süreci basitleştirir:</p><ul><li>İlk adım</li><li>İkinci adım</li><li>Üçüncü adım</li></ul>`,
            },
          ],
          faq: [
            { question: `${topic} ne kadar sürer?`, answer: "Duruma göre değişir; genellikle kısa sürede tamamlanır." },
          ],
          sources: [],
          suggestedInternalLinks: [],
        };
    }
  }
}
