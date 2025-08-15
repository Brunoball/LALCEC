import React, { useState, useMemo } from "react";
import { FaUserMinus } from "react-icons/fa";
import "./ModalBajaEmpresa.css";

const MAX_LEN = 250;

const ModalBajaEmpresa = ({ empresa, onCancelar, onConfirmar }) => {
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
      await onConfirmar(empresa, motivo.trim());
    } finally {
      setEnviando(false);
    }
  };

  if (!empresa) return null;

  return (
    <div
      className="empbaja-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="empbaja-title"
    >
      <div className="empbaja-modal empbaja-modal--danger">
        <div className="empbaja-modal__icon" aria-hidden="true">
          <FaUserMinus />
        </div>

        <h3 id="empbaja-title" className="empbaja-modal__title">
          Confirmar baja de empresa
        </h3>

        <p className="empbaja-modal__body">
          ¿Estás seguro que deseas dar de baja a{" "}
          <strong>{empresa?.razon_social}</strong>?
        </p>

        <div className="empbaja-field">
          <label htmlFor="empbaja-motivo" className="empbaja-label">
            Motivo de la baja <span className="empbaja-asterisk">*</span>
          </label>

          <textarea
            id="empbaja-motivo"
            className="empbaja-textarea"
            maxLength={MAX_LEN}
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Escribí el motivo (obligatorio)"
          />
          <div className="empbaja-helper">
            {motivo.length}/{MAX_LEN}
          </div>
        </div>

        <div className="empbaja-modal__actions">
          <button
            type="button"
            className="empbaja-btn empbaja-btn--ghost"
            onClick={onCancelar}
            disabled={enviando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={`empbaja-btn empbaja-btn--solid-danger ${
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

export default ModalBajaEmpresa;
