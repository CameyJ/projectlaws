import { useEffect, useState } from "react";
import { authHeader } from "../../utils/authHeader";

export default function CreadorControlAdmin() {
  const [regs, setRegs] = useState([]);
  const [regId, setRegId] = useState("");
  const [arts, setArts] = useState([]);
  const [artId, setArtId] = useState("");
  const [form, setForm] = useState({ clave:"", pregunta:"", recomendacion:"", peso:1 });

  useEffect(() => {
    fetch("/api/admin/regulaciones", { headers: authHeader() })
      .then(r => r.json()).then(setRegs);
  }, []);

  useEffect(() => {
    if (!regId) return;
    fetch(`/api/admin/regulaciones/${regId}/articulos`, { headers: authHeader() })
      .then(r => r.json()).then(setArts);
  }, [regId]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = { regulacion_id: regId, articulo_id: artId || null, ...form, peso: Number(form.peso) || 1 };
    const res = await fetch("/api/admin/controles", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setForm({ clave:"", pregunta:"", recomendacion:"", peso:1 });
      setArtId("");
      alert("Control creado");
    } else {
      alert("Error creando control");
    }
  };

  const artSel = arts.find(a => a.id === artId);

  return (
    <div className="page-container">
      <h1>Nuevo Control — Administración</h1>
      <form onSubmit={submit} className="g-card" style={{ maxWidth: 820 }}>
        <label>Regulación</label>
        <select value={regId} onChange={e=>setRegId(e.target.value)} required>
          <option value="">Seleccione</option>
          {regs.map(r => <option key={r.id} value={r.id}>{r.codigo} — {r.nombre}</option>)}
        </select>

        <label style={{marginTop:12}}>Artículo (opcional)</label>
        <select value={artId} onChange={e=>setArtId(e.target.value)}>
          <option value="">— Sin artículo —</option>
          {arts.map(a => (
            <option key={a.id} value={a.id}>
              {(a.codigo || 's/art')} — {a.titulo?.slice(0,80) || 'sin título'}
            </option>
          ))}
        </select>

        {artId && (
          <div className="g-card" style={{ marginTop: 12, background: "#f7f9fc" }}>
            <b>{artSel?.codigo} — {artSel?.titulo}</b>
            <p style={{ whiteSpace: "pre-wrap" }}>{artSel?.cuerpo?.slice(0,800) || 'Sin texto'}</p>
          </div>
        )}

        <label style={{marginTop:12}}>Clave</label>
        <input value={form.clave} onChange={e=>setForm({...form, clave:e.target.value})} required />

        <label>Pregunta</label>
        <textarea rows={3} value={form.pregunta}
          onChange={e=>setForm({...form, pregunta:e.target.value})} required />

        <label>Recomendación</label>
        <textarea rows={3} value={form.recomendacion}
          onChange={e=>setForm({...form, recomendacion:e.target.value})} />

        <label>Peso</label>
        <input type="number" min="0.5" step="0.5"
          value={form.peso} onChange={e=>setForm({...form, peso:e.target.value})} />

        <button type="submit" className="btn-primary" style={{marginTop:16}}>Guardar control</button>
      </form>
    </div>
  );
}
