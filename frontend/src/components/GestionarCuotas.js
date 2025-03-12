import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExcel, faArrowLeft, faSearch } from '@fortawesome/free-solid-svg-icons';
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
              <tr key={index}>
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
        </div>
      </div>
    </div>
  );
};

export default GestionarCuotas;