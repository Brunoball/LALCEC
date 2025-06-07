import React from "react";
import "./ModalEliminar.css";

const ModalEliminar = ({ socioSeleccionado, onCancelar, onEliminar }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h3 className="modal-title">¿Deseas eliminar este socio?</h3>
        <p className="modal-text">{`${socioSeleccionado.nombre} ${socioSeleccionado.apellido}`}</p>
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

export default ModalEliminar;