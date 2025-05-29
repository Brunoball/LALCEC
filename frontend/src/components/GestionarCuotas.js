import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExcel, faArrowLeft, faSearch } from '@fortawesome/free-solid-svg-icons';
import "./GestionarCuotas.css";
import {
  faMoneyCheckAlt,
  faFilter,
  faCalendarAlt,
  faUsers,
  faList,
  faCheckCircle,
  faExclamationTriangle,
  faExclamationCircle,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import ModalMesCuotas from "./ModalMesCuotas";

const GestionarCuotas = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pagado");
  const [sociosPagados, setSociosPagados] = useState([]);
  const [sociosDeudores, setSociosDeudores] = useState([]);
  const [empresasPagadas, setEmpresasPagadas] = useState([]);
  const [empresasDeudoras, setEmpresasDeudoras] = useState([]);
  const [meses, setMeses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewType, setViewType] = useState("socio");
  const [mostrarModalMes, setMostrarModalMes] = useState(false);
  const [mesSeleccionadoImpresion, setMesSeleccionadoImpresion] = useState("");

  // Obtener los meses disponibles
  useEffect(() => {
    const fetchMeses = async () => {
      try {
        const response = await fetch("http://localhost:3001/meses_pagos.php");
        const data = await response.json();
        setMeses(data);
      } catch (error) {
        console.error("Error al obtener los meses:", error);
      }
    };

    fetchMeses();
  }, []);

  // Obtener los datos de socios o empresas según el mes seleccionado
  useEffect(() => {
    const fetchData = async () => {
      if (selectedMonth) {
        try {
          if (viewType === "socio") {
            const responsePagados = await fetch(
              `http://localhost:3001/socios_pagados.php?mes=${selectedMonth}`
            );
            const dataPagados = await responsePagados.json();
            setSociosPagados(dataPagados);

            const responseDeudores = await fetch(
              `http://localhost:3001/socios_deudores.php?mes=${selectedMonth}`
            );
            const dataDeudores = await responseDeudores.json();
            setSociosDeudores(dataDeudores);
          } else if (viewType === "empresa") {
            const responsePagados = await fetch(
              `http://localhost:3001/empresas_pagadas.php?mes=${selectedMonth}`
            );
            const dataPagados = await responsePagados.json();
            setEmpresasPagadas(dataPagados);

            const responseDeudores = await fetch(
              `http://localhost:3001/empresas_deudoras.php?mes=${selectedMonth}`
            );
            const dataDeudores = await responseDeudores.json();
            setEmpresasDeudoras(dataDeudores);
          }
        } catch (error) {
          console.error("Error al obtener los datos:", error);
        }
      }
    };

    fetchData();
  }, [selectedMonth, viewType]);

  // Función para volver atrás
  const handleVolverAtras = () => navigate(-1);

  // Función para manejar el cambio de mes
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  // Función para exportar a Excel
  const handleExportExcel = () => {
    let data = [];
    if (viewType === "socio") {
      data = activeTab === "pagado" ? sociosPagados : sociosDeudores;
    } else if (viewType === "empresa") {
      data = activeTab === "pagado" ? empresasPagadas : empresasDeudoras;
    }

    if (data.length === 0) {
      setErrorMessage("No hay datos para exportar.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    const dataExport = data.map((item) => ({
      ...item,
      Mes: selectedMonth,
      Tipo: activeTab === "pagado" ? "Pagados" : "Deudores",
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, viewType === "socio" ? "Socios" : "Empresas");
    XLSX.writeFile(wb, `${viewType}_${selectedMonth}_${activeTab}.xlsx`);

    setErrorMessage("");
  };

  // Función para imprimir el registro
  const handleImprimirRegistro = () => {
    if (!selectedMonth) {
      setErrorMessage("Por favor seleccione un mes.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    let data = [];
    if (viewType === "socio") {
      data = activeTab === "pagado" ? sociosPagados : sociosDeudores;
    } else if (viewType === "empresa") {
      data = activeTab === "pagado" ? empresasPagadas : empresasDeudoras;
    }

    if (data.length === 0) {
      setErrorMessage("No hay datos para imprimir.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    let content = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            h2 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #0288d1; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h2> Registro - ${activeTab === "pagado" ? "Pagados" : "Deudores"} - Mes: ${selectedMonth}</h2>
          <table>
            <thead>
              <tr>
                ${viewType === "socio" ? "<th>APELLIDO</th><th>NOMBRE</th>" : "<th>EMPRESA</th>"}
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `<tr>${viewType === "socio" ? `<td>${item.apellido}</td><td>${item.nombre}</td>` : `<td>${item.razon_social}</td>`}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "Imprimir", "width=800,height=600");
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // Función para abrir el modal de selección de mes para impresión
  const handleAbrirModalImpresion = () => {
    // Validar que hay datos antes de mostrar el modal
    let data = [];
    if (viewType === "socio") {
      data = activeTab === "pagado" ? sociosPagados : sociosDeudores;
    } else if (viewType === "empresa") {
      data = activeTab === "pagado" ? empresasPagadas : empresasDeudoras;
    }

    if (data.length === 0) {
      setErrorMessage("No hay datos para imprimir.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    setMostrarModalMes(true);
  };

  // Función para imprimir todos los comprobantes
  const handleImprimirTodosComprobantes = (mes) => {
    let data = [];
    if (viewType === "socio") {
      data = activeTab === "pagado" ? sociosPagados : sociosDeudores;
    } else if (viewType === "empresa") {
      data = activeTab === "pagado" ? empresasPagadas : empresasDeudoras;
    }

    let comprobantesHTML = `
      <html>
      <head>
          <title>Comprobantes de Pago</title>
          <style>
              @page {
                  size: A4 portrait;
                  margin: 0;
              }
              body {
                  width: 210mm;
                  height: 297mm;
                  margin: 0;
                  padding: 0;
                  font-family: Arial, sans-serif;
                  font-size: 12px;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  align-items: center;
                  position: relative;
                  transform: rotate(90deg);
                  transform-origin: top left;
                  left: 70%;
                  top: 0;
              }
              .contenedor {
                  width: 210mm;
                  margin: 10mm 0;
                  page-break-after: always;
                  box-sizing: border-box;
              }
              .comprobante {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  box-sizing: border-box;
              }
              .talon-socio {
                  width: 60%;
                  padding-left: 20mm;
                  padding-top: 13mm;
              }
              .talon-cobrador {
                  width: 60mm;
                  padding-left: 10mm;
                  padding-top: 16mm;
              }
              p {
                  margin-top: 5px;
                  font-size: 13px;
              }
          </style>
      </head>
      <body>
    `;

    data.forEach((item) => {
      const monto = item.categoria === "A" ? "5000" : 
                  item.categoria === "B" ? "3000" : 
                  item.categoria === "C" ? "2000" : "N/A";

      comprobantesHTML += `
        <div class="contenedor">
          <div class="comprobante">
            <div class="talon-socio">
              <p><strong>${viewType === "socio" ? "Afiliado:" : "Empresa:"}</strong> ${viewType === "socio" ? `${item.apellido} ${item.nombre}` : item.razon_social}</p>
              <p><strong>Domicilio:</strong> ${item.domicilio || item.domicilio_2 || "N/A"}</p>
              <p><strong>Categoría / Monto:</strong> ${item.categoria} / $${monto}</p>
              <p><strong>Período:</strong> ${mes}</p>
              <p><strong>Estado:</strong> PAGADO</p>
              <p>Por consultas comunicarse al 03564-15205778</p>
            </div>
            <div class="talon-cobrador">
              <p><strong>${viewType === "socio" ? "Nombre y Apellido:" : "Empresa:"}</strong> ${viewType === "socio" ? `${item.apellido} ${item.nombre}` : item.razon_social}</p>
              <p><strong>Categoría / Monto:</strong> ${item.categoria} / $${monto}</p>
              <p><strong>Período:</strong> ${mes}</p>
              <p><strong>Estado:</strong> PAGADO</p>
            </div>
          </div>
        </div>
      `;
    });

    comprobantesHTML += `
      </body>
      </html>
    `;

    const ventana = window.open('', '', 'width=600,height=400');
    ventana.document.write(comprobantesHTML);
    ventana.document.close();
    ventana.print();
    setMostrarModalMes(false);
  };

  // Función para manejar la búsqueda
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Función para filtrar los datos
  const filterData = (data) => {
    return data.filter((item) =>
      viewType === "socio"
        ? item.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        : item.razon_social.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Función para renderizar la tabla
  const renderTabla = (data) => {
    const filteredData = filterData(data);

    return (
      <div className="gc-table-container">
        <table className="gc-table">
          <thead>
            <tr>
              {viewType === "socio" ? (
                <>
                  <th>Apellido</th>
                  <th>Nombre</th>
                  <th className="gc-domicilio-column">Dirección</th>
                  <th className="gc-categoria-column">Categoría</th>
                </>
              ) : (
                <>
                  <th>Razón Social</th>
                  <th className="gc-domicilio-column">Dirección</th>
                  <th className="gc-categoria-column">Categoría</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={index}>
                {viewType === "socio" ? (
                  <>
                    <td>{item.apellido}</td>
                    <td>{item.nombre}</td>
                    <td className="gc-domicilio-column">{`${item.domicilio} ${item.numero}`}</td>
                    <td className="gc-categoria-column">{item.categoria} ${item.precio_categoria}</td>
                  </>
                ) : (
                  <>
                    <td>{item.razon_social}</td>
                    <td className="gc-domicilio-column">{item.domicilio}</td>
                    <td className="gc-categoria-column">{item.categoria} ${item.precio_categoria}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="gc-container">
      {/* Modal para seleccionar mes de impresión */}
      {mostrarModalMes && (
        <ModalMesCuotas
          mesSeleccionado={mesSeleccionadoImpresion}
          onMesSeleccionado={setMesSeleccionadoImpresion}
          onCancelar={() => setMostrarModalMes(false)}
          onImprimir={() => handleImprimirTodosComprobantes(mesSeleccionadoImpresion)}
        />
      )}

      {/* Sección izquierda con filtros y controles */}
      <div className="gc-left-section gc-box">
        {/* Header fijo */}
        <div className="gc-header-section">
          <h2 className="gc-title">
            <FontAwesomeIcon icon={faMoneyCheckAlt} className="gc-title-icon" />
            Gestionar Cuotas
          </h2>
          <div className="gc-divider"></div>
        </div>
  
        {/* Contenido con scroll */}
        <div className="gc-scrollable-content">
          <div className="gc-top-section">
            <div className="gc-filter-card">
              <div className="gc-filter-header">
                <FontAwesomeIcon icon={faFilter} className="gc-filter-icon" />
                <span>Filtros</span>
              </div>
  
              <div className="gc-select-container">
                <div className="gc-input-group">
                  <label htmlFor="meses" className="gc-input-label">
                    <FontAwesomeIcon icon={faCalendarAlt} /> Mes
                  </label>
                  <select
                    id="meses"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="gc-dropdown"
                  >
                    <option value="">Seleccionar mes</option>
                    {meses.map((mes, index) => (
                      <option key={index} value={mes.mes}>{mes.mes}</option>
                    ))}
                  </select>
                </div>
  
                <div className="gc-input-group">
                  <label htmlFor="entidad" className="gc-input-label">
                    <FontAwesomeIcon icon={faUsers} /> Tipo de vista
                  </label>
                  <select
                    id="entidad"
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    className="gc-dropdown"
                  >
                    <option value="socio">Socios</option>
                    <option value="empresa">Empresas</option>
                  </select>
                </div>
  
                <div className="gc-input-group">
                  <label htmlFor="search" className="gc-input-label">
                    <FontAwesomeIcon icon={faSearch} /> Buscar
                  </label>
                  <div className="gc-search-integrated">
                    <FontAwesomeIcon icon={faSearch} className="gc-search-icon" />
                    <input
                      id="search"
                      type="text"
                      placeholder={`Buscar ${viewType === "socio" ? "socio..." : "empresa..."}`}
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
              </div>
            </div>
  
            <div className="gc-tabs-card">
              <div className="gc-tabs-header">
                <FontAwesomeIcon icon={faList} className="gc-tabs-icon" />
                <span>Estado de cuotas</span>
              </div>
              <div className="gc-tab-container">
                <button
                  className={`gc-tab-button ${activeTab === "pagado" ? "gc-active-tab" : ""}`}
                  onClick={() => setActiveTab("pagado")}
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Pagado
                  <span className="gc-tab-badge">
                    {viewType === "socio" ? sociosPagados.length : empresasPagadas.length}
                  </span>
                </button>
                <button
                  className={`gc-tab-button ${activeTab === "deudores" ? "gc-active-tab" : ""}`}
                  onClick={() => setActiveTab("deudores")}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  Deudores
                  <span className="gc-tab-badge">
                    {viewType === "socio" ? sociosDeudores.length : empresasDeudoras.length}
                  </span>
                </button>
              </div>
            </div>
          </div>
  
          {errorMessage && (
            <div className="gc-alert gc-alert-error">
              <FontAwesomeIcon icon={faExclamationCircle} />
              {errorMessage}
            </div>
          )}
  
          <div className="gc-actions-card">
            <div className="gc-actions-header">
              <FontAwesomeIcon icon={faCog} className="gc-actions-icon" />
              <span>Acciones</span>
            </div>
            <div className="gc-buttons-container">
              <button className="gc-button gc-button-back" onClick={handleVolverAtras}>
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Volver Atrás</span>
              </button>
              <button className="gc-button gc-button-export" onClick={handleExportExcel}>
                <FontAwesomeIcon icon={faFileExcel} />
                <span>Exportar a Excel</span>
              </button>
              <button className="gc-button gc-button-print" onClick={handleImprimirRegistro}>
                <FontAwesomeIcon icon={faPrint} />
                <span>Registro</span>
              </button>
              <button 
                className="gc-button gc-button-print-all" 
                onClick={handleAbrirModalImpresion}
              >
                <FontAwesomeIcon icon={faPrint} />
                <span>Imprimir Todos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
  
      {/* Sección derecha con la tabla */}
      <div className="gc-right-section gc-box">
        <div className="gc-table-header">
          <h3>
            <FontAwesomeIcon icon={activeTab === "pagado" ? faCheckCircle : faExclamationTriangle} />
            {activeTab === "pagado" ? "Cuotas Pagadas" : "Cuotas Pendientes"}
          </h3>
          <div className="gc-summary-info">
            <span className="gc-summary-item">
              <FontAwesomeIcon icon={faUsers} />
              Total: {viewType === "socio"
                ? (activeTab === "pagado" ? sociosPagados.length : sociosDeudores.length)
                : (activeTab === "pagado" ? empresasPagadas.length : empresasDeudoras.length)}
            </span>
            <span className="gc-summary-item">
              <FontAwesomeIcon icon={faCalendarAlt} />
              Mes: {selectedMonth || "Todos"}
            </span>
          </div>
        </div>
  
        <div className="gc-table-container">
          {activeTab === "pagado"
            ? renderTabla(viewType === "socio" ? sociosPagados : empresasPagadas)
            : renderTabla(viewType === "socio" ? sociosDeudores : empresasDeudoras)}
        </div>
      </div>
    </div>
  );
};

export default GestionarCuotas;