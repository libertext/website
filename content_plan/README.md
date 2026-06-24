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
