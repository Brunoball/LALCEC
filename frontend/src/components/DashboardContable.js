import React, { useState, useEffect } from "react";
import "./dashboard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faDollarSign,
  faTags,
  faCalendarAlt,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

export default function DashboardContable() {
  const [mesSeleccionado, setMesSeleccionado] = useState("Todos");
  const [categorias, setCategorias] = useState([]);
  const [meses, setMeses] = useState([]);
  const [totalSocios, setTotalSocios] = useState(0);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3001/getCategorias.php")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((response) => {
        const data = response.data || response;
        console.log("Datos recibidos:", data);
        
        // Procesar categorías
        if (data.categorias && Array.isArray(data.categorias)) {
          const validData = data.categorias.filter(item => 
            item.nombre !== undefined && 
            item.monto !== undefined &&
            item.socios !== undefined
          );
  
          if (validData.length > 0) {
            setCategorias(validData);
  
            const totals = validData.reduce((acc, cat) => ({
              socios: acc.socios + (cat.socios || 0),
              recaudado: acc.recaudado + ((cat.socios || 0) * (cat.monto || 0))
            }), { socios: 0, recaudado: 0 });
  
            setTotalSocios(totals.socios);
            setTotalRecaudado(totals.recaudado);
          } else {
            console.warn("Datos de categorías no tienen la estructura esperada");
          }
        }

        // Procesar meses
        if (data.meses && Array.isArray(data.meses)) {
          setMeses(data.meses);
        } else {
          console.warn("No se recibieron meses válidos desde el servidor");
          // Opcional: establecer meses por defecto si la API no los devuelve
          setMeses([
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
          ]);
        }
      })
      .catch((err) => {
        console.error("Error en la solicitud:", err);
        // Opcional: establecer meses por defecto si hay error
        setMeses([
          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const volver = () => {
    window.history.back();
  };

  const handleMesChange = (e) => {
    setMesSeleccionado(e.target.value);
    // Aquí puedes agregar lógica para filtrar por mes si es necesario
  };

  if (loading) {
    return <div className="contable-container">Cargando...</div>;
  }

  return (
    <div className="contable-container">
      <div className="contable-header">
        <h1 className="contable-title">Contable</h1>
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
          </div>
        </div>

        <div className="contable-summary-card">
          <div className="contable-card-icon">
            <FontAwesomeIcon icon={faDollarSign} />
          </div>
          <div className="contable-card-content">
            <h3>Total recaudado</h3>
            <p>${totalRecaudado.toLocaleString()}</p>
          </div>
        </div>

        <div className="contable-summary-card">
          <div className="contable-card-icon">
            <FontAwesomeIcon icon={faTags} />
          </div>
          <div className="contable-card-content">
            <h3>Categorías</h3>
            <p>{categorias.length}</p>
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
                <option key={index} value={mes}>{mes}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="contable-categories-cards">
          {categorias.length > 0 ? (
            categorias.map((categoria, i) => (
              <div className="contable-category-card" key={i}>
                <div className="contable-category-header">
                  <h3>{categoria.nombre} - ${categoria.monto.toLocaleString()}</h3>
                </div>
                <div className="contable-category-people">
                  <FontAwesomeIcon icon={faUser} /> {categoria.socios.toLocaleString()}
                </div>
                <div className="contable-category-total">
                  <span>Total</span>
                  <span>${(categoria.monto * categoria.socios).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <p>No hay categorías disponibles</p>
          )}
        </div>
      </div>
    </div>
  );
}