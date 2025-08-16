import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import "./ModalMesCuotas.css";

const ModalMesCuotas = ({ 
  mesesSeleccionados, 
  onMesSeleccionadosChange, 
  onCancelar, 
  onImprimir 
}) => {
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
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Seleccionar Meses para Comprobantes</h3>
          <button className="modal-close" onClick={onCancelar}>
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
