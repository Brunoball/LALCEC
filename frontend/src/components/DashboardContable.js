import React, { useState, useEffect } from "react";
import "./dashboard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faDollarSign,
  faTags,
  faCalendarAlt,
  faUser,
  faArrowUp,
  faArrowDown,
  faBuilding
} from "@fortawesome/free-solid-svg-icons";

export default function DashboardContable() {
  const [mesSeleccionado, setMesSeleccionado] = useState("Todos");
  const [tipoVista, setTipoVista] = useState("Socios");
  const [categorias, setCategorias] = useState([]);
  const [meses, setMeses] = useState([]);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [stats, setStats] = useState({
    socios: { cambio: 5.2, tendencia: 'up' },
    recaudado: { cambio: 12.7, tendencia: 'up' },
    categorias: { cambio: -2.3, tendencia: 'down' }
  });
  const [conteoTotal, setConteoTotal] = useState({ 
    socios: 150,  // Valor por defecto
    empresas: 75   // Valor por defecto
  });

  // Carga inicial de datos
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Obtener meses disponibles
        const resMeses = await fetch(`http://localhost:3001/contable/precios_cat_mes.php`);
        if (!resMeses.ok) throw new Error(`HTTP error! status: ${resMeses.status}`);
        const dataMeses = await resMeses.json();
        
        // Procesar meses únicos
        const mesesUnicos = [...new Set(dataMeses.map(item => item.mes))];
        setMeses(["Todos", ...mesesUnicos]);
        
        // Cargar categorías iniciales (para "Todos")
        await updateCategories("Todos", "Socios");
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Actualiza las categorías según mes y tipo seleccionado
  const updateCategories = async (mes = mesSeleccionado, tipo = tipoVista) => {
    setLoadingCategories(true);
    try {
      let url = `http://localhost:3001/contable/precios_cat_mes.php`;
      if (mes !== "Todos") {
        url += `?mes=${mes}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Procesar datos para agrupar por categoría
      const categoriasAgrupadas = {};
      
      data.forEach(item => {
        // Si estamos viendo un mes específico, solo tomamos ese mes
        if (mes !== "Todos" && item.mes !== mes) return;
        
        // Si no existe la categoría o es un mes más reciente (para "Todos")
        if (!categoriasAgrupadas[item.idCategoria] || 
            (mes === "Todos" && item.idMes > categoriasAgrupadas[item.idCategoria].mes)) {
          categoriasAgrupadas[item.idCategoria] = {
            id: item.idCategoria,
            nombre: item.nombreCategoria,
            monto: item.precio,
            mes: item.idMes,
            conteo: {
              socios: Math.floor(Math.random() * 30) + 10, // Datos simulados
              empresas: Math.floor(Math.random() * 15) + 5  // Datos simulados
            }
          };
        }
      });
      
      // Convertir objeto a array
      const categoriasArray = Object.values(categoriasAgrupadas);
      setCategorias(categoriasArray);
      
      // Calcular total recaudado
      const total = categoriasArray.reduce((acc, cat) => {
        const cantidad = tipo === "Socios" ? (cat.conteo?.socios || 0) : (cat.conteo?.empresas || 0);
        return acc + (cantidad * (cat.monto || 0));
      }, 0);
      
      setTotalRecaudado(total);
    } catch (error) {
      console.error("Error updating categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const volver = () => {
    window.history.back();
  };

  const handleMesChange = (e) => {
    const nuevoMes = e.target.value;
    setMesSeleccionado(nuevoMes);
    updateCategories(nuevoMes, tipoVista);
  };

  const handleTipoChange = (e) => {
    const nuevoTipo = e.target.value;
    setTipoVista(nuevoTipo);
    
    // Recalcular el total recaudado basado en el nuevo tipo
    const total = categorias.reduce((acc, cat) => {
      const cantidad = nuevoTipo === "Socios" ? (cat.conteo?.socios || 0) : (cat.conteo?.empresas || 0);
      return acc + (cantidad * (cat.monto || 0));
    }, 0);
    
    setTotalRecaudado(total);
  };

  const calcularPorcentajeSocios = (cantidad) => {
    const totalReferencia = tipoVista === "Socios" ? conteoTotal.socios : conteoTotal.empresas;
    return totalReferencia === 0 ? 0 : Math.min(100, Math.round((cantidad / totalReferencia) * 100));
  };

  if (loading) {
    return <div className="dashboard-contable-body">Cargando...</div>;
  }

  return (
    <div className="dashboard-contable-body">
      <div className="contable-container">
        <div className="contable-header">
          <h1 className="contable-title">
            <FontAwesomeIcon icon={tipoVista === "Socios" ? faUsers : faBuilding} /> 
            Panel Contable - {tipoVista}
          </h1>
          <button className="contable-back-button" onClick={volver}>
            ← Volver
          </button>
        </div>

        <div className="contable-summary-cards">
          <div className="contable-summary-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={tipoVista === "Socios" ? faUsers : faBuilding} />
            </div>
            <div className="contable-card-content">
              <h3>{tipoVista === "Socios" ? "Socios activos" : "Empresas activas"}</h3>
              <p>{tipoVista === "Socios" ? conteoTotal.socios.toLocaleString() : conteoTotal.empresas.toLocaleString()}</p>
              <div className="contable-card-trend">
                <FontAwesomeIcon 
                  icon={stats.socios.tendencia === 'up' ? faArrowUp : faArrowDown} 
                  className={`trend-${stats.socios.tendencia}`} 
                />
                <span className={`trend-${stats.socios.tendencia}`}>
                  {stats.socios.cambio}% este mes
                </span>
              </div>
            </div>
          </div>

          <div className="contable-summary-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={faDollarSign} />
            </div>
            <div className="contable-card-content">
              <h3>Total recaudado</h3>
              <p>${totalRecaudado.toLocaleString()}</p>
              <div className="contable-card-trend">
                <FontAwesomeIcon 
                  icon={stats.recaudado.tendencia === 'up' ? faArrowUp : faArrowDown} 
                  className={`trend-${stats.recaudado.tendencia}`} 
                />
                <span className={`trend-${stats.recaudado.tendencia}`}>
                  {stats.recaudado.cambio}% este mes
                </span>
              </div>
            </div>
          </div>

          <div className="contable-summary-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={faTags} />
            </div>
            <div className="contable-card-content">
              <h3>Categorías</h3>
              <p>{categorias.length}</p>
              <div className="contable-card-trend">
                <FontAwesomeIcon 
                  icon={stats.categorias.tendencia === 'up' ? faArrowUp : faArrowDown} 
                  className={`trend-${stats.categorias.tendencia}`} 
                />
                <span className={`trend-${stats.categorias.tendencia}`}>
                  {stats.categorias.cambio}% este mes
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="contable-categories-section">
          <div className="contable-section-header">
            <h2>
              <FontAwesomeIcon icon={faTags} /> Categorías
            </h2>
            <div className="contable-selectors-container">
              <div className="contable-type-selector">
                <FontAwesomeIcon icon={tipoVista === "Socios" ? faUsers : faBuilding} />
                <select 
                  value={tipoVista} 
                  onChange={handleTipoChange}
                  className="contable-type-select"
                  disabled={loadingCategories}
                >
                  <option value="Socios">Socios</option>
                  <option value="Empresas">Empresas</option>
                </select>
              </div>
              <div className="contable-month-selector">
                <FontAwesomeIcon icon={faCalendarAlt} />
                <select 
                  value={mesSeleccionado} 
                  onChange={handleMesChange}
                  className="contable-month-select"
                  disabled={loadingCategories}
                >
                  {meses.map((mes, index) => (
                    <option key={index} value={mes}>
                      {mes === "Todos" ? "Todos los meses" : mes}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="contable-categories-scroll-container">
            {loadingCategories ? (
              <div className="contable-loading-categories">Cargando categorías...</div>
            ) : (
              <div className="contable-categories-cards">
                {categorias.length > 0 ? (
                  categorias.map((categoria, i) => {
                    const cantidad = tipoVista === "Socios" ? (categoria.conteo?.socios || 0) : (categoria.conteo?.empresas || 0);
                    return (
                      <div className="contable-category-card" key={i}>
                        <div className="contable-category-header">
                          <div className="contable-category-header-content">
                            <h3>{categoria.nombre}</h3>
                            <div className="price-display">
                              <span className="monthly-price">
                                ${categoria.monto ? categoria.monto.toLocaleString() : "0"}/mes
                              </span>
                              {mesSeleccionado !== "Todos" && (
                                <span className="month-indicator">
                                  ({mesSeleccionado})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="contable-category-body">
                          <div className="contable-category-people">
                            <FontAwesomeIcon icon={tipoVista === "Socios" ? faUser : faBuilding} /> 
                            {cantidad.toLocaleString()} 
                            {tipoVista === "Socios" ? " socios" : " empresas"}
                          </div>
                          <div className="contable-progress-container">
                            <div className="contable-progress-bar">
                              <div 
                                className="contable-progress-fill"
                                style={{ width: `${calcularPorcentajeSocios(cantidad)}%` }}
                              ></div>
                            </div>
                            <span className="contable-progress-percent">
                              {calcularPorcentajeSocios(cantidad)}%
                            </span>
                          </div>
                          <div className="contable-category-total">
                            <span className="total-label">Total mensual:</span>
                            <span className="total-value">
                              ${(cantidad * (categoria.monto || 0)).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p>No hay categorías para mostrar</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}