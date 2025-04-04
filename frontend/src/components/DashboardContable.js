import React from "react";
import "./dashboard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faDollarSign,
  faTags,
  faFileInvoiceDollar,
} from "@fortawesome/free-solid-svg-icons";

export default function DashboardContable() {
  const data = {
    totalSocios: 120,
    totalRecaudado: 258000,
    recaudacionMensual: [
      { mes: "Enero", monto: 22000 },
      { mes: "Febrero", monto: 18000 },
      { mes: "Marzo", monto: 24000 },
      { mes: "Abril", monto: 26000 },
      { mes: "Mayo", monto: 30000 },
    ],
    categorias: [
      { nombre: "Cuotas sociales", monto: 150000 },
      { nombre: "Donaciones", monto: 60000 },
      { nombre: "Eventos", monto: 48000 },
    ],
  };

  const volver = () => {
    window.history.back(); // vuelve a la página anterior
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Contable</h1>

      <div className="card">
        <FontAwesomeIcon icon={faUsers} className="icon" />
        <div className="info">
          <p className="info-title">Socios activos</p>
          <p className="info-value">{data.totalSocios}</p>
        </div>
      </div>

      <div className="card">
        <FontAwesomeIcon icon={faDollarSign} className="icon" />
        <div className="info">
          <p className="info-title">Total recaudado</p>
          <p className="info-value">${data.totalRecaudado}</p>
        </div>
      </div>

      <div className="card">
        <FontAwesomeIcon icon={faFileInvoiceDollar} className="icon" />
        <div className="info">
          <p className="info-title">Cantidad de categorías</p>
          <p className="info-value">{data.categorias.length}</p>
        </div>
      </div>

      <div className="section">
        <h2>Recaudación Mensual</h2>
        <ul>
          {data.recaudacionMensual.map((item, i) => (
            <li key={i}>
              <span>{item.mes}</span>
              <span>${item.monto}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h2>Categorías de Ingreso</h2>
        <ul>
          {data.categorias.map((cat, i) => (
            <li key={i}>
              <span>
                <FontAwesomeIcon icon={faTags} /> {cat.nombre}
              </span>
              <span>${cat.monto}</span>
            </li>
          ))}
        </ul>
      </div>

      <button className="back-button" onClick={volver}>
        ← Volver
      </button>
    </div>
  );
}
