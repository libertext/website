import type { ArticleStatus } from "@prisma/client";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

/** Consistent, accessible status → label/color mapping (§179). */
export function statusBadge(status: ArticleStatus): { label: string; variant: Variant } {
  const map: Record<ArticleStatus, { label: string; variant: Variant }> = {
    LOCAL_DRAFT: { label: "Taslak", variant: "muted" },
    GENERATING: { label: "Oluşturuluyor", variant: "warning" },
    GENERATED: { label: "Oluşturuldu", variant: "default" },
    EDITING: { label: "Düzenleniyor", variant: "default" },
    READY: { label: "Hazır", variant: "default" },
    IN_REVIEW: { label: "İncelemede", variant: "warning" },
    APPROVED: { label: "Onaylandı", variant: "success" },
    REJECTED: { label: "Reddedildi", variant: "destructive" },
    WP_DRAFT: { label: "WP Taslak", variant: "muted" },
    WP_SCHEDULED: { label: "Planlandı", variant: "warning" },
    WP_PUBLISHED: { label: "Yayında", variant: "success" },
    WP_FAILED: { label: "Yayın Hatası", variant: "destructive" },
  };
  return map[status];
}
