import React, { useState, useEffect } from 'react';
import BASE_URL from "../../config/config";
import './ModalPagos.css';

const ModalPagos = ({ nombre, apellido, cerrarModal, onPagoRealizado }) => {
  const [mesesSeleccionados, setMesesSeleccionados] = useState([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [precioMensual, setPrecioMensual] = useState(0);
  const [error, setError] = useState('');
  const [mesesPagados, setMesesPagados] = useState([]);
  const [fechaUnion, setFechaUnion] = useState(null);
  const [socioData, setSocioData] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-AR');
  };

  useEffect(() => {
    const obtenerDatosSocio = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api.php?action=monto_pago`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, apellido })
        });

        const result = await response.json();

        if (result.success) {
          setPrecioMensual(result.precioMes || 0);
          setMesesPagados(result.mesesPagados || []);
          setFechaUnion(result.fechaUnion || new Date().toISOString().split('T')[0]);
          setSocioData({
            domicilio: result.domicilio || '',
            categoria: result.categoria || '',
            cobrador: result.cobrador || ''
          });
        } else {
          setError(result.message || "Error al obtener datos del socio");
        }
      } catch (error) {
        setError("Ocurrió un error al obtener los datos del socio.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    obtenerDatosSocio();
  }, [nombre, apellido]);

  const totalPagar = mesesSeleccionados.length * precioMensual;

  const getMesesDisponibles = () => {
    if (!fechaUnion) return [];
    try {
      const fechaUnionObj = new Date(fechaUnion + 'T00:00:00');
      const mesUnion = fechaUnionObj.getMonth() + 1;
      const añoActual = new Date().getFullYear();
      const añoUnion = fechaUnionObj.getFullYear();

      if (añoUnion === añoActual) {
        return [...Array(12 - mesUnion + 1)].map((_, i) => ({
          id: mesUnion + i,
          nombre: new Date(0, mesUnion + i - 1).toLocaleString('es', { month: 'long' }).toUpperCase()
        }));
      }
      return [...Array(12)].map((_, i) => ({
        id: i + 1,
        nombre: new Date(0, i).toLocaleString('es', { month: 'long' }).toUpperCase()
      }));
    } catch (e) {
      console.error("Error al procesar fecha de unión:", e);
      return [];
    }
  };

  const meses = getMesesDisponibles();

  const handleSeleccionarMes = (mes) => {
    if (mesesPagados.includes(mes)) return;
    setMesesSeleccionados(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const handleSeleccionarTodos = () => {
    const mesesDisponibles = meses.filter(m => !mesesPagados.includes(m.id)).map(m => m.id);
    setMesesSeleccionados(todosSeleccionados ? [] : mesesDisponibles);
    setTodosSeleccionados(!todosSeleccionados);
  };

  const handleRealizarPago = async () => {
    if (mesesSeleccionados.length === 0) return;

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=registrar_pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          apellido,
          meses: mesesSeleccionados
        })
      });

      const result = await response.json();

      if (result.success) {
        setPagoExitoso(true);
      } else {
        setError(result.message || "Error al registrar el pago");
      }
    } catch (error) {
      setError("Ocurrió un error al realizar el pago.");
      console.error(error);
    }
  };

  const handleImprimirComprobante = () => {
    if (!socioData || mesesSeleccionados.length === 0) return;

    const domicilioMostrar = socioData.domicilio_2 || socioData.domicilio || 'Domicilio no registrado';
    
    const mesesPagadosStr = meses
      .filter(m => mesesSeleccionados.includes(m.id))
      .map(m => m.nombre)
      .join(", ");

    const comprobanteHTML = `
      <html>
      <head>
        <title>Comprobante de Pago</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body {
            width: 210mm; height: 297mm;
            margin: 0; padding: 0;
            font-family: Arial, sans-serif;
            font-size: 12px;
            display: flex; justify-content: center; align-items: center;
          }
          .contenedor {
            width: 210mm; height: 70mm;
            position: absolute;
            top: 33%; left: 50%;
            transform: translate(-50%, -50%) rotate(90deg);
            transform-origin: center center;
            box-sizing: border-box;
          }
          .comprobante {
            width: 100%; height: 100%;
            display: flex; box-sizing: border-box;
          }
          .talon-socio {
            width: 60%; padding-left: 20mm; padding-top: 13mm;
          }
          .talon-cobrador {
            width: 60mm; padding-left: 10mm; padding-top: 16mm;
          }
          p { margin-top: 5px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="contenedor">
          <div class="comprobante">
            <div class="talon-socio">
              <p><strong>Afiliado:</strong> ${nombre} ${apellido}</p>
              <p><strong>Domicilio:</strong> ${domicilioMostrar}</p>
              <p><strong>Categoría / Monto:</strong> ${socioData.categoria} / $${totalPagar}</p>
              <p><strong>Período:</strong> ${mesesPagadosStr}</p>
              <p><strong>Cobrador:</strong> ${socioData.cobrador}</p>
              <p><strong>Estado:</strong> PAGADO</p>
              <p>Por consultas comunicarse al 03564-15205778</p>
            </div>
            <div class="talon-cobrador">
              <p><strong>Nombre y Apellido:</strong> ${nombre} ${apellido}</p>
              <p><strong>Categoría / Monto:</strong> ${socioData.categoria} / $${totalPagar}</p>
              <p><strong>Período:</strong> ${mesesPagadosStr}</p>
              <p><strong>Cobrador:</strong> ${socioData.cobrador}</p>
              <p><strong>Estado:</strong> PAGADO</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '', 'width=600,height=400');
    ventana.document.write(comprobanteHTML);
    ventana.document.close();
    ventana.print();
  };

  if (loading) {
    return (
      <div className="modal-s-container">
        <div className="modal-s-content">
          <p>Cargando datos del socio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-s-container">
        <div className="modal-s-content">
          <p className="modal-s-error-message">{error}</p>
          <button className="modal-s-cancel-button" onClick={cerrarModal}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-s-container">
      {pagoExitoso ? (
        <div className="modal-s-success-message">
          <h2 className="modal-s-success-title">¡Pago realizado con éxito!</h2>
          <div className="modal-s-buttons-container">
            <button 
              className="modal-s-cancel-button" 
              onClick={() => {
                if (onPagoRealizado) onPagoRealizado();
                cerrarModal();
              }}
            >
              Cerrar
            </button>
            <button 
              className="modal-s-receipt-button" 
              onClick={handleImprimirComprobante}
              disabled={mesesSeleccionados.length === 0}
            >
              Generar Comprobante
            </button>
          </div>
        </div>
      ) : (
        <div className="modal-s-header modal-s-content">
          <h1 className="modal-s-title">Modal de Pagos</h1>
          <p className="modal-s-subtitle">Socio: {nombre} {apellido}</p>
          {fechaUnion && <p className="modal-s-subtitle">Fecha de alta: {formatDate(fechaUnion)}</p>}

          {error && <p className="modal-s-error-message">{error}</p>}

          <div className="modal-s-table-container">
            {/* Encabezado de la tabla con divs */}
            <div className="modal-s-table-header">
              <div className="modal-s-th">Mes</div>
              <div className="modal-s-th">Seleccionar</div>
            </div>
            
            {/* Cuerpo de la tabla con divs */}
            <div className="modal-s-table-body">
              {meses.map((mes) => (
                <div 
                  key={mes.id}
                  className={`modal-s-row ${mesesPagados.includes(mes.id) ? "modal-s-row-disabled" : ""}`}
                >
                  <div className="modal-s-td">{mes.nombre}</div>
                  <div className="modal-s-td">
                    <input
                      type="checkbox"
                      checked={mesesSeleccionados.includes(mes.id)}
                      onChange={() => handleSeleccionarMes(mes.id)}
                      className="modal-s-checkbox"
                      disabled={mesesPagados.includes(mes.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-s-select-all-container">
            <input
              type="checkbox"
              checked={todosSeleccionados}
              onChange={handleSeleccionarTodos}
              className="modal-s-checkbox"
              disabled={mesesPagados.length === meses.length}
            />
            <label className="modal-s-select-all-label">Todos los meses disponibles</label>
            <h2 className="modal-s-total-amount">Total a pagar: ${totalPagar}</h2>
          </div>

          <div className="modal-s-buttons-container">
            <button
              className="modal-s-button modal-s-cancel-button"
              onClick={cerrarModal}
            >
              Cerrar
            </button>
            <button 
              className="modal-s-button modal-s-pay-button" 
              onClick={handleRealizarPago}
              disabled={mesesSeleccionados.length === 0}
            >
              Realizar Pago
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalPagos;