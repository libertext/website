"""SEO meta veri üretimi (title, description, slug, alt texts)."""

from __future__ import annotations

from slugify import slugify

from .llm import load_prompt, parse_structured
from .models import KeywordCluster, Outline, SEOMeta


def uret(
    *,
    konu: str,
    cluster: KeywordCluster,
    outline: Outline,
    icerik_ozeti: str,
) -> SEOMeta:
    bolum_basliklari = "\n".join(f"- {b.baslik}" for b in outline.h2_bolumleri)
    user_prompt = (
        f"Konu: {konu}\n"
        f"Ana keyword: {cluster.ana_keyword}\n"
        f"LSI keyword'ler: {', '.join(cluster.lsi_keywords[:5])}\n"
        f"Makale H1: {outline.h1_baslik}\n"
        f"Bölüm başlıkları:\n{bolum_basliklari}\n\n"
        f"Makalenin kısa özeti:\n{icerik_ozeti[:1500]}\n\n"
        "Bu makale için SEO meta verileri üret. Her H2 bölümü için bir görsel önerisi (alt text + image prompt) oluştur."
    )
    meta = parse_structured(
        system_prompt=load_prompt("seo_meta"),
        user_prompt=user_prompt,
        response_model=SEOMeta,
        max_tokens=4096,
    )
    # Slug'ı garantiye al: LLM tutmadıysa python-slugify ile yeniden üret.
    if not meta.url_slug or " " in meta.url_slug or any(c.isupper() for c in meta.url_slug):
        meta.url_slug = slugify(meta.url_slug or outline.h1_baslik, max_length=60, word_boundary=True)
    return meta
