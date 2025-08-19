// src/modules/admin/AdminArticles.jsx
import { useEffect, useMemo, useState } from "react";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function numFromCode(code) {
  const m = /(\d+)/.exec(code || "");
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

export default function AdminArticles() {
  const [regs, setRegs] = useState([]);
  const [regId, setRegId] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  // preguntas por artículo (control nuevo)
  const [questionDraft, setQuestionDraft] = useState({}); // { [articleId]: "texto..." }
  const [savingRow, setSavingRow] = useState(null); // articleId mientras guarda

  const [page, setPage] = useState(1);
  const pageSize = 20;

  // cargar regulaciones
  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const r = await fetch(`${API}/api/admin/regulaciones`, { headers: authHeader() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setRegs(arr);
        if (arr.length && !regId) setRegId(arr[0].id);
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar las regulaciones.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cargar artículos por regulación
  const loadArticles = async (rid) => {
    const r = await fetch(`${API}/api/admin/regulaciones/${rid}/articulos`, { headers: authHeader() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!regId) return;
    (async () => {
      try {
        setBusy(true);
        setErr("");
        setItems([]);
        setPage(1);
        await loadArticles(regId);
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar los artículos.");
      } finally {
        setBusy(false);
      }
    })();
  }, [regId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = items.slice().sort((a, b) => {
      const na = numFromCode(a.code);
      const nb = numFromCode(b.code);
      if (na !== nb) return na - nb;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
    if (!term) return base;
    return base.filter(a =>
      (a.code || "").toLowerCase().includes(term) ||
      (a.title || "").toLowerCase().includes(term) ||
      (a.body || "").toLowerCase().includes(term)
    );
  }, [items, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCSV = () => {
    const rows = [
      ["id","regulation_id","code","title","is_enabled","created_at","body"],
      ...filtered.map(a => [
        a.id, a.regulation_id, a.code, a.title ?? "", a.is_enabled ? "true" : "false", a.created_at ?? "",
        (a.body ?? "").replace(/\r?\n/g, " ").slice(0, 32000)
      ])
    ];
    const csv = rows.map(r => r.map(v => {
      const s = String(v ?? "");
      if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `articulos_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  async function toggleEnabled(a) {
    try {
      setSavingRow(a.id);
      const r = await fetch(`${API}/api/admin/articulos/${a.id}`, {
        method: "PATCH",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !a.is_enabled }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const updated = await r.json();
      setItems(prev => prev.map(x => x.id === a.id ? updated : x));
    } catch (e) {
      console.error(e);
      alert("No se pudo actualizar el estado del artículo.");
    } finally {
      setSavingRow(null);
    }
  }

  async function createQuestion(a) {
    const texto = (questionDraft[a.id] || "").trim();
    if (!texto) { alert("Escribe una pregunta."); return; }
    try {
      setSavingRow(a.id);
      const r = await fetch(`${API}/api/admin/controles`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          regulation_id: a.regulation_id,
          article_id: a.id,
          clave: a.code,            // opcional: usamos el código como clave
          pregunta: texto,
          recomendacion: null,
          peso: 1,
        }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(()=> "");
        throw new Error(`HTTP ${r.status} ${txt}`);
      }
      setQuestionDraft(prev => ({ ...prev, [a.id]: "" }));
      alert("✅ Pregunta creada para el artículo.");
    } catch (e) {
      console.error(e);
      alert("No se pudo crear la pregunta.");
    } finally {
      setSavingRow(null);
    }
  }

  return (
    <div className="page-container">
      <h1>Artículos por regulación</h1>

      {err && (
        <div style={{ background: "#ffe3e3", color: "#8a1a1a", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <strong>Error:</strong> {err}{" "}
          <button onClick={() => window.location.reload()} style={{ marginLeft: 12 }}>
            Reintentar
          </button>
        </div>
      )}

      <div className="g-card" style={{ maxWidth: 1200 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column" }}>
            <span>Regulación</span>
            <select value={regId} onChange={(e) => setRegId(e.target.value)}>
              {regs.map(r => (
                <option key={r.id} value={r.id}>
                  {(r.codigo || r.code)} — {(r.nombre || r.name)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column" }}>
            <span>Buscar</span>
            <input
              placeholder="Código, título o texto…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <button type="button" onClick={exportCSV} className="btn-secondary">Exportar CSV</button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <small>
            {busy ? "Cargando…" : `Total: ${filtered.length} artículo(s)`} — Página {page} / {totalPages}
          </small>
        </div>

        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="g-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ width: 90 }}>Código</th>
                <th>Título</th>
                <th>Contenido (preview)</th>
                <th style={{ width: 140 }}>Usar en evaluación</th>
                <th style={{ width: 380 }}>Nueva pregunta</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(a => (
                <tr key={a.id}>
                  <td>{a.code}</td>
                  <td>{a.title || <em style={{ color:"#777" }}>(sin título)</em>}</td>
                  <td title={a.body}>
                    {(a.body || "").slice(0, 240)}
                    {(a.body && a.body.length > 240) ? "…" : ""}
                  </td>

                  {/* Toggle usar/no usar */}
                  <td>
                    <button
                      className="btn-secondary"
                      disabled={savingRow === a.id}
                      onClick={() => toggleEnabled(a)}
                      style={{ minWidth: 120 }}
                    >
                      {savingRow === a.id ? "Guardando…" : a.is_enabled ? "✓ Usando" : "No usar"}
                    </button>
                  </td>

                  {/* Campo para crear pregunta */}
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        style={{ flex: 1 }}
                        placeholder="Escribe la pregunta ligada a este artículo…"
                        value={questionDraft[a.id] ?? ""}
                        onChange={(e) =>
                          setQuestionDraft(prev => ({ ...prev, [a.id]: e.target.value }))
                        }
                      />
                      <button
                        className="btn-primary"
                        disabled={savingRow === a.id || !(questionDraft[a.id] || "").trim()}
                        onClick={() => createQuestion(a)}
                      >
                        {savingRow === a.id ? "Guardando…" : "Agregar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!busy && pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#777" }}>
                    No hay artículos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
          <button className="btn-secondary" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
          <button className="btn-secondary" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}
