import React, { useState } from "react";
import "./ModalInfoSocio.css";

const ModalInfoSocio = ({ infoSocio, mesesPagados, onCerrar }) => {
  const [socio_pestañaActiva, setSocioPestañaActiva] = useState("general");

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

  // --- Normalización robusta de mesesPagados ---
  const mesesPagadosNorm = Array.isArray(mesesPagados)
    ? mesesPagados
        .map(m => String(m).trim().toUpperCase())
        .filter(m => MESES_ANIO.includes(m))
    : [];
  const mesesPagadosSet = new Set(mesesPagadosNorm);

  // Rango a mostrar en la grilla (desde mes de alta hasta dic si es mismo año;
  // si el alta fue otro año, se muestran los 12 meses)
  const mesUnion = fechaUnion.getMonth();
  const añoUnion = fechaUnion.getFullYear();
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  const mesesAMostrar = (añoUnion < añoActual)
    ? MESES_ANIO
    : MESES_ANIO.slice(mesUnion);

  // ===== Fix de estado de pagos =====
  const calcularEstado = () => {
    // Meses que “corresponden” hasta hoy:
    const mesesHastaAhora = (añoUnion < añoActual)
      ? MESES_ANIO.slice(0, mesActual + 1)                // todo el año hasta hoy
      : MESES_ANIO.slice(mesUnion, mesActual + 1);        // desde alta hasta hoy

    // Pagos efectivamente hechos HASTA HOY (intersección)
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

    // Si está al día, vemos si hay meses futuros pagos (adelantado)
    const mesesFuturos = MESES_ANIO.slice(mesActual + 1); // sólo posteriores a hoy (del mismo año)
    const adelantados = mesesFuturos.reduce(
      (acc, mes) => acc + (mesesPagadosSet.has(mes) ? 1 : 0),
      0
    );

    if (adelantados > 0) {
      return `Adelantado (${adelantados} mes${adelantados > 1 ? 'es' : ''})`;
    }

    // Año completo (12 pagos) sólo si realmente hay 12 distintos
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

        <div className="socio_content">
          <div className="socio_tabs">
            <div className={`socio_tab ${socio_pestañaActiva === 'general' ? 'socio_active' : ''}`} onClick={() => setSocioPestañaActiva('general')}>General</div>
            <div className={`socio_tab ${socio_pestañaActiva === 'contacto' ? 'socio_active' : ''}`} onClick={() => setSocioPestañaActiva('contacto')}>Contacto</div>
            <div className={`socio_tab ${socio_pestañaActiva === 'pagos' ? 'socio_active' : ''}`} onClick={() => setSocioPestañaActiva('pagos')}>Estado de Pagos</div>
          </div>

          {socio_pestañaActiva === 'general' && (
            <div className="socio_tab-content socio_active">
              <div className="socio_info-grid">
                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Información Básica</h3>
                  <div className="socio_info-item"><span className="socio_info-label">Nombre:</span><span className="socio_info-value">{infoSocio.nombre || '-'}</span></div>
                  <div className="socio_info-item"><span className="socio_info-label">Apellido:</span><span className="socio_info-value">{infoSocio.apellido || '-'}</span></div>
                  <div className="socio_info-item"><span className="socio_info-label">DNI:</span><span className="socio_info-value">{infoSocio.DNI || '-'}</span></div>
                  <div className="socio_info-item"><span className="socio_info-label">Fecha de Alta:</span><span className="socio_info-value">{formatFecha(fechaUnion)}</span></div>
                </div>

                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Datos de Membresía</h3>
                  <div className="socio_info-item"><span className="socio_info-label">Categoría:</span><span className="socio_info-value">{infoSocio.categoria || '-'} (${infoSocio.precio_categoria || '0'})</span></div>
                  <div className="socio_info-item"><span className="socio_info-label">Medio de Pago:</span><span className="socio_info-value">{infoSocio.medio_pago || '-'}</span></div>
                  <div className="socio_info-item socio_comentario"><span className="socio_info-label">Observaciones:</span><span className="socio_info-value">{infoSocio.observacion || '-'}</span></div>
                </div>
              </div>
            </div>
          )}

          {socio_pestañaActiva === 'contacto' && (
            <div className="socio_tab-content socio_active">
              <div className="socio_info-grid">
                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Contacto</h3>
                  <div className="socio_info-item"><span className="socio_info-label">Teléfono:</span><span className="socio_info-value">{infoSocio.telefono || '-'}</span></div>
                  <div className="socio_info-item"><span className="socio_info-label">Email:</span><span className="socio_info-value">{infoSocio.email || '-'}</span></div>
                </div>

                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Direcciones</h3>
                  <div className="socio_info-item"><span className="socio_info-label">Domicilio:</span><span className="socio_info-value">{infoSocio.domicilio || '-'} {infoSocio.numero || ''}</span></div>
                  <div className="socio_info-item"><span className="socio_info-label">Domicilio Cobro:</span><span className="socio_info-value">{infoSocio.domicilio_2 || '-'}</span></div>
                </div>
              </div>
            </div>
          )}

          {socio_pestañaActiva === 'pagos' && (
            <div className="socio_tab-content socio_active">
              <div className="socio_info-grid">
                <div className="socio_info-card socio_info-card-full">
                  <h3 className="socio_info-card-title">Estado de Pagos</h3>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Estado Actual:</span>
                    <span
                      className={`socio_info-value ${
                        calcularEstado().includes('Atrasado')
                          ? 'socio_text-danger'
                          : calcularEstado().includes('Adelantado')
                          ? 'socio_text-warning'
                          : 'socio_text-success'
                      }`}
                    >
                      {calcularEstado()}
                    </span>
                  </div>

                  <div className="socio_meses-container">
                    <h4 className="socio_meses-title">Meses Pagados</h4>
                    <div className="socio_meses-grid">
                      {mesesAMostrar.map((mes, index) => (
                        <div
                          key={index}
                          className={`socio_mes-item ${mesesPagadosSet.has(mes) ? 'socio_pagado' : 'socio_adeudado'}`}
                        >
                          {mes}
                          {mesesPagadosSet.has(mes) ? (
                            <span className="socio_mes-icon">✓</span>
                          ) : (
                            <span className="socio_mes-icon">✗</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="socio_leyenda">
                    <div className="socio_leyenda-item">
                      <span className="socio_leyenda-color socio_pagado"></span>
                      <span>Pagado</span>
                    </div>
                    <div className="socio_leyenda-item">
                      <span className="socio_leyenda-color socio_adeudado"></span>
                      <span>Pendiente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalInfoSocio;
