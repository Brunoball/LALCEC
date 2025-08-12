// src/components/socios/modales_soc/ModalBaja.jsx
import React, { useState } from "react";
import "./ModalBaja.css";

const ModalBaja = ({ socio, onCancelar, onConfirmar }) => {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const puedeConfirmar = motivo.trim().length > 0 && !enviando;

  const handleConfirmarClick = async () => {
    if (!puedeConfirmar) return;
    try {
      setEnviando(true);
      await onConfirmar(socio, motivo.trim());
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="socio-modal-overlay">
      <div className="socio-modal-content">
        <h3>Confirmar Baja de Socio</h3>
        <p>
          ¿Estás seguro que deseas dar de baja a{" "}
          <strong>{socio?.nombre} {socio?.apellido}</strong>?
        </p>

        <div className="socio-field">
          <label htmlFor="motivo" className="socio-label">
            Motivo de la baja <span style={{ color: "red" }}>*</span>
          </label>
          <textarea
            id="motivo"
            className="socio-textarea"
            maxLength={250}
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Escribí el motivo (obligatorio)"
          />
          <div className="socio-helper">
            {motivo.length}/250
          </div>
        </div>

        <div className="socio-modal-buttons">
          <button className="socio-btn-cancelar" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </button>
          <button
            className={`socio-btn-confirmar ${!puedeConfirmar ? "disabled" : ""}`}
            onClick={handleConfirmarClick}
            disabled={!puedeConfirmar}
            title={!puedeConfirmar ? "Ingresá un motivo para continuar" : "Confirmar Baja"}
          >
            {enviando ? "Procesando..." : "Confirmar Baja"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBaja;
