"use client";

import { secondaryButtonStyle } from "@/components/dashboard-ui";

export default function LogoutButton({
  label = "Cerrar sesión",
  redirectTo = "/login",
  className,
}: {
  label?: string;
  redirectTo?: string;
  className?: string;
} = {}) {
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
    } finally {
      window.location.href = redirectTo;
    }
  }

  return (
    <button type="button" className={className} onClick={handleLogout} style={secondaryButtonStyle}>
      {label}
    </button>
  );
}
