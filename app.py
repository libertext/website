"""SEO uyumlu makale üretim agent'ı — Streamlit web UI."""

from __future__ import annotations

import json
from pathlib import Path

import streamlit as st

from agent.core import MakaleTalebi, calistir, kaydet
from agent.trends_planner import planla


ADIM_ETIKETLERI = {
    "keyword_research": "Anahtar kelime araştırması yapılıyor",
    "outline": "Makale outline'ı oluşturuluyor",
    "content": "İçerik üretiliyor (bölüm bölüm)",
    "seo_meta": "SEO meta veriler üretiliyor",
    "links": "İç/dış link önerileri hazırlanıyor",
    "schema": "Schema.org JSON-LD üretiliyor",
    "kalite": "Kalite raporu hesaplanıyor",
}


st.set_page_config(
    page_title="SEO Makale Agent'ı",
    page_icon="📝",
    layout="wide",
)

st.title("SEO Uyumlu Türkçe Makale Üretim Agent'ı")
st.caption("Google Trends tabanlı başlık planlayıcı + Claude API ile çok-aşamalı makale üretimi")


def _basliklari_render(oneriler) -> None:
    """Başlık önerilerini liste olarak gösterir, her başlığın yanında 'kullan' butonu."""
    st.success(f"✅ {len(oneriler.basliklar)} başlık önerisi hazır.")
    for i, b in enumerate(oneriler.basliklar, 1):
        col1, col2 = st.columns([5, 1])
        with col1:
            st.markdown(f"**{i}.** {b.baslik}")
        with col2:
            if st.button("Bu başlığı kullan", key=f"pick_{i}"):
                st.session_state["secili_baslik"] = b.baslik
                st.session_state["secili_ana_keyword"] = b.ana_keyword
                st.toast(f"Başlık seçildi: {b.baslik}", icon="✅")
                st.rerun()


def _makale_sonucu_render(sonuc) -> None:
    """Pipeline sonucunu sekmeli görünümle gösterir."""
    md_yolu, meta_yolu = kaydet(sonuc, output_dir=Path("output"))
    st.caption(f"Kaydedildi: `{md_yolu}` ve `{meta_yolu}`")

    sekmeler = st.tabs(["Markdown", "SEO Meta", "Linkler", "Schema.org", "Kalite Raporu", "Anahtar Kelimeler"])

    with sekmeler[0]:
        st.subheader(sonuc.outline.h1_baslik)
        st.markdown(sonuc.icerik_md)
        st.download_button(
            "Markdown indir",
            data=sonuc.markdown_dosyasi(),
            file_name=f"{sonuc.seo_meta.url_slug}.md",
            mime="text/markdown",
        )

    with sekmeler[1]:
        st.metric("SEO Title", sonuc.seo_meta.seo_title)
        st.caption(f"{len(sonuc.seo_meta.seo_title)} karakter")
        st.markdown("**Meta Description**")
        st.write(sonuc.seo_meta.meta_description)
        st.caption(f"{len(sonuc.seo_meta.meta_description)} karakter")
        st.markdown("**URL Slug**")
        st.code(sonuc.seo_meta.url_slug)
        st.markdown("**Open Graph**")
        st.write(f"**Başlık:** {sonuc.seo_meta.og_title}")
        st.write(f"**Açıklama:** {sonuc.seo_meta.og_description}")

        st.markdown("**Görsel Önerileri**")
        for g in sonuc.seo_meta.gorseller:
            with st.expander(g.bolum_basligi):
                st.write(f"**Alt text:** {g.alt_text}")
                st.write(f"**Image prompt (EN):** {g.image_prompt_en}")

    with sekmeler[2]:
        st.markdown("### İç Link Önerileri")
        for link in sonuc.linkler.ic_linkler:
            st.write(f"**Hedef:** {link.hedef_baslik}")
            st.write(f"  ↳ Anchor: *{link.anchor_text}*")
            st.write(f"  ↳ Bağlam: {link.yerlestirme_baglami}")
            st.divider()
        st.markdown("### Dış Link Önerileri")
        for link in sonuc.linkler.dis_linkler:
            st.write(f"**Kaynak:** {link.kaynak_adi}")
            st.write(f"  ↳ Anchor: *{link.anchor_text}*")
            st.write(f"  ↳ Bağlam: {link.yerlestirme_baglami}")
            st.divider()

    with sekmeler[3]:
        st.markdown("BlogPosting Schema.org JSON-LD:")
        schema_json = json.dumps(sonuc.schema_jsonld, ensure_ascii=False, indent=2)
        st.code(schema_json, language="json")
        st.download_button(
            "Meta JSON indir",
            data=json.dumps(sonuc.meta_dosyasi(), ensure_ascii=False, indent=2),
            file_name=f"{sonuc.seo_meta.url_slug}.meta.json",
            mime="application/json",
        )

    with sekmeler[4]:
        col1, col2, col3 = st.columns(3)
        col1.metric("Toplam kelime", sonuc.kalite.toplam_kelime)
        col2.metric(
            "Okunabilirlik",
            f"{sonuc.kalite.okunabilirlik['skor']}",
            sonuc.kalite.okunabilirlik["seviye"],
        )
        col3.metric("H2 bölüm sayısı", sonuc.kalite.toplam_h2)

        st.markdown("### Anahtar Kelime Yoğunluğu")
        for r in sonuc.kalite.keyword_yogunluk:
            renk = {"ideal": "🟢", "düşük": "🟡", "yüksek": "🔴"}.get(r["durum"], "⚪")
            st.write(f"{renk} **{r['keyword']}** — %{r['yogunluk']} ({r['gecis']} geçiş, {r['durum']})")

        if sonuc.kalite.uyarilar:
            st.markdown("### ⚠️ Uyarılar")
            for u in sonuc.kalite.uyarilar:
                st.warning(u)

    with sekmeler[5]:
        st.markdown(f"**Search Intent:** `{sonuc.cluster.search_intent}`")
        st.markdown("### LSI Keyword'ler")
        st.write(", ".join(sonuc.cluster.lsi_keywords))
        st.markdown("### Long-tail Keyword'ler")
        st.write("\n".join(f"- {k}" for k in sonuc.cluster.long_tail_keywords))
        st.markdown("### Soru Bazlı Keyword'ler")
        st.write("\n".join(f"- {k}" for k in sonuc.cluster.soru_keywords))


sekme_planlayici, sekme_uretici = st.tabs(["🔍 Başlık Planlayıcı", "📝 Makale Üretici"])

with sekme_planlayici:
    st.subheader("Google Trends'ten İlhamla Başlık Önerileri")
    st.caption("Bir konu gir; gerçek Google Trends verisinden ilham alarak 10-15 makale başlığı önereyim.")

    with st.form("planlayici_form"):
        konu_planner = st.text_input(
            "Konu", placeholder="Örn: kahve makineleri", key="planner_konu_input"
        )
        col_a, col_b = st.columns(2)
        with col_a:
            kitle_planner = st.text_input(
                "Hedef kitle", value="genel okuyucular", key="planner_kitle"
            )
            geo_planner = st.text_input("Coğrafya", value="TR", key="planner_geo")
        with col_b:
            sayi_planner = st.slider("Başlık sayısı", 10, 15, 12, key="planner_sayi")
            zaman_planner = st.selectbox(
                "Zaman aralığı",
                ["today 12-m", "today 5-y", "today 3-m", "today 1-m", "now 7-d"],
                key="planner_zaman",
            )
        getir = st.form_submit_button("Önerileri getir", type="primary")

    if getir:
        if not konu_planner.strip():
            st.warning("Lütfen bir konu girin.")
        else:
            with st.spinner("Google Trends'ten veriler çekiliyor ve başlıklar üretiliyor…"):
                try:
                    oneriler = planla(
                        konu=konu_planner.strip(),
                        hedef_kitle=kitle_planner.strip() or "genel okuyucular",
                        sayi=sayi_planner,
                        geo=geo_planner.strip() or "TR",
                        timeframe=zaman_planner,
                    )
                    st.session_state["son_oneriler"] = oneriler
                except Exception as e:
                    st.error(f"Hata: {e}")
                    st.session_state.pop("son_oneriler", None)

    if "son_oneriler" in st.session_state:
        _basliklari_render(st.session_state["son_oneriler"])

    if "secili_baslik" in st.session_state:
        st.info(
            f"✅ Seçilen başlık: **{st.session_state['secili_baslik']}** — "
            "yukarıdaki **📝 Makale Üretici** sekmesine geçip Üret tuşuna basabilirsiniz."
        )


with sekme_uretici:
    st.subheader("Makale Üretimi")

    onceden_secili_baslik = st.session_state.get("secili_baslik", "")
    onceden_secili_keyword = st.session_state.get("secili_ana_keyword", "")

    if onceden_secili_baslik:
        st.success(f"Planlayıcıdan gelen başlık: **{onceden_secili_baslik}**")

    with st.sidebar:
        st.header("Makale Parametreleri")
        konu = st.text_input("Konu", value=onceden_secili_baslik, key="yazici_konu")
        ana_keyword = st.text_input(
            "Ana anahtar kelime", value=onceden_secili_keyword, key="yazici_keyword"
        )
        hedef_kitle = st.text_input("Hedef kitle", value="genel okuyucular", key="yazici_kitle")
        ton = st.selectbox(
            "Ton",
            ["profesyonel ama anlaşılır", "samimi ve sohbet havasında",
             "eğitici ve detaylı", "kısa ve teknik"],
            key="yazici_ton",
        )
        hedef_uzunluk = st.slider("Hedef kelime sayısı", 500, 4000, 1500, step=250, key="yazici_uzunluk")
        yazar = st.text_input("Yazar adı", value="Editör", key="yazici_yazar")
        site_url = st.text_input("Site URL", value="https://example.com", key="yazici_site")
        uretmeyi_baslat = st.button(
            "Üret", type="primary", disabled=not (konu and ana_keyword), key="yazici_uret"
        )

    if uretmeyi_baslat:
        talep = MakaleTalebi(
            konu=konu, ana_keyword=ana_keyword, hedef_kitle=hedef_kitle,
            ton=ton, hedef_uzunluk=hedef_uzunluk, yazar=yazar, site_url=site_url,
        )

        durum_alani = st.empty()
        bolum_alani = st.container()
        with bolum_alani:
            st.subheader("Bölüm Üretim İlerlemesi")
            bolum_yer = st.empty()
        bolum_kayitlari: list[str] = []

        def _ilerleme(adim: str, _ekstra) -> None:
            durum_alani.info(f"⏳ {ADIM_ETIKETLERI.get(adim, adim)}…")

        def _bolum_cb(sira: int, toplam: int, bolum, _icerik) -> None:
            bolum_kayitlari.append(f"✓ [{sira}/{toplam}] {bolum.baslik}")
            bolum_yer.markdown("\n\n".join(bolum_kayitlari))

        try:
            with st.spinner("Pipeline çalıştırılıyor…"):
                sonuc = calistir(talep, ilerleme=_ilerleme, bolum_callback=_bolum_cb)
        except Exception as e:
            durum_alani.error(f"Hata: {e}")
            st.stop()

        durum_alani.success("✅ Makale üretildi.")
        _makale_sonucu_render(sonuc)
    else:
        st.info(
            "Sol panelden konu ve ana anahtar kelime girip **Üret** tuşuna basın. "
            "Veya **🔍 Başlık Planlayıcı** sekmesinden bir başlık seçin."
        )
        st.markdown(
            "**Pipeline:** Anahtar kelime araştırması → Outline → İçerik üretimi → "
            "SEO meta → İç/dış linkler → Schema.org → Kalite raporu"
        )
