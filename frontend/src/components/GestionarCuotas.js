import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExcel, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import "./GestionarCuotas.css";

const GestionarCuotas = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pagado");
  const [sociosPagados, setSociosPagados] = useState([]);
  const [sociosDeudores, setSociosDeudores] = useState([]);
  const [meses, setMeses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // Estado para el mensaje de error


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

  useEffect(() => {
    const fetchSocios = async () => {
      if (selectedMonth) {
        try {
          const responsePagados = await fetch(
            `http://localhost:3001/socios_pagados.php?mes=${selectedMonth}`
          );
          const dataPagados = await responsePagados.json();
          const sociosSinId = dataPagados.map(({ id_socios, ...resto }) => resto);
          setSociosPagados(sociosSinId);

          const responseDeudores = await fetch(
            `http://localhost:3001/socios_deudores.php?mes=${selectedMonth}`
          );
          const dataDeudores = await responseDeudores.json();
          const deudoresSinId = dataDeudores.map(({ id_socios, ...resto }) => resto);
          setSociosDeudores(deudoresSinId);
        } catch (error) {
          console.error("Error al obtener los socios:", error);
        }
      }
    };

    fetchSocios();
  }, [selectedMonth]);

  const handleVolverAtras = () => navigate(-1);

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };






  const handleExportExcel = () => {
    let socios = activeTab === "pagado" ? sociosPagados : sociosDeudores;
  
    // Si no hay socios, mostramos un mensaje de error en el estado
    if (socios.length === 0) {
      setErrorMessage("Datos incompletos: No hay socios para exportar.");
  
      // Ocultar el mensaje después de 3 segundos
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
      
      return;
    }
  
    const sociosExport = socios.map(({ idSocios, nombre, apellido, ...resto }) => ({
      idSocios, // Primera columna (A)
      apellido, // Segunda columna (B)
      nombre,   // Tercera columna (C)
      ...resto,  // Mantiene las demás propiedades en su orden original
      Mes: selectedMonth,
      Tipo: activeTab === "pagado" ? "Pagados" : "Deudores",
    }));
  
    const ws = XLSX.utils.json_to_sheet(sociosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Socios");
    XLSX.writeFile(wb, `socios_${selectedMonth}_${activeTab}.xlsx`);
  
    // Limpiar el mensaje de error después de la exportación exitosa
    setErrorMessage("");
  };
  
  






  const handleImprimirRegsitro = () => {
    let socios = activeTab === "pagado" ? sociosPagados : sociosDeudores;
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
                <th>APELLIDO</th>
                <th>NOMBRE</th>
              </tr>
            </thead>
            <tbody>
              ${socios.map(socio => `<tr><td>${socio.apellido}</td><td>${socio.nombre}</td></tr>`).join("")}
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

  const renderTabla = (socios) => (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Apellido</th>
            <th>Nombre</th>
            <th className="domicilio-column">Dirección</th>
            <th className="categoria-column">Categoría</th> {/* Clase especial para Categoría */}
          </tr>
        </thead>
        <tbody>
          {socios.map((socio, index) => (
            <tr key={index}>
              <td>{socio.apellido}</td>
              <td>{socio.nombre}</td>
              <td className="domicilio-column">{`${socio.domicilio} ${socio.numero}`}</td>
              <td className="categoria-column">{socio.categoria}</td> {/* Clase especial para Categoría */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  

  return (
    <div className="container">
      <div className="box">
        <h2 className="title">Gestionar Cuotas</h2>
        <div className="top-section">
          <div className="select-container">
            <select id="meses" value={selectedMonth} onChange={handleMonthChange} className="select">
              <option value="">Seleccionar mes</option>
              {meses.map((mes, index) => (
                <option key={index} value={mes.mes}>{mes.mes}</option>
              ))}
            </select>
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
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        {activeTab === "pagado" ? renderTabla(sociosPagados) : renderTabla(sociosDeudores)}
        <div className="buttons-container">
          <button className="button-back" onClick={handleVolverAtras}><FontAwesomeIcon icon={faArrowLeft} /> Volver Atrás</button>
          <button className="button-export" onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} /> Exportar a Excel</button>
          <button className="button-print" onClick={handleImprimirRegsitro}><FontAwesomeIcon icon={faPrint} /> Imprimir Registro</button>
        </div>
      </div>
    </div>
  );
};

export default GestionarCuotas;
