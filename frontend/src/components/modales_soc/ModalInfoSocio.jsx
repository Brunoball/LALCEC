import React from "react";
import "./ModalInfo.css";

const ModalInfo = ({ infoSocio, mesesPagados, onCerrar }) => {
  // Función para parsear fecha en zona horaria Argentina (UTC-3)
  const parseFechaArgentina = (fechaStr) => {
    if (!fechaStr) return new Date('2025-01-01T00:00:00-03:00'); // Fecha por defecto en ARG
    
    try {
      // Si ya es un objeto Date válido
      if (fechaStr instanceof Date && !isNaN(fechaStr.getTime())) {
        return fechaStr;
      }
      
      // Si es un string ISO (de la base de datos)
      if (typeof fechaStr === 'string') {
        // Asegurarnos que tenga formato completo (añadir hora 00:00 en ARG si no la tiene)
        const fechaCompleta = fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00-03:00`;
        const fecha = new Date(fechaCompleta);
        
        // Validar fecha
        if (!isNaN(fecha.getTime())) {
          return fecha;
        }
      }
      
      // Parsear otros formatos (como 'YYYY-MM-DD')
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset() + 180); // Ajuste ARG (UTC-3)
      
      return !isNaN(fecha.getTime()) ? fecha : new Date('2025-01-01T00:00:00-03:00');
    } catch {
      return new Date('2025-01-01T00:00:00-03:00');
    }
  };

  // Obtener fecha de alta ajustada a zona horaria Argentina
  const fechaUnion = parseFechaArgentina(infoSocio.Fechaunion);
  
  // Formatear fecha para mostrar (DD/MM/YYYY)
  const formatFecha = (fecha) => {
    return fecha.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obtener mes y año de ingreso (en zona horaria ARG)
  const mesUnion = fechaUnion.getMonth(); // 0 (Enero) a 11 (Diciembre)
  const añoUnion = fechaUnion.getFullYear();
  const añoActual = new Date().getFullYear();

  // Lista de todos los meses del año en MAYÚSCULAS
  const MESES_ANIO = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  // Determinar qué meses mostrar
  const mesesAMostrar = añoUnion < añoActual 
    ? MESES_ANIO 
    : MESES_ANIO.slice(mesUnion);

  // Calcular estado de pagos
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
        return `⚠️ Atrasado ${deuda} mes${deuda > 1 ? 'es' : ''}`;
      }
      return `🚫 Atrasado (${deuda} meses)`;
    }

    if (mesesPagados?.length === 12) {
      return "🎯 Año completo";
    }

    const adelantado = mesesPagados?.length - mesesHastaAhora.length;
    if (adelantado > 0) {
      return `📅 Adelantado (${adelantado} mes${adelantado > 1 ? 'es' : ''})`;
    }

    return "✅ Al día";
  };

  return (
    <div className="modal-socio">
      <div className="modal-socio-content">
        <h3 className="modal-socio-title">Información del Socio</h3>
        <div className="modal-socio-info">
          <p><strong>Nombre:</strong> {infoSocio.nombre} {infoSocio.apellido}</p>
          <p><strong>DNI:</strong> {infoSocio.DNI}</p>
          <p><strong>Teléfono:</strong> {infoSocio.telefono}</p>
          <p><strong>Domicilio:</strong> {infoSocio.domicilio} {infoSocio.numero}</p>
          <p><strong>Domicilio Cobro:</strong> {infoSocio.domicilio_2}</p>
          <p><strong>Categoría:</strong> {infoSocio.categoria} (${infoSocio.precio_categoria})</p>
          <p><strong>Medio de Pago:</strong> {infoSocio.medio_pago}</p>
          <p><strong>Fecha de Alta:</strong> {formatFecha(fechaUnion)}</p>
          <p><strong>Observaciones:</strong> {infoSocio.observacion}</p>
        </div>

        <div className="modal-socio-meses">
          <h4 className="modal-socio-subtitle">
            Estado de Meses: 
            <span className="modal-socio-estado">
              {calcularEstado()}
            </span>
          </h4>

          <div className="modal-socio-meses-container">
            {mesesAMostrar.map((mes, index) => (
              <span
                key={index}
                className={
                  mesesPagados?.includes(mes)
                    ? "modal-socio-mes modal-socio-pagado"
                    : "modal-socio-mes modal-socio-adeudado"
                }
              >
                {mes}
              </span>
            ))}
          </div>
        </div>

        <div className="modal-socio-buttons">
          <button 
            className="modal-socio-button cerrar-button" 
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalInfo;