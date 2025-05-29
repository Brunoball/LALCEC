import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowLeft, faEdit, faTrash, faSearch, faDollar, faFileExcel, faPrint, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import ModalPagosEmpresas from "./ModalPagosEmpresas";
import "./GestionarEmpresas.css";
import ModalEliminarEmpresa from "./modales_emp/ModalEliminarEmpresa";
import ModalInfoEmpresa from "./modales_emp/ModalInfoEmpresa";
import ModalMesEmpresa from "./modales_emp/ModalMesEmpresa";

const GestionarEmpresas = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [mediosDePago, setMediosDePago] = useState([]);
  const [letraSeleccionada, setLetraSeleccionada] = useState("");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [empresasFiltradas, setEmpresasFiltradas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tipoEntidad, setTipoEntidad] = useState(localStorage.getItem("ultimaEntidad") || "empresas");
  const [actualizar, setActualizar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [restaurandoEstado, setRestaurandoEstado] = useState(true);
  const [mostrarModalMes, setMostrarModalMes] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [infoEmpresa, setInfoEmpresa] = useState(null);
  const [mesesPagados, setMesesPagados] = useState([]);

  // Función para determinar el estado de pago de la empresa
  const getEstadoPago = (mesesPagados) => {
    if (!mesesPagados) return 'rojo';
    
    const meses = mesesPagados.split(',').map(mes => mes.trim().toUpperCase());
    const mesActual = new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
    const mesesAnio = [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];
    
    const indiceMesActual = mesesAnio.indexOf(mesActual);
    const mesesHastaActual = mesesAnio.slice(0, indiceMesActual + 1);
    
    const mesesDebidos = mesesHastaActual.filter(mes => !meses.includes(mes));
    
    if (mesesDebidos.length === 0) {
      return 'verde';
    } else if (mesesDebidos.length <= 2) {
      return 'amarillo';
    } else {
      return 'rojo';
    }
  };

  // Búsqueda automática cuando cambian `busqueda` o `tipoEntidad`
  useEffect(() => {
    const ejecutarBusqueda = async () => {
      if (restaurandoEstado) {
        return;
      }

      if (busqueda) {
        await handleBusqueda(busqueda);
      } else {
        await handleMostrarTodos();
      }
    };

    ejecutarBusqueda();
  }, [busqueda, tipoEntidad]);

  // Carga inicial de datos y manejo del estado basado en el localStorage
  useEffect(() => {
    const obtenerDatos = async () => {
      setCargando(true);
      try {
        // Obtener medios de pago
        const responseMediosPago = await fetch("http://localhost:3001/obtener_datos.php");
        if (responseMediosPago.ok) {
          const data = await responseMediosPago.json();
          if (Array.isArray(data.mediosPago)) {
            setMediosDePago(data.mediosPago);
          } else {
            setError("Error: No se encontraron medios de pago.");
          }
        } else {
          setError("Error al obtener los medios de pago.");
        }

        // Restaurar el estado de la última búsqueda o filtrado
        const ultimaAccion = localStorage.getItem("ultimaAccion");
        const ultimaBusqueda = localStorage.getItem("ultimaBusqueda");
        const ultimosResultados = localStorage.getItem("ultimosResultados");
        const ultimaLetraSeleccionada = localStorage.getItem("ultimaLetraSeleccionada");
        const ultimoMedioPagoSeleccionado = localStorage.getItem("ultimoMedioPagoSeleccionado");

        if (ultimaAccion === "busqueda" && ultimaBusqueda && ultimosResultados) {
          setBusqueda(ultimaBusqueda);
          setEmpresasFiltradas(JSON.parse(ultimosResultados));
          setRestaurandoEstado(false);
        } else if (ultimaAccion === "letra" && ultimaLetraSeleccionada) {
          setLetraSeleccionada(ultimaLetraSeleccionada);
          await handleFiltrarPorLetra(ultimaLetraSeleccionada, tipoEntidad);
          setRestaurandoEstado(false);
        } else if (ultimaAccion === "medioPago" && ultimoMedioPagoSeleccionado) {
          setMedioPagoSeleccionado(ultimoMedioPagoSeleccionado);
          await handleFiltrarPorMedioPago(ultimoMedioPagoSeleccionado);
          setRestaurandoEstado(false);
        } else if (ultimaAccion === "todos") {
          await handleMostrarTodos();
          setRestaurandoEstado(false);
        } else {
          setEmpresas([]);
          setEmpresasFiltradas([]);
          setRestaurandoEstado(false);
        }
      } catch (error) {
        setError("Hubo un problema al obtener los datos.");
        console.error("Error:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerDatos();
  }, [actualizar, tipoEntidad]);

  const handleBusqueda = async (busquedaParam) => {
    let query = busquedaParam || busqueda || "";

    if (!query) {
      await handleMostrarTodos();
      return;
    }

    try {
      const url = `http://localhost:3001/buscarEmpresa.php?busqueda=${encodeURIComponent(query)}&tipoEntidad=empresas`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setEmpresas(data);
          setEmpresasFiltradas(data);
          localStorage.setItem("ultimaAccion", "busqueda");
          localStorage.setItem("ultimaBusqueda", query);
          localStorage.setItem("ultimosResultados", JSON.stringify(data));
        } else {
          setEmpresas([]);
          setEmpresasFiltradas([]);
        }
      } else {
        setEmpresas([]);
        setEmpresasFiltradas([]);
      }
    } catch (err) {
      console.error("Error en la búsqueda:", err);
      setEmpresas([]);
      setEmpresasFiltradas([]);
    }
  };

  const handleBusquedaInputChange = (e) => {
    const value = e.target.value;
    setBusqueda(value);

    if (value.length > 0) {
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      localStorage.removeItem("ultimaSeleccion");
    }
  };

  const handleVolverAtras = async () => {
    navigate(-1);
  };

  const handleFiltrarPorLetra = async (letra, tipo) => {
    try {
      let url = `http://localhost:3001/obtener_letras_empresa.php?letra=${letra}&tipo=${tipo}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setEmpresas(Array.isArray(data) ? data : []);
        setEmpresasFiltradas(Array.isArray(data) ? data : []);
        localStorage.setItem("ultimaAccion", "letra");
        localStorage.setItem("ultimaLetraSeleccionada", letra);
        localStorage.removeItem("ultimaBusqueda");
        localStorage.removeItem("ultimosResultados");
        setError(null);
      } else {
        setEmpresas([]);
        setEmpresasFiltradas([]);
      }
    } catch (error) {
      setEmpresas([]);
      setEmpresasFiltradas([]);
      setError("Error al obtener las empresas.");
      console.error("Error al obtener empresas:", error);
    }
  };

  const handleFiltrarPorMedioPago = async (medioPago) => {
    try {
      const url = `http://localhost:3001/filtro_empresas_mp.php?medio=${encodeURIComponent(medioPago)}&tipo=${tipoEntidad}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setEmpresas(data);
          setEmpresasFiltradas(data);
          localStorage.setItem("ultimaAccion", "medioPago");
          localStorage.setItem("ultimoMedioPagoSeleccionado", medioPago);
          localStorage.removeItem("ultimaBusqueda");
          localStorage.removeItem("ultimosResultados");
          setError(null);
        } else {
          setEmpresas([]);
          setEmpresasFiltradas([]);
        }
      } else {
        setEmpresas([]);
        setEmpresasFiltradas([]);
        setError("Error al obtener las empresas.");
      }
    } catch (error) {
      setEmpresas([]);
      setEmpresasFiltradas([]);
      setError("Error al obtener las empresas.");
    }
  };

  const handleMostrarTodos = async () => {
    try {
      const entidad = localStorage.getItem("ultimaEntidad") || "empresas";
      const url = `http://localhost:3001/todos_empresas.php?tipo=${entidad}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setEmpresas(Array.isArray(data.empresas) ? data.empresas : []);
        setEmpresasFiltradas(Array.isArray(data.empresas) ? data.empresas : []);
        setError(null);

        localStorage.setItem("ultimaAccion", "todos");
        localStorage.removeItem("ultimaBusqueda");
        localStorage.removeItem("ultimosResultados");
      } else {
        setEmpresas([]);
        setEmpresasFiltradas([]);
      }
    } catch (error) {
      setEmpresas([]);
      setEmpresasFiltradas([]);
      setError("Error al obtener las empresas.");
      console.error("Error al obtener empresas:", error);
    }
  };

  const handleAgregarEmpresa = () => {
    navigate("/AgregarEmpresa");
    setActualizar(prev => !prev);
  };

  const handlePagoRealizado = () => {
    setActualizar(prev => !prev);
  };

  const handleSeleccion = async (e) => {
    const selectedValue = e.target.value;

    localStorage.setItem("ultimaSeleccion", selectedValue);
    localStorage.setItem("ultimaEntidad", tipoEntidad);

    setBusqueda("");

    localStorage.removeItem("ultimaBusqueda");
    localStorage.removeItem("ultimosResultados");

    if (selectedValue === "Seleccionar") {
      setEmpresas([]);
      setEmpresasFiltradas([]);
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      localStorage.setItem("ultimaAccion", "seleccionar");
    } else if (selectedValue === "todos") {
      await handleMostrarTodos();
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      localStorage.setItem("ultimaAccion", "todos");
    } else if (/^[A-Z]$/.test(selectedValue)) {
      setLetraSeleccionada(selectedValue);
      setMedioPagoSeleccionado("");
      localStorage.setItem("ultimaAccion", "letra");
      localStorage.setItem("ultimaLetraSeleccionada", selectedValue);
      await handleFiltrarPorLetra(selectedValue, tipoEntidad);
    } else {
      setMedioPagoSeleccionado(selectedValue);
      setLetraSeleccionada("");
      localStorage.setItem("ultimaAccion", "medioPago");
      localStorage.setItem("ultimoMedioPagoSeleccionado", selectedValue);
      await handleFiltrarPorMedioPago(selectedValue);
    }
  };

  const handleFilaSeleccionada = (index, empresa) => {
    setFilaSeleccionada(filaSeleccionada === index ? null : index);
    setEmpresaSeleccionada(empresa);

    if (empresa) {
      localStorage.setItem("empresaSeleccionada", JSON.stringify(empresa));
    } else {
      localStorage.removeItem("empresaSeleccionada");
    }
  };

  const handleEditarEmpresa = (razonSocial) => {
    navigate(`/editarEmpresa/${razonSocial}`);
    setActualizar(prev => !prev);
  };

  const handleEliminarEmpresa = async () => {
    if (!empresaSeleccionada) return;

    try {
        const response = await fetch(
            `http://localhost:3001/eliminar_empresa.php?idEmp=${empresaSeleccionada.idEmp}&razon_social=${encodeURIComponent(empresaSeleccionada.razon_social)}`,
            { method: 'GET' }
        );

        const data = await response.json();

        if (data.success) {
            setEmpresas(empresas.filter(empresa => empresa.idEmp !== empresaSeleccionada.idEmp));
            setEmpresasFiltradas(empresasFiltradas.filter(empresa => empresa.idEmp !== empresaSeleccionada.idEmp));
            setMostrarModalEliminar(false);
        } else {
            alert(data.message || "Error al eliminar la empresa.");
        }
    } catch (error) {
        console.error("Error al eliminar empresa:", error);
        alert("Hubo un problema al eliminar la empresa.");
    }
  };

  const handleConfirmarEliminar = (empresa) => {
    setEmpresaSeleccionada(empresa);
    setMostrarModalEliminar(true);
  };

  const handleCancelarEliminar = () => {
    setMostrarModalEliminar(false);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const handlePagoEmpresa = (empresa) => {
    setEmpresaSeleccionada(empresa);
    setMostrarModal(true);
  };

  const handleMostrarInfoEmpresa = (empresa) => {
    setCargando(true);
    try {
      // Normalizar los meses pagados: mayúsculas y sin espacios
      const mesesPagados = empresa.meses_pagados
        ? empresa.meses_pagados.split(',').map(mes => mes.trim().toUpperCase())
        : [];
  
      setInfoEmpresa(empresa);
      setMesesPagados(mesesPagados);
      setMostrarModalInfo(true);
    } catch (error) {
      console.error('Error al procesar información:', error);
      setErrorMessage(`Error: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setCargando(false);
    }
  };

  const exportarAExcel = () => {
    if (empresasFiltradas.length === 0) {
      setErrorMessage("Datos incompletos: No hay empresas para exportar.");

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);

      return;
    }

    const nombreArchivo = "Empresas.xlsx";

    const datosReordenados = empresasFiltradas.map(({ idEmpresas, nombre, ...resto }) => resto);

    const ws = XLSX.utils.json_to_sheet(datosReordenados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empresas");

    XLSX.writeFile(wb, nombreArchivo);

    setErrorMessage("");
  };

  const abrirModalMes = () => {
    if (empresasFiltradas.length === 0) {
      setErrorMessage("Datos incompletos: No hay empresas para imprimir.");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
      return;
    }
    setMostrarModalMes(true);
  };

  const cerrarModalMes = () => {
    setMostrarModalMes(false);
  };

  const handleImprimirComprobantes = () => {
    if (!mesSeleccionado) {
      setErrorMessage("Por favor seleccione un mes.");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
      return;
    }
    cerrarModalMes();
    handleImprimirTodosComprobantes();
  };

  const handleImprimirTodosComprobantes = async () => {
    try {
      if (empresasFiltradas.length === 0) {
        setErrorMessage("Datos incompletos: No hay empresas para imprimir.");
        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
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
                .talon-empresa {
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

      empresasFiltradas.forEach((empresa) => {
        const razonSocial = empresa.razon_social || "";
        const domicilio2 = empresa.domicilio_2 || "";
        const categoria = empresa.categoria || "";
        const precioCategoria = empresa.precio_categoria || "0";
        const medioPago = empresa.medio_pago || "";
        const mesesPagados = mesSeleccionado || new Date().toLocaleString('default', { month: 'long' }).toUpperCase();

        comprobantesHTML += `
          <div class="contenedor">
            <div class="comprobante">
              <div class="talon-empresa">
                <p><strong>Empresa:</strong> ${razonSocial}</p>
                <p><strong>Domicilio:</strong> ${domicilio2}</p>
                <p><strong>Categoría / Monto:</strong> ${categoria} / $${precioCategoria}</p>
                <p><strong>Período:</strong> ${mesesPagados}</p>
                <p><strong>Cobrador:</strong> ${medioPago}</p>
                <p>Por consultas comunicarse al 03564-15205778</p>
              </div>
              <div class="talon-cobrador">
                <p><strong>Nombre:</strong> ${razonSocial}</p>
                <p><strong>Categoría / Monto:</strong> ${categoria} / $${precioCategoria}</p>
                <p><strong>Período:</strong> ${mesesPagados}</p>
                <p><strong>Cobrador:</strong> ${medioPago}</p>
              </div>
            </div>
          </div>
        `;
      });

      comprobantesHTML += `</body></html>`;

      const ventana = window.open('', '', 'width=600,height=400');
      ventana.document.write(comprobantesHTML);
      ventana.document.close();
      ventana.print();
    } catch (error) {
      setErrorMessage("Ocurrió un error al generar los comprobantes.");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  const meses = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  return (
    <div className="empresa-container">
      <div className="empresa-box">
        <div className="front-row-emp">
          <h2 className="empresa-title">Gestionar Empresas</h2>
          <div className="front-row">
            <div className="search-bar">
              <input
                id="search"
                type="text"
                placeholder="Buscar por nombre"
                className="search-input"
                value={busqueda}
                onChange={handleBusquedaInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleBusqueda(busqueda)}
              />
              <button className="search-button" onClick={() => handleBusqueda(busqueda)}>
                <FontAwesomeIcon icon={faSearch} className="icon-button" />
              </button>
            </div>

            <div className="alphabet-dropdown">
              <select
                id="alphabet"
                className="dropdown"
                value={letraSeleccionada || medioPagoSeleccionado || localStorage.getItem("ultimaSeleccion") || "Seleccionar"}
                onChange={handleSeleccion}
              >
                <option value="Seleccionar" disabled>
                  Seleccionar
                </option>
                <option value="todos">Todos</option>

                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].map((letter, index) => (
                  <option key={index} value={letter}>
                    {letter}
                  </option>
                ))}

                {mediosDePago.length > 0 ? (
                  mediosDePago.map((medio, index) => (
                    <option key={`medio-${index}`} value={medio.Medio_Pago}>
                      {medio.Medio_Pago}
                    </option>
                  ))
                ) : (
                  <option disabled>No hay medios de pago disponibles</option>
                )}
              </select>
            </div>

            {error && <p className="error">{error}</p>}
          </div>
        </div>

        {errorMessage && (
          <div className="error-message-emp">
            {errorMessage}
          </div>
        )}

        <div className="empresas-list">
          <div className="box-table">
            <div className="header">
              <div className="column-header header-razon">Razón Social</div>
              <div className="column-header header-cuit">CUIT</div>
              <div className="column-header header-iva">Cond. IVA</div>
              <div className="column-header header-dom">Domicilio cobro</div>
              <div className="column-header header-obs">Observaciones</div>
              <div className="column-header header-medio">Medio de Pago</div> 
              <div className="column-header icons-column"></div>
            </div>

            <div className="body">
              {cargando ? (
                <div className="row">
                  <div className="not_empresa" colSpan="5">
                    Cargando...
                  </div>
                </div>
              ) : empresasFiltradas.length > 0 ? (
                <div className="scrollable">
                  {empresasFiltradas.map((empresa, index) => {
                    const estadoPago = getEstadoPago(empresa.meses_pagados);
                    const rowClass = filaSeleccionada === index 
                      ? `selected-row ${estadoPago}` 
                      : index % 2 === 0 
                        ? `even-row ${estadoPago}` 
                        : `odd-row ${estadoPago}`;
                    
                    return (
                      <div
                        key={index}
                        className={`row ${rowClass}`}
                        onClick={() => handleFilaSeleccionada(index, empresa)}
                      >
                        <div className="column column-razon">{empresa.razon_social}</div>
                        <div className="column column-cuit">{empresa.cuit}</div>
                        <div className="column column-iva">{empresa.descripcion_iva}</div>
                        <div className="column column-dom">{empresa.domicilio_2}</div>
                        <div className="column column-obs">{empresa.observacion}</div>
                        <div className="column column-medio">{empresa.medio_pago}</div>
                        <div className="column icons-column">
                          {filaSeleccionada === index && (
                            <div className="icons-container">
                              <FontAwesomeIcon
                                icon={faInfoCircle}
                                className="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMostrarInfoEmpresa(empresa);
                                }}
                              />
                              <FontAwesomeIcon
                                icon={faEdit}
                                className="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditarEmpresa(empresa.razon_social);
                                }}
                              />
                              <FontAwesomeIcon
                                icon={faTrash}
                                className="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarEliminar(empresa);
                                }}
                              />
                              <FontAwesomeIcon
                                icon={faDollar}
                                className="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePagoEmpresa(empresa);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="row">
                  <div className="not_empresa" colSpan="5">
                    No hay empresas para esta letra o búsqueda.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="down-container">
          <div className="contador-container">
            <span className="socios-totales">
              Cant empresas: {empresasFiltradas.length}
            </span>
          </div>

          <div className="botones-container">
            <button className="socio-button" onClick={handleAgregarEmpresa}>
              <FontAwesomeIcon icon={faPlus} className="socio-icon-button" />
              <p>Agregar Empresa</p>
            </button>

            <button className="socio-button" onClick={exportarAExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="socio-icon-button" />
              <p>Exportar a Excel</p>
            </button>

            <button className="socio-button" onClick={abrirModalMes}>
              <FontAwesomeIcon icon={faPrint} className="socio-icon-button" />
              <p>Imprimir Comprobantes</p>
            </button>

            <button className="socio-button" onClick={handleVolverAtras}>
              <FontAwesomeIcon icon={faArrowLeft} className="socio-icon-button" />
              <p>Volver Atrás</p>
            </button>
          </div>

          <div className="estado-pagos-container">
            <div className="estado-indicador al-dia">
              <div className="indicador-color"></div>
              <span>Al día</span>
            </div>
            <div className="estado-indicador debe-1-2">
              <div className="indicador-color"></div>
              <span>Debe 1-2 meses</span>
            </div>
            <div className="estado-indicador debe-3-mas">
              <div className="indicador-color"></div>
              <span>Debe 3+ meses</span>
            </div>
          </div>
        </div>

      </div>

      {mostrarModalMes && (
        <ModalMesEmpresa
          mesSeleccionado={mesSeleccionado}
          onMesSeleccionado={setMesSeleccionado}
          onCancelar={() => setMostrarModalMes(false)}
          onImprimir={handleImprimirComprobantes}
        />
      )}


      {mostrarModalEliminar && (
        <ModalEliminarEmpresa
          empresaSeleccionada={empresaSeleccionada}
          onCancelar={handleCancelarEliminar}
          onEliminar={handleEliminarEmpresa}
        />
      )}

      {mostrarModal && (
        <ModalPagosEmpresas
          razonSocial={empresaSeleccionada.razon_social}
          cerrarModal={cerrarModal}
          onPagoRealizado={handlePagoRealizado}
        />
      )}

      {mostrarModalInfo && infoEmpresa && (
        <ModalInfoEmpresa
          infoEmpresa={infoEmpresa}
          mesesPagados={mesesPagados}
          onCerrar={() => setMostrarModalInfo(false)}
        />
      )}
    </div>
  );
};

export default GestionarEmpresas;