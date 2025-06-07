import React, { useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faSpinner,
  faInfoCircle
} from "@fortawesome/free-solid-svg-icons";
import './Toast.css';

const Toast = ({ tipo, mensaje, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const iconos = {
    exito: faCheckCircle,
    error: faTimesCircle,
    advertencia: faExclamationTriangle,
    cargando: faSpinner
  };

  const clasesTipo = {
    exito: 'toast-exito',
    error: 'toast-error',
    advertencia: 'toast-advertencia',
    cargando: 'toast-cargando'
  };

  const iconoSeleccionado = iconos[tipo] || faInfoCircle;
  const claseSeleccionada = clasesTipo[tipo] || 'toast-info';

  return (
    <div className={`toast-container ${claseSeleccionada}`}>
      <FontAwesomeIcon
        icon={iconoSeleccionado}
        className={`toast-icon ${tipo === 'cargando' ? 'spin' : ''}`}
      />
      <span className="toast-message">{mensaje}</span>
    </div>
  );
};

export default Toast;
