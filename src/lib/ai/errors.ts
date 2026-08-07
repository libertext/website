/**
 * Standardized, user-safe error taxonomy (§73). Providers throw ProviderError;
 * the retry policy (§149) uses `retryable` to decide whether to back off or fail fast.
 */
export type AppErrorCode =
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_AUTH_FAILED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "INVALID_MODEL"
  | "INVALID_RESPONSE"
  | "INSUFFICIENT_CREDITS"
  | "WORDPRESS_AUTH_FAILED"
  | "WORDPRESS_CONNECTION_FAILED"
  | "WORDPRESS_PERMISSION_DENIED"
  | "GENERATION_FAILED"
  | "QUEUE_FAILED"
  | "SSRF_BLOCKED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "RATE_LIMITED";

/** Turkish user-facing messages (§73, §196). Technical detail stays in logs. */
const USER_MESSAGES: Record<AppErrorCode, string> = {
  PROVIDER_RATE_LIMIT: "Yapay zeka sağlayıcısı şu an yoğun. Biraz sonra tekrar denenecek.",
  PROVIDER_AUTH_FAILED: "Yapay zeka sağlayıcı anahtarı geçersiz. Lütfen ayarları kontrol edin.",
  PROVIDER_UNAVAILABLE: "Yapay zeka sağlayıcısı geçici olarak kullanılamıyor.",
  PROVIDER_TIMEOUT: "Yapay zeka isteği zaman aşımına uğradı. Lütfen tekrar deneyin.",
  INVALID_MODEL: "Seçilen model geçerli değil.",
  INVALID_RESPONSE: "Yapay zeka beklenmeyen bir yanıt döndürdü. Tekrar denenecek.",
  INSUFFICIENT_CREDITS: "Yeterli krediniz yok. Lütfen planınızı yükseltin.",
  WORDPRESS_AUTH_FAILED: "WordPress kimlik doğrulaması başarısız oldu.",
  WORDPRESS_CONNECTION_FAILED: "WordPress sitesine bağlanılamadı.",
  WORDPRESS_PERMISSION_DENIED: "Bu WordPress bağlantısının yazı yayınlama yetkisi yok.",
  GENERATION_FAILED: "Makale oluşturulurken bir hata oluştu.",
  QUEUE_FAILED: "İş kuyruğa eklenemedi. Lütfen tekrar deneyin.",
  SSRF_BLOCKED: "Bu adrese güvenlik nedeniyle bağlanılamıyor.",
  FORBIDDEN: "Bu işlem için yetkiniz yok.",
  NOT_FOUND: "Kayıt bulunamadı.",
  VALIDATION_FAILED: "Girdiğiniz bilgiler geçerli değil.",
  RATE_LIMITED: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  readonly status: number;
  readonly cause?: unknown;

  constructor(
    code: AppErrorCode,
    opts: { retryable?: boolean; status?: number; cause?: unknown; message?: string } = {},
  ) {
    super(opts.message ?? code);
    this.name = "AppError";
    this.code = code;
    this.retryable = opts.retryable ?? false;
    this.status = opts.status ?? defaultStatus(code);
    this.cause = opts.cause;
  }

  /** Safe payload for the client — no stack, no provider internals. */
  toClient(): { code: AppErrorCode; message: string } {
    return { code: this.code, message: USER_MESSAGES[this.code] };
  }
}

function defaultStatus(code: AppErrorCode): number {
  switch (code) {
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_FAILED":
      return 422;
    case "RATE_LIMITED":
    case "PROVIDER_RATE_LIMIT":
      return 429;
    case "INSUFFICIENT_CREDITS":
      return 402;
    default:
      return 500;
  }
}

export function userMessage(code: AppErrorCode): string {
  return USER_MESSAGES[code];
}

/** Map an HTTP status from a provider to our taxonomy for retry decisions (§149). */
export function classifyHttpStatus(status: number): AppError {
  if (status === 401 || status === 403) return new AppError("PROVIDER_AUTH_FAILED");
  if (status === 429) return new AppError("PROVIDER_RATE_LIMIT", { retryable: true });
  if (status >= 500) return new AppError("PROVIDER_UNAVAILABLE", { retryable: true });
  return new AppError("GENERATION_FAILED");
}
