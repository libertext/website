# 🎥 YouTube Video Planlama

YouTube'a yükleyeceğin videoları **önceden, ücretsiz ve repo içinde** planlamak
için basit bir sistem. Tüm veri `videos.yaml` içinde tutulur; git ile
versiyonlanır, istediğin yerden düzenlersin. Harici servis veya ücret yok.

## Hızlı başlangıç

Bağımlılıklar zaten projede mevcut (`pyyaml`, `rich`). Kurulu değilse:

```bash
pip install -r requirements.txt
```

## Komutlar

Tüm komutlar repo kökünden çalıştırılır.

### Video ekle
```bash
python content_plan/plan.py ekle \
  --baslik "Python ile YouTube otomasyonu" \
  --konu "Video açıklamalarını otomatik yazma" \
  --tarih 2026-07-08 \
  --durum senaryo \
  --etiketler "python,otomasyon,tutorial"
```
Sadece `--baslik` zorunlu; diğerleri isteğe bağlı.

### Listele
```bash
python content_plan/plan.py liste                 # hepsi (tarihe göre sıralı)
python content_plan/plan.py liste --durum fikir   # sadece fikir aşamasındakiler
```

### Durumu ilerlet
İş akışı: `fikir → senaryo → cekim → kurgu → yayinda`
```bash
python content_plan/plan.py durum 2 kurgu
```

### Alan güncelle
```bash
python content_plan/plan.py guncelle 2 --tarih 2026-07-15 --baslik "Yeni başlık"
```

### Sil
```bash
python content_plan/plan.py sil 2
```

### Takvimi üret (PLAN.md)
GitHub'da güzel görünen, aya göre gruplanmış tabloyu üretir:
```bash
python content_plan/plan.py takvim
```
Çıktı: [`PLAN.md`](./PLAN.md)

## Dosyalar

| Dosya | Açıklama |
|---|---|
| `videos.yaml` | Tek doğruluk kaynağı — videoların burada |
| `plan.py` | Ekle/listele/güncelle/takvim CLI'si |
| `PLAN.md` | `takvim` komutuyla üretilen okunabilir takvim |

## İş akışı önerisi

1. Aklına bir fikir gelince: `ekle --baslik "..." --durum fikir`
2. Üzerinde çalıştıkça `durum` komutuyla ilerlet.
3. Genel görünüm için `python content_plan/plan.py takvim` çalıştır, `PLAN.md`'e bak.
4. Değişiklikleri commit'le — geçmişin tamamı git'te durur.

---

## YouTube'a otomatik (zamanlı) yayın

Bitmiş bir video dosyasını **planladığın tarih-saatte otomatik yayınlanacak**
şekilde YouTube'a yükler. Video `private` olarak yüklenir ve `publishAt`
zamanında YouTube tarafından otomatik yayınlanır. Tamamen ücretsizdir
(YouTube Data API ücretsiz kotası: günde 10.000 birim ≈ 6 yükleme).

### Tek seferlik kurulum (Google tarafı)

1. https://console.cloud.google.com → yeni bir proje oluştur (ücretsiz).
2. **APIs & Services → Library → "YouTube Data API v3" → Enable**.
3. **APIs & Services → OAuth consent screen**: User type = *External*,
   uygulamayı doldur, **Test users**'a kendi Google hesabını ekle.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID →
   Application type: Desktop app**. Oluşan JSON'u indir ve şuraya koy:
   ```
   content_plan/client_secret.json
   ```
   (Bu dosya ve `token.json` `.gitignore`'dadır — asla commit edilmez.)

### Kurulum (yerel makine)

```bash
pip install -r content_plan/requirements-youtube.txt
python content_plan/youtube.py yetkilendir   # tarayıcı açılır, izin ver (bir kez)
```

> Not: Yetkilendirme bir tarayıcı gerektirir, yani kendi bilgisayarında
> çalıştırılmalıdır (bu bulut oturumunda değil).

### Yükleme

`videos.yaml` içindeki kayda `dosya` (ve istersen `yayin_saati`, `aciklama`)
alanlarını ekle:

```yaml
  - id: 3
    baslik: "Python ile YouTube otomasyonu"
    aciklama: "Bu videoda ... anlatıyoruz. Abone olmayı unutma!"
    yayin_tarihi: 2026-07-08
    yayin_saati: "19:00"
    durum: kurgu
    etiketler: [python, otomasyon, tutorial]
    dosya: ~/videolar/yt-otomasyon.mp4
```

Sonra:

```bash
python content_plan/youtube.py yukle 3
```

Yükleme bitince `youtube_id` doldurulur, durum `zamanlandi` olur. Belirlenen
zamanda video otomatik yayınlanır.

### Ayarlar

`content_plan/youtube.py` başındaki sabitler:
- `TZ_OFFSET` — saat dilimi farkı (varsayılan `+03:00`, Türkiye).
- `KATEGORI_ID` — YouTube kategori (22 = People & Blogs, 27 = Education, 28 = Science & Tech).
- `VARSAYILAN_SAAT` — `yayin_saati` verilmezse kullanılır (`10:00`).

### Sınırlar
- Sadece **bitmiş video dosyaları** zamanlanabilir; bir fikri çekmeden yayınlayamazsın.
- Yayın zamanı **gelecekte** olmalı.
- İlk yetkilendirme tarayıcı ister (yerel makine).
