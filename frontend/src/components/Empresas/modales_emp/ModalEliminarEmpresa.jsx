import React from "react";
import "./ModalEliminarEmpresa.css";

const ModalEliminarEmpresa = ({ empresaSeleccionada, onCancelar, onEliminar }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h3 className="modal-title">¿Deseas eliminar esta empresa?</h3>
        <p className="modal-text">{empresaSeleccionada?.razon_social}</p>

        <div className="modal-buttons">
          <button className="modal-button cancel-button" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="modal-button accept-button" onClick={onEliminar}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminarEmpresa;