"""Pydantic veri modelleri (structured output için)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


SearchIntent = Literal["informational", "commercial", "transactional", "navigational"]


class KeywordCluster(BaseModel):
    ana_keyword: str
    lsi_keywords: list[str] = Field(
        description="Ana keyword'le anlamsal olarak ilişkili LSI keyword'ler (5-10 adet)."
    )
    long_tail_keywords: list[str] = Field(
        description="3+ kelimeden oluşan, daha spesifik niyet taşıyan long-tail keyword'ler (5-10 adet)."
    )
    soru_keywords: list[str] = Field(
        description="Kullanıcı arama sorgularını yansıtan soru bazlı keyword'ler (4-8 adet)."
    )
    search_intent: SearchIntent = Field(
        description="Ana keyword'ün baskın search intent'i."
    )


class OutlineH3(BaseModel):
    baslik: str
    amac: str = Field(description="Bu alt bölümün amacı (içerik üreticisi rehberi).")


class OutlineH2(BaseModel):
    baslik: str
    amac: str = Field(description="Bu bölümün amacı.")
    h3_alt_basliklar: list[OutlineH3] = Field(default_factory=list)
    hedef_kelime_sayisi: int = Field(
        description="Bu bölüm için hedef kelime sayısı (toplam uzunluğa göre dağıtılmış)."
    )


class Outline(BaseModel):
    h1_baslik: str = Field(
        description="50-60 karakter aralığında, ana keyword'ü içeren SEO başlık."
    )
    giris_ozeti: str = Field(
        description="Makalenin 1-2 cümlelik temel vaadi (introduction için rehber)."
    )
    h2_bolumleri: list[OutlineH2]


class GorselOnerisi(BaseModel):
    bolum_basligi: str = Field(description="Bu görselin yerleştirileceği H2 başlığı.")
    alt_text: str = Field(description="80-125 karakter, ana keyword'ü doğal kullanan alt text.")
    image_prompt_en: str = Field(
        description="DALL-E/Midjourney için İngilizce görsel prompt'u."
    )


class SEOMeta(BaseModel):
    seo_title: str = Field(description="50-60 karakter, ana keyword başa yakın.")
    meta_description: str = Field(
        description="140-155 karakter, ana keyword + LSI + CTA içeren meta açıklama."
    )
    url_slug: str = Field(
        description="3-5 kelime, tire ile ayrılmış, sadece küçük latin harf."
    )
    og_title: str = Field(description="Open Graph başlığı (sosyal medyaya optimize).")
    og_description: str = Field(description="Open Graph açıklaması (max 200 karakter).")
    gorseller: list[GorselOnerisi]


class IcLinkOnerisi(BaseModel):
    hedef_baslik: str = Field(description="Aynı sitede yazılabilecek ilgili makale başlığı.")
    anchor_text: str = Field(description="Doğal Türkçe anchor text.")
    yerlestirme_baglami: str = Field(
        description="Anchor text'in geçeceği paragrafın kısa bağlamı (1 cümle)."
    )


class DisLinkOnerisi(BaseModel):
    kaynak_adi: str = Field(description="Otoriter kaynak adı (kurum/site/yayın).")
    anchor_text: str = Field(description="Doğal Türkçe anchor text.")
    yerlestirme_baglami: str = Field(
        description="Anchor text'in geçeceği paragrafın kısa bağlamı."
    )


class LinkOnerileri(BaseModel):
    ic_linkler: list[IcLinkOnerisi] = Field(min_length=3, max_length=5)
    dis_linkler: list[DisLinkOnerisi] = Field(min_length=2, max_length=3)
