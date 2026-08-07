"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Layers,
  Calendar,
  Link2,
  FolderKanban,
  Globe,
  LayoutTemplate,
  Cpu,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { appConfig } from "@/lib/config/app";

const groups: { label?: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  { items: [{ href: "/dashboard", label: "Panel", icon: LayoutDashboard }] },
  {
    label: "İçerikler",
    items: [
      { href: "/articles", label: "Makaleler", icon: FileText },
      { href: "/articles/new", label: "Yeni Makale", icon: PlusCircle },
      { href: "/bulk", label: "Toplu İçerik", icon: Layers },
      { href: "/calendar", label: "Takvim", icon: Calendar },
    ],
  },
  {
    label: "SEO",
    items: [{ href: "/internal-links", label: "İç Linkler", icon: Link2 }],
  },
  {
    label: "Yönetim",
    items: [
      { href: "/projects", label: "Projeler", icon: FolderKanban },
      { href: "/sites", label: "WordPress Siteleri", icon: Globe },
      { href: "/templates", label: "Şablonlar", icon: LayoutTemplate },
      { href: "/models", label: "AI Modelleri", icon: Cpu },
      { href: "/usage", label: "Kullanım", icon: BarChart3 },
      { href: "/settings", label: "Ayarlar", icon: Settings },
    ],
  },
];

export function Sidebar({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-5 text-lg font-bold text-primary">
        {appConfig.shortName}
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {groups.map((group, i) => (
          <div key={i}>
            {group.label && (
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {isSuperAdmin && (
          <div>
            <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Yönetici
            </p>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                pathname.startsWith("/admin") && "bg-accent font-medium text-accent-foreground",
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
