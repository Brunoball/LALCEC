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
  faEye,
  faTable,
  faListAlt,
  faBuilding,
  faUser
} from "@fortawesome/free-solid-svg-icons";

export default function DashboardContable() {
  const navigate = useNavigate();
  const [mesSeleccionado, setMesSeleccionado] = useState("Selecciona un mes");
  const [tipoEntidad, setTipoEntidad] = useState("socio");
  const [meses, setMeses] = useState(["Selecciona un mes"]);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [cierresMensuales, setCierresMensuales] = useState([]);
  const [datosMeses, setDatosMeses] = useState([]);
  const [datosEmpresas, setDatosEmpresas] = useState([]);
  const [categoriasAgrupadas, setCategoriasAgrupadas] = useState([]);
  const [preciosCategorias, setPreciosCategorias] = useState([]);
  const [mostrarTablaDetalle, setMostrarTablaDetalle] = useState(false);
  const [registrosMes, setRegistrosMes] = useState([]);

  const fetchData = async (url) => {
    try {
      const timestamp = new Date().getTime();
      const urlWithCacheBuster = `${url}?timestamp=${timestamp}`;
      
      const response = await fetch(urlWithCacheBuster, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        throw new Error("No data received from server");
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  };

  useEffect(() => {
    sessionStorage.removeItem("cierres_mensuales");
    sessionStorage.removeItem("datos_contables");
    sessionStorage.removeItem("precios_categorias");

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar datos en paralelo
        const [dataCierres, dataContable, dataEmpresas, dataPrecios] = await Promise.all([
          fetchData("http://localhost:3001/contable/cierres_mensuales.php"),
          fetchData("http://localhost:3001/contable/contable.php"),
          fetchData("http://localhost:3001/contable/contable_emp.php"),
          fetchData("http://localhost:3001/contable/precios_cat_mes.php")
        ]);

        console.log("dataCierres:", dataCierres);
        console.log("dataContable:", dataContable);
        console.log("dataEmpresas:", dataEmpresas);
        console.log("dataPrecios:", dataPrecios);

        // Procesar cierres mensuales
        if (dataCierres && dataCierres.success && Array.isArray(dataCierres.data)) {
          setCierresMensuales(dataCierres.data);
        } else if (Array.isArray(dataCierres)) {
          setCierresMensuales(dataCierres);
        } else {
          console.warn("Formato inesperado en cierres mensuales");
        }

        // Validar datos contables (objeto con .data que es array)
        if (!dataContable || !dataContable.success || !Array.isArray(dataContable.data)) {
          throw new Error(`Formato inválido en datos contables: esperado objeto con success=true y data array`);
        }
        setDatosMeses(dataContable.data);

        // Validar datos de empresas (objeto con .data que es array)
        if (!dataEmpresas || !dataEmpresas.success || !Array.isArray(dataEmpresas.data)) {
          throw new Error(`Formato inválido en datos de empresas: esperado objeto con success=true y data array`);
        }
        setDatosEmpresas(dataEmpresas.data);

        // Validar precios de categorías (objeto, no array)
        if (!dataPrecios || typeof dataPrecios !== 'object' || Array.isArray(dataPrecios)) {
          throw new Error(`Formato inválido en precios de categorías: esperado objeto`);
        }
        setPreciosCategorias(dataPrecios);

        // Obtener meses disponibles (de precios o de datos contables)
        const mesesDisponibles = Object.keys(dataPrecios).length > 0
          ? Object.keys(dataPrecios)
          : [...new Set([
              ...dataContable.data.map(m => m.nombre),
              ...dataEmpresas.data.map(m => m.nombre)
            ])];

        setMeses(["Selecciona un mes", ...mesesDisponibles.filter(Boolean)]);

        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error en carga inicial:", error);
        setError("Error al cargar datos. Verifique la conexión o intente más tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (initialLoadComplete && mesSeleccionado !== "Selecciona un mes") {
      updateMonthData();
    }
  }, [mesSeleccionado, tipoEntidad, initialLoadComplete]);

  const updateMonthData = () => {
    try {
      let mesData;
      if (tipoEntidad === "socio") {
        mesData = datosMeses.find(m => m.nombre === mesSeleccionado);
      } else {
        mesData = datosEmpresas.find(m => m.nombre === mesSeleccionado);
      }
      
      const preciosMesActual = preciosCategorias[mesSeleccionado] || [];
      
      if (mesData || preciosMesActual.length > 0) {
        const pagosAgrupados = agruparPorCategoria(mesData?.pagos || []);
        
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
        setRegistrosMes(mesData?.pagos || []);
      } else {
        setTotalRecaudado(0);
        setCategoriasAgrupadas([]);
        setRegistrosMes([]);
      }
    } catch (error) {
      console.error("Error al actualizar datos del mes:", error);
      setError("Error al procesar datos del mes seleccionado.");
    }
  };

  const agruparPorCategoria = (pagos) => {
    const agrupado = {};
    
    pagos.forEach(pago => {
      if (!pago.Nombre_Categoria) return;
      
      if (!agrupado[pago.Nombre_Categoria]) {
        agrupado[pago.Nombre_Categoria] = {
          nombre: pago.Nombre_Categoria,
          total: 0,
          cantidad: 0,
          registros: []
        };
      }
      
      const precio = parseFloat(pago.Precio) || 0;
      agrupado[pago.Nombre_Categoria].total += precio;
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

  const volver = () => navigate(-1);

  const handleMesChange = (e) => {
    const nuevoMes = e.target.value;
    setMesSeleccionado(nuevoMes);
    // Eliminamos la línea que resetearía mostrarTablaDetalle
  };

  const handleTipoEntidadChange = (e) => {
    setTipoEntidad(e.target.value);
    // También eliminamos el reset de mostrarTablaDetalle aquí si quieres que se mantenga al cambiar tipo de entidad
  };

  const toggleVistaDetalle = () => {
    setMostrarTablaDetalle(!mostrarTablaDetalle);
  };

  const calcularTotalRegistros = () => {
    return registrosMes.length;
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

          <div className="contable-summary-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={faListAlt} />
            </div>
            <div className="contable-card-content">
              <h3>Total registros</h3>
              <p>{calcularTotalRegistros()}</p>
              <small className="contable-card-subtext">
                {mesSeleccionado !== "Selecciona un mes" ? `En ${mesSeleccionado}` : "Seleccione un mes"}
              </small>
            </div>
          </div>
        </div>

        <div className="contable-categories-section">
          <div className="contable-section-header">
            <h2>
              {mostrarTablaDetalle ? (
                <><FontAwesomeIcon icon={faTable} /> Detalle de Pagos - {mesSeleccionado} ({tipoEntidad === "socio" ? "Socios" : "Empresas"})</>
              ) : (
                <><FontAwesomeIcon icon={faTags} /> Resumen por Categoría - {mesSeleccionado} ({tipoEntidad === "socio" ? "Socios" : "Empresas"})</>
              )}
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
              
              <div className="contable-entity-selector">
                <FontAwesomeIcon icon={tipoEntidad === "socio" ? faUser : faBuilding} />
                <select
                  value={tipoEntidad}
                  onChange={handleTipoEntidadChange}
                  className="contable-entity-select"
                  disabled={loading}
                >
                  <option value="socio">Socios</option>
                  <option value="empresa">Empresas</option>
                </select>
              </div>

              {mesSeleccionado !== "Selecciona un mes" && (
                <button 
                  className={`contable-detail-view-button ${
                    mesEstaCerrado(mesSeleccionado) ? 'closed' : ''
                  }`}
                  onClick={toggleVistaDetalle}
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={mostrarTablaDetalle ? faTags : faTable} />
                  {mostrarTablaDetalle ? "Ver Resumen" : "Ver Detalle"}
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
            ) : mostrarTablaDetalle ? (
              <div className="contable-detail-table-container">
                <table className="contable-detail-table">
                  <thead>
                    <tr>
                      <th>{tipoEntidad === "socio" ? "Socio" : "Empresa"}</th>
                      <th>Categoría</th>
                      <th>Monto</th>
                      <th>Fecha de Pago</th>
                      <th>Mes Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosMes.length > 0 ? (
                      registrosMes.map((registro, index) => (
                        <tr key={index}>
                          <td>
                            {tipoEntidad === "socio" 
                              ? `${registro.Apellido}, ${registro.Nombre}`
                              : registro.Razon_Social || registro.Nombre_Empresa}
                          </td>
                          <td>{registro.Nombre_Categoria}</td>
                          <td>${(registro.Precio || 0).toLocaleString('es-AR')}</td>
                          <td>{registro.fechaPago}</td>
                          <td>{registro.Mes_Pagado}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="contable-no-data">
                          No hay registros para mostrar en este mes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
    </div>
  );
}