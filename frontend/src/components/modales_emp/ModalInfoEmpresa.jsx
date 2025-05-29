import React from "react";
import "./ModalInfoEmpresa.css";

const ModalInfoEmpresa = ({ infoEmpresa, mesesPagados, onCerrar }) => {
  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  return (
    <div className="modal-empresa">
      <div className="modal-empresa-content">
        <h3 className="modal-empresa-title">Información de la Empresa</h3>
        <div className="modal-empresa-scrollable">
          <div className="modal-empresa-info">
            <p><strong>Razón Social:</strong> {infoEmpresa.razon_social}</p>
            <p><strong>CUIT:</strong> {infoEmpresa.cuit}</p>
            <p><strong>Condición IVA:</strong> {infoEmpresa.descripcion_iva}</p>
            <p><strong>Teléfono:</strong> {infoEmpresa.telefono}</p>
            <p><strong>Domicilio Legal:</strong> {infoEmpresa.domicilio} {infoEmpresa.numero}</p>
            <p><strong>Domicilio Cobro:</strong> {infoEmpresa.domicilio_2}</p>
            <p><strong>Categoría:</strong> {infoEmpresa.categoria} (${infoEmpresa.precio_categoria})</p>
            <p><strong>Medio de Pago:</strong> {infoEmpresa.medio_pago}</p>
            <p><strong>Observaciones:</strong> {infoEmpresa.observacion}</p>
          </div>

          <div className="modal-empresa-meses">
            <h4 className="modal-empresa-subtitle">
              Estado de Meses: 
              <span className="modal-empresa-estado">
                {(() => {
                  const mesActual = new Date().getMonth();
                  const mesesHastaAhora = meses.slice(0, mesActual + 1);
                  const mesesPagadosHastaAhora = mesesHastaAhora.filter(mes =>
                    mesesPagados.includes(mes)
                  );
                  const cantidadEsperada = mesesHastaAhora.length;
                  const cantidadPagosHastaAhora = mesesPagadosHastaAhora.length;
                  const pagosTotales = mesesPagados.length;
                  const deuda = cantidadEsperada - cantidadPagosHastaAhora;

                  if (deuda > 0) {
                    if (deuda === 1 || deuda === 2) {
                      return `⚠️ Atrasado ${deuda} mes${deuda > 1 ? 'es' : ''}`;
                    }
                    return `🚫 Atrasado (${deuda} meses)`;
                  }
                  if (pagosTotales === 12) {
                    return "🎯 Año completo";
                  }
                  const adelantado = pagosTotales - cantidadEsperada;
                  if (adelantado > 0) {
                    return `📅 Adelantado (${adelantado} mes${adelantado > 1 ? 'es' : ''})`;
                  }
                  return "✅ Al día";
                })()}
              </span>
            </h4>

            <div className="modal-empresa-meses-container">
              {meses.map((mes, index) => (
                <span
                  key={index}
                  className={
                    mesesPagados.includes(mes)
                      ? "modal-empresa-mes modal-empresa-pagado"
                      : "modal-empresa-mes modal-empresa-adeudado"
                  }
                >
                  {mes}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-empresa-buttons">
          <button 
            className="modal-empresa-button cerrar-button" 
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalInfoEmpresa;