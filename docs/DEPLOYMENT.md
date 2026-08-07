# Yayına Alma Rehberi — Vercel + Neon + Upstash

Bu rehber ArticlePilot AI'ı üretim ortamına, ekran ekran alır:

- **Vercel** → Next.js web uygulaması
- **Neon** → PostgreSQL
- **Upstash** → Redis (BullMQ kuyruğu)
- **Railway** (veya Render) → arka plan **worker** process'i

> **Neden ayrı worker?** Makale üretimi HTTP isteği içinde değil, ayrı bir Node
> process'inde (`worker/index.ts`) çalışır. Vercel **serverless**'tır; sürekli
> çalışan bir worker barındıramaz. Bu yüzden web'i Vercel'de, worker'ı
> Railway/Render gibi "always-on" bir serviste çalıştırırız. İkisi de aynı
> Neon + Upstash'e bağlanır. (Worker'sız hızlı başlangıç için bkz. Ek A.)

---

## 0. Ön hazırlık — sırlar (secrets) üret

Yerelde şu iki değeri üret ve bir kenara not al (Vercel + Railway'e gireceğiz):

```bash
# Oturum imzalama sırrı
openssl rand -base64 48
# AES-256-GCM ana şifreleme anahtarı (64 hex karakter). YEDEKLE — kaybolursa
# şifreli WordPress/BYOK kimlik bilgileri geri getirilemez.
openssl rand -hex 32
```

GitHub deposu hazır: `libertext/website`, dal `claude/ai-seo-saas-platform-j0mf8x`
(PR merge edildiyse `main`). Vercel/Railway bu depoyu bağlayacak.

---

## 1. Neon — PostgreSQL

1. https://neon.tech → **Sign up** (GitHub ile giriş kolay).
2. **Create project** → isim: `articlepilot`, region: kullanıcılarınıza yakın olan
   (ör. Frankfurt — `eu-central-1`), Postgres 16.
3. Proje açılınca **Connection string** kutusunu göreceksiniz. **İki** string lazım:
   - **Pooled** (varsayılan, `-pooler` içerir) → uygulama çalışma zamanı için.
   - **Direct** (Connection details → "Direct connection" seç, `-pooler` **yok**) →
     migration'lar için.
4. Her ikisini de kopyalayın. Şuna benzerler:
   ```
   # Pooled (runtime)
   postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/articlepilot?sslmode=require
   # Direct (migrations)
   postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/articlepilot?sslmode=require
   ```

> Neden ikisi? Prisma migration'ları pooler üzerinden güvenilir çalışmaz; migration
> için **Direct**, uygulama sorguları için **Pooled** kullanılır.

---

## 2. Upstash — Redis (BullMQ)

1. https://upstash.com → **Sign up**.
2. **Create Database** → Type: **Redis**, isim: `articlepilot`, region: Neon ile
   **aynı bölge** (gecikmeyi azaltır), **Eviction: disabled** seçin.
   - ⚠️ **Kritik:** BullMQ, veri düşürülmesini (eviction) kaldırmaz. Eviction
     **kapalı** (`noeviction`) olmalı. Upstash'te oluştururken "Eviction" kapalı bırakın.
3. Veritabanı açılınca **TLS** endpoint'ini kullanın. `Details` altında
   **`rediss://`** ile başlayan bağlantı URL'sini kopyalayın:
   ```
   rediss://default:xxxxx@eu1-xxx.upstash.io:6379
   ```
   (Not: şema `rediss://` — TLS için çift 's'.)

> Upstash ücretsiz katmanı günlük komut limitine sahiptir; yoğun toplu üretim için
> ücretli plana geçin.

---

## 3. Vercel — Web uygulaması

1. https://vercel.com → **Sign up** (GitHub ile).
2. **Add New… → Project** → `libertext/website` deposunu **Import** edin.
3. **Configure Project:**
   - Framework Preset: **Next.js** (otomatik algılanır).
   - Root Directory: **`./`** (kök).
   - **Build Command** (Override açın):
     ```
     pnpm db:deploy && pnpm build
     ```
     Bu, deploy sırasında migration'ları uygular sonra derler.
   - Install Command: `pnpm install` (varsayılan yeterli).
4. **Environment Variables** — şunları ekleyin (Production + Preview):

   | Key | Değer |
   |---|---|
   | `DATABASE_URL` | Neon **Pooled** string |
   | `DIRECT_DATABASE_URL` | Neon **Direct** string |
   | `REDIS_URL` | Upstash **`rediss://`** URL |
   | `AUTH_SECRET` | `openssl rand -base64 48` çıktısı |
   | `APP_ENCRYPTION_KEY` | `openssl rand -hex 32` çıktısı |
   | `NODE_ENV` | `production` |
   | `NEXT_PUBLIC_APP_NAME` | `ArticlePilot AI` |
   | `NEXT_PUBLIC_APP_URL` | `https://<projeniz>.vercel.app` |
   | `INITIAL_ADMIN_EMAIL` | kendi e-postanız (ilk süper admin) |
   | `EMAIL_PROVIDER` | `resend` (öneri) veya `console` |
   | `RESEND_API_KEY` | Resend anahtarı (email için) |
   | `OPENAI_API_KEY` | (ops.) platform anahtarı |
   | `ANTHROPIC_API_KEY` | (ops.) |
   | `GEMINI_API_KEY` | (ops.) |

   > AI anahtarları opsiyonel — hiçbiri yoksa kullanıcılar kendi anahtarlarını (BYOK)
   > Ayarlar'dan girer. `ALLOW_PRIVATE_WORDPRESS_HOSTS` **ayarlanmasın** (prod'da
   > SSRF koruması açık kalır).

5. Migration'ın **Direct** bağlantıyı kullanması için şemayı bir satır güncelleyin
   (bkz. bölüm 6 — `directUrl`). Bunu deploy'dan **önce** yapın.
6. **Deploy**'a basın. İlk derleme birkaç dakika sürer.

---

## 4. Prisma şeması — `directUrl` (bir kerelik düzenleme)

`prisma/schema.prisma` içindeki datasource bloğunu şu hale getirin ki migration'lar
Direct, sorgular Pooled bağlantıyı kullansın:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")         // pooled (runtime)
  directUrl = env("DIRECT_DATABASE_URL")  // direct (migrations)
}
```

Sonra commit + push edin; Vercel yeni deploy'u tetikler. (Bu değişikliği rehberin
sonunda otomatik ekleyebilirim — bkz. "Yardım" notu.)

---

## 5. Worker — Railway (önerilen)

Web ayakta ama üretim işleri kuyrukta bekler; onları işleyecek worker'ı ekleyelim.

1. https://railway.app → **Sign up** (GitHub).
2. **New Project → Deploy from GitHub repo** → `libertext/website`.
3. Servis açılınca **Settings**:
   - **Start Command:** `pnpm install && pnpm start:worker`
   - (Railway Nixpacks Node'u otomatik algılar; pnpm için `packageManager`
     alanı yeterli, gerekirse `corepack enable`.)
4. **Variables** → Vercel'dekiyle **aynı** şu değişkenleri ekleyin:
   `DATABASE_URL` (pooled), `DIRECT_DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`,
   `APP_ENCRYPTION_KEY`, `NODE_ENV=production`, ve varsa AI anahtarları.
   - ⚠️ `APP_ENCRYPTION_KEY` **birebir aynı** olmalı — yoksa worker, web'in
     şifrelediği kimlik bilgilerini çözemez.
5. Deploy edin. Loglarda `[worker] started; listening on generation + bulk queues`
   görmelisiniz.

> **Render alternatifi:** New → **Background Worker**, repo bağla, Start Command
> `pnpm start:worker`, aynı env değişkenleri. Render için worker "Background Worker"
> tipi seçilmeli (Web Service değil).

---

## 6. Migration + seed (ilk kurulum)

Build komutu (`pnpm db:deploy`) migration'ları uygular. Başlangıç verisini (planlar,
model registry, prompt şablonları, süper admin) **bir kez** yükleyin. Yerelinizden,
prod DATABASE_URL ile:

```bash
# .env.production.local içine Neon DIRECT string'i koyun, sonra:
DATABASE_URL="<neon-direct-url>" INITIAL_ADMIN_EMAIL="siz@ornek.com" pnpm db:seed
```

Bu; FREE/STARTER/PRO/AGENCY planlarını, AI model kataloğunu ve süper admin
kullanıcısını oluşturur. (Prod'da seed'in oluşturduğu admin şifresini hemen
değiştirin; ideali kendi e-postanızla kayıt olup `INITIAL_ADMIN_EMAIL` sayesinde
süper admin olmanız.)

---

## 7. İlk giriş + doğrulama

1. `https://<projeniz>.vercel.app` → **Kayıt ol** (`INITIAL_ADMIN_EMAIL`'deki
   e-posta ile → otomatik süper admin).
2. Onboarding → çalışma alanı oluştur.
3. **Yeni Makale** → konu gir → model seç. AI anahtarı yoksa **Mock** modelini
   seçin (çalıştığını görürsünüz) veya Ayarlar → API Anahtarları'ndan kendi
   anahtarınızı ekleyin.
4. Sağlık kontrolü: `https://<projeniz>.vercel.app/api/health` →
   `{"ok":true,"checks":{"web":true,"database":true,"redis":true}}`.

---

## 8. Özel alan adı (custom domain)

1. Vercel → Project → **Settings → Domains** → alan adınızı ekleyin.
2. Alan sağlayıcınızda gösterilen DNS kayıtlarını (A/CNAME) girin.
3. `NEXT_PUBLIC_APP_URL`'i yeni alan adına güncelleyin, yeniden deploy edin.

---

## 9. Yayın sonrası kontrol listesi

- [ ] `/api/health` → tüm kontroller `true`
- [ ] Worker logunda "started" mesajı, iş tamamlandığında "completed"
- [ ] Kayıt / giriş / makale üretimi (mock) uçtan uca çalışıyor
- [ ] `APP_ENCRYPTION_KEY` güvenli bir kasada yedeklendi
- [ ] Neon otomatik yedekleme (Point-in-time Restore) açık
- [ ] Email sağlayıcı (Resend) doğrulanmış alan adıyla ayarlı
- [ ] Upstash eviction **kapalı**
- [ ] SSRF koruması açık (`ALLOW_PRIVATE_WORDPRESS_HOSTS` tanımsız)
- [ ] Legal sayfalar hukukçuya inceletildi (`/legal/*` placeholder)

---

## Maliyet (yaklaşık, başlangıç)

| Servis | Ücretsiz katman | Ölçeklenince |
|---|---|---|
| Vercel | Hobby (kişisel) | Pro ~$20/ay |
| Neon | 0.5 GB ücretsiz | Launch ~$19/ay |
| Upstash | günlük limitli ücretsiz | Pay-as-you-go |
| Railway | $5 kredi/ay | kullanım bazlı (~$5–10) |

AI maliyeti ayrıdır (kullanıcı BYOK ise size maliyeti yok; platform anahtarı
kullanıyorsanız kredilerle yönetilir).

---

## Ek A — Worker'sız hızlı başlangıç (sadece Vercel + Neon + Upstash)

Ayrı worker kurmak istemezseniz: kod, kuyruğa ekleme başarısız olduğunda üretimi
**satır içi** (request içinde) çalıştıran bir yedeğe sahiptir (`dispatchGeneration`).
Ancak Vercel serverless fonksiyon süresi sınırlıdır:

- Hobby: ~10 sn (tek makale için **yetersiz**).
- Pro: 60 sn (tek makale genelde yeterli; toplu üretim **değil**).

Bu yüzden Ek A yalnızca demo/tek makale için uygundur. Gerçek/ölçekli kullanım için
Bölüm 5'teki worker'ı kurun.

---

## Ek B — Sorun giderme

| Belirti | Neden / Çözüm |
|---|---|
| Build'de `Can't reach database` | `pnpm db:deploy` Direct URL kullanmıyor → `directUrl` ekleyin (Bölüm 4). |
| Worker "started" ama iş işlenmiyor | `REDIS_URL` `rediss://` mi? Upstash eviction kapalı mı? |
| WordPress bağlanmıyor (prod) | SSRF koruması özel/localhost adresleri engeller — gerçek public HTTPS site gerekir. |
| Kimlik bilgisi çözülemiyor | web ve worker'da `APP_ENCRYPTION_KEY` farklı → aynılayın. |
| Migration çakışması | `pnpm prisma migrate resolve` veya Neon'da şemayı sıfırlayıp `migrate deploy`. |
