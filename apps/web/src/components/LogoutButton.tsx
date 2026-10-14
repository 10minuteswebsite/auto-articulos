"use client";

import { secondaryButtonStyle } from "@/components/dashboard-ui";

export default function LogoutButton({
  label = "Cerrar sesión",
  redirectTo = "/login",
}: {
  label?: string;
  redirectTo?: string;
}) {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = redirectTo;
  }

  return (
    <button onClick={handleLogout} style={secondaryButtonStyle}>
      {label}
    </button>
  );
}
