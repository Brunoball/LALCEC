import React, { useEffect, useState } from 'react';
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
  const [desapareciendo, setDesapareciendo] = useState(false);

  useEffect(() => {
    const mostrarTimer = setTimeout(() => {
      setDesapareciendo(true);
    }, 1000); // mostrar solo 1 segundo

    const ocultarTimer = setTimeout(() => {
      onClose();
    }, 1500); // animación de salida de 0.5 segundos

    return () => {
      clearTimeout(mostrarTimer);
      clearTimeout(ocultarTimer);
    };
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
    <div className={`toast-container ${claseSeleccionada} ${desapareciendo ? 'desaparecer' : ''}`}>
      <FontAwesomeIcon
        icon={iconoSeleccionado}
        className={`toast-icon ${tipo === 'cargando' ? 'spin' : ''}`}
      />
      <span className="toast-message">{mensaje}</span>
    </div>
  );
};

export default Toast;
