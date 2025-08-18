import React, { useState, useEffect } from "react";
import "./ModalInfoSocio.css";

const ModalInfoSocio = ({ infoSocio, mesesPagados, onCerrar }) => {
  const [socio_pestañaActiva, setSocioPestañaActiva] = useState("general");

  // 👉 Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCerrar();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCerrar]);

  const parseFechaArgentina = (fechaStr) => {
    if (!fechaStr) return new Date('2025-01-01T00:00:00-03:00');
    try {
      if (fechaStr instanceof Date && !isNaN(fechaStr.getTime())) return fechaStr;
      if (typeof fechaStr === 'string') {
        const fechaCompleta = fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00-03:00`;
        const fecha = new Date(fechaCompleta);
        if (!isNaN(fecha.getTime())) return fecha;
      }
      const [year, month, day] = String(fechaStr).split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset() + 180);
      return !isNaN(fecha.getTime()) ? fecha : new Date('2025-01-01T00:00:00-03:00');
    } catch {
      return new Date('2025-01-01T00:00:00-03:00');
    }
  };

  const fechaUnion = parseFechaArgentina(infoSocio.Fechaunion);

  const formatFecha = (fecha) =>
    fecha.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

  const MESES_ANIO = [
    "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
    "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
  ];

  const mesesPagadosNorm = Array.isArray(mesesPagados)
    ? mesesPagados
        .map(m => String(m).trim().toUpperCase())
        .filter(m => MESES_ANIO.includes(m))
    : [];
  const mesesPagadosSet = new Set(mesesPagadosNorm);

  const mesUnion = fechaUnion.getMonth();
  const añoUnion = fechaUnion.getFullYear();
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  const mesesAMostrar = (añoUnion < añoActual)
    ? MESES_ANIO
    : MESES_ANIO.slice(mesUnion);

  const calcularEstado = () => {
    const mesesHastaAhora = (añoUnion < añoActual)
      ? MESES_ANIO.slice(0, mesActual + 1)
      : MESES_ANIO.slice(mesUnion, mesActual + 1);

    const pagadosHastaHoy = mesesHastaAhora.reduce(
      (acc, mes) => acc + (mesesPagadosSet.has(mes) ? 1 : 0),
      0
    );

    const deuda = mesesHastaAhora.length - pagadosHastaHoy;
    if (deuda > 0) {
      return deuda <= 2
        ? `Atrasado ${deuda} mes${deuda > 1 ? 'es' : ''}`
        : `Atrasado (${deuda} meses)`;
    }

    const mesesFuturos = MESES_ANIO.slice(mesActual + 1);
    const adelantados = mesesFuturos.reduce(
      (acc, mes) => acc + (mesesPagadosSet.has(mes) ? 1 : 0),
      0
    );

    if (adelantados > 0) {
      return `Adelantado (${adelantados} mes${adelantados > 1 ? 'es' : ''})`;
    }

    if (mesesPagadosSet.size === 12) {
      return "Año completo";
    }

    return "Al día";
  };

  return (
    <div className="socio_overlay">
      <div className="socio_container">
        <div className="socio_header">
          <div className="socio_header-content">
            <h2 className="socio_title">Información del Socio</h2>
            <p className="socio_subtitle">
              DNI: {infoSocio.DNI} | {infoSocio.nombre} {infoSocio.apellido}
            </p>
          </div>
          <button className="socio_close-btn" onClick={onCerrar} aria-label="Cerrar modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* resto del contenido igual */}
      </div>
    </div>
  );
};

export default ModalInfoSocio;
