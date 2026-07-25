"use client";

import { Button } from "@agrismartchain/noki-design-system";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Best-effort: the browser must still be able to sign out locally even
      // if the network call to our own BFF route fails.
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleLogout} loading={pending} disabled={pending} startIcon={<LogOut aria-hidden="true" size={16} />}>
      {t("auth.logout.action")}
    </Button>
  );
}
