import React, { useEffect } from "react";
import { FaTrash } from "react-icons/fa";
import "./ModalEliminarEmpresa.css";

const ModalEliminarEmpresa = ({ empresaSeleccionada, onCancelar, onEliminar }) => {
  // ⌨️ Cerrar con ESC
  useEffect(() => {
    if (!empresaSeleccionada) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) {
        e.preventDefault();
        onCancelar?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [empresaSeleccionada, onCancelar]);

  if (!empresaSeleccionada) return null;

  return (
    <div className="empdel-modal-overlay" role="dialog" aria-modal="true">
      <div className="empdel-modal empdel-modal--danger">
        <div className="empdel-modal__icon">
          <FaTrash />
        </div>

        <h3 className="empdel-modal__title">Eliminar permanentemente</h3>

        <p className="empdel-modal__body">
          ¿Estás seguro que deseas eliminar a la empresa{" "}
          <strong>{empresaSeleccionada.razon_social}</strong>?
        </p>

        <div className="empdel-modal__actions">
          <button
            type="button"
            className="empdel-btn empdel-btn--ghost"
            onClick={onCancelar}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="empdel-btn empdel-btn--solid-danger"
            onClick={onEliminar}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminarEmpresa;
