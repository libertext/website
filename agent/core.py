"""Pipeline orchestrator: tüm adımları sırayla çalıştırır."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable

import yaml

from . import (
    content_generator,
    keyword_density,
    keyword_research,
    link_suggester,
    outline_generator,
    readability,
    schema_generator,
    seo_optimizer,
)
from .models import KeywordCluster, LinkOnerileri, Outline, OutlineH2, SEOMeta


@dataclass
class MakaleTalebi:
    konu: str
    ana_keyword: str
    hedef_kitle: str = "genel okuyucular"
    ton: str = "profesyonel ama anlaşılır"
    hedef_uzunluk: int = 1500
    yazar: str = "Editör"
    site_url: str = "https://example.com"


@dataclass
class KaliteRaporu:
    okunabilirlik: dict
    keyword_yogunluk: list[dict]
    title_uzunluk: int
    meta_description_uzunluk: int
    toplam_kelime: int
    toplam_h2: int
    uyarilar: list[str] = field(default_factory=list)


@dataclass
class MakaleSonucu:
    talep: MakaleTalebi
    cluster: KeywordCluster
    outline: Outline
    icerik_md: str
    seo_meta: SEOMeta
    linkler: LinkOnerileri
    schema_jsonld: dict
    kalite: KaliteRaporu

    def markdown_dosyasi(self) -> str:
        """Frontmatter'lı markdown çıktısı üretir."""
        frontmatter = {
            "title": self.seo_meta.seo_title,
            "description": self.seo_meta.meta_description,
            "slug": self.seo_meta.url_slug,
            "author": self.talep.yazar,
            "keywords": [self.cluster.ana_keyword] + self.cluster.lsi_keywords[:5],
            "lang": "tr-TR",
        }
        fm_yaml = yaml.safe_dump(frontmatter, allow_unicode=True, sort_keys=False).strip()
        return f"---\n{fm_yaml}\n---\n\n{self.icerik_md}"

    def meta_dosyasi(self) -> dict:
        """JSON çıktı için meta veri sözlüğü."""
        return {
            "talep": asdict(self.talep),
            "keyword_cluster": self.cluster.model_dump(),
            "outline": self.outline.model_dump(),
            "seo_meta": self.seo_meta.model_dump(),
            "linkler": self.linkler.model_dump(),
            "schema_jsonld": self.schema_jsonld,
            "kalite_raporu": {
                **asdict(self.kalite),
            },
        }


def _kalite_hesapla(
    *,
    icerik_md: str,
    cluster: KeywordCluster,
    seo_meta: SEOMeta,
    outline: Outline,
) -> KaliteRaporu:
    okunabilirlik = readability.hesapla(icerik_md)
    keyword_listesi = [cluster.ana_keyword] + cluster.lsi_keywords[:5] + cluster.long_tail_keywords[:3]
    yogunluklar = keyword_density.analiz_et(icerik_md, keyword_listesi)

    uyarilar: list[str] = []
    if not (50 <= len(seo_meta.seo_title) <= 60):
        uyarilar.append(
            f"SEO title {len(seo_meta.seo_title)} karakter — ideal 50-60 aralığı dışında."
        )
    if not (140 <= len(seo_meta.meta_description) <= 155):
        uyarilar.append(
            f"Meta description {len(seo_meta.meta_description)} karakter — ideal 140-155 aralığı dışında."
        )
    if okunabilirlik.skor < 50:
        uyarilar.append(f"Okunabilirlik skoru düşük ({okunabilirlik.skor}) — cümleleri kısaltmayı düşün.")
    ana_kw_durumu = next(
        (r for r in yogunluklar if r.keyword.lower() == cluster.ana_keyword.lower()), None
    )
    if ana_kw_durumu and ana_kw_durumu.durum == "düşük":
        uyarilar.append(
            f"Ana anahtar kelime yoğunluğu düşük (%{ana_kw_durumu.yogunluk}) — birkaç ek geçiş eklenebilir."
        )
    if ana_kw_durumu and ana_kw_durumu.durum == "yüksek":
        uyarilar.append(
            f"Ana anahtar kelime yoğunluğu yüksek (%{ana_kw_durumu.yogunluk}) — keyword stuffing riski."
        )

    return KaliteRaporu(
        okunabilirlik={
            "skor": okunabilirlik.skor,
            "seviye": okunabilirlik.seviye,
            "ort_kelime_uzunlugu": okunabilirlik.ort_kelime_uzunlugu,
            "ort_cumle_uzunlugu": okunabilirlik.ort_cumle_uzunlugu,
        },
        keyword_yogunluk=[
            {"keyword": r.keyword, "gecis": r.gecis_sayisi, "yogunluk": r.yogunluk, "durum": r.durum}
            for r in yogunluklar
        ],
        title_uzunluk=len(seo_meta.seo_title),
        meta_description_uzunluk=len(seo_meta.meta_description),
        toplam_kelime=okunabilirlik.toplam_kelime,
        toplam_h2=len(outline.h2_bolumleri),
        uyarilar=uyarilar,
    )


def calistir(
    talep: MakaleTalebi,
    *,
    ilerleme: Callable[[str, dict | None], None] | None = None,
    bolum_callback: Callable[[int, int, OutlineH2, str], None] | None = None,
) -> MakaleSonucu:
    """Tüm pipeline'ı çalıştırır.

    ilerleme(adim, ekstra): her adım başlangıcında çağrılır.
    bolum_callback: her bölüm üretildiğinde çağrılır (sira, toplam, bolum, icerik).
    """
    def _ilerle(adim: str, ekstra: dict | None = None) -> None:
        if ilerleme:
            ilerleme(adim, ekstra)

    _ilerle("keyword_research", None)
    cluster = keyword_research.arastir(
        konu=talep.konu, ana_keyword=talep.ana_keyword, hedef_kitle=talep.hedef_kitle,
    )

    _ilerle("outline", {"keyword_cluster": cluster.model_dump()})
    outline = outline_generator.uret(
        konu=talep.konu, cluster=cluster, hedef_kitle=talep.hedef_kitle,
        ton=talep.ton, hedef_uzunluk=talep.hedef_uzunluk,
    )

    _ilerle("content", {"outline": outline.model_dump()})
    icerik_md = content_generator.tum_makaleyi_uret(
        konu=talep.konu, cluster=cluster, outline=outline,
        ton=talep.ton, hedef_kitle=talep.hedef_kitle,
        bolum_callback=bolum_callback,
    )

    _ilerle("seo_meta", None)
    seo_meta = seo_optimizer.uret(
        konu=talep.konu, cluster=cluster, outline=outline, icerik_ozeti=icerik_md,
    )

    _ilerle("links", None)
    linkler = link_suggester.uret(konu=talep.konu, cluster=cluster, outline=outline)

    _ilerle("schema", None)
    schema_jsonld = schema_generator.blog_posting(
        outline=outline, seo_meta=seo_meta, yazar=talep.yazar, site_url=talep.site_url,
    )

    _ilerle("kalite", None)
    kalite = _kalite_hesapla(
        icerik_md=icerik_md, cluster=cluster, seo_meta=seo_meta, outline=outline,
    )

    return MakaleSonucu(
        talep=talep, cluster=cluster, outline=outline, icerik_md=icerik_md,
        seo_meta=seo_meta, linkler=linkler, schema_jsonld=schema_jsonld, kalite=kalite,
    )


def kaydet(sonuc: MakaleSonucu, output_dir: Path | str = "output") -> tuple[Path, Path]:
    """Sonuçları markdown + JSON olarak diske yazar."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    slug = sonuc.seo_meta.url_slug
    md_yolu = output_dir / f"{slug}.md"
    meta_yolu = output_dir / f"{slug}.meta.json"
    md_yolu.write_text(sonuc.markdown_dosyasi(), encoding="utf-8")
    meta_yolu.write_text(
        json.dumps(sonuc.meta_dosyasi(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return md_yolu, meta_yolu
