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
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = redirectTo;
  }

  return (
    <button className={className} onClick={handleLogout} style={secondaryButtonStyle}>
      {label}
    </button>
  );
}
