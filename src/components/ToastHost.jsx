import { useEffect, useState } from "react";
import "./Toast.css";

/** Host global de toasts (no bloquea la UI). 
 *  Escucha eventos window 'app:toast' y también
 *  sobrescribe window.alert para mantener tu flujo existente.
 */
export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  // Escucha eventos para mostrar toasts
  useEffect(() => {
    const onToast = (e) => {
      const { message, type = "success", duration = 3000 } = e.detail || {};
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message: String(message), type }]);
      const t = setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, duration);
      return () => clearTimeout(t);
    };
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);

  // Sobrescribe alert() -> muestra toast (visual, no bloqueante)
  useEffect(() => {
    const original = window.alert;
    window.alert = (msg) => {
      window.dispatchEvent(
        new CustomEvent("app:toast", {
          detail: { message: msg, type: "success", duration: 3200 },
        })
      );
    };
    return () => {
      window.alert = original;
    };
  }, []);

  const close = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <div className="toast__icon" aria-hidden="true">
            {t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}
          </div>
          <div className="toast__body">{t.message}</div>
          <button
            className="toast__close"
            onClick={() => close(t.id)}
            aria-label="Cerrar notificación"
            title="Cerrar"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/** Utilidad opcional por si quieres disparar toasts custom desde código:
 *  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Texto', type: 'error' } }))
 */
