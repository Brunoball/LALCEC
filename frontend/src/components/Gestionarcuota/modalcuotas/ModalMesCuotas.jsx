import React, { useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import "./ModalMesCuotas.css";

const ModalMesCuotas = ({ 
  mesesSeleccionados, 
  onMesSeleccionadosChange, 
  onCancelar, 
  onImprimir 
}) => {
  // ⌨️ Cerrar con ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) {
        e.preventDefault();
        onCancelar?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancelar]);

  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  const toggleMes = (mes) => {
    if (mesesSeleccionados.includes(mes)) {
      onMesSeleccionadosChange(mesesSeleccionados.filter(m => m !== mes));
    } else {
      onMesSeleccionadosChange([...mesesSeleccionados, mes]);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" role="document">
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">Seleccionar Meses para Comprobantes</h3>
          <button className="modal-close" onClick={onCancelar} aria-label="Cerrar">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="meses-container">
          {meses.map((mes, index) => (
            <button
              key={index}
              className={`mes-button ${mesesSeleccionados.includes(mes) ? "selected" : ""}`}
              onClick={() => toggleMes(mes)}
            >
              {mes}
            </button>
          ))}
        </div>
        
        <div className="modal-buttons">
          <button 
            className="modal-button cancel-button" 
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button 
            className="modal-button accept-button" 
            onClick={onImprimir}
            disabled={mesesSeleccionados.length === 0}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMesCuotas;
