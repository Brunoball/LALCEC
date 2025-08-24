// src/components/.../ModalMesCuotas.jsx
import React, { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faCalendarAlt, faPrint } from "@fortawesome/free-solid-svg-icons";
import "./ModalMesCuotas.css";

const ModalMesCuotas = ({
  mesesSeleccionados,
  onMesSeleccionadosChange,
  onCancelar,
  onImprimir,
}) => {
  // ESC para cerrar
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
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  const toggleMes = (mes) => {
    if (mesesSeleccionados.includes(mes)) {
      onMesSeleccionadosChange(mesesSeleccionados.filter((m) => m !== mes));
    } else {
      onMesSeleccionadosChange([...mesesSeleccionados, mes]);
    }
  };

  const seleccionarTodos = () => {
    if (mesesSeleccionados.length === meses.length) {
      onMesSeleccionadosChange([]);
    } else {
      onMesSeleccionadosChange(meses);
    }
  };

  return (
    <div className="mescuot_overlay">
      <div className="mescuot_contenido">
        {/* Header */}
        <div className="mescuot_header">
          <div className="mescuot_header-left">
            <div className="mescuot_icon-circle">
              <FontAwesomeIcon icon={faCalendarAlt} />
            </div>
            <div className="mescuot_header-texts">
              <h2 className="mescuot_title">
                Seleccionar Meses
              </h2>
            </div>
          </div>
          <button className="mescuot_close-btn" onClick={onCancelar} aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="mescuot_body">
          <div className="mescuot_periodos-section">
            <div className="mescuot_section-header">
              <h4 className="mescuot_section-title">Meses disponibles</h4>
              <div className="mescuot_section-header-actions">
                <button
                  type="button"
                  className="mescuot_btn mescuot_btn-small mescuot_btn-terciario"
                  onClick={seleccionarTodos}
                >
                  {mesesSeleccionados.length === meses.length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </button>
              </div>
            </div>

            <div className="mescuot_periodos-grid-container">
              <div className="mescuot_periodos-grid">
                {meses.map((mes, index) => {
                  const checked = mesesSeleccionados.includes(mes);
                  return (
                    /* 👇 Todo el card es un <label>, sin onClick extra */
                    <label
                      key={index}
                      className={`mescuot_periodo-card ${
                        checked ? "mescuot_seleccionado" : ""
                      }`}
                    >
                      <div className="mescuot_periodo-checkbox">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMes(mes)}
                          aria-checked={checked}
                          aria-label={mes}
                          /* el input ya está oculto por CSS */
                        />
                        <span className="mescuot_checkmark" aria-hidden="true" />
                      </div>
                      <span className="mescuot_periodo-label">{mes}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mescuot_footer mescuot_footer-sides">
          <div className="mescuot_footer-left">
            <div className="mescuot_selection-info">
              {mesesSeleccionados.length > 0
                ? `${mesesSeleccionados.length} seleccionados`
                : "Ninguno seleccionado"}
            </div>
          </div>
          <div className="mescuot_footer-right">
            <button
              type="button"
              className="mescuot_btn mescuot_btn-secondary mescuot_action-btn"
              onClick={onCancelar}
            >
              <FontAwesomeIcon icon={faTimes} />
              <span className="btn-label">Cancelar</span>
            </button>
            <button
              type="button"
              className="mescuot_btn mescuot_btn-primary mescuot_action-btn"
              onClick={onImprimir}
              disabled={mesesSeleccionados.length === 0}
            >
              <FontAwesomeIcon icon={faPrint} />
              <span className="btn-label">Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalMesCuotas;
