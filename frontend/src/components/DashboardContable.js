import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDollarSign,
  faTags,
  faCalendarAlt,
  faExclamationTriangle,
  faLock,
  faLockOpen,
  faCheckCircle,
  faTimes,
  faUsers,
  faEye
} from "@fortawesome/free-solid-svg-icons";

export default function DashboardContable() {
  const navigate = useNavigate();
  const [mesSeleccionado, setMesSeleccionado] = useState("Selecciona un mes");
  const [meses, setMeses] = useState(["Selecciona un mes"]);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [cierresMensuales, setCierresMensuales] = useState([]);
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [mesACerrar, setMesACerrar] = useState(null);
  const [procesandoCierre, setProcesandoCierre] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [datosMeses, setDatosMeses] = useState([]);
  const [categoriasAgrupadas, setCategoriasAgrupadas] = useState([]);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const [detalleCategoria, setDetalleCategoria] = useState(null);
  const [preciosCategorias, setPreciosCategorias] = useState([]);

  // Eliminamos la función safeFetch y usamos fetch directamente sin caché
  const fetchData = async (url) => {
    try {
      // Agregamos un timestamp para evitar caché del navegador
      const timestamp = new Date().getTime();
      const urlWithCacheBuster = `${url}?timestamp=${timestamp}`;
      
      const response = await fetch(urlWithCacheBuster);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  };

  useEffect(() => {
    // Limpiamos cualquier caché previa al cargar
    sessionStorage.removeItem("cierres_mensuales");
    sessionStorage.removeItem("datos_contables");
    sessionStorage.removeItem("precios_categorias");

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Obtener datos de cierres mensuales
        const dataCierres = await fetchData(
          "http://localhost:3001/contable/cierres_mensuales.php"
        );
        
        if (dataCierres?.success && Array.isArray(dataCierres.data)) {
          setCierresMensuales(dataCierres.data);
        }

        // Obtener datos contables
        const dataContable = await fetchData(
          "http://localhost:3001/contable/contable.php"
        );

        // Obtener precios por categoría y mes
        const dataPrecios = await fetchData(
          "http://localhost:3001/contable/precios_cat_mes.php"
        );

        if (dataContable && Array.isArray(dataContable) && dataPrecios) {
          setDatosMeses(dataContable);
          setPreciosCategorias(dataPrecios);
          
          // Extraer los meses disponibles de los precios
          const mesesDisponibles = Object.keys(dataPrecios);
          setMeses(["Selecciona un mes", ...mesesDisponibles]);
        } else {
          throw new Error("Error al cargar datos iniciales");
        }

        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error en carga inicial:", error);
        setError("Error al cargar datos iniciales. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // ... (el resto del código permanece igual)

  useEffect(() => {
    if (initialLoadComplete && mesSeleccionado !== "Selecciona un mes") {
      updateMonthData();
    }
  }, [mesSeleccionado, initialLoadComplete]);

  const updateMonthData = () => {
    // Buscar datos contables para el mes seleccionado
    const mesData = datosMeses.find(m => m.nombre === mesSeleccionado);
    
    // Obtener precios de categorías para el mes seleccionado
    const preciosMesActual = preciosCategorias[mesSeleccionado] || [];
    
    if (mesData || preciosMesActual.length > 0) {
      // Agrupar los pagos por categoría
      const pagosAgrupados = agruparPorCategoria(mesData?.pagos || []);
      
      // Combinar con los precios de las categorías
      const categoriasCombinadas = preciosMesActual.map(catPrecio => {
        const categoriaPagos = pagosAgrupados.find(cat => cat.nombre === catPrecio.nombreCategoria) || {
          total: 0,
          cantidad: 0,
          registros: []
        };
        
        return {
          nombre: catPrecio.nombreCategoria,
          precio: catPrecio.precio,
          total: categoriaPagos.total,
          cantidad: categoriaPagos.cantidad,
          registros: categoriaPagos.registros
        };
      });
      
      setCategoriasAgrupadas(categoriasCombinadas);
      setTotalRecaudado(mesData?.subtotal || 0);
    } else {
      setTotalRecaudado(0);
      setCategoriasAgrupadas([]);
    }
  };

  const agruparPorCategoria = (pagos) => {
    const agrupado = {};
    
    pagos.forEach(pago => {
      if (!agrupado[pago.Nombre_Categoria]) {
        agrupado[pago.Nombre_Categoria] = {
          nombre: pago.Nombre_Categoria,
          total: 0,
          cantidad: 0,
          registros: []
        };
      }
      
      agrupado[pago.Nombre_Categoria].total += parseFloat(pago.Precio) || 0;
      agrupado[pago.Nombre_Categoria].cantidad += 1;
      agrupado[pago.Nombre_Categoria].registros.push(pago);
    });
    
    return Object.values(agrupado);
  };

  const mesEstaCerrado = (mes) => {
    return cierresMensuales.some(
      cierre => cierre.mes === mes && cierre.estado === 'cerrado'
    );
  };

  const handleCierreMes = async () => {
    if (!mesACerrar) return;
    
    setProcesandoCierre(true);
    
    try {
      const response = await fetch("http://localhost:3001/contable/cierres_mensuales.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mes: mesACerrar,
          anio: new Date().getFullYear(),
          total_recaudado: totalRecaudado
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Usamos fetchData en lugar de safeFetch para obtener los cierres actualizados
        const updatedCierres = await fetchData(
          "http://localhost:3001/contable/cierres_mensuales.php"
        );
        
        if (updatedCierres?.success && Array.isArray(updatedCierres.data)) {
          setCierresMensuales(updatedCierres.data);
          setMostrarModalCierre(false);
          setMensajeExito(`El mes de ${mesACerrar} ha sido cerrado correctamente.`);
          setTimeout(() => setMensajeExito(null), 5000);
        } else {
          setError("Error al actualizar los cierres mensuales");
        }
      } else {
        setError(data.message || "Error al cerrar el mes");
      }
    } catch (error) {
      console.error("Error al cerrar mes:", error);
      setError("Error al cerrar el mes");
    } finally {
      setProcesandoCierre(false);
    }
  };

  const mostrarDetalleCategoria = (categoria) => {
    setDetalleCategoria(categoria);
    setMostrarModalDetalle(true);
  };

  const volver = () => navigate(-1);

  const handleMesChange = (e) => {
    const nuevoMes = e.target.value;
    setMesSeleccionado(nuevoMes);
  };

  return (
    <div className="dashboard-contable-body">
      <div className="contable-container">
        {error && (
          <div className="contable-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="contable-close-error">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        {mensajeExito && (
          <div className="contable-success">
            <FontAwesomeIcon icon={faCheckCircle} />
            <span>{mensajeExito}</span>
            <button onClick={() => setMensajeExito(null)} className="contable-close-success">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        <div className="contable-header">
          <h1 className="contable-title">
            <FontAwesomeIcon icon={faDollarSign} /> 
            Panel Contable
          </h1>
          <button className="contable-back-button" onClick={volver}>
            ← Volver
          </button>
        </div>

        <div className="contable-summary-cards">
          <div className="contable-summary-card total-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={faDollarSign} />
            </div>
            <div className="contable-card-content">
              <h3>Total recaudado</h3>
              <p>${totalRecaudado.toLocaleString('es-AR')}</p>
              <small className="contable-card-subtext">
                {mesSeleccionado !== "Selecciona un mes" ? `En ${mesSeleccionado}` : "Seleccione un mes"}
              </small>
            </div>
          </div>

          <div className="contable-summary-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={faTags} />
            </div>
            <div className="contable-card-content">
              <h3>Categorías</h3>
              <p>{categoriasAgrupadas.length}</p>
              <small className="contable-card-subtext">
                {mesSeleccionado !== "Selecciona un mes" ? `En ${mesSeleccionado}` : "Seleccione un mes"}
              </small>
            </div>
          </div>
        </div>

        <div className="contable-categories-section">
          <div className="contable-section-header">
            <h2>
              <FontAwesomeIcon icon={faTags} /> Detalle por Mes
            </h2>
            <div className="contable-selectors-container">
              <div className="contable-month-selector">
                <FontAwesomeIcon icon={faCalendarAlt} />
                <select 
                  value={mesSeleccionado} 
                  onChange={handleMesChange}
                  className="contable-month-select"
                  disabled={loading || !initialLoadComplete}
                >
                  {meses.map((mes, index) => (
                    <option key={index} value={mes}>
                      {mes === "Selecciona un mes" ? "Selecciona un mes" : mes}
                    </option>
                  ))}
                </select>
              </div>
              {mesSeleccionado !== "Selecciona un mes" && (
                <button 
                  className={`contable-close-month-button ${
                    mesEstaCerrado(mesSeleccionado) ? 'closed' : ''
                  }`}
                  onClick={() => {
                    if (mesEstaCerrado(mesSeleccionado)) {
                      setError("Este mes ya está cerrado");
                    } else {
                      setMesACerrar(mesSeleccionado);
                      setMostrarModalCierre(true);
                    }
                  }}
                  disabled={mesEstaCerrado(mesSeleccionado) || loading}
                >
                  <FontAwesomeIcon icon={mesEstaCerrado(mesSeleccionado) ? faLock : faLockOpen} />
                  {mesEstaCerrado(mesSeleccionado) ? "Mes Cerrado" : "Cerrar Mes"}
                </button>
              )}
            </div>
          </div>

          <div className="contable-categories-scroll-container">
            {loading ? (
              <div className="contable-loading-categories">
                <div className="contable-spinner"></div>
                <span>Cargando datos...</span>
              </div>
            ) : (
              <div className="contable-categories-cards">
                {categoriasAgrupadas.length > 0 ? (
                  categoriasAgrupadas.map((categoria, i) => (
                    <div className="contable-category-card" key={i}>
                      <div className="contable-category-header">
                        <div className="contable-category-header-content">
                          <h3>{categoria.nombre}</h3>
                          <div className="price-display">
                            <span className="monthly-price">
                              ${categoria.precio?.toLocaleString('es-AR') || '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="contable-category-body">
                        <div className="contable-category-info">
                          <span className="contable-category-label">Registros:</span>
                          <span className="contable-category-value">{categoria.cantidad}</span>
                        </div>
                        <div className="contable-category-info">
                          <span className="contable-category-label">Subtotal:</span>
                          <span className="contable-category-value">${categoria.total.toLocaleString('es-AR')}</span>
                        </div>
                        {categoria.cantidad > 0 && (
                          <button 
                            className="contable-detail-button"
                            onClick={() => mostrarDetalleCategoria(categoria)}
                          >
                            <FontAwesomeIcon icon={faEye} /> Ver Detalle
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="contable-no-data">
                    {mesSeleccionado === "Selecciona un mes" 
                      ? "Seleccione un mes para ver los detalles" 
                      : "No hay datos para mostrar para este mes"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de cierre de mes */}
      {mostrarModalCierre && (
        <div className="contable-modal-overlay">
          <div className="contable-modal">
            <div className="contable-modal-header">
              <h3>
                <FontAwesomeIcon icon={faLock} /> Confirmar Cierre de Mes
              </h3>
              <button 
                onClick={() => setMostrarModalCierre(false)}
                disabled={procesandoCierre}
                className="contable-modal-close-btn"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="contable-modal-body">
              <div className="contable-modal-icon warning">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <div className="contable-modal-text-content">
                <p>Estás a punto de cerrar el mes de <strong>{mesACerrar}</strong>.</p>
                <p>Esta acción es irreversible. ¿Deseas continuar?</p>
              </div>
              
              <div className="contable-modal-summary">
                <h4>Resumen del Mes:</h4>
                <div className="contable-modal-summary-grid">
                  <div className="contable-modal-summary-item">
                    <span>Total Recaudado:</span>
                    <strong>${totalRecaudado.toLocaleString('es-AR')}</strong>
                  </div>
                  <div className="contable-modal-summary-item">
                    <span>Cantidad de Categorías:</span>
                    <strong>{categoriasAgrupadas.length}</strong>
                  </div>
                  <div className="contable-modal-summary-item">
                    <span>Total de Pagos:</span>
                    <strong>{categoriasAgrupadas.reduce((acc, cat) => acc + cat.cantidad, 0)}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="contable-modal-footer">
              <button 
                onClick={() => setMostrarModalCierre(false)}
                disabled={procesandoCierre}
                className="contable-modal-cancel-btn"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCierreMes}
                disabled={procesandoCierre}
                className="contable-modal-confirm-btn"
              >
                {procesandoCierre ? (
                  <>
                    <span className="contable-modal-spinner"></span>
                    Procesando...
                  </>
                ) : (
                  "Confirmar Cierre"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de categoría */}
      {mostrarModalDetalle && detalleCategoria && (
        <div className="contable-modal-overlay">
          <div className="contable-modal contable-detail-modal">
            <div className="contable-modal-header">
              <h3>
                <FontAwesomeIcon icon={faUsers} /> Detalle de Pagos - {detalleCategoria.nombre}
              </h3>
              <button 
                onClick={() => setMostrarModalDetalle(false)}
                className="contable-modal-close-btn"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="contable-modal-body">
              <div className="contable-detail-summary">
                <div className="contable-detail-summary-item">
                  <span>Precio Unitario:</span>
                  <strong>${detalleCategoria.precio?.toLocaleString('es-AR') || '0'}</strong>
                </div>
                <div className="contable-detail-summary-item">
                  <span>Total Recaudado:</span>
                  <strong>${detalleCategoria.total.toLocaleString('es-AR')}</strong>
                </div>
                <div className="contable-detail-summary-item">
                  <span>Cantidad de Pagos:</span>
                  <strong>{detalleCategoria.cantidad}</strong>
                </div>
              </div>
              
              <div className="contable-detail-table-container">
                <table className="contable-detail-table">
                  <thead>
                    <tr>
                      <th>Socio</th>
                      <th>Monto</th>
                      <th>Fecha de Pago</th>
                      <th>Mes Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleCategoria.registros.map((registro, index) => (
                      <tr key={index}>
                        <td>{registro.Apellido}, {registro.Nombre}</td>
                        <td>${(registro.Precio || 0).toLocaleString('es-AR')}</td>
                        <td>{registro.fechaPago}</td>
                        <td>{registro.Mes_Pagado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="contable-modal-footer">
              <button 
                onClick={() => setMostrarModalDetalle(false)}
                className="contable-modal-close-detail-btn"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}