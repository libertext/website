"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function Topbar({ workspaceName, userEmail }: { workspaceName: string; userEmail: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="text-sm font-medium">{workspaceName}</div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Tema değiştir">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
        <form action={logoutAction}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Çıkış">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
