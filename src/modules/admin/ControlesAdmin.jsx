import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";

export default function ControlesAdmin() {
  const [regs, setRegs] = useState([]);
  const [regId, setRegId] = useState("");
  const [articles, setArticles] = useState([]);
  const [articleId, setArticleId] = useState("");
  const [listPrev, setListPrev] = useState([]);
  const [form, setForm] = useState({ clave: "", pregunta: "", recomendacion: "", peso: 1 });

  useEffect(() => {
    apiGet("/api/admin/regulations").then(setRegs).catch(console.error);
  }, []);

  useEffect(() => {
    if (!regId) { setArticles([]); setListPrev([]); return; }
    apiGet(`/api/admin/regulations/${regId}/articles`).then(setArticles).catch(console.error);
    // opcional: vista previa de controles ya creados (por regulación)
    apiGet(`/api/controles/por-regulacion/${regId}`).then(setListPrev).catch(()=>setListPrev([]));
  }, [regId]);

  const save = async (e) => {
    e.preventDefault();
    await apiPost("/api/admin/controls", {
      regulation_id: regId,
      article_id: articleId,
      clave: form.clave || null,
      pregunta: form.pregunta,
      recomendacion: form.recomendacion || null,
      peso: Number(form.peso) || 1,
    });
    setForm({ clave: "", pregunta: "", recomendacion: "", peso: 1 });
    const prev = await apiGet(`/api/controles/por-regulacion/${regId}`);
    setListPrev(prev);
  };

  return (
    <div className="page-container">
      <h1>Controles (Admin)</h1>

      <form onSubmit={save} className="g-card" style={{maxWidth:760}}>
        <label>Regulación</label>
        <select value={regId} onChange={e=>setRegId(e.target.value)} required>
          <option value="">Seleccione…</option>
          {regs.map(r => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
        </select>

        {!!regId && (
          <>
            <label style={{marginTop:12}}>Artículo</label>
            <select value={articleId} onChange={e=>setArticleId(e.target.value)} required>
              <option value="">Seleccione…</option>
              {articles.map(a =>
                <option key={a.id} value={a.id}>
                  {a.code || "(s/art)"} — {a.title?.slice(0,80)}
                </option>
              )}
            </select>

            {articleId && (
              <div className="g-card" style={{marginTop:12}}>
                <strong>Preview artículo:</strong>
                <p style={{whiteSpace:"pre-wrap"}}>
                  {articles.find(a=>a.id===articleId)?.body?.slice(0,600) || "Sin texto"}
                </p>
              </div>
            )}

            <label style={{marginTop:12}}>Clave (opcional)</label>
            <input value={form.clave} onChange={e=>setForm({...form, clave:e.target.value})}/>

            <label>Pregunta</label>
            <textarea rows={3} required value={form.pregunta}
                      onChange={e=>setForm({...form, pregunta:e.target.value})}/>

            <label>Recomendación (opcional)</label>
            <textarea rows={3} value={form.recomendacion}
                      onChange={e=>setForm({...form, recomendacion:e.target.value})}/>

            <label>Peso</label>
            <input type="number" min="0.5" step="0.5" value={form.peso}
                   onChange={e=>setForm({...form, peso:e.target.value})}/>

            <button type="submit" className="btn-primary" style={{marginTop:16}}>
              Guardar control
            </button>
          </>
        )}
      </form>

      {!!listPrev.length && (
        <div className="g-card" style={{maxWidth:900, marginTop:16}}>
          <h3>Controles existentes</h3>
          <ul>
            {listPrev.map(c => (
              <li key={c.id}>
                <strong>{c.clave || "(s/clave)"}:</strong> {c.pregunta}
                {c.articulo_codigo && <> — <em>{c.articulo_codigo}</em></>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
