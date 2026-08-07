"""Anahtar kelime yoğunluk analizi."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

from .readability import KELIME, metni_temizle


@dataclass
class KeywordRaporu:
    keyword: str
    gecis_sayisi: int
    yogunluk: float  # %
    durum: str  # "düşük", "ideal", "yüksek"


def _normalize(s: str) -> str:
    s = s.lower()
    s = (
        s.replace("ı", "i")
        .replace("ş", "s")
        .replace("ç", "c")
        .replace("ö", "o")
        .replace("ü", "u")
        .replace("ğ", "g")
    )
    return s


def _kelime_listesi(metin: str) -> list[str]:
    temiz = metni_temizle(metin)
    return [_normalize(k) for k in KELIME.findall(temiz)]


def _gecis_say(metin_kelimeleri: list[str], keyword: str) -> int:
    parcalar = [_normalize(p) for p in keyword.split()]
    if not parcalar:
        return 0
    n = len(parcalar)
    sayim = 0
    for i in range(len(metin_kelimeleri) - n + 1):
        if metin_kelimeleri[i : i + n] == parcalar:
            sayim += 1
    return sayim


def _durum(yogunluk: float) -> str:
    if yogunluk < 0.5:
        return "düşük"
    if yogunluk <= 2.5:
        return "ideal"
    return "yüksek"


def analiz_et(metin: str, keywordler: Iterable[str]) -> list[KeywordRaporu]:
    kelimeler = _kelime_listesi(metin)
    toplam = max(len(kelimeler), 1)
    raporlar: list[KeywordRaporu] = []
    for kw in keywordler:
        kw = kw.strip()
        if not kw:
            continue
        gecis = _gecis_say(kelimeler, kw)
        # çok-kelimeli ise: gecis sayısı * kelime sayısı
        kelime_agirligi = len(kw.split())
        yogunluk = round((gecis * kelime_agirligi / toplam) * 100, 2)
        raporlar.append(
            KeywordRaporu(
                keyword=kw,
                gecis_sayisi=gecis,
                yogunluk=yogunluk,
                durum=_durum(yogunluk),
            )
        )
    return raporlar
