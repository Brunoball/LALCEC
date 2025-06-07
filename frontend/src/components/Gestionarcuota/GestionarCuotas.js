import React, { useState, useEffect, useMemo, memo } from "react";
import { FixedSizeList as List } from "react-window";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExcel, faArrowLeft, faSearch, faCoins } from '@fortawesome/free-solid-svg-icons';
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
  faCreditCard,
} from '@fortawesome/free-solid-svg-icons';
import ModalMesCuotas from "./ModalMesCuotas";
import ModalPagos from "./ModalPagos";
import ModalPagosEmpresas from "./ModalPagosEmpresas";
import BASE_URL from "../../config/config";

const Row = memo(({ index, style, data, selectedRow, viewType, activeTab, onRowClick, onPaymentClick }) => {
  const item = data[index];
  const isSelected = selectedRow === index;
  
  return (
    <div
      style={style}
      className={`gc-virtual-row ${isSelected ? "gc-selected-row" : ""}`}
      onClick={() => onRowClick(index)}
    >
      {viewType === "socio" ? (
        <>
          <div className="gc-virtual-cell">{item.apellido}</div>
          <div className="gc-virtual-cell">{item.nombre}</div>
          <div className="gc-virtual-cell">{item.domicilio}</div>
          <div className="gc-virtual-cell">{item.displayCategoriaPrecio}</div>
          <div className="gc-virtual-cell">{item.medio_pago || '-'}</div>
          {activeTab === "deudores" && (
            <div className="gc-virtual-cell">
              {isSelected && (
                <button
                  className="gc-action-button gc-payment-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPaymentClick(item);
                  }}
                >
                  <FontAwesomeIcon icon={faCoins} />
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="gc-virtual-cell">{item.razon_social}</div>
          <div className="gc-virtual-cell">{item.domicilio}</div>
          <div className="gc-virtual-cell">{item.displayCategoriaPrecio}</div>
          <div className="gc-virtual-cell">{item.medio_pago || '-'}</div>
          {activeTab === "deudores" && (
            <div className="gc-virtual-cell">
              {isSelected && (
                <button
                  className="gc-action-button gc-payment-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPaymentClick(item);
                  }}
                >
                  <FontAwesomeIcon icon={faCoins} />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

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
  const [mediosPago, setMediosPago] = useState([]);
  const [selectedMedioPago, setSelectedMedioPago] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [mostrarModalPagoSocio, setMostrarModalPagoSocio] = useState(false);
  const [mostrarModalPagoEmpresa, setMostrarModalPagoEmpresa] = useState(false);
  const [selectedItemData, setSelectedItemData] = useState(null);
  const [mesesSeleccionadosImpresion, setMesesSeleccionadosImpresion] = useState([]);
  const [dataSocios, setDataSocios] = useState({ pagado: [], deudor: [] });
  const [dataEmpresas, setDataEmpresas] = useState({ pagado: [], deudor: [] });

  // Obtener los meses disponibles
  useEffect(() => {
    const fetchMeses = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api.php?action=meses_pagos`);
        const data = await response.json();
        setMeses(data);
      } catch (error) {
        console.error("Error al obtener los meses:", error);
      }
    };

    fetchMeses();
  }, []);

  // Obtener los medios de pago disponibles
  useEffect(() => {
    const fetchMediosPago = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api.php?action=obtener_datos`);
        const data = await response.json();

        const mediosAdaptados = (data.mediosPago || []).map((item) => ({
          id: item.IdMedios_pago,
          nombre: item.Medio_Pago
        }));

        setMediosPago(mediosAdaptados);
      } catch (error) {
        console.error("Error al obtener los medios de pago:", error);
      }
    };

    fetchMediosPago();
  }, []);

  const precargarDatos = async () => {
    try {
      const tipos = ["pagado", "deudor"];
      for (const estado of tipos) {
        const url = new URL(`${BASE_URL}/api.php`);
        url.searchParams.append("action", "cuotas");
        url.searchParams.append("tipo", viewType);
        url.searchParams.append("estado", estado);
        url.searchParams.append("mes", selectedMonth);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (Array.isArray(data)) {
          const formattedData = data.map(item => ({
            ...item,
            displayCategoriaPrecio: `${item.categoria} $${item.precio_categoria || "N/A"}`
          }));

          if (viewType === "socio") {
            setDataSocios(prev => ({ ...prev, [estado]: formattedData }));
          } else {
            setDataEmpresas(prev => ({ ...prev, [estado]: formattedData }));
          }
        }
      }
    } catch (error) {
      console.error("Error precargando datos:", error);
    }
  };

  useEffect(() => {
    if (!selectedMonth) return;
    precargarDatos();
  }, [selectedMonth, viewType]);

  useEffect(() => {
    if (!selectedMonth) return;

    const sourceData = viewType === "socio" ? dataSocios : dataEmpresas;

    const pagadosFiltrados = sourceData.pagado.filter(item =>
      !selectedMedioPago || item.medio_pago?.toLowerCase() === selectedMedioPago.toLowerCase()
    );

    const deudoresFiltrados = sourceData.deudor.filter(item =>
      !selectedMedioPago || item.medio_pago?.toLowerCase() === selectedMedioPago.toLowerCase()
    );

    if (viewType === "socio") {
      setSociosPagados(pagadosFiltrados);
      setSociosDeudores(deudoresFiltrados);
    } else {
      setEmpresasPagadas(pagadosFiltrados);
      setEmpresasDeudoras(deudoresFiltrados);
    }
  }, [dataSocios, dataEmpresas, selectedMedioPago, viewType, selectedMonth]);

  const datosCrudos = useMemo(() => {
    return viewType === "socio"
      ? (activeTab === "pagado" ? sociosPagados : sociosDeudores)
      : (activeTab === "pagado" ? empresasPagadas : empresasDeudoras);
  }, [viewType, activeTab, sociosPagados, sociosDeudores, empresasPagadas, empresasDeudoras]);

  const filterData = (data) => {
    return data.filter((item) =>
      viewType === "socio"
        ? item.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
        : item.razon_social?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredData = useMemo(() => {
    return filterData(datosCrudos);
  }, [datosCrudos, searchTerm]);

  const handleVolverAtras = () => navigate(-1);

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleMedioPagoChange = (e) => {
    setSelectedMedioPago(e.target.value);
  };

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
      MedioPago: selectedMedioPago || "Todos"
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, viewType === "socio" ? "Socios" : "Empresas");
    XLSX.writeFile(wb, `${viewType}_${selectedMonth}_${activeTab}_${selectedMedioPago || 'todos'}.xlsx`);

    setErrorMessage("");
  };

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
          ${selectedMedioPago ? `<h3>Medio de Pago: ${selectedMedioPago}</h3>` : ''}
          <table>
            <thead>
              <tr>
                ${viewType === "socio" ? "<th>APELLIDO</th><th>NOMBRE</th><th>MEDIO PAGO</th>" : "<th>EMPRESA</th><th>MEDIO PAGO</th>"}
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `<tr>${viewType === "socio" ? 
                `<td>${item.apellido}</td><td>${item.nombre}</td><td>${item.medio_pago || '-'}</td>` : 
                `<td>${item.razon_social}</td><td>${item.medio_pago || '-'}</td>`}</tr>`).join("")}
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

  const handleAbrirModalImpresion = () => {
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
      const monto = item.precio_categoria || "N/A";

      comprobantesHTML += `
        <div class="contenedor">
          <div class="comprobante">
            <div class="talon-socio">
              <p><strong>${viewType === "socio" ? "Afiliado:" : "Empresa:"}</strong> ${viewType === "socio" ? `${item.apellido} ${item.nombre}` : item.razon_social}</p>
              <p><strong>Domicilio:</strong> ${item.domicilio || item.domicilio_2 || "N/A"}</p>
              <p><strong>Categoría / Monto:</strong> ${item.categoria} / $${monto}</p>
              <p><strong>Período:</strong> ${mes}</p>
              <p><strong>Medio de Pago:</strong> ${item.medio_pago || 'No especificado'}</p>
              ${activeTab === "pagado" ? `<p><strong>Estado:</strong> PAGADO</p>` : ""}
              <p>Por consultas comunicarse al 03564-15205778</p>
              <p>Las cuotas adeudadas se cobrarán al valor actualizado al momento del pago.</p>
            </div>

            <div class="talon-cobrador">
              <p><strong>${viewType === "socio" ? "Nombre y Apellido:" : "Empresa:"}</strong> ${viewType === "socio" ? `${item.apellido} ${item.nombre}` : item.razon_social}</p>
              <p><strong>Categoría / Monto:</strong> ${item.categoria} / $${monto}</p>
              <p><strong>Período:</strong> ${mes}</p>
              <p><strong>Medio de Pago:</strong> ${item.medio_pago || 'No especificado'}</p>
              ${activeTab === "pagado" ? `<p><strong>Estado:</strong> PAGADO</p>` : ""}
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRowClick = (index) => {
    setSelectedRow(selectedRow === index ? null : index);
  };

  const handlePaymentClick = (item) => {
    setSelectedItemData(item);
    if (viewType === "socio") {
      setMostrarModalPagoSocio(true);
    } else {
      setMostrarModalPagoEmpresa(true);
    }
  };

  const renderTabla = () => {
    return (
      <div className="gc-virtual-table">
        <div className="gc-virtual-header">
          {viewType === "socio" ? (
            <>
              <div className="gc-virtual-cell">Apellido</div>
              <div className="gc-virtual-cell">Nombre</div>
              <div className="gc-virtual-cell">Dirección</div>
              <div className="gc-virtual-cell">Categoría</div>
              <div className="gc-virtual-cell">Medio Pago</div>
              {activeTab === "deudores" && <div className="gc-virtual-cell">Acciones</div>}
            </>
          ) : (
            <>
              <div className="gc-virtual-cell">Razón Social</div>
              <div className="gc-virtual-cell">Dirección</div>
              <div className="gc-virtual-cell">Categoría</div>
              <div className="gc-virtual-cell">Medio Pago</div>
              {activeTab === "deudores" && <div className="gc-virtual-cell">Acciones</div>}
            </>
          )}
        </div>

        <List
          height={500}
          itemCount={filteredData.length}
          itemSize={50}
          itemData={filteredData}
          width={"100%"}
        >
          {(props) => (
            <Row 
              {...props} 
              selectedRow={selectedRow} 
              viewType={viewType} 
              activeTab={activeTab}
              onRowClick={handleRowClick}
              onPaymentClick={handlePaymentClick}
            />
          )}
        </List>
      </div>
    );
  };

  return (
    <div className="gc-container">
      {mostrarModalMes && (
        <ModalMesCuotas
          mesesSeleccionados={mesesSeleccionadosImpresion}
          onMesSeleccionadosChange={setMesesSeleccionadosImpresion}
          onCancelar={() => setMostrarModalMes(false)}
          onImprimir={() => handleImprimirTodosComprobantes(mesesSeleccionadosImpresion)}
        />
      )}

      {mostrarModalPagoSocio && selectedItemData && (
        <ModalPagos
          nombre={selectedItemData.nombre}
          apellido={selectedItemData.apellido}
          cerrarModal={() => {
            setMostrarModalPagoSocio(false);
            setSelectedItemData(null);
          }}
          onPagoRealizado={() => {
            setMostrarModalPagoSocio(false);
            setSelectedItemData(null);
            if (selectedMonth) {
              precargarDatos();
            }
          }}
        />
      )}

      {mostrarModalPagoEmpresa && selectedItemData && (
        <ModalPagosEmpresas
          razonSocial={selectedItemData.razon_social}
          cerrarModal={() => {
            setMostrarModalPagoEmpresa(false);
            setSelectedItemData(null);
          }}
          onPagoRealizado={() => {
            setMostrarModalPagoEmpresa(false);
            setSelectedItemData(null);
            if (selectedMonth) {
              precargarDatos();
            }
          }}
        />
      )}

      <div className="gc-left-section gc-box">
        <div className="gc-header-section">
          <h2 className="gc-title">
            <FontAwesomeIcon icon={faMoneyCheckAlt} className="gc-title-icon" />
            Gestionar Cuotas
          </h2>
          <div className="gc-divider"></div>
        </div>
  
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
                  <label htmlFor="medioPago" className="gc-input-label">
                    <FontAwesomeIcon icon={faCreditCard} /> Medio de Pago
                  </label>
                  <select
                    id="medioPago"
                    value={selectedMedioPago}
                    onChange={handleMedioPagoChange}
                    className="gc-dropdown"
                  >
                    <option value="">Todos</option>
                    {mediosPago.map((medio, index) => (
                      <option key={index} value={medio.nombre}>{medio.nombre}</option>
                    ))}
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
                  onClick={() => {
                    setActiveTab("pagado");
                    setSelectedRow(null);
                  }}
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Pagado
                  <span className="gc-tab-badge">
                    {viewType === "socio" ? (sociosPagados?.length || 0) : (empresasPagadas?.length || 0)}
                  </span>
                </button>
                <button
                  className={`gc-tab-button ${activeTab === "deudores" ? "gc-active-tab" : ""}`}
                  onClick={() => {
                    setActiveTab("deudores");
                    setSelectedRow(null);
                  }}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  Deudores
                  <span className="gc-tab-badge">
                    {viewType === "socio" ? (sociosDeudores?.length || 0) : (empresasDeudoras?.length || 0)}
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
                <span>Generar Excel</span>
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
                ? (activeTab === "pagado" ? (sociosPagados?.length || 0) : (sociosDeudores?.length || 0))
                : (activeTab === "pagado" ? (empresasPagadas?.length || 0) : (empresasDeudoras?.length || 0))}
            </span>
            <span className="gc-summary-item">
              <FontAwesomeIcon icon={faCalendarAlt} />
              Mes: {selectedMonth || "Todos"}
            </span>
            {activeTab === "pagado" && selectedMedioPago && (
              <span className="gc-summary-item">
                <FontAwesomeIcon icon={faCreditCard} />
                Medio: {selectedMedioPago}
              </span>
            )}
          </div>
        </div>
  
        <div className="gc-table-container">
          {renderTabla()}
        </div>
      </div>
    </div>
  );
};

export default GestionarCuotas;