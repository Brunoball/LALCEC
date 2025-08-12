import React, { useState, useEffect } from "react";
import "./ModalMes.css";

const meses = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const ModalMes = ({ mesSeleccionado, onMesSeleccionado, onCancelar, onImprimir }) => {
  const [seleccionados, setSeleccionados] = useState([]);

  useEffect(() => {
    if (Array.isArray(mesSeleccionado)) {
      setSeleccionados(mesSeleccionado);
    } else if (typeof mesSeleccionado === "string" && mesSeleccionado !== "") {
      setSeleccionados([mesSeleccionado]);
    }
  }, [mesSeleccionado]);

  const toggleMes = (mes) => {
    setSeleccionados((prev) =>
      prev.includes(mes)
        ? prev.filter((m) => m !== mes)
        : [...prev, mes]
    );
  };

  const handleConfirmar = () => {
    if (seleccionados.length === 0) return;
    onMesSeleccionado(seleccionados);
    onImprimir(seleccionados);
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3 className="modal-title">Seleccionar Meses para Comprobantes</h3>
        <div className="meses-container">
          {meses.map((mes, index) => (
            <button
              key={index}
              className={`mes-button ${seleccionados.includes(mes) ? "selected" : ""}`}
              onClick={() => toggleMes(mes)}
            >
              {mes}
            </button>
          ))}
        </div>

        <div className="modal-buttons">
          <button className="modal-button cancel-button" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className="modal-button accept-button"
            onClick={handleConfirmar}
            disabled={seleccionados.length === 0}
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMes;
