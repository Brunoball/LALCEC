import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import "./ModalMesCuotas.css";

const ModalMesCuotas = ({ 
  mesSeleccionado, 
  onMesSeleccionado, 
  onCancelar, 
  onImprimir 
}) => {
  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Seleccionar Mes para Comprobantes</h3>
          <button className="modal-close" onClick={onCancelar}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="meses-container">
          {meses.map((mes, index) => (
            <button
              key={index}
              className={`mes-button ${mesSeleccionado === mes ? "selected" : ""}`}
              onClick={() => onMesSeleccionado(mes)}
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
            disabled={!mesSeleccionado}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMesCuotas;