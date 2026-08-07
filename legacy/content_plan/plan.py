#!/usr/bin/env python3
"""YouTube video planlama CLI'si.

Videoları `videos.yaml` içinde tutar. Komutlar:

  python content_plan/plan.py liste [--durum fikir]
  python content_plan/plan.py ekle --baslik "..." [--konu "..."] [--tarih 2026-07-01] [--durum fikir] [--etiketler "a,b"]
  python content_plan/plan.py durum <id> <yeni_durum>
  python content_plan/plan.py guncelle <id> [--baslik ...] [--konu ...] [--tarih ...] [--etiketler "a,b"]
  python content_plan/plan.py sil <id>
  python content_plan/plan.py takvim          # PLAN.md dosyasını üretir

Sıfır harici bağımlılık (pyyaml + rich zaten projede mevcut).
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, datetime
from pathlib import Path

import yaml
from rich.console import Console
from rich.table import Table

KLASOR = Path(__file__).resolve().parent
VERI = KLASOR / "videos.yaml"
PLAN_MD = KLASOR / "PLAN.md"

# Durumlar üretim sırasına göre. İlerledikçe video bir sonraki duruma geçer.
DURUMLAR = ["fikir", "senaryo", "cekim", "kurgu", "zamanlandi", "yayinda"]
DURUM_ETIKET = {
    "fikir": "💡 Fikir",
    "senaryo": "📝 Senaryo",
    "cekim": "🎬 Çekim",
    "kurgu": "✂️ Kurgu",
    "zamanlandi": "⏰ Zamanlandı",
    "yayinda": "✅ Yayında",
}

console = Console()


def yukle() -> list[dict]:
    if not VERI.exists():
        return []
    data = yaml.safe_load(VERI.read_text(encoding="utf-8")) or {}
    return data.get("videolar", []) or []


def kaydet(videolar: list[dict]) -> None:
    VERI.write_text(
        yaml.safe_dump(
            {"videolar": videolar},
            allow_unicode=True,
            sort_keys=False,
            default_flow_style=False,
        ),
        encoding="utf-8",
    )


def yeni_id(videolar: list[dict]) -> int:
    return max((v.get("id", 0) for v in videolar), default=0) + 1


def tarih_anahtari(v: dict):
    """Tarihe göre sıralama anahtarı; tarihsizler en sona."""
    t = v.get("yayin_tarihi")
    if isinstance(t, date):
        return (0, t.isoformat())
    if isinstance(t, str) and t.strip():
        return (0, t.strip())
    return (1, "")


def etiket_listesi(ham: str) -> list[str]:
    return [e.strip() for e in ham.split(",") if e.strip()]


def tarih_metni(v: dict) -> str:
    t = v.get("yayin_tarihi")
    if isinstance(t, date):
        return t.isoformat()
    return str(t) if t else "—"


# ---- Komutlar ---------------------------------------------------------------


def cmd_liste(args) -> None:
    videolar = sorted(yukle(), key=tarih_anahtari)
    if args.durum:
        videolar = [v for v in videolar if v.get("durum") == args.durum]
    if not videolar:
        console.print("[yellow]Henüz video yok. 'ekle' komutuyla başla.[/]")
        return

    tablo = Table(title="🎥 YouTube Video Planı", show_lines=False)
    tablo.add_column("ID", justify="right", style="dim")
    tablo.add_column("Tarih", style="cyan")
    tablo.add_column("Durum")
    tablo.add_column("Başlık", style="bold")
    tablo.add_column("Etiketler", style="magenta")

    for v in videolar:
        tablo.add_row(
            str(v.get("id", "")),
            tarih_metni(v),
            DURUM_ETIKET.get(v.get("durum", ""), v.get("durum", "")),
            v.get("baslik", ""),
            ", ".join(v.get("etiketler", []) or []),
        )
    console.print(tablo)


def cmd_ekle(args) -> None:
    videolar = yukle()
    video = {
        "id": yeni_id(videolar),
        "baslik": args.baslik,
        "konu": args.konu or "",
        "yayin_tarihi": args.tarih or None,
        "durum": args.durum,
        "etiketler": etiket_listesi(args.etiketler) if args.etiketler else [],
    }
    videolar.append(video)
    kaydet(videolar)
    console.print(f"[green]Eklendi[/] (id={video['id']}): {video['baslik']}")


def _bul(videolar: list[dict], vid: int) -> dict | None:
    return next((v for v in videolar if v.get("id") == vid), None)


def cmd_durum(args) -> None:
    if args.yeni_durum not in DURUMLAR:
        console.print(f"[red]Geçersiz durum.[/] Seçenekler: {', '.join(DURUMLAR)}")
        sys.exit(1)
    videolar = yukle()
    v = _bul(videolar, args.id)
    if not v:
        console.print(f"[red]id={args.id} bulunamadı.[/]")
        sys.exit(1)
    v["durum"] = args.yeni_durum
    kaydet(videolar)
    console.print(f"[green]Güncellendi[/] id={args.id} → {DURUM_ETIKET[args.yeni_durum]}")


def cmd_guncelle(args) -> None:
    videolar = yukle()
    v = _bul(videolar, args.id)
    if not v:
        console.print(f"[red]id={args.id} bulunamadı.[/]")
        sys.exit(1)
    if args.baslik is not None:
        v["baslik"] = args.baslik
    if args.konu is not None:
        v["konu"] = args.konu
    if args.tarih is not None:
        v["yayin_tarihi"] = args.tarih or None
    if args.etiketler is not None:
        v["etiketler"] = etiket_listesi(args.etiketler)
    kaydet(videolar)
    console.print(f"[green]Güncellendi[/] id={args.id}")


def cmd_sil(args) -> None:
    videolar = yukle()
    if not _bul(videolar, args.id):
        console.print(f"[red]id={args.id} bulunamadı.[/]")
        sys.exit(1)
    videolar = [v for v in videolar if v.get("id") != args.id]
    kaydet(videolar)
    console.print(f"[green]Silindi[/] id={args.id}")


def cmd_takvim(args) -> None:
    """videos.yaml'dan GitHub'da güzel görünen PLAN.md üretir."""
    videolar = sorted(yukle(), key=tarih_anahtari)
    satirlar: list[str] = [
        "# 🎥 YouTube Video Planı",
        "",
        "> Bu dosya `plan.py takvim` ile otomatik üretilir. Düzenlemeyin;",
        "> bunun yerine `videos.yaml` dosyasını veya `plan.py` komutlarını kullanın.",
        "",
    ]

    # Aya göre grupla
    aylar: dict[str, list[dict]] = {}
    for v in videolar:
        t = v.get("yayin_tarihi")
        if isinstance(t, date):
            ay = t.strftime("%Y-%m")
        elif isinstance(t, str) and t.strip():
            try:
                ay = datetime.strptime(t.strip(), "%Y-%m-%d").strftime("%Y-%m")
            except ValueError:
                ay = "Tarihsiz"
        else:
            ay = "Tarihsiz"
        aylar.setdefault(ay, []).append(v)

    # Özet
    toplam = len(videolar)
    yayinda = sum(1 for v in videolar if v.get("durum") == "yayinda")
    satirlar.append(f"**Toplam:** {toplam} video · **Yayında:** {yayinda} · "
                    f"**Sırada:** {toplam - yayinda}")
    satirlar.append("")

    for ay in sorted(aylar.keys()):
        baslik = "Tarihsiz" if ay == "Tarihsiz" else ay
        satirlar.append(f"## {baslik}")
        satirlar.append("")
        satirlar.append("| Tarih | Durum | Başlık | Konu | Etiketler |")
        satirlar.append("|---|---|---|---|---|")
        for v in aylar[ay]:
            satirlar.append(
                "| {tarih} | {durum} | {baslik} | {konu} | {etk} |".format(
                    tarih=tarih_metni(v),
                    durum=DURUM_ETIKET.get(v.get("durum", ""), v.get("durum", "")),
                    baslik=v.get("baslik", "").replace("|", "\\|"),
                    konu=(v.get("konu", "") or "").replace("|", "\\|"),
                    etk=", ".join(v.get("etiketler", []) or []),
                )
            )
        satirlar.append("")

    PLAN_MD.write_text("\n".join(satirlar), encoding="utf-8")
    console.print(f"[green]PLAN.md güncellendi[/] → {PLAN_MD}")


def main() -> None:
    p = argparse.ArgumentParser(description="YouTube video planlama CLI'si")
    alt = p.add_subparsers(dest="komut", required=True)

    l = alt.add_parser("liste", help="Videoları listele")
    l.add_argument("--durum", choices=DURUMLAR, help="Sadece bu durumu göster")
    l.set_defaults(func=cmd_liste)

    e = alt.add_parser("ekle", help="Yeni video ekle")
    e.add_argument("--baslik", required=True)
    e.add_argument("--konu", default="")
    e.add_argument("--tarih", default="", help="YYYY-MM-DD")
    e.add_argument("--durum", default="fikir", choices=DURUMLAR)
    e.add_argument("--etiketler", default="", help="Virgülle ayır: a,b,c")
    e.set_defaults(func=cmd_ekle)

    d = alt.add_parser("durum", help="Durum güncelle")
    d.add_argument("id", type=int)
    d.add_argument("yeni_durum", choices=DURUMLAR)
    d.set_defaults(func=cmd_durum)

    g = alt.add_parser("guncelle", help="Video alanlarını güncelle")
    g.add_argument("id", type=int)
    g.add_argument("--baslik")
    g.add_argument("--konu")
    g.add_argument("--tarih", help="YYYY-MM-DD (boş geçmek için '')")
    g.add_argument("--etiketler", help="Virgülle ayır: a,b,c")
    g.set_defaults(func=cmd_guncelle)

    s = alt.add_parser("sil", help="Video sil")
    s.add_argument("id", type=int)
    s.set_defaults(func=cmd_sil)

    t = alt.add_parser("takvim", help="PLAN.md dosyasını üret")
    t.set_defaults(func=cmd_takvim)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
