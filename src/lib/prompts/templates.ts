/**
 * Centralized prompt task-instructions (§57). The full system prompt is assembled
 * by the prompt engine (§114). Version tags flow into AIUsage records (§57).
 */
export const PROMPT_VERSION = "2026-01";

export const TASK_INSTRUCTIONS = {
  brief:
    "Aşağıdaki konu için bir SEO içerik brief'i üret. Arama niyetini belirle, birincil/ikincil anahtar kelimeleri, cevaplanması gereken soruları ve kaynak gerektiren iddiaları listele. Yalnızca JSON döndür.",
  titles:
    "Aşağıdaki konu için 6 başlık alternatifi üret. Her başlık için intent uyumu, netlik, anahtar kelime alaka, tıklanma çekiciliği ve sansasyon riskini 0-100 arası puanla. Clickbait üretme. Yalnızca JSON döndür.",
  outline:
    "Aşağıdaki konu için H1, H2/H3 hiyerarşisi ve FAQ içeren bir taslak (outline) üret. Yalnızca JSON döndür.",
  draft:
    "Aşağıdaki konu ve taslağa göre tam bir makale üret. Her bölüm için temiz HTML paragrafları yaz. Okuyucunun sorusunu doğrudan cevapla, gereksiz tekrar yapma, kaynak uydurma. Yalnızca JSON döndür.",
  meta:
    "Aşağıdaki makale için SEO meta verisi üret: meta başlık (≤60 karakter), meta açıklama (≤155 karakter), okunaklı slug ve kısa özet. Yalnızca JSON döndür.",
  seoReview:
    "Aşağıdaki makaleyi SEO ve okuyucu değeri açısından değerlendir. Şeffaf, gerekçeli puan ver. Yalnızca JSON döndür.",
  qualityReview:
    "Aşağıdaki makaleyi kalite açısından incele: kullanıcının sorusunu cevaplıyor mu, özgün sentez var mı, gereksiz tekrar/uydurma/yanıltıcı başlık var mı? Yalnızca JSON döndür.",
  sectionRewrite:
    "Aşağıdaki metin bölümünü verilen talimata göre yeniden yaz. Yalnızca yeniden yazılmış HTML döndür, başka açıklama ekleme.",
} as const;
