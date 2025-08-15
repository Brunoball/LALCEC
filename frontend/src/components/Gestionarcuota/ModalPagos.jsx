import React, { useState, useEffect } from 'react';
import { FaCoins } from 'react-icons/fa';
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
            domicilio_2: result.domicilio_2 || '',
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

  const getMesesDisponibles = () => {
    if (!fechaUnion) return [];
    try {
      const fechaUnionObj = new Date(fechaUnion + 'T00:00:00');
      const mesUnion = fechaUnionObj.getMonth() + 1;
      const añoActual = new Date().getFullYear();
      const añoUnion = fechaUnionObj.getFullYear();

      const makeMes = (id) => ({
        id,
        nombre: new Date(0, id - 1).toLocaleString('es', { month: 'long' }).toUpperCase()
      });

      if (añoUnion === añoActual) {
        return [...Array(12 - mesUnion + 1)].map((_, i) => makeMes(mesUnion + i));
      }
      return [...Array(12)].map((_, i) => makeMes(i + 1));
    } catch (e) {
      console.error("Error al procesar fecha de unión:", e);
      return [];
    }
  };

  const meses = getMesesDisponibles();
  const totalPagar = mesesSeleccionados.length * precioMensual;

  const handleSeleccionarMes = (mesId, yaPagado) => {
    if (yaPagado) return;
    setMesesSeleccionados(prev =>
      prev.includes(mesId) ? prev.filter(m => m !== mesId) : [...prev, mesId]
    );
  };

  const handleSeleccionarTodos = () => {
    const disponibles = meses
      .filter(m => !mesesPagados.includes(m.id))
      .map(m => m.id);

    if (todosSeleccionados) {
      setMesesSeleccionados([]);
    } else {
      setMesesSeleccionados(disponibles);
    }
    setTodosSeleccionados(!todosSeleccionados);
  };

  useEffect(() => {
    const disponibles = meses.filter(m => !mesesPagados.includes(m.id)).map(m => m.id);
    const todos = disponibles.length > 0 && disponibles.every(id => mesesSeleccionados.includes(id));
    setTodosSeleccionados(todos);
  }, [mesesSeleccionados, mesesPagados, fechaUnion]);

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
      <div className="modpag_overlay">
        <div className="modpag_contenido">
          <div className="modpag_header">
            <div className="modpag_header-left">
              <div className="modpag_icon-circle"><FaCoins size={20} /></div>
              <div className="modpag_header-texts">
                <h2 className="modpag_title">Registro de Pagos</h2>
              </div>
            </div>
            <button className="modpag_close-btn" disabled>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="modpag_body">
            <div className="modpag_loading-state">
              <div className="modpag_spinner"></div>
              <span>Cargando datos del socio...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modpag_overlay">
        <div className="modpag_contenido">
          <div className="modpag_header">
            <div className="modpag_header-left">
              <div className="modpag_icon-circle"><FaCoins size={20} /></div>
              <div className="modpag_header-texts">
                <h2 className="modpag_title">Registro de Pagos</h2>
              </div>
            </div>
            <button className="modpag_close-btn" onClick={cerrarModal}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="modpag_body">
            <div className="modpag_info-summary">
              <div className="modpag_info-row">
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Socio</span>
                  <span className="modpag_info-value">{nombre} {apellido}</span>
                </div>
                {fechaUnion && (
                  <div className="modpag_info-item">
                    <span className="modpag_info-label">Fecha de alta</span>
                    <span className="modpag_info-value">{formatDate(fechaUnion)}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="modpag_error-banner">{error}</p>
          </div>
          <div className="modpag_footer modpag_footer-sides">
            <div className="modpag_footer-left" />
            <div className="modpag_footer-right">
              <button className="modpag_btn modpag_btn-secondary" onClick={cerrarModal}>Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pagoExitoso) {
    return (
      <div className="modpag_overlay">
        <div className="modpag_contenido">
          <div className="modpag_header">
            <div className="modpag_header-left">
              <div className="modpag_icon-circle"><FaCoins size={20} /></div>
              <div className="modpag_header-texts">
                <h2 className="modpag_title">Registro de Pagos</h2>
              </div>
            </div>
            <button className="modpag_close-btn" onClick={() => { if (onPagoRealizado) onPagoRealizado(); cerrarModal(); }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="modpag_body">
            <div className="modpag_info-summary">
              <div className="modpag_info-row">
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Socio</span>
                  <span className="modpag_info-value">{nombre} {apellido}</span>
                </div>
                {fechaUnion && (
                  <div className="modpag_info-item">
                    <span className="modpag_info-label">Fecha de alta</span>
                    <span className="modpag_info-value">{formatDate(fechaUnion)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modpag_success">
              <h2 className="modpag_success-title">¡Pago realizado con éxito!</h2>
              <p className="modpag_success-subtitle">Podés generar el comprobante ahora mismo.</p>
            </div>
          </div>

          <div className="modpag_footer modpag_footer-sides">
            <div className="modpag_footer-left">
              <div className="modpag_total-pill modpag_total-pill-inline">Total: ${totalPagar}</div>
            </div>
            <div className="modpag_footer-right">
              <button
                className="modpag_btn modpag_btn-secondary"
                onClick={() => { if (onPagoRealizado) onPagoRealizado(); cerrarModal(); }}
              >
                Cerrar
              </button>
              <button
                className="modpag_btn modpag_btn-success"
                onClick={handleImprimirComprobante}
                disabled={mesesSeleccionados.length === 0}
              >
                Comprobante
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modpag_overlay">
      <div className="modpag_contenido">
        <div className="modpag_header">
          <div className="modpag_header-left">
            <div className="modpag_icon-circle"><FaCoins size={20} /></div>
            <div className="modpag_header-texts">
              <h2 className="modpag_title">Registro de Pagos</h2>
            </div>
          </div>
          <button className="modpag_close-btn" onClick={cerrarModal}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="modpag_body">
          {error && <p className="modpag_error-banner">{error}</p>}

          <div className="modpag_info-summary">
            <div className="modpag_info-row">
              <div className="modpag_info-item">
                <span className="modpag_info-label">Socio</span>
                <span className="modpag_info-value modpag_info-value-highlight">{nombre} {apellido}</span>
              </div>
              {fechaUnion && (
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Fecha de alta</span>
                  <span className="modpag_info-value modpag_info-value-highlight">{formatDate(fechaUnion)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="modpag_periodos-section">
            <div className="modpag_section-header">
              <h4 className="modpag_section-title">Meses disponibles</h4>
              <div className="modpag_section-header-actions">
                <button
                  className="modpag_btn modpag_btn-small modpag_btn-terciario"
                  onClick={handleSeleccionarTodos}
                  disabled={meses.filter(m => !mesesPagados.includes(m.id)).length === 0}
                >
                  {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                <div className="modpag_selection-info">
                  {mesesSeleccionados.length > 0 ? `${mesesSeleccionados.length} seleccionados` : 'Ninguno seleccionado'}
                </div>
              </div>
            </div>

            <div className="modpag_periodos-grid-container">
              <div className="modpag_periodos-grid">
                {meses.map((mes) => {
                  const yaPagado = mesesPagados.includes(mes.id);
                  const checked = mesesSeleccionados.includes(mes.id);
                  return (
                    <div
                      key={mes.id}
                      className={`modpag_periodo-card ${yaPagado ? 'modpag_pagado' : ''} ${checked ? 'modpag_seleccionado' : ''}`}
                      onClick={() => handleSeleccionarMes(mes.id, yaPagado)}
                    >
                      <div className="modpag_periodo-checkbox">
                        <input
                          type="checkbox"
                          id={`periodo-${mes.id}`}
                          checked={checked}
                          onChange={() => handleSeleccionarMes(mes.id, yaPagado)}
                          disabled={yaPagado}
                        />
                        <span className="modpag_checkmark"></span>
                      </div>
                      <label htmlFor={`periodo-${mes.id}`} className="modpag_periodo-label">
                        {mes.nombre}
                        {yaPagado && (
                          <span className="modpag_periodo-status">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Pagado
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="modpag_footer modpag_footer-sides">
          <div className="modpag_footer-left">
            <div className="modpag_total-pill modpag_total-pill-inline">Total a pagar: ${totalPagar}</div>
          </div>
          <div className="modpag_footer-right">
            <button className="modpag_btn modpag_btn-secondary" onClick={cerrarModal}>Cerrar</button>
            <button
              className="modpag_btn modpag_btn-primary"
              onClick={handleRealizarPago}
              disabled={mesesSeleccionados.length === 0}
            >
              Realizar Pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPagos;