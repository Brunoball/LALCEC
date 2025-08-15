import React, { useState, useMemo } from "react";
import { FaUserMinus } from "react-icons/fa";
import "./ModalBaja.css";

const MAX_LEN = 250;

const ModalBaja = ({ socio, onCancelar, onConfirmar }) => {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const puedeConfirmar = useMemo(
    () => motivo.trim().length > 0 && !enviando,
    [motivo, enviando]
  );

  const handleConfirmarClick = async () => {
    if (!puedeConfirmar) return;
    try {
      setEnviando(true);
      await onConfirmar(socio, motivo.trim());
    } finally {
      setEnviando(false);
    }
  };

  if (!socio) return null;

  return (
    <div
      className="socbaja-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="socbaja-title"
    >
      <div className="socbaja-modal socbaja-modal--danger" role="document">
        <div className="socbaja-modal__icon" aria-hidden="true">
          <FaUserMinus />
        </div>

        <h3 id="socbaja-title" className="socbaja-modal__title">
          Confirmar baja de socio
        </h3>

        <p className="socbaja-modal__body">
          ¿Estás seguro que deseas dar de baja a{" "}
          <strong>
            {socio?.nombre} {socio?.apellido}
          </strong>
          ?
        </p>

        <div className="socbaja-field">
          <label htmlFor="socbaja-motivo" className="socbaja-label">
            Motivo de la baja <span className="socbaja-asterisk">*</span>
          </label>

          <textarea
            id="socbaja-motivo"
            className="socbaja-textarea"
            maxLength={MAX_LEN}
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Escribí el motivo (obligatorio)"
          />
          <div className="socbaja-helper">
            {motivo.length}/{MAX_LEN}
          </div>
        </div>

        <div className="socbaja-modal__actions">
          <button
            type="button"
            className="socbaja-btn socbaja-btn--ghost"
            onClick={onCancelar}
            disabled={enviando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={`socbaja-btn socbaja-btn--solid-danger ${
              !puedeConfirmar ? "is-disabled" : ""
            }`}
            onClick={handleConfirmarClick}
            disabled={!puedeConfirmar}
            title={
              !puedeConfirmar
                ? "Ingresá un motivo para continuar"
                : "Confirmar baja"
            }
          >
            {enviando ? "Procesando..." : "Confirmar baja"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBaja;
