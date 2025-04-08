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
  faChartLine
} from "@fortawesome/free-solid-svg-icons";

export default function DashboardContable() {
  const [mesSeleccionado, setMesSeleccionado] = useState("Todos");
  const [categorias, setCategorias] = useState([]);
  const [meses, setMeses] = useState([]);
  const [totalSocios, setTotalSocios] = useState(0);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    socios: { cambio: 5.2, tendencia: 'up' },
    recaudado: { cambio: 12.7, tendencia: 'up' },
    categorias: { cambio: -2.3, tendencia: 'down' }
  });

  const fetchData = (mes = "Todos") => {
    setLoading(true);
    fetch(`http://localhost:3001/getCategorias.php?mes=${mes}&t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((response) => {
        const data = response.data || response;
        console.log("Datos recibidos:", data);
        
        if (data.categorias?.length > 0) {
          setCategorias(data.categorias);
          
          const totals = data.categorias.reduce((acc, cat) => ({
            socios: acc.socios + (cat.socios || 0),
            recaudado: acc.recaudado + ((cat.socios || 0) * (cat.monto || 0))
          }), { socios: 0, recaudado: 0 });
          
          setTotalSocios(totals.socios);
          setTotalRecaudado(totals.recaudado);
        }
        
        setMeses(data.meses || [
          "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
          "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
        ]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const volver = () => {
    window.history.back();
  };

  const handleMesChange = (e) => {
    const nuevoMes = e.target.value;
    setMesSeleccionado(nuevoMes);
    fetchData(nuevoMes);
  };

  const calcularPorcentajeSocios = (socios) => {
    const totalReferencia = 500;
    return totalReferencia === 0 ? 0 : Math.min(100, Math.round((socios / totalReferencia) * 100));
  };

  if (loading) {
    return <div className="dashboard-contable-body">Cargando...</div>;
  }

  return (
    <div className="dashboard-contable-body">
      <div className="contable-container">
        <div className="contable-header">
          <h1 className="contable-title">
            <FontAwesomeIcon icon={faChartLine} /> Panel Contable
          </h1>
          <button className="contable-back-button" onClick={volver}>
            ← Volver
          </button>
        </div>

        <div className="contable-summary-cards">
          <div className="contable-summary-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div className="contable-card-content">
              <h3>Socios activos</h3>
              <p>{totalSocios.toLocaleString()}</p>
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
            <div className="contable-month-selector">
              <FontAwesomeIcon icon={faCalendarAlt} />
              <select 
                value={mesSeleccionado} 
                onChange={handleMesChange}
                className="contable-month-select"
              >
                <option value="Todos">Todos los meses</option>
                {meses.map((mes, index) => (
                  <option key={index} value={mes}>{mes.charAt(0) + mes.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="contable-categories-scroll-container">
            <div className="contable-categories-cards">
              {categorias.length > 0 ? (
                categorias.map((categoria, i) => (
                  <div className="contable-category-card" key={i}>
                    <div className="contable-category-header">
                      <div className="contable-category-header-content">
                        <h3>{categoria.nombre}</h3>
                        <div className="price-display">
                          <span className="monthly-price">${categoria.monto.toLocaleString()}/mes</span>
                        </div>
                      </div>
                    </div>
                    <div className="contable-category-body">
                      <div className="contable-category-people">
                        <FontAwesomeIcon icon={faUser} /> {categoria.socios.toLocaleString()} socios
                      </div>
                      <div className="contable-progress-container">
                        <div className="contable-progress-bar">
                          <div 
                            className="contable-progress-fill"
                            style={{ width: `${calcularPorcentajeSocios(categoria.socios)}%` }}
                          ></div>
                        </div>
                        <span className="contable-progress-percent">
                          {calcularPorcentajeSocios(categoria.socios)}%
                        </span>
                      </div>
                      <div className="contable-category-total">
                        <span className="total-label">Total mensual:</span>
                        <span className="total-value">${(categoria.monto * categoria.socios).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay categorías disponibles</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}