"""SEO uyumlu makale outline'ı üretimi."""

from __future__ import annotations

from .llm import load_prompt, parse_structured
from .models import KeywordCluster, Outline


def uret(
    *,
    konu: str,
    cluster: KeywordCluster,
    hedef_kitle: str,
    ton: str,
    hedef_uzunluk: int,
) -> Outline:
    keyword_listesi = "\n".join(
        [
            f"- Ana: {cluster.ana_keyword}",
            "- LSI: " + ", ".join(cluster.lsi_keywords),
            "- Long-tail: " + ", ".join(cluster.long_tail_keywords),
            "- Soru bazlı: " + ", ".join(cluster.soru_keywords),
            f"- Search intent: {cluster.search_intent}",
        ]
    )
    user_prompt = (
        f"Konu: {konu}\n"
        f"Hedef kitle: {hedef_kitle}\n"
        f"Ton: {ton}\n"
        f"Hedef toplam kelime sayısı: {hedef_uzunluk}\n\n"
        f"Anahtar kelime cluster:\n{keyword_listesi}\n\n"
        "Bu konu için SEO uyumlu bir Türkçe makale outline'ı oluştur. "
        "H2 bölümleri için kelime sayılarını dengeli dağıt; toplamı hedef uzunluğa yakın olmalı."
    )
    return parse_structured(
        system_prompt=load_prompt("outline"),
        user_prompt=user_prompt,
        response_model=Outline,
        max_tokens=4096,
    )
