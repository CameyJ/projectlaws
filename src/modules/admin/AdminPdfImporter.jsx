// src/modules/admin/AdminPdfImporter.jsx
import { useEffect, useState } from "react";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminPdfImporter() {
  const [regs, setRegs] = useState([]);
  const [regId, setRegId] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Cargar regulaciones
  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const res = await fetch(`${API}/api/admin/regulaciones`, { headers: authHeader() });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
        }
        const data = await res.json();
        setRegs(data || []);
      } catch (e) {
        console.error("Error cargando regulaciones:", e);
        setErr("Error de red/JS al cargar regulaciones.");
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!regId) return setErr("Selecciona una regulación.");
    if (!file) return setErr("Selecciona un archivo PDF.");

    try {
      setBusy(true);
      const fd = new FormData();
      fd.append("regulation_id", regId);
      fd.append("file", file);

      const res = await fetch(`${API}/api/admin/upload/pdf`, {
        method: "POST",
        headers: authHeader(), // solo Authorization
        body: fd,              // NO fijes Content-Type
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }

      const data = await res.json();
      alert(`Listo. Insertados: ${data.inserted}  |  Omitidos: ${data.skipped || 0}`);
      setFile(null);
      setRegId("");
    } catch (e) {
      console.error("Error importando PDF:", e);
      setErr("Error procesando PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Importar artículos desde PDF</h1>

      {err && (
        <div style={{ background: "#ffe3e3", color: "#8a1a1a", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <strong>Error:</strong> {err}{" "}
          <button onClick={() => window.location.reload()} style={{ marginLeft: 12 }}>
            Reintentar
          </button>
        </div>
      )}

      <form onSubmit={submit} className="g-card" style={{ maxWidth: 720 }}>
        <label>Regulación</label>
        <select value={regId} onChange={(e) => setRegId(e.target.value)} required>
          <option value="">Seleccione…</option>
          {regs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.codigo} — {r.nombre}
            </option>
          ))}
        </select>

        <label style={{ marginTop: 12 }}>Archivo PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />

        <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 16 }}>
          {busy ? "Procesando…" : "Procesar PDF"}
        </button>
      </form>
    </div>
  );
}
