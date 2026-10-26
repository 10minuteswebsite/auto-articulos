"use client";

import { useState } from "react";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  buttonStyle,
  secondaryButtonStyle,
  disabledStyle,
} from "@/components/dashboard-ui";

type PromptStyle = { id: string; name: string; prompt: string };

/**
 * Crear, editar y eliminar los estilos de redacción (prompts de artículos).
 * Solo se monta para administradores; las rutas /api/admin/prompts vuelven a
 * exigir el rol en el servidor. `onChanged` recarga la lista del padre.
 */
export default function PromptStylesAdmin({
  prompts,
  onChanged,
}: {
  prompts: PromptStyle[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "error" | "info"; text: string } | null>(null);

  function reset() {
    setEditingId(null);
    setName("");
    setText("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(editingId ? `/api/admin/prompts/${editingId}` : "/api/admin/prompts", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prompt: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data.error ?? "Error al guardar el prompt" });
        return;
      }
      setBanner({ type: "info", text: editingId ? "Prompt actualizado con éxito" : "Prompt creado con éxito" });
      reset();
      onChanged();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Error al conectar con el servidor" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este estilo de redacción?")) return;
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/prompts/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (editingId === id) reset();
        setBanner({ type: "info", text: "Prompt eliminado con éxito" });
        onChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        setBanner({ type: "error", text: data.error ?? "Error al eliminar el prompt" });
      }
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Error al conectar con el servidor" });
    }
  }

  const linkButton = { background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 } as const;

  return (
    <section id="prompts-redaccion" style={sectionStyle}>
      <h2 style={h2Style}>
        {editingId ? "Editar estilo de redacción" : "Agregar nuevo estilo de redacción (Prompt)"}
      </h2>
      <p style={{ fontSize: 13, color: "#6e6e73" }}>
        Solo administradores. Los prompts de redacción permiten a los usuarios elegir diferentes estilos de escritura al generar artículos.
        Puedes usar <code>{"{title}"}</code> o <code>{"{keyword}"}</code> en el texto; se reemplazan con el tema del artículo.
      </p>

      <form onSubmit={handleSave} style={{ marginTop: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
            Nombre del estilo (ej. Profesional, Directo, Creativo)
            <input
              type="text"
              required
              placeholder="Nombre corto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600 }}>
            Instrucciones del Prompt
            <textarea
              required
              placeholder="Instrucciones detalladas que recibirá la IA para escribir el artículo. Ej: Escribe un artículo con tono informal sobre {title}..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              style={{ ...inputStyle, fontFamily: "inherit" }}
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="submit" disabled={saving} style={disabledStyle(buttonStyle, saving)}>
              {saving ? "Guardando..." : "Guardar estilo"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} style={secondaryButtonStyle}>
                Cancelar edición
              </button>
            )}
          </div>
        </div>
      </form>

      {banner && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            marginTop: 14,
            background: banner.type === "error" ? "#fff2f1" : "#eafaf0",
            color: banner.type === "error" ? "#d64545" : "#16803c",
            fontSize: 13,
          }}
        >
          {banner.text}
        </div>
      )}

      <h2 style={{ ...h2Style, marginTop: 28 }}>Estilos de redacción registrados</h2>
      {prompts.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6e6e73" }}>
          No hay estilos personalizados guardados. Todos los artículos se generarán con el flujo estándar.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          {prompts.map((p) => (
            <div key={p.id} style={{ padding: "16px 0", borderBottom: "1px solid #d2d2d7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: 15, color: "#1d1d1f" }}>{p.name}</strong>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setName(p.name);
                      setText(p.prompt);
                      document.getElementById("prompts-redaccion")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    style={{ ...linkButton, color: "#1d1d1f" }}
                  >
                    Editar
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={{ ...linkButton, color: "#ff3b30" }}>
                    Eliminar
                  </button>
                </div>
              </div>
              <pre
                style={{
                  fontSize: 12,
                  color: "#6e6e73",
                  background: "#f5f5f7",
                  padding: 10,
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  maxHeight: 120,
                  overflowY: "auto",
                  fontFamily: "inherit",
                }}
              >
                {p.prompt}
              </pre>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
