"""İç ve dış link önerileri."""

from __future__ import annotations

from .llm import load_prompt, parse_structured
from .models import KeywordCluster, LinkOnerileri, Outline


def uret(
    *,
    konu: str,
    cluster: KeywordCluster,
    outline: Outline,
) -> LinkOnerileri:
    bolum_basliklari = "\n".join(f"- {b.baslik}" for b in outline.h2_bolumleri)
    user_prompt = (
        f"Konu: {konu}\n"
        f"Ana keyword: {cluster.ana_keyword}\n"
        f"İlgili keyword'ler: {', '.join(cluster.lsi_keywords[:5] + cluster.long_tail_keywords[:3])}\n"
        f"Makale H1: {outline.h1_baslik}\n"
        f"Bölüm başlıkları:\n{bolum_basliklari}\n\n"
        "Bu makale için 3-5 iç link ve 2-3 dış link önerisi oluştur."
    )
    return parse_structured(
        system_prompt=load_prompt("links"),
        user_prompt=user_prompt,
        response_model=LinkOnerileri,
        max_tokens=2048,
    )
