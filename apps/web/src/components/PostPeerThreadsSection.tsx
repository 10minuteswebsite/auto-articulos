"use client";

import { useEffect, useState } from "react";

type Status = {
  status?: string;
  accountName?: string | null;
  lastError?: string | null;
};

export default function PostPeerThreadsSection() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    void fetch(`/api/postpeer/status?platform=threads&_t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => setStatus(value))
      .catch(() => setStatus(null));
  }, []);

  const connected = status?.status === "ACTIVE";
  return (
    <section style={{ border: "1px solid #d6d6d6", borderRadius: 12, padding: 18, marginBottom: 18, background: "#fbfbfd" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Threads por PostPeer</h3>
      <p style={{ margin: "0 0 12px", lineHeight: 1.5, color: "#424245" }}>
        Esta es la vía temporal de publicación mientras se autoriza la aplicación propia de Meta. La conexión directa de Meta se conserva como respaldo y no se elimina.
      </p>
      {connected ? (
        <p style={{ margin: 0, color: "#1a7f37", fontWeight: 600 }}>Conectada: {status?.accountName || "cuenta de Threads"}</p>
      ) : (
        <a href="/api/postpeer/threads/connect" style={{ display: "inline-flex", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "#111", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
          Conectar Threads por PostPeer
        </a>
      )}
      {status?.lastError && <p style={{ margin: "10px 0 0", color: "#b42318" }}>{status.lastError}</p>}
    </section>
  );
}
