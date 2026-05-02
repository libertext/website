"""Google Trends tabanlı makale başlık planlayıcısı — CLI arayüzü.

Kullanım:
  python cli_planner.py --topic "kahve makineleri"
  python cli_planner.py --topic "kahve makineleri" --pick 1
  python cli_planner.py --topic "kahve makineleri" --interactive
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.prompt import IntPrompt
from rich.table import Table

from agent.core import MakaleTalebi, calistir, kaydet
from agent.trends_planner import planla


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Google Trends tabanlı makale başlık planlayıcısı",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--topic", "--konu", dest="topic", required=True, help="Konu")
    p.add_argument(
        "--audience", "--kitle", dest="audience",
        default="genel okuyucular", help="Hedef kitle",
    )
    p.add_argument("--count", dest="count", type=int, default=12, help="Başlık sayısı (10-15)")
    p.add_argument("--geo", dest="geo", default="TR", help="Coğrafya kodu (Google Trends)")
    p.add_argument(
        "--timeframe", dest="timeframe",
        default="today 12-m", help="Zaman aralığı (Google Trends)",
    )
    p.add_argument(
        "--pick", dest="pick", type=int, default=None,
        help="N. başlığı otomatik seç ve makale üretimine geç (1-tabanlı)",
    )
    p.add_argument(
        "--interactive", dest="interactive", action="store_true",
        help="Listeyi göster, terminal'den seçim iste, sonra makale üret",
    )
    p.add_argument(
        "--length", "--uzunluk", dest="length", type=int, default=1500,
        help="Makale hedef kelime sayısı (pick/interactive modunda)",
    )
    p.add_argument(
        "--tone", "--ton", dest="tone",
        default="profesyonel ama anlaşılır", help="Yazım tonu (pick/interactive)",
    )
    p.add_argument("--author", "--yazar", dest="author", default="Editör", help="Yazar adı")
    p.add_argument(
        "--site-url", dest="site_url",
        default="https://example.com", help="Site URL",
    )
    p.add_argument("--output", "-o", dest="output", default="output", help="Çıktı klasörü")
    return p.parse_args()


def _basliklari_goster(console: Console, konu: str, oneriler) -> None:
    tablo = Table(title=f"Başlık Önerileri — '{konu}'", show_lines=False)
    tablo.add_column("#", style="bold cyan", justify="right")
    tablo.add_column("Başlık", style="bold")
    for i, b in enumerate(oneriler.basliklar, 1):
        tablo.add_row(str(i), b.baslik)
    console.print(tablo)


def _makaleyi_uret(console: Console, args, secilen) -> int:
    talep = MakaleTalebi(
        konu=secilen.baslik,
        ana_keyword=secilen.ana_keyword,
        hedef_kitle=args.audience,
        ton=args.tone,
        hedef_uzunluk=args.length,
        yazar=args.author,
        site_url=args.site_url,
    )

    console.print()
    console.print(Panel.fit(
        f"[bold]Seçilen başlık:[/] {secilen.baslik}\n"
        f"[bold]Ana keyword:[/] {secilen.ana_keyword}\n"
        f"[bold]Hedef kitle:[/] {talep.hedef_kitle}\n"
        f"[bold]Ton:[/] {talep.ton}\n"
        f"[bold]Uzunluk:[/] ~{talep.hedef_uzunluk} kelime",
        title="Makale Üretimi",
        border_style="cyan",
    ))

    def _ilerleme(adim: str, _ekstra) -> None:
        console.print(f"[cyan]→[/] {adim}...")

    def _bolum_cb(sira, toplam, bolum, _icerik) -> None:
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
    return 0


def main() -> int:
    args = parse_args()
    console = Console()

    console.print(Panel.fit(
        f"[bold]Konu:[/] {args.topic}\n"
        f"[bold]Hedef kitle:[/] {args.audience}\n"
        f"[bold]Coğrafya:[/] {args.geo}  [bold]Zaman:[/] {args.timeframe}\n"
        f"[bold]Başlık sayısı:[/] {args.count}",
        title="Başlık Planlayıcı",
        border_style="cyan",
    ))
    console.print("[cyan]→[/] Google Trends'ten veriler çekiliyor ve başlıklar üretiliyor...")

    try:
        oneriler = planla(
            konu=args.topic, hedef_kitle=args.audience, sayi=args.count,
            geo=args.geo, timeframe=args.timeframe,
        )
    except Exception as e:
        console.print(f"[bold red]Hata:[/] {e}")
        return 1

    _basliklari_goster(console, args.topic, oneriler)

    secilen = None
    if args.pick is not None:
        if not (1 <= args.pick <= len(oneriler.basliklar)):
            console.print(
                f"[bold red]Hata:[/] --pick {args.pick} aralık dışı "
                f"(1-{len(oneriler.basliklar)})."
            )
            return 1
        secilen = oneriler.basliklar[args.pick - 1]
    elif args.interactive:
        secim = IntPrompt.ask(
            "Hangi başlığı kullanalım? (numara gir, iptal için 0)",
            default=0,
            choices=[str(i) for i in range(0, len(oneriler.basliklar) + 1)],
            show_choices=False,
        )
        if secim == 0:
            console.print("[yellow]İptal edildi.[/]")
            return 0
        secilen = oneriler.basliklar[secim - 1]

    if secilen is not None:
        return _makaleyi_uret(console, args, secilen)

    return 0


if __name__ == "__main__":
    sys.exit(main())
