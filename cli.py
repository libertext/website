"""SEO uyumlu makale üretim agent'ı — CLI arayüzü."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from agent.core import MakaleTalebi, calistir, kaydet


ADIM_ETIKETLERI = {
    "keyword_research": "Anahtar kelime araştırması",
    "outline": "Outline oluşturma",
    "content": "İçerik üretimi (bölüm bölüm)",
    "seo_meta": "SEO meta veri",
    "links": "İç/dış link önerileri",
    "schema": "Schema.org JSON-LD",
    "kalite": "Kalite raporu",
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="SEO uyumlu Türkçe makale üretim agent'ı",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--topic", "--konu", dest="topic", required=True, help="Makale konusu")
    p.add_argument("--keyword", "--anahtar", dest="keyword", required=True, help="Ana anahtar kelime")
    p.add_argument("--audience", "--kitle", dest="audience", default="genel okuyucular", help="Hedef kitle")
    p.add_argument("--tone", "--ton", dest="tone", default="profesyonel ama anlaşılır", help="Yazım tonu")
    p.add_argument("--length", "--uzunluk", dest="length", type=int, default=1500, help="Hedef kelime sayısı")
    p.add_argument("--author", "--yazar", dest="author", default="Editör", help="Yazar adı (schema için)")
    p.add_argument("--site-url", dest="site_url", default="https://example.com", help="Site URL (schema için)")
    p.add_argument("--output", "-o", dest="output", default="output", help="Çıktı klasörü")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    console = Console()

    talep = MakaleTalebi(
        konu=args.topic,
        ana_keyword=args.keyword,
        hedef_kitle=args.audience,
        ton=args.tone,
        hedef_uzunluk=args.length,
        yazar=args.author,
        site_url=args.site_url,
    )

    console.print(Panel.fit(
        f"[bold]Konu:[/] {talep.konu}\n"
        f"[bold]Ana keyword:[/] {talep.ana_keyword}\n"
        f"[bold]Hedef kitle:[/] {talep.hedef_kitle}\n"
        f"[bold]Ton:[/] {talep.ton}\n"
        f"[bold]Uzunluk:[/] ~{talep.hedef_uzunluk} kelime",
        title="SEO Makale Agent'ı",
        border_style="cyan",
    ))

    def _ilerleme(adim: str, _ekstra) -> None:
        etiket = ADIM_ETIKETLERI.get(adim, adim)
        console.print(f"[cyan]→[/] {etiket}...")

    def _bolum_cb(sira: int, toplam: int, bolum, _icerik) -> None:
        console.print(f"  [green]✓[/] [{sira}/{toplam}] {bolum.baslik}")

    try:
        sonuc = calistir(talep, ilerleme=_ilerleme, bolum_callback=_bolum_cb)
    except Exception as e:
        console.print(f"[bold red]Hata:[/] {e}")
        return 1

    md_yolu, meta_yolu = kaydet(sonuc, output_dir=Path(args.output))

    console.print()
    console.print(Panel.fit(
        f"[bold green]Makale üretildi![/]\n\n"
        f"Markdown: [cyan]{md_yolu}[/]\n"
        f"Meta JSON: [cyan]{meta_yolu}[/]",
        border_style="green",
    ))

    tablo = Table(title="Kalite Raporu", show_lines=False)
    tablo.add_column("Metrik", style="bold")
    tablo.add_column("Değer")
    tablo.add_row("Toplam kelime", str(sonuc.kalite.toplam_kelime))
    tablo.add_row("H2 bölüm sayısı", str(sonuc.kalite.toplam_h2))
    tablo.add_row(
        "Okunabilirlik (Ateşman)",
        f"{sonuc.kalite.okunabilirlik['skor']} ({sonuc.kalite.okunabilirlik['seviye']})",
    )
    tablo.add_row(
        "SEO title uzunluğu",
        f"{sonuc.kalite.title_uzunluk} kar.",
    )
    tablo.add_row(
        "Meta description uzunluğu",
        f"{sonuc.kalite.meta_description_uzunluk} kar.",
    )
    console.print(tablo)

    yog_tablo = Table(title="Anahtar Kelime Yoğunluğu", show_lines=False)
    yog_tablo.add_column("Keyword", style="bold")
    yog_tablo.add_column("Geçiş")
    yog_tablo.add_column("Yoğunluk")
    yog_tablo.add_column("Durum")
    for r in sonuc.kalite.keyword_yogunluk:
        renk = {"ideal": "green", "düşük": "yellow", "yüksek": "red"}.get(r["durum"], "white")
        yog_tablo.add_row(
            r["keyword"], str(r["gecis"]), f"%{r['yogunluk']}", f"[{renk}]{r['durum']}[/]"
        )
    console.print(yog_tablo)

    if sonuc.kalite.uyarilar:
        console.print()
        console.print(Panel(
            "\n".join(f"• {u}" for u in sonuc.kalite.uyarilar),
            title="[yellow]Uyarılar[/]",
            border_style="yellow",
        ))

    return 0


if __name__ == "__main__":
    sys.exit(main())
