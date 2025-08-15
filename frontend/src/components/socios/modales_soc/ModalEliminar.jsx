import React from "react";
import { FaTrash } from "react-icons/fa";
import "./ModalEliminar.css";

const ModalEliminar = ({ socioSeleccionado, onCancelar, onEliminar }) => {
  if (!socioSeleccionado) return null;

  return (
    <div
      className="socdel-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="socdel-title"
    >
      <div className="socdel-modal socdel-modal--danger" role="document">
        <div className="socdel-modal__icon" aria-hidden="true">
          <FaTrash />
        </div>

        <h3 id="socdel-title" className="socdel-modal__title">
          Eliminar permanentemente
        </h3>

        <p className="socdel-modal__body">
          ¿Estás seguro que deseas eliminar al socio{" "}
          <strong>
            {socioSeleccionado?.nombre} {socioSeleccionado?.apellido}
          </strong>
          ?
        </p>

        <div className="socdel-modal__actions">
          <button
            type="button"
            className="socdel-btn socdel-btn--ghost"
            onClick={onCancelar}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="socdel-btn socdel-btn--solid-danger"
            onClick={onEliminar}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminar;
