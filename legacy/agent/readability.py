"""Türkçe Ateşman okunabilirlik skoru.

Formül (Ateşman, 1997):
    Skor = 198.825 - (40.175 * ortHece) - (2.610 * ortKelime)

ortHece = toplam hece / toplam kelime
ortKelime = toplam kelime / toplam cümle

Türkçe'de hece sayısı yaklaşık olarak ünlü harf sayısına eşittir.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

TURKCE_UNLULER = set("aeıioöuüAEIİOÖUÜ")
CUMLE_SONU = re.compile(r"[.!?…]+")
KELIME = re.compile(r"[A-Za-zÇĞİıÖŞÜçğıöşü]+")


def hece_say(kelime: str) -> int:
    """Türkçe kelimedeki hece sayısı = ünlü harf sayısı (yaklaşık)."""
    return sum(1 for ch in kelime if ch in TURKCE_UNLULER) or 1


def metni_temizle(metin: str) -> str:
    """Markdown sentaks işaretlerini metinden çıkarır."""
    metin = re.sub(r"```.*?```", " ", metin, flags=re.DOTALL)
    metin = re.sub(r"`[^`]*`", " ", metin)
    metin = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", metin)
    metin = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", metin)
    metin = re.sub(r"^#+\s+", "", metin, flags=re.MULTILINE)
    metin = re.sub(r"[*_>#~|-]+", " ", metin)
    return metin


@dataclass
class OkunabilirlikRaporu:
    skor: float
    seviye: str
    toplam_kelime: int
    toplam_cumle: int
    toplam_hece: int
    ort_kelime_uzunlugu: float
    ort_cumle_uzunlugu: float


def seviye_belirle(skor: float) -> str:
    if skor >= 90:
        return "çok kolay"
    if skor >= 70:
        return "kolay"
    if skor >= 50:
        return "orta"
    if skor >= 30:
        return "zor"
    return "çok zor"


def hesapla(metin: str) -> OkunabilirlikRaporu:
    temiz = metni_temizle(metin)
    cumleler = [c for c in CUMLE_SONU.split(temiz) if c.strip()]
    kelimeler = KELIME.findall(temiz)

    toplam_cumle = max(len(cumleler), 1)
    toplam_kelime = max(len(kelimeler), 1)
    toplam_hece = sum(hece_say(k) for k in kelimeler)

    ort_hece = toplam_hece / toplam_kelime
    ort_kelime = toplam_kelime / toplam_cumle

    skor = 198.825 - (40.175 * ort_hece) - (2.610 * ort_kelime)
    skor = max(0.0, min(100.0, round(skor, 2)))

    return OkunabilirlikRaporu(
        skor=skor,
        seviye=seviye_belirle(skor),
        toplam_kelime=toplam_kelime,
        toplam_cumle=toplam_cumle,
        toplam_hece=toplam_hece,
        ort_kelime_uzunlugu=round(ort_hece, 2),
        ort_cumle_uzunlugu=round(ort_kelime, 2),
    )
