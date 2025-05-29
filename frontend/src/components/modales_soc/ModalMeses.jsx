import React from "react";
import "./ModalMes.css";

const meses = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const ModalMes = ({ mesSeleccionado, onMesSeleccionado, onCancelar, onImprimir }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h3 className="modal-title">Seleccionar Mes para Comprobantes</h3>
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
          <button className="modal-button cancel-button" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="modal-button accept-button" onClick={onImprimir}>
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMes;