import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";

export default function AdminArticles() {
  const [regs, setRegs] = useState([]);
  const [regId, setRegId] = useState("");
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ codigo: "", titulo: "", cuerpo: "", orden: "" });

  useEffect(() => {
    apiGet("/api/admin/regulations").then(setRegs).catch(console.error);
  }, []);

  useEffect(() => {
    if (!regId) { setList([]); return; }
    apiGet(`/api/admin/regulations/${regId}/articles`).then(setList).catch(console.error);
  }, [regId]);

  const save = async (e) => {
    e.preventDefault();
    await apiPost("/api/admin/articles", {
      regulation_id: regId,
      code: form.codigo || null,
      title: form.titulo || null,
      body: form.cuerpo,
      sort_index: form.orden ? Number(form.orden) : null,
    });
    setForm({ codigo: "", titulo: "", cuerpo: "", orden: "" });
    const data = await apiGet(`/api/admin/regulations/${regId}/articles`);
    setList(data);
  };

  return (
    <div className="page-container">
      <h1>Artículos (Admin)</h1>

      <label>Regulación</label>
      <select value={regId} onChange={(e)=>setRegId(e.target.value)} style={{maxWidth:400}}>
        <option value="">Seleccione…</option>
        {regs.map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
      </select>

      {regId && (
        <form onSubmit={save} className="g-card" style={{maxWidth:800, marginTop:16}}>
          <div className="grid" style={{display:"grid", gap:12}}>
            <input placeholder="Código (ej: Art. 404)" value={form.codigo}
                   onChange={e=>setForm({...form, codigo:e.target.value})}/>
            <input placeholder="Título" value={form.titulo}
                   onChange={e=>setForm({...form, titulo:e.target.value})}/>
            <textarea rows={6} placeholder="Cuerpo / texto del artículo" required
                      value={form.cuerpo}
                      onChange={e=>setForm({...form, cuerpo:e.target.value})}/>
            <input placeholder="Orden (opcional)" value={form.orden}
                   onChange={e=>setForm({...form, orden:e.target.value})}/>
            <button type="submit" className="btn-primary">Guardar artículo</button>
          </div>
        </form>
      )}

      {!!list.length && (
        <div className="g-card" style={{maxWidth:1000, marginTop:16}}>
          <h3>Artículos cargados</h3>
          <ul>
            {list.map(a => (
              <li key={a.id}>
                <strong>{a.code || "(s/código)"}:</strong> {a.title || "(s/título)"} — {String(a.created_at).slice(0,19)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
