import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowLeft, faEdit, faTrash, faSearch, faDollar, faFileExcel, faPrint, faInfoCircle, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import ModalPagos from "./ModalPagos";
import ModalEliminar from "./modales_soc/ModalEliminar";
import ModalMes from "./modales_soc/ModalMeses";
import ModalInfo from "./modales_soc/ModalInfoSocio";
import './GestionarSocios.css';

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
  }, [busqueda, tipoEntidad, actualizar]); // Agregué actualizar como dependencia

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
    setActualizar(prev => !prev); // Esto fuerza la recarga de los datos
    
    // Actualización optimista del estado local
    if (socioSeleccionado) {
      const nuevosSocios = socios.map(socio => {
        if (socio.nombre === socioSeleccionado.nombre && socio.apellido === socioSeleccionado.apellido) {
          // Aquí deberías actualizar los meses pagados según lo que devuelva el backend
          // Esto es un ejemplo, ajusta según tu lógica real
          return {
            ...socio,
            meses_pagados: socio.meses_pagados ? 
              `${socio.meses_pagados},${mesSeleccionado}` : 
              mesSeleccionado
          };
        }
        return socio;
      });
      
      setSocios(nuevosSocios);
      setSociosFiltrados(nuevosSocios);
    }
  };
  
  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const handlePagoSocio = (socio) => {
    setSocioSeleccionado(socio);
    setMostrarModal(true);
  };

  const handleImprimirComprobantes = () => {
    if (!mesSeleccionado) {
      setErrorMessage("Por favor seleccione un mes.");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
      return;
    }
    setMostrarModalMes(false);
    handleImprimirTodosComprobantes();
  };

  const handleImprimirTodosComprobantes = async () => {
    try {
      if (sociosFiltrados.length === 0) {
        setErrorMessage("Datos incompletos: No hay socios para imprimir.");
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

      sociosFiltrados.forEach((socio) => {
        const nombreCompleto = `${socio.nombre || ""} ${socio.apellido || ""}`;
        const domicilio2 = socio.domicilio_2 || "";
        const categoria = socio.categoria || "";
        const precioCategoria = socio.precio_categoria || "0";
        const medioPago = socio.medio_pago || "";
        const mesesPagados = mesSeleccionado || new Date().toLocaleString('default', { month: 'long' }).toUpperCase();

        comprobantesHTML += `
          <div class="contenedor">
            <div class="comprobante">
              <div class="talon-socio">
                <p><strong>Socio:</strong> ${nombreCompleto}</p>
                <p><strong>Domicilio:</strong> ${domicilio2}</p>
                <p><strong>Categoría / Monto:</strong> ${categoria} / $${precioCategoria}</p>
                <p><strong>Período:</strong> ${mesesPagados}</p>
                <p><strong>Cobrador:</strong> ${medioPago}</p>
                <p>Por consultas comunicarse al 03564-15205778</p>
              </div>
              <div class="talon-cobrador">
                <p><strong>Nombre:</strong> ${nombreCompleto}</p>
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
      const mesesPagados = socio.meses_pagados
        ? socio.meses_pagados.split(',').map(mes => mes.trim().toUpperCase())
        : [];
  
      setInfoSocio(socio);
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
              <FontAwesomeIcon icon={faUserPlus} className="socio-icon-button" />
              <p>Agregar Socio</p>
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

      {mostrarModalEliminar && (
        <ModalEliminar
          socioSeleccionado={socioSeleccionado}
          onCancelar={handleCancelarEliminar}
          onEliminar={handleEliminarSocio}
        />
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
        <ModalMes
          mesSeleccionado={mesSeleccionado}
          onMesSeleccionado={setMesSeleccionado}
          onCancelar={() => setMostrarModalMes(false)}
          onImprimir={handleImprimirComprobantes}
        />
      )}

      {mostrarModalInfo && infoSocio && (
        <ModalInfo
          infoSocio={infoSocio}
          mesesPagados={mesesPagados}
          onCerrar={() => setMostrarModalInfo(false)}
        />
      )}
    </div>
  );
};

export default GestionarSocios;