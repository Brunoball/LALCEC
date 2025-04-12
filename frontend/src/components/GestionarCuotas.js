import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExcel, faArrowLeft, faSearch, faReceipt } from '@fortawesome/free-solid-svg-icons';
import "./GestionarCuotas.css";

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
  const [viewType, setViewType] = useState("socio"); // "socio" o "empresa"
  const [selectedItem, setSelectedItem] = useState(null);
  const [mostrarModalMes, setMostrarModalMes] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState("");

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
    setMesSeleccionado(e.target.value);
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
      setErrorMessage("Datos incompletos: No hay datos para exportar.");
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
    let data = [];
    if (viewType === "socio") {
      data = activeTab === "pagado" ? sociosPagados : sociosDeudores;
    } else if (viewType === "empresa") {
      data = activeTab === "pagado" ? empresasPagadas : empresasDeudoras;
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

  // Función para imprimir comprobante individual
  const handleImprimirComprobante = () => {
    if (!selectedItem) {
      setErrorMessage("Por favor seleccione un item de la lista");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    const fechaActual = new Date().toLocaleDateString();
    const monto = selectedItem.categoria === "A" ? "5000" : 
                 selectedItem.categoria === "B" ? "3000" : 
                 selectedItem.categoria === "C" ? "2000" : "N/A";

    let content = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .comprobante { border: 2px solid #000; padding: 20px; max-width: 500px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .subtitle { font-size: 18px; margin-bottom: 20px; }
            .info { margin-bottom: 15px; }
            .info-label { font-weight: bold; display: inline-block; width: 150px; }
            .footer { margin-top: 30px; text-align: center; font-style: italic; }
            .separator { border-top: 1px dashed #000; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="comprobante">
            <div class="header">
              <div class="title">COMPROBANTE DE PAGO</div>
              <div class="subtitle">Club Social y Deportivo</div>
            </div>
            
            <div class="info">
              <span class="info-label">Fecha:</span> ${fechaActual}
            </div>
            
            <div class="info">
              <span class="info-label">Mes:</span> ${selectedMonth}
            </div>
            
            <div class="separator"></div>
            
            <div class="info">
              <span class="info-label">${viewType === "socio" ? "Socio:" : "Empresa:"}</span> 
              ${viewType === "socio" ? `${selectedItem.apellido}, ${selectedItem.nombre}` : selectedItem.razon_social}
            </div>
            
            <div class="info">
              <span class="info-label">Categoría:</span> ${selectedItem.categoria}
            </div>
            
            <div class="info">
              <span class="info-label">Monto:</span> $${monto}
            </div>
            
            <div class="separator"></div>
            
            <div class="footer">
              <p>¡Gracias por su pago!</p>
              <p>Este comprobante no es válido como factura</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "Imprimir Comprobante", "width=600,height=800");
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // Función para abrir modal de selección de mes
  const abrirModalMes = () => {
    if (!selectedMonth) {
      setErrorMessage("Por favor seleccione un mes primero");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }
    setMostrarModalMes(true);
  };

  // Función para cerrar modal de mes
  const cerrarModalMes = () => {
    setMostrarModalMes(false);
  };

  // Función para imprimir todos los comprobantes
  const handleImprimirTodosComprobantes = () => {
    if (!mesSeleccionado) {
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
              <p><strong>Período:</strong> ${mesSeleccionado}</p>
              <p><strong>Estado:</strong> ${activeTab === "pagado" ? "PAGADO" : "DEUDOR"}</p>
              <p>Por consultas comunicarse al 03564-15205778</p>
            </div>
            <div class="talon-cobrador">
              <p><strong>${viewType === "socio" ? "Nombre y Apellido:" : "Empresa:"}</strong> ${viewType === "socio" ? `${item.apellido} ${item.nombre}` : item.razon_social}</p>
              <p><strong>Categoría / Monto:</strong> ${item.categoria} / $${monto}</p>
              <p><strong>Período:</strong> ${mesSeleccionado}</p>
              <p><strong>Estado:</strong> ${activeTab === "pagado" ? "PAGADO" : "DEUDOR"}</p>
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
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {viewType === "socio" ? (
                <>
                  <th>Apellido</th>
                  <th>Nombre</th>
                  <th className="domicilio-column">Dirección</th>
                  <th className="categoria-column">Categoría</th>
                </>
              ) : (
                <>
                  <th>Empresa</th>
                  <th className="domicilio-column">Dirección</th>
                  <th className="categoria-column">Categoría</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr 
                key={index} 
                onClick={() => setSelectedItem(item)}
                className={selectedItem === item ? "selected-row" : ""}
              >
                {viewType === "socio" ? (
                  <>
                    <td>{item.apellido}</td>
                    <td>{item.nombre}</td>
                    <td className="domicilio-column">{`${item.domicilio} ${item.numero}`}</td>
                    <td className="categoria-column">{item.categoria}</td>
                  </>
                ) : (
                  <>
                    <td>{item.razon_social}</td>
                    <td className="domicilio-column">{item.domicilio}</td>
                    <td className="categoria-column">{item.categoria}</td>
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
    <div className="container">
      <div className="box">
        <h2 className="title">Gestionar Cuotas</h2>
        <div className="top-section">
          <div className="select-container">
            <div className="select-mes">
              <select
                id="meses"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="dropdown"
              >
                <option value="">Seleccionar mes</option>
                {meses.map((mes, index) => (
                  <option key={index} value={mes.mes}>{mes.mes}</option>
                ))}
              </select>
            </div>
            <div className="select-entidad">
              <select
                value={viewType}
                onChange={(e) => setViewType(e.target.value)}
                className="dropdown"
              >
                <option value="socio">Socios</option>
                <option value="empresa">Empresas</option>
              </select>
            </div>
          </div>

          <div className="search-container">
            <div className="search-wrapper">
              <input
                type="text"
                placeholder={`Buscar por ${viewType === "socio" ? "socio..." : "empresa..."}`}
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
            </div>
          </div>

          <div className="tab-container">
            <button className={activeTab === "pagado" ? "active-tab" : "inactive-tab"} onClick={() => setActiveTab("pagado")}>
              Pagado
            </button>
            <button className={activeTab === "deudores" ? "active-tab" : "inactive-tab"} onClick={() => setActiveTab("deudores")}>
              Deudores
            </button>
          </div>
        </div>

        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {activeTab === "pagado"
          ? renderTabla(viewType === "socio" ? sociosPagados : empresasPagadas)
          : renderTabla(viewType === "socio" ? sociosDeudores : empresasDeudoras)}
        
        <div className="buttons-container">
          <button className="button-back" onClick={handleVolverAtras}>
            <FontAwesomeIcon icon={faArrowLeft} /> Volver Atrás
          </button>
          <button className="button-export" onClick={handleExportExcel}>
            <FontAwesomeIcon icon={faFileExcel} /> Exportar a Excel
          </button>
          <button className="button-print" onClick={handleImprimirRegistro}>
            <FontAwesomeIcon icon={faPrint} /> Imprimir Registro
          </button>

          <button className="button-print-all" onClick={abrirModalMes}>
            <FontAwesomeIcon icon={faPrint} /> Imprimir Todos
          </button>
        </div>
      </div>

      {/* Modal para confirmar impresión de todos los comprobantes */}
      {mostrarModalMes && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="modal-title">Confirmar Impresión</h3>
            <p className="modal-text">
              ¿Desea imprimir comprobantes para {activeTab === "pagado" ? "todos los pagados" : "todos los deudores"} del mes {mesSeleccionado}?
            </p>
            <p className="modal-text">
              Total: {viewType === "socio" 
                ? (activeTab === "pagado" ? sociosPagados.length : sociosDeudores.length)
                : (activeTab === "pagado" ? empresasPagadas.length : empresasDeudoras.length)} {viewType === "socio" ? "socios" : "empresas"}
            </p>
            <div className="modal-buttons">
              <button className="modal-button cancel-button" onClick={cerrarModalMes}>
                Cancelar
              </button>
              <button className="modal-button accept-button" onClick={handleImprimirTodosComprobantes}>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionarCuotas;