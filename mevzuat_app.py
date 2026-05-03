"""Mevzuat (Türk Mevzuatı) — Flask tabanlı HTML uygulaması.

mevzuat.gov.tr üzerinden Kanunları ve Yönetmelikleri çeker, basit bir
arayüzde listeler. Backend istekleri proxy + cache eder, frontend statik
HTML/CSS/JS olarak çalışır.

Çalıştırma:
    pip install flask requests
    python mevzuat_app.py
    # http://127.0.0.1:5000

Not: mevzuat.gov.tr bazı ağlardan erişimi engelleyebilir. Türkiye'den
çalıştırılması önerilir.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import requests
from flask import Flask, jsonify, request, send_from_directory

BASE_URL = "https://www.mevzuat.gov.tr"
DATATABLE_URL = f"{BASE_URL}/anasayfa/MevzuatDatatable"

# Mevzuat türleri (mevzuat.gov.tr'nin kullandığı kodlar)
MEVZUAT_TURLERI: dict[str, dict[str, str]] = {
    "kanun": {"kod": "1", "ad": "Kanun"},
    "cb_kararnamesi": {"kod": "19", "ad": "Cumhurbaşkanlığı Kararnamesi"},
    "khk": {"kod": "4", "ad": "KHK"},
    "tuzuk": {"kod": "2", "ad": "Tüzük"},
    "yonetmelik": {"kod": "7", "ad": "Yönetmelik"},
    "teblig": {"kod": "9", "ad": "Tebliğ"},
}

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": f"{BASE_URL}/",
    "Origin": BASE_URL,
}

CACHE_DIR = Path(__file__).parent / ".cache_mevzuat"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_TTL = 60 * 60 * 6  # 6 saat

app = Flask(__name__, static_folder="static", static_url_path="/static")


def _cache_path(key: str) -> Path:
    safe = "".join(c if c.isalnum() else "_" for c in key)[:200]
    return CACHE_DIR / f"{safe}.json"


def _read_cache(key: str) -> Any | None:
    p = _cache_path(key)
    if not p.exists():
        return None
    if time.time() - p.stat().st_mtime > CACHE_TTL:
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_cache(key: str, value: Any) -> None:
    try:
        _cache_path(key).write_text(
            json.dumps(value, ensure_ascii=False), encoding="utf-8"
        )
    except Exception:
        pass


def fetch_mevzuat_list(
    tur_kodu: str,
    arama: str = "",
    sayfa: int = 1,
    sayfa_boyutu: int = 25,
) -> dict[str, Any]:
    """mevzuat.gov.tr Datatable endpoint'ine POST atar.

    Endpoint server-side paging için DataTables formatında parametre alır.
    """
    start = (sayfa - 1) * sayfa_boyutu
    cache_key = f"list_{tur_kodu}_{arama}_{sayfa}_{sayfa_boyutu}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached

    payload = {
        "draw": "1",
        "columns[0][data]": "MevzuatNo",
        "columns[0][searchable]": "true",
        "columns[0][orderable]": "true",
        "columns[1][data]": "MevAdi",
        "columns[1][searchable]": "true",
        "columns[1][orderable]": "true",
        "columns[2][data]": "Tarih",
        "columns[2][searchable]": "true",
        "columns[2][orderable]": "true",
        "order[0][column]": "0",
        "order[0][dir]": "desc",
        "start": str(start),
        "length": str(sayfa_boyutu),
        "search[value]": arama,
        "search[regex]": "false",
        "parameters[MevzuatTur]": tur_kodu,
        "parameters[YonetmelikMevzuatTur]": "",
        "parameters[AranacakIfade]": arama,
        "parameters[AranacakYer]": "1",
        "parameters[TertipNo]": "",
    }

    try:
        r = requests.post(
            DATATABLE_URL, data=payload, headers=DEFAULT_HEADERS, timeout=20
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        return {
            "error": f"mevzuat.gov.tr'ye erişilemedi: {e}",
            "items": [],
            "toplam": 0,
            "sayfa": sayfa,
            "sayfa_boyutu": sayfa_boyutu,
        }

    items = []
    for row in data.get("data", []):
        items.append(
            {
                "no": row.get("mevzuatNo") or row.get("MevzuatNo") or "",
                "ad": row.get("mevAdi") or row.get("MevAdi") or "",
                "tarih": row.get("kabulTarih") or row.get("Tarih") or "",
                "tur": row.get("mevzuatTur") or row.get("MevzuatTur") or tur_kodu,
                "tertip": row.get("mevzuatTertip") or "",
                "url": (
                    row.get("url")
                    or f"{BASE_URL}/MevzuatMetin/1.5.{row.get('mevzuatNo','')}.pdf"
                ),
            }
        )

    result = {
        "items": items,
        "toplam": data.get("recordsTotal", len(items)),
        "sayfa": sayfa,
        "sayfa_boyutu": sayfa_boyutu,
    }
    _write_cache(cache_key, result)
    return result


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/turler")
def api_turler():
    return jsonify(
        [
            {"slug": slug, "kod": meta["kod"], "ad": meta["ad"]}
            for slug, meta in MEVZUAT_TURLERI.items()
        ]
    )


@app.route("/api/mevzuat/<tur>")
def api_mevzuat(tur: str):
    meta = MEVZUAT_TURLERI.get(tur)
    if not meta:
        return jsonify({"error": f"Bilinmeyen tür: {tur}"}), 400

    arama = request.args.get("q", "").strip()
    sayfa = max(1, int(request.args.get("sayfa", 1)))
    sayfa_boyutu = min(100, max(5, int(request.args.get("limit", 25))))

    return jsonify(fetch_mevzuat_list(meta["kod"], arama, sayfa, sayfa_boyutu))


@app.route("/api/metin")
def api_metin():
    """Belirli bir mevzuatın resmi PDF/HTML linkini döner.

    mevzuat.gov.tr metinleri 1.5.{NO}.pdf veya MevzuatMetin sayfası ile
    sunar; burada sadece kanonik URL'leri döndürüyoruz.
    """
    no = request.args.get("no", "").strip()
    tertip = request.args.get("tertip", "5").strip() or "5"
    if not no:
        return jsonify({"error": "no parametresi gerekli"}), 400
    return jsonify(
        {
            "pdf": f"{BASE_URL}/MevzuatMetin/1.{tertip}.{no}.pdf",
            "html": f"{BASE_URL}/mevzuat?MevzuatNo={no}&MevzuatTertip={tertip}",
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
