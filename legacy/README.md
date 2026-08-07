# SEO Uyumlu Makale Üretim Agent'ı

Türkçe SEO odaklı, çok-aşamalı (multi-step) makale üretim agent'ı. Anthropic Claude API ile çalışır. Hem CLI hem de Streamlit web arayüzü ile kullanılabilir.

## Özellikler

- **Anahtar kelime araştırması**: Verilen ana keyword için LSI, long-tail ve soru bazlı keyword önerileri
- **SEO uyumlu outline**: H1 + H2/H3 hiyerarşisi (search intent'e göre)
- **Doğal Türkçe içerik**: Anahtar kelimeleri organik kullanır, keyword stuffing yapmaz
- **Meta veri**: SEO title (≤60 kar.), meta description (≤155 kar.), URL slug
- **Görsel önerileri**: Her bölüm için alt text + image prompt
- **İç/dış link önerileri**: 3-5 internal, 2-3 external otoriter link
- **Schema.org JSON-LD**: BlogPosting markup (Google Rich Results uyumlu)
- **Kalite raporu**: Türkçe Ateşman okunabilirlik skoru, anahtar kelime yoğunluğu analizi
- **Prompt caching**: Maliyet düşürmek için sistem prompt'ları cache'lenir

## Kurulum

```bash
git clone <repo>
cd website
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env içine ANTHROPIC_API_KEY değerini gir
```

## Kullanım

### CLI

```bash
python cli.py \
  --topic "Yapay zeka ile içerik üretimi" \
  --keyword "yapay zeka içerik" \
  --audience "dijital pazarlamacılar" \
  --tone "profesyonel" \
  --length 1500
```

Çıktılar `output/` klasörüne yazılır:
- `output/{slug}.md` — frontmatter + içerik
- `output/{slug}.meta.json` — SEO meta + schema + kalite raporu

### Web UI (Streamlit)

```bash
streamlit run app.py
```

Tarayıcıdan formu doldur, "Üret" tuşuna bas. Sonuçlar sekmeli görünümde gösterilir, indirilebilir.

## Pipeline

1. **Keyword Research** — LSI/long-tail/soru bazlı keyword'ler üretilir
2. **Outline** — SEO başlık + H2/H3 yapısı
3. **Content** — Bölüm bazlı doğal Türkçe içerik
4. **SEO Meta** — Title, description, slug, alt text
5. **Links** — İç/dış link önerileri
6. **Schema** — Schema.org JSON-LD (BlogPosting)
7. **Quality Report** — Okunabilirlik + keyword density

## Yapı

```
agent/
├── core.py                 # Pipeline orchestrator
├── keyword_research.py
├── outline_generator.py
├── content_generator.py
├── seo_optimizer.py
├── link_suggester.py
├── schema_generator.py
├── readability.py          # Türkçe Ateşman
├── keyword_density.py
└── prompts/                # Sistem prompt'ları
cli.py                      # CLI arayüzü
app.py                      # Streamlit web UI
```

## Notlar

- Varsayılan model: `claude-sonnet-4-6`. `.env` üzerinden değiştirilebilir.
- Sistem prompt'ları cache'lenir (cache_control). Çok-bölümlü makalelerde maliyet ~%50-90 düşer.
- Türkçe Ateşman formülü: `198.825 - (40.175 * ortHeceSayısı) - (2.610 * ortKelimeSayısı)`
