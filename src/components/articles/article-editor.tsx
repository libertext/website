"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Save, ExternalLink } from "lucide-react";
import { saveArticleAction } from "@/lib/articles/actions";
import type { SeoAnalysisResult } from "@/lib/seo/analyze";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, Badge } from "@/components/ui/primitives";
import { SeoPanel } from "@/components/articles/seo-panel";

interface EditorArticle {
  id: string;
  title: string;
  contentHtml: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  status: string;
  wpPermalink: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ArticleEditor({
  article,
  initialSeo,
}: {
  article: EditorArticle;
  initialSeo: SeoAnalysisResult;
}) {
  const [title, setTitle] = useState(article.title);
  const [contentHtml, setContentHtml] = useState(article.contentHtml);
  const [metaTitle, setMetaTitle] = useState(article.metaTitle);
  const [metaDescription, setMetaDescription] = useState(article.metaDescription);
  const [slug, setSlug] = useState(article.slug);
  const [seo, setSeo] = useState(initialSeo);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await saveArticleAction({
        id: article.id,
        title,
        contentHtml,
        metaTitle,
        metaDescription,
        slug,
      });
      setSeo(res.seo);
      setSaveState("saved");
      setDirty(false);
    } catch {
      setSaveState("error");
    }
  }, [article.id, title, contentHtml, metaTitle, metaDescription, slug]);

  // Debounced autosave (§173): don't hit the server on every keypress.
  useEffect(() => {
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dirty, save]);

  // Warn on navigating away with unsaved changes (§128).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Ctrl/Cmd+S to save (§172).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  function onChange<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  const saveLabel =
    saveState === "saving" ? "Kaydediliyor…" : saveState === "saved" ? "Kaydedildi" : saveState === "error" ? "Kaydedilemedi" : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            value={title}
            onChange={(e) => onChange(setTitle)(e.target.value)}
            className="h-auto border-0 bg-transparent px-0 text-2xl font-bold focus-visible:ring-0"
            placeholder="Makale başlığı"
          />
          <div className="flex shrink-0 items-center gap-3">
            {saveLabel && <span className="text-xs text-muted-foreground">{saveLabel}</span>}
            <Button size="sm" onClick={() => void save()} disabled={saveState === "saving"}>
              <Save className="h-4 w-4" /> Kaydet
            </Button>
          </div>
        </div>

        {article.wpPermalink && (
          <a
            href={article.wpPermalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            WordPress'te görüntüle <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>İçerik (HTML)</CardTitle>
            <Badge variant="muted">Temiz HTML olarak kaydedilir</Badge>
          </CardHeader>
          <CardContent>
            <Textarea
              value={contentHtml}
              onChange={(e) => onChange(setContentHtml)(e.target.value)}
              className="min-h-[420px] font-mono text-xs"
              placeholder="<h2>Başlık</h2><p>Metin…</p>"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Önizleme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose-article max-w-none" dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <SeoPanel seo={seo} />

        <Card>
          <CardHeader>
            <CardTitle>SEO Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Meta başlık ({metaTitle.length}/60)</Label>
              <Input value={metaTitle} onChange={(e) => onChange(setMetaTitle)(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta açıklama ({metaDescription.length}/155)</Label>
              <Textarea
                value={metaDescription}
                onChange={(e) => onChange(setMetaDescription)(e.target.value)}
                className="min-h-[70px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => onChange(setSlug)(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
