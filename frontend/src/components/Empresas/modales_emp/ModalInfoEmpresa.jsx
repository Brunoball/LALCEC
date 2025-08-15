import React, { useState } from "react";
import "./ModalInfoEmpresa.css";

const ModalInfoEmpresa = ({ infoEmpresa, mesesPagados, onCerrar }) => {
  const [modinfo_pestañaActiva, setModinfoPestañaActiva] = useState("general");

  const parseFechaArgentina = (fechaStr) => {
    if (!fechaStr) return new Date('2025-01-01T00:00:00-03:00');
    
    try {
      if (fechaStr instanceof Date && !isNaN(fechaStr.getTime())) {
        return fechaStr;
      }
      
      if (typeof fechaStr === 'string') {
        const fechaCompleta = fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00-03:00`;
        const fecha = new Date(fechaCompleta);
        
        if (!isNaN(fecha.getTime())) {
          return fecha;
        }
      }
      
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset() + 180);
      
      return !isNaN(fecha.getTime()) ? fecha : new Date('2025-01-01T00:00:00-03:00');
    } catch {
      return new Date('2025-01-01T00:00:00-03:00');
    }
  };

  const fechaUnion = parseFechaArgentina(infoEmpresa.Fechaunion);
  
  const formatFecha = (fecha) => {
    return fecha.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const mesUnion = fechaUnion.getMonth();
  const añoUnion = fechaUnion.getFullYear();
  const añoActual = new Date().getFullYear();

  const MESES_ANIO = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  const mesesAMostrar = añoUnion < añoActual 
    ? MESES_ANIO 
    : MESES_ANIO.slice(mesUnion);

  const calcularEstado = () => {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const añoActual = ahora.getFullYear();
    
    const mesesHastaAhora = añoUnion < añoActual 
      ? MESES_ANIO.slice(0, mesActual + 1) 
      : MESES_ANIO.slice(mesUnion, mesActual + 1);
    
    const mesesPagadosHastaAhora = mesesHastaAhora.filter(mes => 
      mesesPagados?.includes(mes)
    );

    const deuda = mesesHastaAhora.length - mesesPagadosHastaAhora.length;

    if (deuda > 0) {
      if (deuda === 1 || deuda === 2) {
        return `Atrasado ${deuda} mes${deuda > 1 ? 'es' : ''}`;
      }
      return `Atrasado (${deuda} meses)`;
    }

    if (mesesPagados?.length === 12) {
      return "Año completo";
    }

    const adelantado = mesesPagados?.length - mesesHastaAhora.length;
    if (adelantado > 0) {
      return `Adelantado (${adelantado} mes${adelantado > 1 ? 'es' : ''})`;
    }

    return "Al día";
  };

  return (
    <div className="modinfo_overlay">
      <div className="modinfo_container">
        <div className="modinfo_header">
          <div className="modinfo_header-content">
            <h2 className="modinfo_title">Información de la Empresa</h2>
            <p className="modinfo_subtitle">CUIT: {infoEmpresa.cuit} | {infoEmpresa.razon_social}</p>
          </div>
          <button 
            className="modinfo_close-btn" 
            onClick={onCerrar}
            aria-label="Cerrar modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modinfo_content">
          <div className="modinfo_tabs">
            <div 
              className={`modinfo_tab ${modinfo_pestañaActiva === 'general' ? 'modinfo_active' : ''}`} 
              onClick={() => setModinfoPestañaActiva('general')}
            >
              General
            </div>
            <div 
              className={`modinfo_tab ${modinfo_pestañaActiva === 'contacto' ? 'modinfo_active' : ''}`} 
              onClick={() => setModinfoPestañaActiva('contacto')}
            >
              Contacto
            </div>
            <div 
              className={`modinfo_tab ${modinfo_pestañaActiva === 'fiscal' ? 'modinfo_active' : ''}`} 
              onClick={() => setModinfoPestañaActiva('fiscal')}
            >
              Datos Fiscales
            </div>
            <div 
              className={`modinfo_tab ${modinfo_pestañaActiva === 'pagos' ? 'modinfo_active' : ''}`} 
              onClick={() => setModinfoPestañaActiva('pagos')}
            >
              Estado de Pagos
            </div>
          </div>

          {modinfo_pestañaActiva === 'general' && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Información Básica</h3>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Razón Social:</span>
                    <span className="modinfo_info-value">{infoEmpresa.razon_social || '-'}</span>
                  </div>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Categoría:</span>
                    <span className="modinfo_info-value">{infoEmpresa.categoria || '-'} (${infoEmpresa.precio_categoria || '0'})</span>
                  </div>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Fecha de Alta:</span>
                    <span className="modinfo_info-value">{formatFecha(fechaUnion)}</span>
                  </div>
                </div>

                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Medio de Pago</h3>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Método:</span>
                    <span className="modinfo_info-value">{infoEmpresa.medio_pago || '-'}</span>
                  </div>
                  <div className="modinfo_info-item modinfo_comentario">
                    <span className="modinfo_info-label">Observaciones:</span>
                    <span className="modinfo_info-value">{infoEmpresa.observacion || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modinfo_pestañaActiva === 'contacto' && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Contacto</h3>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Teléfono:</span>
                    <span className="modinfo_info-value">{infoEmpresa.telefono || '-'}</span>
                  </div>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Email:</span>
                    <span className="modinfo_info-value">{infoEmpresa.email || '-'}</span>
                  </div>
                </div>

                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Direcciones</h3>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Domicilio Legal:</span>
                    <span className="modinfo_info-value">{infoEmpresa.domicilio || '-'} {infoEmpresa.numero || ''}</span>
                  </div>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Domicilio Cobro:</span>
                    <span className="modinfo_info-value">{infoEmpresa.domicilio_2 || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modinfo_pestañaActiva === 'fiscal' && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card modinfo_info-card-full">
                  <h3 className="modinfo_info-card-title">Datos Fiscales</h3>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">CUIT:</span>
                    <span className="modinfo_info-value">{infoEmpresa.cuit || '-'}</span>
                  </div>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Condición IVA:</span>
                    <span className="modinfo_info-value">{infoEmpresa.descripcion_iva || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modinfo_pestañaActiva === 'pagos' && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card modinfo_info-card-full">
                  <h3 className="modinfo_info-card-title">Estado de Pagos</h3>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Estado Actual:</span>
                    <span className={`modinfo_info-value ${
                      calcularEstado().includes('Atrasado') ? 'modinfo_text-danger' : 
                      calcularEstado().includes('Adelantado') ? 'modinfo_text-warning' : 'modinfo_text-success'
                    }`}>
                      {calcularEstado()}
                    </span>
                  </div>
                  
                  <div className="modinfo_meses-container">
                    <h4 className="modinfo_meses-title">Meses Pagados</h4>
                    <div className="modinfo_meses-grid">
                      {mesesAMostrar.map((mes, index) => (
                        <div
                          key={index}
                          className={`modinfo_mes-item ${mesesPagados?.includes(mes) ? 'modinfo_pagado' : 'modinfo_adeudado'}`}
                        >
                          {mes}
                          {mesesPagados?.includes(mes) ? (
                            <span className="modinfo_mes-icon">✓</span>
                          ) : (
                            <span className="modinfo_mes-icon">✗</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="modinfo_leyenda">
                    <div className="modinfo_leyenda-item">
                      <span className="modinfo_leyenda-color modinfo_pagado"></span>
                      <span>Pagado</span>
                    </div>
                    <div className="modinfo_leyenda-item">
                      <span className="modinfo_leyenda-color modinfo_adeudado"></span>
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

export default ModalInfoEmpresa;