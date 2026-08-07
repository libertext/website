#!/usr/bin/env python3
"""YouTube'a zamanlı (otomatik yayınlanan) video yükleme.

Videoyu `private` + `publishAt` ile yükler; YouTube belirlenen tarih-saatte
otomatik yayınlar. Veri kaynağı `videos.yaml`'dır.

Komutlar
--------
  python content_plan/youtube.py yetkilendir
      İlk kez OAuth izni alır, token'ı token.json'a kaydeder. (Tarayıcı gerekir.)

  python content_plan/youtube.py yukle <id>
      videos.yaml'daki <id> kaydını YouTube'a zamanlı olarak yükler.

Gereken alanlar (videos.yaml içinde, ilgili video için)
------------------------------------------------------
  baslik        : video başlığı            (zorunlu)
  dosya         : yerel video dosyası yolu  (zorunlu, örn. ~/videolar/x.mp4)
  yayin_tarihi  : YYYY-MM-DD                (zorunlu — gelecekte olmalı)
  yayin_saati   : HH:MM (varsayılan 10:00)  (isteğe bağlı)
  konu/aciklama : açıklama metni            (isteğe bağlı)
  etiketler     : etiket listesi            (isteğe bağlı)

Kurulum için content_plan/README.md → "YouTube'a otomatik yayın" bölümüne bak.
Bağımlılıklar: pip install -r content_plan/requirements-youtube.txt
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, datetime
from pathlib import Path

import yaml

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
except ImportError:
    sys.exit(
        "Eksik bağımlılık. Şunu çalıştır:\n"
        "  pip install -r content_plan/requirements-youtube.txt"
    )

KLASOR = Path(__file__).resolve().parent
VERI = KLASOR / "videos.yaml"
CLIENT_SECRET = KLASOR / "client_secret.json"   # Google Cloud'dan indirilir (gitignore)
TOKEN = KLASOR / "token.json"                    # ilk yetkilendirmede oluşur (gitignore)

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

# Yerel saat dilimi farkı (Türkiye = +03:00). publishAt bu offset'le gönderilir.
TZ_OFFSET = "+03:00"
# Varsayılan YouTube kategori ID'si (22 = People & Blogs, 27 = Education, 28 = Science & Tech)
KATEGORI_ID = "22"
VARSAYILAN_SAAT = "10:00"


# ---- Veri -------------------------------------------------------------------


def yukle_veri() -> list[dict]:
    if not VERI.exists():
        return []
    data = yaml.safe_load(VERI.read_text(encoding="utf-8")) or {}
    return data.get("videolar", []) or []


def kaydet_veri(videolar: list[dict]) -> None:
    VERI.write_text(
        yaml.safe_dump(
            {"videolar": videolar},
            allow_unicode=True,
            sort_keys=False,
            default_flow_style=False,
        ),
        encoding="utf-8",
    )


def publish_at(v: dict) -> str:
    """videos.yaml tarih/saatinden RFC3339 publishAt üretir; gelecekte olmalı."""
    t = v.get("yayin_tarihi")
    if isinstance(t, date):
        gun = t.isoformat()
    elif isinstance(t, str) and t.strip():
        gun = t.strip()
    else:
        sys.exit("Bu videoda 'yayin_tarihi' yok; zamanlı yükleme için gerekli.")
    saat = (v.get("yayin_saati") or VARSAYILAN_SAAT).strip()
    iso = f"{gun}T{saat}:00{TZ_OFFSET}"
    try:
        an = datetime.fromisoformat(iso)
    except ValueError:
        sys.exit(f"Geçersiz tarih/saat: {iso}")
    if an <= datetime.now(an.tzinfo):
        sys.exit(f"Yayın zamanı geçmişte ({iso}); ileri bir tarih ver.")
    return iso


# ---- Kimlik doğrulama -------------------------------------------------------


def kimlik() -> "Credentials":
    creds = None
    if TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN.write_text(creds.to_json(), encoding="utf-8")
        return creds
    if not CLIENT_SECRET.exists():
        sys.exit(
            f"{CLIENT_SECRET.name} bulunamadı.\n"
            "Google Cloud > APIs & Services > Credentials'tan OAuth istemci\n"
            "(Desktop app) oluşturup JSON'u bu konuma indir:\n"
            f"  {CLIENT_SECRET}"
        )
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
    creds = flow.run_local_server(port=0)
    TOKEN.write_text(creds.to_json(), encoding="utf-8")
    print(f"Token kaydedildi → {TOKEN}")
    return creds


# ---- Komutlar ---------------------------------------------------------------


def cmd_yetkilendir(_args) -> None:
    kimlik()
    print("Yetkilendirme tamam. Artık 'yukle' komutunu kullanabilirsin.")


def cmd_yukle(args) -> None:
    videolar = yukle_veri()
    v = next((x for x in videolar if x.get("id") == args.id), None)
    if not v:
        sys.exit(f"id={args.id} bulunamadı.")

    dosya = v.get("dosya")
    if not dosya:
        sys.exit("Bu videoda 'dosya' alanı yok (yerel video dosyası yolu gerekli).")
    dosya_yolu = Path(dosya).expanduser()
    if not dosya_yolu.exists():
        sys.exit(f"Video dosyası bulunamadı: {dosya_yolu}")

    yayin = publish_at(v)
    aciklama = v.get("aciklama") or v.get("konu") or ""
    etiketler = v.get("etiketler", []) or []

    print(f"Yükleniyor: {v.get('baslik')}")
    print(f"  Dosya:  {dosya_yolu}")
    print(f"  Yayın:  {yayin} (private → otomatik yayınlanacak)")

    youtube = build("youtube", "v3", credentials=kimlik())
    govde = {
        "snippet": {
            "title": v.get("baslik", ""),
            "description": aciklama,
            "tags": etiketler,
            "categoryId": KATEGORI_ID,
        },
        "status": {
            "privacyStatus": "private",
            "publishAt": yayin,
            "selfDeclaredMadeForKids": False,
        },
    }
    medya = MediaFileUpload(str(dosya_yolu), chunksize=-1, resumable=True)
    istek = youtube.videos().insert(
        part="snippet,status", body=govde, media_body=medya
    )

    yanit = None
    while yanit is None:
        durum, yanit = istek.next_chunk()
        if durum:
            print(f"  Yükleniyor... %{int(durum.progress() * 100)}")

    vid = yanit["id"]
    print(f"Yüklendi ✅  YouTube ID: {vid}")
    print(f"  https://youtu.be/{vid}")

    # videos.yaml'ı güncelle
    v["youtube_id"] = vid
    v["durum"] = "zamanlandi"
    kaydet_veri(videolar)
    print("videos.yaml güncellendi (durum → zamanlandi).")


def main() -> None:
    p = argparse.ArgumentParser(description="YouTube'a zamanlı video yükleme")
    alt = p.add_subparsers(dest="komut", required=True)

    y = alt.add_parser("yetkilendir", help="OAuth izni al (ilk kullanım)")
    y.set_defaults(func=cmd_yetkilendir)

    u = alt.add_parser("yukle", help="Bir videoyu zamanlı yükle")
    u.add_argument("id", type=int)
    u.set_defaults(func=cmd_yukle)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
