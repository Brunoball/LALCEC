import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import "./ModalEliminarPago.css";

const ModalEliminarPago = ({ tipo, mes, item, onCancelar, onConfirmar }) => {
  const [submitting, setSubmitting] = useState(false);

  // ⌨️ Cerrar con ESC cuando el modal está visible (hay item)
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) {
        e.preventDefault();
        onCancelar?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [item, onCancelar]);

  if (!item) return null;

  const titulo =
    tipo === "socio"
      ? `${item.apellido || ""} ${item.nombre || ""}`.trim()
      : item.razon_social || "";

  const handleEliminar = async () => {
    if (submitting) return;
    // 1) Cerrar modal inmediatamente para que se vea el toast y el spinner de la tabla
    onCancelar?.();

    // 2) Disparar la confirmación en el siguiente tick (sin bloquear la UI)
    setSubmitting(true);
    Promise.resolve()
      .then(() => onConfirmar?.())
      .finally(() => setSubmitting(false));
  };

  return (
    <div
      className="mpago-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mpago-title"
      onClick={onCancelar}
    >
      <div
        className="mpago-modal mpago-modal--danger"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mpago-icon" aria-hidden="true">
          <FontAwesomeIcon icon={faTimesCircle} />
        </div>

        <h3 id="mpago-title" className="mpago-title">
          Eliminar pago
        </h3>

        <div className="mpago-body">
          <p>
            ¿Confirmás que querés <strong>eliminar</strong> el pago de{" "}
            {tipo === "socio" ? "el socio" : "la empresa"}{" "}
            <strong>{titulo || "—"}</strong> correspondiente al mes{" "}
            <strong>{mes}</strong>?
          </p>

          {item.id_pago || item.idPago ? (
            <p className="mpago-note">
              Se detectó <em>idPago</em>:{" "}
              <code>{item.id_pago || item.idPago}</code>
            </p>
          ) : (
            <p className="mpago-note"></p>
          )}
        </div>

        <div className="mpago-actions">
          <button
            type="button"
            className="mpago-btn mpago-btn--ghost"
            onClick={onCancelar}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="mpago-btn mpago-btn--solid-danger"
            onClick={handleEliminar}
            title="Eliminar pago"
            disabled={submitting}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminarPago;
