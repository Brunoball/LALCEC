import React, { useState } from "react";
import "./ModalBajaEmpresa.css";

const ModalBajaEmpresa = ({ empresa, onCancelar, onConfirmar }) => {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const puedeConfirmar = motivo.trim().length > 0 && !enviando;

  const handleConfirmarClick = async () => {
    if (!puedeConfirmar) return;
    try {
      setEnviando(true);
      await onConfirmar(empresa, motivo.trim());
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="empresa-modal-overlay">
      <div className="empresa-modal-content">
        <h3>Confirmar Baja de Empresa</h3>
        <p>
          ¿Estás seguro que deseas dar de baja a{" "}
          <strong>{empresa?.razon_social}</strong>?
        </p>

        <div className="empresa-field">
          <label htmlFor="motivo" className="empresa-label">
            Motivo de la baja <span style={{ color: "red" }}>*</span>
          </label>
          <textarea
            id="motivo"
            className="empresa-textarea"
            maxLength={250}
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Escribí el motivo (obligatorio)"
          />
          <div className="empresa-helper">{motivo.length}/250</div>
        </div>

        <div className="empresa-modal-buttons">
          <button
            className="empresa-btn-cancelar"
            onClick={onCancelar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            className={`empresa-btn-confirmar ${!puedeConfirmar ? "disabled" : ""}`}
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

export default ModalBajaEmpresa;
