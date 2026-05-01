"""Bölüm bazlı içerik üretimi (streaming)."""

from __future__ import annotations

from typing import Callable, Iterator

from .llm import generate_text, load_prompt, stream_text
from .models import KeywordCluster, Outline, OutlineH2


def _bolum_promptu(
    *,
    konu: str,
    cluster: KeywordCluster,
    bolum: OutlineH2,
    ton: str,
    hedef_kitle: str,
    sira: int,
    toplam: int,
) -> str:
    h3_satirlari = "\n".join(
        f"  - {h3.baslik} (amaç: {h3.amac})" for h3 in bolum.h3_alt_basliklar
    )
    cluster_metni = (
        f"Ana: {cluster.ana_keyword} | "
        f"LSI: {', '.join(cluster.lsi_keywords[:6])} | "
        f"Long-tail: {', '.join(cluster.long_tail_keywords[:4])}"
    )
    return (
        f"Konu (genel): {konu}\n"
        f"Bölüm sırası: {sira}/{toplam}\n"
        f"Bölüm başlığı: {bolum.baslik}\n"
        f"Bölümün amacı: {bolum.amac}\n"
        f"Hedef kelime sayısı: {bolum.hedef_kelime_sayisi}\n"
        f"H3 alt başlıklar:\n{h3_satirlari or '  (yok)'}\n"
        f"Kullanılabilir keyword'ler: {cluster_metni}\n"
        f"Ton: {ton}\n"
        f"Hedef kitle: {hedef_kitle}\n\n"
        "Bu bölüm için içeriği markdown formatında üret. "
        "H3 alt başlıkları varsa onları '### ' ile başlat. "
        "Bölümün ana başlığını (H2) tekrar yazma — orchestrator ekleyecek. "
        "İçeriği doğrudan paragraflarla başlat."
    )


def bolum_uret(
    *,
    konu: str,
    cluster: KeywordCluster,
    bolum: OutlineH2,
    ton: str,
    hedef_kitle: str,
    sira: int,
    toplam: int,
) -> str:
    """Tek bölümün tüm içeriğini blocking olarak üretir."""
    user_prompt = _bolum_promptu(
        konu=konu, cluster=cluster, bolum=bolum, ton=ton,
        hedef_kitle=hedef_kitle, sira=sira, toplam=toplam,
    )
    # Hedef kelime sayısına göre token limitini ayarla (~ 1.5 token/kelime)
    max_tokens = max(2048, int(bolum.hedef_kelime_sayisi * 2.2))
    return generate_text(
        system_prompt=load_prompt("content"),
        user_prompt=user_prompt,
        max_tokens=max_tokens,
    )


def bolum_stream(
    *,
    konu: str,
    cluster: KeywordCluster,
    bolum: OutlineH2,
    ton: str,
    hedef_kitle: str,
    sira: int,
    toplam: int,
) -> Iterator[str]:
    """Tek bölümün içeriğini token token streaming üretir."""
    user_prompt = _bolum_promptu(
        konu=konu, cluster=cluster, bolum=bolum, ton=ton,
        hedef_kitle=hedef_kitle, sira=sira, toplam=toplam,
    )
    max_tokens = max(2048, int(bolum.hedef_kelime_sayisi * 2.2))
    yield from stream_text(
        system_prompt=load_prompt("content"),
        user_prompt=user_prompt,
        max_tokens=max_tokens,
    )


def tum_makaleyi_uret(
    *,
    konu: str,
    cluster: KeywordCluster,
    outline: Outline,
    ton: str,
    hedef_kitle: str,
    bolum_callback: Callable[[int, int, OutlineH2, str], None] | None = None,
) -> str:
    """Tüm makaleyi bölüm bölüm üretir, başlıklarla birlikte birleştirir.

    bolum_callback: ilerleme bildirmek için (sira, toplam, bolum, icerik).
    """
    parcalar = [f"# {outline.h1_baslik}\n"]
    toplam = len(outline.h2_bolumleri)
    for i, bolum in enumerate(outline.h2_bolumleri, 1):
        icerik = bolum_uret(
            konu=konu, cluster=cluster, bolum=bolum, ton=ton,
            hedef_kitle=hedef_kitle, sira=i, toplam=toplam,
        )
        parcalar.append(f"\n## {bolum.baslik}\n\n{icerik.strip()}\n")
        if bolum_callback:
            bolum_callback(i, toplam, bolum, icerik)
    return "".join(parcalar)
