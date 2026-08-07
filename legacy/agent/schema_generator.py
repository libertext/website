"""Schema.org JSON-LD üretimi (BlogPosting). Deterministik, LLM gerektirmez."""

from __future__ import annotations

from datetime import date

from .models import Outline, SEOMeta


def blog_posting(
    *,
    outline: Outline,
    seo_meta: SEOMeta,
    yazar: str = "Editör",
    yayin_tarihi: str | None = None,
    site_url: str = "https://example.com",
) -> dict:
    """Google Rich Results uyumlu BlogPosting JSON-LD üretir."""
    yayin_tarihi = yayin_tarihi or date.today().isoformat()
    url = f"{site_url.rstrip('/')}/{seo_meta.url_slug}"
    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": outline.h1_baslik,
        "description": seo_meta.meta_description,
        "url": url,
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "author": {"@type": "Person", "name": yazar},
        "publisher": {"@type": "Organization", "name": yazar},
        "datePublished": yayin_tarihi,
        "dateModified": yayin_tarihi,
        "inLanguage": "tr-TR",
        "articleSection": [b.baslik for b in outline.h2_bolumleri],
    }
