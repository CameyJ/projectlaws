import { useEffect, useState } from "react";
import { authHeader } from "../../utils/authHeader";

export default function AdminControlBuilder() {
  const [regulations, setRegulations] = useState([]);
  const [regulationId, setRegulationId] = useState("");
  const [articles, setArticles] = useState([]);
  const [articleId, setArticleId] = useState("");
  const [form, setForm] = useState({
    key: "", question: "", recommendation: "", weight: 1
  });

  useEffect(() => {
    fetch("/api/admin/regulations", { headers: authHeader() })
      .then(r => r.json()).then(setRegulations);
  }, []);

  useEffect(() => {
    if (!regulationId) return;
    fetch(`/api/admin/regulations/${regulationId}/articles`, { headers: authHeader() })
      .then(r => r.json()).then(setArticles);
  }, [regulationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      regulation_id: regulationId,
      article_id: articleId || null,
      clave: form.key,
      pregunta: form.question,
      recomendacion: form.recommendation,
      peso: Number(form.weight) || 1
    };

    const res = await fetch("/api/admin/controls", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setForm({ key: "", question: "", recommendation: "", weight: 1 });
      setArticleId("");
      alert("Control saved successfully");
    } else {
      alert("Error saving control");
    }
  };

  const selectedArticle = articles.find(a => a.id === articleId);

  return (
    <div className="page-container">
      <h1>Create New Control</h1>
      <form onSubmit={handleSubmit} className="g-card" style={{ maxWidth: 820 }}>
        <label>Regulation</label>
        <select value={regulationId} onChange={e => setRegulationId(e.target.value)} required>
          <option value="">Select</option>
          {regulations.map(r => (
            <option key={r.id} value={r.id}>
              {r.code || r.codigo} — {r.name || r.nombre}
            </option>
          ))}
        </select>

        <label style={{ marginTop: 12 }}>Article (optional)</label>
        <select value={articleId} onChange={e => setArticleId(e.target.value)}>
          <option value="">— No article —</option>
          {articles.map(a => (
            <option key={a.id} value={a.id}>
              {(a.code || a.codigo || "n/a")} — {a.title?.slice(0, 80) || a.titulo?.slice(0, 80) || "Untitled"}
            </option>
          ))}
        </select>

        {articleId && (
          <div className="g-card" style={{ marginTop: 12, background: "#f7f9fc" }}>
            <b>{selectedArticle?.code || selectedArticle?.codigo} — {selectedArticle?.title || selectedArticle?.titulo}</b>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {selectedArticle?.body?.slice(0, 800) || selectedArticle?.cuerpo?.slice(0, 800) || "No content"}
            </p>
          </div>
        )}

        <label style={{ marginTop: 12 }}>Control Key</label>
        <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} required />

        <label>Evaluation Question</label>
        <textarea rows={3} value={form.question}
          onChange={e => setForm({ ...form, question: e.target.value })} required />

        <label>Recommendation</label>
        <textarea rows={3} value={form.recommendation}
          onChange={e => setForm({ ...form, recommendation: e.target.value })} />

        <label>Weight</label>
        <input type="number" min="0.5" step="0.5"
          value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />

        <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
          Save Control
        </button>
      </form>
    </div>
  );
}
