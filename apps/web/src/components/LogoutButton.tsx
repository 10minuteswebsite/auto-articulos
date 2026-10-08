"use client";

import { secondaryButtonStyle } from "@/components/dashboard-ui";

export default function LogoutButton({ label = "Cerrar sesión" }: { label?: string }) {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button onClick={handleLogout} style={secondaryButtonStyle}>
      {label}
    </button>
  );
}
