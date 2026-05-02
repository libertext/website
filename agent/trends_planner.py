"""Google Trends tabanlı makale başlık planlayıcısı.

Konu verilir → pytrends ile gerçek Google Trends verisi (TR) çekilir →
Claude bu veriden ilhamla 10-15 SEO uyumlu makale başlığı önerir.
"""

from __future__ import annotations

import json
import time

from .llm import load_prompt, parse_structured
from .models import BaslikOnerileri


def _pytrends_client(geo: str):
    from pytrends.request import TrendReq

    hl = "tr-TR" if geo == "TR" else "en-US"
    return TrendReq(hl=hl, tz=180)


def cek_trends(
    konu: str, geo: str = "TR", timeframe: str = "today 12-m"
) -> dict:
    """Gerçek Google Trends verisi çeker.

    Döndürür: {
        "related_top": [...], "related_rising": [...], "suggestions": [...]
    }
    Hata / boş veri / rate-limit durumunda boş dict döner (fallback için).
    """
    backoff = 2
    for deneme in range(3):
        try:
            py = _pytrends_client(geo)
            py.build_payload([konu], geo=geo, timeframe=timeframe)

            related = py.related_queries() or {}
            konu_data = related.get(konu) or {}

            top_df = konu_data.get("top")
            rising_df = konu_data.get("rising")

            top = (
                top_df["query"].head(15).tolist()
                if top_df is not None and not top_df.empty
                else []
            )
            rising = (
                rising_df["query"].head(15).tolist()
                if rising_df is not None and not rising_df.empty
                else []
            )

            try:
                suggestions_raw = py.suggestions(keyword=konu) or []
                suggestions = [
                    s.get("title", "") for s in suggestions_raw if s.get("title")
                ][:10]
            except Exception:
                suggestions = []

            if not (top or rising or suggestions):
                return {}

            return {
                "related_top": top,
                "related_rising": rising,
                "suggestions": suggestions,
            }
        except Exception as e:
            mesaj = str(e).lower()
            if "429" in mesaj or "too many" in mesaj or "rate" in mesaj:
                if deneme < 2:
                    time.sleep(backoff)
                    backoff *= 2
                    continue
            return {}
    return {}


def planla(
    konu: str,
    hedef_kitle: str = "genel okuyucular",
    sayi: int = 12,
    geo: str = "TR",
    timeframe: str = "today 12-m",
) -> BaslikOnerileri:
    """Konu için trend verisini çeker ve Claude'dan başlık önerileri ister."""
    sayi = max(10, min(15, sayi))
    trends = cek_trends(konu, geo=geo, timeframe=timeframe)

    if trends:
        trends_blok = json.dumps(trends, ensure_ascii=False, indent=2)
        trends_aciklamasi = (
            f"Aşağıda Google Trends'ten ({geo}, {timeframe}) çekilmiş gerçek veri var:\n\n"
            f"{trends_blok}\n\n"
        )
    else:
        trends_aciklamasi = (
            "Not: Bu konu için Google Trends verisi alınamadı (boş döndü veya "
            "rate-limit). Sadece konu ve hedef kitle bilgisinden başlık üret.\n\n"
        )

    user_prompt = (
        f"Konu: {konu}\n"
        f"Hedef kitle: {hedef_kitle}\n"
        f"İstenen başlık sayısı: {sayi}\n\n"
        f"{trends_aciklamasi}"
        f"Bu girdilerden ilham alarak {sayi} adet SEO uyumlu Türkçe makale başlığı öner. "
        "Her başlık için pipeline'a aktarılabilecek doğal bir ana_keyword belirt."
    )

    return parse_structured(
        system_prompt=load_prompt("trends_planner"),
        user_prompt=user_prompt,
        response_model=BaslikOnerileri,
        max_tokens=4096,
    )
