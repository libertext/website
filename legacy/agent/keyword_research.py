"""Anahtar kelime cluster üretimi."""

from __future__ import annotations

from .llm import load_prompt, parse_structured
from .models import KeywordCluster


def arastir(*, konu: str, ana_keyword: str, hedef_kitle: str) -> KeywordCluster:
    user_prompt = (
        f"Konu: {konu}\n"
        f"Ana anahtar kelime: {ana_keyword}\n"
        f"Hedef kitle: {hedef_kitle}\n\n"
        "Bu konu için kapsamlı bir Türkçe anahtar kelime cluster üret."
    )
    return parse_structured(
        system_prompt=load_prompt("keyword_research"),
        user_prompt=user_prompt,
        response_model=KeywordCluster,
        max_tokens=4096,
    )


def tum_keywordler(cluster: KeywordCluster) -> list[str]:
    """Cluster'daki tüm keyword'leri tek listede toplar."""
    sonuc = [cluster.ana_keyword]
    sonuc.extend(cluster.lsi_keywords)
    sonuc.extend(cluster.long_tail_keywords)
    sonuc.extend(cluster.soru_keywords)
    return sonuc
