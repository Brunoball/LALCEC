import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowLeft, faEdit, faTrash, faSearch, faDollar, faFileExcel, faPrint, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import ModalPagos from "./ModalPagos";
import "./GestionarSocios.css";

const GestionarSocios = () => {
  const navigate = useNavigate();
  const [socios, setSocios] = useState([]);
  const [mediosDePago, setMediosDePago] = useState([]);
  const [letraSeleccionada, setLetraSeleccionada] = useState("");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [sociosFiltrados, setSociosFiltrados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tipoEntidad, setTipoEntidad] = useState(localStorage.getItem("ultimaEntidad") || "socios");
  const [actualizar, setActualizar] = useState(false);
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [restaurandoEstado, setRestaurandoEstado] = useState(true);
  const [mostrarModalMes, setMostrarModalMes] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [infoSocio, setInfoSocio] = useState(null);
  const [mesesPagados, setMesesPagados] = useState([]);
  const [mesesAdeudados, setMesesAdeudados] = useState([]);


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

  useEffect(() => {
    const obtenerDatos = async () => {
      setCargando(true);
      try {
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

        const ultimaAccion = localStorage.getItem("ultimaAccion");
        const ultimaBusqueda = localStorage.getItem("ultimaBusqueda");
        const ultimosResultados = localStorage.getItem("ultimosResultados");
        const ultimaLetraSeleccionada = localStorage.getItem("ultimaLetraSeleccionada");
        const ultimoMedioPagoSeleccionado = localStorage.getItem("ultimoMedioPagoSeleccionado");

        if (ultimaAccion === "busqueda" && ultimaBusqueda && ultimosResultados) {
          setBusqueda(ultimaBusqueda);
          setSociosFiltrados(JSON.parse(ultimosResultados));
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
          setSocios([]);
          setSociosFiltrados([]);
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
      const url = tipoEntidad === "socios"
        ? `http://localhost:3001/buscarSocio.php?busqueda=${encodeURIComponent(query)}&tipoEntidad=socios`
        : `http://localhost:3001/buscarSocio.php?busqueda=${encodeURIComponent(query)}&tipoEntidad=empresas`;
  
      const response = await fetch(url);
  
      if (response.ok) {
        const data = await response.json();
  
        if (Array.isArray(data) && data.length > 0) {
          setSocios(data);
          setSociosFiltrados(data);
          localStorage.setItem("ultimaAccion", "busqueda");
          localStorage.setItem("ultimaBusqueda", query);
          localStorage.setItem("ultimosResultados", JSON.stringify(data));
        } else {
          setSocios([]);
          setSociosFiltrados([]);
        }
      } else {
        setSocios([]);
        setSociosFiltrados([]);
      }
    } catch (err) {
      console.error("Error en la búsqueda:", err);
      setSocios([]);
      setSociosFiltrados([]);
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
      let url = `http://localhost:3001/obtener_letra.php?letra=${letra}&tipo=${tipo}`;
      const response = await fetch(url);
  
      if (response.ok) {
        const data = await response.json();
        setSocios(Array.isArray(data) ? data : []);
        setSociosFiltrados(Array.isArray(data) ? data : []);
        localStorage.setItem("ultimaAccion", "letra");
        localStorage.setItem("ultimaLetraSeleccionada", letra);
        localStorage.removeItem("ultimaBusqueda");
        localStorage.removeItem("ultimosResultados");
        setError(null);
      } else {
        setSocios([]);
        setSociosFiltrados([]);
      }
    } catch (error) {
      setSocios([]);
      setSociosFiltrados([]);
      setError("Error al obtener los socios.");
      console.error("Error al obtener socios:", error);
    }
  };
  
  const handleFiltrarPorMedioPago = async (medioPago) => {
    try {
      const url = `http://localhost:3001/filtro_mp.php?medio=${encodeURIComponent(medioPago)}&tipo=${tipoEntidad}`;
      const response = await fetch(url);
  
      if (response.ok) {
        const data = await response.json();
  
        if (Array.isArray(data) && data.length > 0) {
          setSocios(data);
          setSociosFiltrados(data);
          localStorage.setItem("ultimaAccion", "medioPago");
          localStorage.setItem("ultimoMedioPagoSeleccionado", medioPago);
          localStorage.removeItem("ultimaBusqueda");
          localStorage.removeItem("ultimosResultados");
          setError(null);
        } else {
          setSocios([]);
          setSociosFiltrados([]);
        }
      } else {
        setSocios([]);
        setSociosFiltrados([]);
        setError("Error al obtener los socios.");
      }
    } catch (error) {
      setSocios([]);
      setSociosFiltrados([]);
      setError("Error al obtener los socios.");
    }
  };

  const handleMostrarTodos = async () => {
    try {
      const entidad = localStorage.getItem("ultimaEntidad") || "socios";
      const url = `http://localhost:3001/todos_socios.php?tipo=${entidad}`;
      const response = await fetch(url);
  
      if (response.ok) {
        const data = await response.json();
        setSocios(Array.isArray(data.socios) ? data.socios : []);
        setSociosFiltrados(Array.isArray(data.socios) ? data.socios : []);
        setError(null);
  
        localStorage.setItem("ultimaAccion", "todos");
        localStorage.removeItem("ultimaBusqueda");
        localStorage.removeItem("ultimosResultados");
      } else {
        setSocios([]);
        setSociosFiltrados([]);
      }
    } catch (error) {
      setSocios([]);
      setSociosFiltrados([]);
      setError("Error al obtener los datos.");
    }
  };

  const handleAgregarSocio = () => {
    navigate("/Agregarsocio");
    setActualizar(prev => !prev);
  };

  const handleSeleccion = async (e) => {
    const selectedValue = e.target.value;
  
    localStorage.setItem("ultimaSeleccion", selectedValue);
    localStorage.setItem("ultimaEntidad", tipoEntidad);
    setBusqueda("");
    localStorage.removeItem("ultimaBusqueda");
    localStorage.removeItem("ultimosResultados");
    setPrimeraCarga(false);
  
    if (selectedValue === "Seleccionar") {
      setSocios([]);
      setSociosFiltrados([]);
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

  const handleFilaSeleccionada = (index, socio) => {
    setFilaSeleccionada(filaSeleccionada === index ? null : index);
    setSocioSeleccionado(socio);

    if (socio) {
      localStorage.setItem("socioSeleccionado", JSON.stringify(socio));
    } else {
      localStorage.removeItem("socioSeleccionado");
    }
  };

  const handleEditarSocio = (nombre, apellido) => {
    navigate(`/editarSocio/${nombre}/${apellido}`);
    setActualizar(prev => !prev);
  };

  const handleEliminarSocio = async () => {
    if (socioSeleccionado) {
      try {
        const response = await fetch(
          `http://localhost:3001/eliminar_socio.php?nombre=${socioSeleccionado.nombre}&apellido=${socioSeleccionado.apellido}`,
          { method: 'GET' }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.message === "Socio eliminado correctamente") {
            setSocios(socios.filter(socio => socio.nombre !== socioSeleccionado.nombre || socio.apellido !== socioSeleccionado.apellido ));
            setSociosFiltrados(sociosFiltrados.filter(socio => socio.nombre !== socioSeleccionado.nombre || socio.apellido !== socioSeleccionado.apellido));
            setMostrarModalEliminar(false);
          } else {
            alert("Error al eliminar el socio.");
          }
        }
      } catch (error) {
        console.error("Error al eliminar socio:", error);
        alert("Hubo un problema al eliminar el socio.");
      }
    }
  };

  const handleConfirmarEliminar = (socio) => {
    setSocioSeleccionado(socio);
    setMostrarModalEliminar(true);
  };

  const handleCancelarEliminar = () => {
    setMostrarModalEliminar(false);
  };

  const handlePagoRealizado = () => {
    setActualizar(prev => !prev);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const handlePagoSocio = (socio) => {
    setSocioSeleccionado(socio);
    setMostrarModal(true);
  };


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



  const handleMostrarInfoSocio = (socio) => {
    setCargando(true);
    try {
      // Normalizar los meses pagados: mayúsculas y sin espacios
      const mesesPagados = socio.meses_pagados
        ? socio.meses_pagados.split(',').map(mes => mes.trim().toUpperCase())
        : [];
  
      setInfoSocio(socio);
      setMesesPagados(mesesPagados); // ya está bien para pintar los meses
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
    if (sociosFiltrados.length === 0) {
      setErrorMessage("Datos incompletos: No hay socios para exportar.");
  
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
  
      return;
    }

    const nombreArchivo = tipoEntidad === "socios" ? "Socios.xlsx" : "Empresas.xlsx";
  
    const datosReordenados = sociosFiltrados.map(({ id, nombre, apellido, ...resto }) => ({
      id,
      apellido,
      nombre,
      ...resto,
    }));
    
    const ws = XLSX.utils.json_to_sheet(datosReordenados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipoEntidad === "socios" ? "Socios" : "Empresas");
  
    XLSX.writeFile(wb, nombreArchivo);
  
    setErrorMessage("");
  };

  const abrirModalMes = () => {
    if (sociosFiltrados.length === 0) {
      setErrorMessage("Datos incompletos: No hay socios para imprimir.");
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
      const socios = sociosFiltrados;
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

      socios.forEach((socio) => {
        const {
          nombre,
          apellido,
          domicilio_2,
          categoria,
          precio_categoria,
          medio_pago,
        } = socio;

        const nombreLimpio = nombre || "";
        const apellidoLimpio = apellido || "";
        const domicilio2Limpio = domicilio_2 || "";
        const categoriaLimpia = categoria || "";
        const precioLimpio = precio_categoria || "0";
        const medioPagoLimpio = medio_pago || "";

        const mesesPagados = mesSeleccionado || new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
        const totalPagar = precioLimpio;

        comprobantesHTML += `
          <div class="contenedor">
            <div class="comprobante">
              <div class="talon-socio">
                <p><strong>Afiliado:</strong> ${nombreLimpio} ${apellidoLimpio}</p>
                <p><strong>Domicilio:</strong> ${domicilio2Limpio}</p>
                <p><strong>Categoría / Monto:</strong> ${categoriaLimpia} / $${totalPagar}</p>
                <p><strong>Período:</strong> ${mesesPagados}</p>
                <p><strong>Cobrador:</strong> ${medioPagoLimpio}</p>
                <p>Por consultas comunicarse al 03564-15205778</p>
              </div>
              <div class="talon-cobrador">
                <p><strong>Nombre y Apellido:</strong> ${nombreLimpio} ${apellidoLimpio}</p>
                <p><strong>Categoría / Monto:</strong> ${categoriaLimpia} / $${totalPagar}</p>
                <p><strong>Período:</strong> ${mesesPagados}</p>
                <p><strong>Cobrador:</strong> ${medioPagoLimpio}</p>
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
    <div className="socio-container">
      
      <div className="socio-box">
        <div className="front-row-soc">
          <h2 className="socio-title">Gestionar Socios</h2>
          <div className="front-row">
            <div className="search-bar">
              <input
                id="search"
                type="text"
                placeholder="Buscar por nombre o apellido"
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
          <div className="error-message-soc">
            {errorMessage}
          </div>
        )}

        <div className="socios-list">
          <div className="box-table">
            <div className="header">
              <div className="column-header header-ape">Apellido</div>
              <div className="column-header header-nom">Nombre</div>
              <div className="column-header header-cat">Cat/precio</div>
              <div className="column-header header-mp">Medio de Pago</div>
              <div className="column-header header-dom">Domicilio Cobro</div>
              <div className="column-header header-obs">Observacion</div>
              <div className="column-header icons-column"></div>
            </div>

            <div className="body">
              {cargando ? (
                <div className="row">
                  <div className="not_socio" colSpan="5">
                    Cargando...
                  </div>
                </div>
              ) : sociosFiltrados.length > 0 ? (
                <div className="scrollable">
                  {sociosFiltrados.map((socio, index) => {
                    const estadoPago = getEstadoPago(socio.meses_pagados);
                    const rowClass = filaSeleccionada === index 
                      ? `selected-row ${estadoPago}` 
                      : index % 2 === 0 
                        ? `even-row ${estadoPago}` 
                        : `odd-row ${estadoPago}`;
                    
                    return (
                      <div
                        key={index}
                        className={`row ${rowClass}`}
                        onClick={() => handleFilaSeleccionada(index, socio)}
                      >
                        <div className="column column-ape">{socio.apellido}</div>
                        <div className="column column-nom">{socio.nombre}</div>
                        <div className="column column-cat">{socio.categoria} ${socio.precio_categoria || "0"}</div>
                        <div className="column column-mp">{socio.medio_pago}</div>
                        <div className="column column-dom">{socio.domicilio_2}</div>
                        <div className="column column-obs">{socio.observacion}</div>
                        <div className="column icons-column">
                          {filaSeleccionada === index && (
                            <div className="icons-container">
                              <FontAwesomeIcon
                                icon={faInfoCircle}
                                className="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMostrarInfoSocio(socio);
                                }}
                              />
                              <FontAwesomeIcon
                                icon={faEdit}
                                className="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditarSocio(socio.nombre, socio.apellido);
                                }}
                              />
                              <FontAwesomeIcon
                                icon={faTrash}
                                className="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarEliminar(socio);
                                }}
                              />
                              <FontAwesomeIcon
                                icon={faDollar}
                                className="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePagoSocio(socio);
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
                  <div className="not_socio" colSpan="5">
                    {letraSeleccionada || medioPagoSeleccionado || busqueda
                      ? "No hay socios para esta letra, medio de pago o búsqueda."
                      : "Seleccione una opción para mostrar los socios."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="down-container">
          <div className="contador-container">
            <span className="socios-totales">
              Cant socios: {sociosFiltrados.length}
            </span>
          </div>

          <div className="botones-container">
            <button className="socio-button" onClick={handleAgregarSocio}>
              <FontAwesomeIcon icon={faPlus} className="socio-icon-button" />
              Agregar Socio
            </button>

            <button className="socio-button" onClick={exportarAExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="socio-icon-button" />
              Exportar a Excel
            </button>

            <button className="socio-button" onClick={abrirModalMes}>
              <FontAwesomeIcon icon={faPrint} className="socio-icon-button" />
              Imprimir Comprobantes
            </button>

            <button className="socio-button" onClick={handleVolverAtras}>
              <FontAwesomeIcon icon={faArrowLeft} className="socio-icon-button" />
              Volver Atrás
            </button>
          </div>
        </div>
      </div>

      {mostrarModalEliminar && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="modal-title">¿Deseas eliminar este socio?</h3>
            <p className="modal-text">{`${socioSeleccionado.nombre} ${socioSeleccionado.apellido}`}</p>
            <div className="modal-buttons">
              <button className="modal-button cancel-button" onClick={handleCancelarEliminar}>
                Cancelar
              </button>
              <button className="modal-button accept-button" onClick={handleEliminarSocio}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModal && (
        <ModalPagos
          nombre={socioSeleccionado.nombre}
          apellido={socioSeleccionado.apellido}
          cerrarModal={cerrarModal}
          onPagoRealizado={handlePagoRealizado}
        />
      )}

      {mostrarModalMes && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="modal-title">Seleccionar Mes para Comprobantes</h3>
            <div className="meses-container">
              {meses.map((mes, index) => (
                <button
                  key={index}
                  className={`mes-button ${mesSeleccionado === mes ? "selected" : ""}`}
                  onClick={() => setMesSeleccionado(mes)}
                >
                  {mes}
                </button>
              ))}
            </div>

            <div className="info-section">
              <h4></h4>
              {mesesAdeudados.length > 0 ? (
                <div className="meses-container">
                  {mesesAdeudados.map((mes, index) => (
                    <span key={index} className="mes-adeudado">{mes}</span>
                  ))}
                </div>
              ) : (
                <p></p>
              )}
            </div>
            
            <div className="modal-buttons">
              <button className="modal-button cancel-button" onClick={cerrarModalMes}>
                Cancelar
              </button>
              <button className="modal-button accept-button" onClick={handleImprimirComprobantes}>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}



      {mostrarModalInfo && infoSocio && (
        <div className="modal-socio">
          <div className="modal-socio-content">
            <h3 className="modal-socio-title">Información del Socio</h3>
            <div className="modal-socio-info">
              <p><strong>Nombre:</strong> {infoSocio.nombre} {infoSocio.apellido}</p>
              <p><strong>DNI:</strong> {infoSocio.DNI}</p>
              <p><strong>Teléfono:</strong> {infoSocio.telefono}</p>
              <p><strong>Domicilio:</strong> {infoSocio.domicilio} {infoSocio.numero}</p>
              <p><strong>Domicilio Cobro:</strong> {infoSocio.domicilio_2}</p>
              <p><strong>Categoría:</strong> {infoSocio.categoria} (${infoSocio.precio_categoria})</p>
              <p><strong>Medio de Pago:</strong> {infoSocio.medio_pago}</p>
              <p><strong>Observaciones:</strong> {infoSocio.observacion}</p>
            </div>

            <div className="modal-socio-meses">
              <h4 className="modal-socio-subtitle">
                Estado de Meses: 
                <span className="modal-socio-estado">
                  {(() => {
                    const meses = [
                      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
                      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
                    ];

                    const mesActual = new Date().getMonth(); // 0 = enero
                    const mesesHastaAhora = meses.slice(0, mesActual + 1); // Desde enero hasta el mes actual

                    // Filtramos cuántos de esos meses fueron pagados
                    const mesesPagadosHastaAhora = mesesHastaAhora.filter(mes =>
                      mesesPagados.includes(mes)
                    );

                    const cantidadEsperada = mesesHastaAhora.length;
                    const cantidadPagosHastaAhora = mesesPagadosHastaAhora.length;
                    const pagosTotales = mesesPagados.length;

                    const deuda = cantidadEsperada - cantidadPagosHastaAhora;

                    // Si debe algún mes hasta el actual, se considera deuda
                    if (deuda > 0) {
                      if (deuda === 1 || deuda === 2) {
                        return `⚠️ Atrasado ${deuda} mes${deuda > 1 ? 'es' : ''}`;
                      }
                      return `🚫 Atrasado (${deuda} meses)`;
                    }

                    // Si pagó hasta el actual, evaluamos si pagó el año completo
                    if (pagosTotales === 12) {
                      return "🎯 Año completo";
                    }

                    // Si pagó más de lo esperado, está adelantado
                    const adelantado = pagosTotales - cantidadEsperada;
                    if (adelantado > 0) {
                      return `📅 Adelantado (${adelantado} mes${adelantado > 1 ? 'es' : ''})`;
                    }

                    // Si pagó lo justo hasta el mes actual
                    return "✅ Al día";
                  })()}
                </span>
              </h4>





              <div className="modal-socio-meses-container">
                {[
                  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
                  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
                ].map((mes, index) => (
                  <span
                    key={index}
                    className={
                      mesesPagados.includes(mes)
                        ? "modal-socio-mes modal-socio-pagado"
                        : "modal-socio-mes modal-socio-adeudado"
                    }
                  >
                    {mes}
                  </span>
                ))}
              </div>
            </div>

            <div className="modal-socio-buttons">
              <button 
                className="modal-socio-button cerrar-button" 
                onClick={() => setMostrarModalInfo(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}






    </div>
  );
};

export default GestionarSocios;