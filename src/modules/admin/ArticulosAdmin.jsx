import { useEffect, useState } from "react";
import { authHeader } from "../../utils/authHeader";

export default function ArticulosAdmin() {
  const [regs, setRegs] = useState([]);
  const [regId, setRegId] = useState("");
  const [form, setForm] = useState({ codigo: "", titulo: "", cuerpo: "", orden: "" });

  useEffect(() => {
    fetch("/api/admin/regulaciones", { headers: authHeader() })
      .then(r => r.json()).then(setRegs);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const payload = { regulacion_id: regId, ...form, orden: form.orden ? Number(form.orden) : null };
    const res = await fetch("/api/admin/articulos", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setForm({ codigo: "", titulo: "", cuerpo: "", orden: "" });
      alert("Artículo creado");
    } else {
      alert("Error creando artículo");
    }
  };

  return (
    <div className="page-container">
      <h1>Artículos — Administración</h1>
      <form onSubmit={submit} className="g-card" style={{ maxWidth: 800 }}>
        <label>Regulación</label>
        <select value={regId} onChange={e=>setRegId(e.target.value)} required>
          <option value="">Seleccione</option>
          {regs.map(r => <option key={r.id} value={r.id}>{r.codigo} — {r.nombre}</option>)}
        </select>

        <label style={{marginTop:12}}>Código (ej: Art. 404)</label>
        <input value={form.codigo} onChange={e=>setForm({...form, codigo:e.target.value})} />

        <label>Título</label>
        <input value={form.titulo} onChange={e=>setForm({...form, titulo:e.target.value})} />

        <label>Texto del artículo</label>
        <textarea rows={6} value={form.cuerpo} onChange={e=>setForm({...form, cuerpo:e.target.value})} />

        <label>Orden (opcional)</label>
        <input type="number" value={form.orden} onChange={e=>setForm({...form, orden:e.target.value})} />

        <button type="submit" className="btn-primary" style={{marginTop:16}}>Guardar artículo</button>
      </form>
    </div>
  );
}
