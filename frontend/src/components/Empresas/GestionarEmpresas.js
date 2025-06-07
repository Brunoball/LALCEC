import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowLeft, faEdit, faTrash, faSearch, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import "./GestionarEmpresas.css";
import ModalEliminarEmpresa from "./modales_emp/ModalEliminarEmpresa";
import ModalInfoEmpresa from "./modales_emp/ModalInfoEmpresa";
import { faFileExcel } from "@fortawesome/free-solid-svg-icons";
import BASE_URL from "../../config/config";

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
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tipoEntidad, setTipoEntidad] = useState(localStorage.getItem("ultimaEntidad") || "empresas");
  const [actualizar, setActualizar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [restaurandoEstado, setRestaurandoEstado] = useState(true);
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [infoEmpresa, setInfoEmpresa] = useState(null);
  const [mesesPagados, setMesesPagados] = useState([]);

  // Función para determinar el estado de pago de la empresa
  const getEstadoPago = (mesesPagadosStr, fechaUnionStr) => {
    if (!fechaUnionStr) return "rojo";

    const mesesPagados = mesesPagadosStr?.split(',').map(m => m.trim().toUpperCase()) || [];

    const MESES_ANIO = [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];

    const fechaUnion = new Date(fechaUnionStr.includes("T") ? fechaUnionStr : `${fechaUnionStr}T00:00:00-03:00`);
    const fechaHoy = new Date();

    const añoUnion = fechaUnion.getFullYear();
    const mesUnion = fechaUnion.getMonth();
    const añoHoy = fechaHoy.getFullYear();
    const mesHoy = fechaHoy.getMonth();

    const mesesEsperados = [];

    for (let año = añoUnion; año <= añoHoy; año++) {
      const desde = (año === añoUnion) ? mesUnion : 0;
      const hasta = (año === añoHoy) ? mesHoy : 11;
      for (let mes = desde; mes <= hasta; mes++) {
        mesesEsperados.push(MESES_ANIO[mes]);
      }
    }

    const deuda = mesesEsperados.filter(mes => !mesesPagados.includes(mes)).length;

    if (deuda === 0) return "verde";
    if (deuda <= 2) return "amarillo";
    return "rojo";
  };


  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (!restaurandoEstado && busqueda.trim().length > 0) {
        handleBusqueda(busqueda);
      }
    }); // Tiempo de espera para evitar llamadas innecesarias

    return () => clearTimeout(delayDebounce);
  }, [busqueda, restaurandoEstado]);


  useEffect(() => {
    const restaurarEstado = async () => {
      setCargando(true);
      try {
        // Obtener medios de pago
        const responseMediosPago = await fetch(`${BASE_URL}/api.php?action=obtener_datos_empresas`);
        if (responseMediosPago.ok) {
          const data = await responseMediosPago.json();
          if (Array.isArray(data.mediosPago)) {
            setMediosDePago(data.mediosPago);
          }
        }

        const ultimaAccion = localStorage.getItem("ultimaAccion");
        const ultimaBusqueda = localStorage.getItem("ultimaBusqueda");
        const ultimaLetra = localStorage.getItem("ultimaLetraSeleccionada");
        const ultimoMedioPago = localStorage.getItem("ultimoMedioPagoSeleccionado");
        const ultimosResultados = localStorage.getItem("ultimosResultados");

        if (ultimaAccion === "busqueda" && ultimaBusqueda) {
          setBusqueda(ultimaBusqueda);
          if (ultimosResultados) {
            const resultados = JSON.parse(ultimosResultados);
            setEmpresas(resultados);
            setEmpresasFiltradas(resultados);
          } else {
            await handleBusqueda(ultimaBusqueda);
          }
        } else if (ultimaAccion === "letra" && ultimaLetra) {
          setLetraSeleccionada(ultimaLetra);
          await handleFiltrarPorLetra(ultimaLetra);
        } else if (ultimaAccion === "medioPago" && ultimoMedioPago) {
          setMedioPagoSeleccionado(ultimoMedioPago);
          await handleFiltrarPorMedioPago(ultimoMedioPago);
        } else if (ultimaAccion === "todos") {
          await handleMostrarTodos();
        } else {
          setEmpresas([]);
          setEmpresasFiltradas([]);
        }
      } catch (error) {
        console.error("Error al restaurar estado:", error);
        setError("Hubo un problema al cargar los datos.");
      } finally {
        setCargando(false);
        setRestaurandoEstado(false);
      }
    };

    restaurarEstado();
  }, [actualizar, tipoEntidad]);



  const handleBusqueda = async (busquedaParam) => {
    let query = busquedaParam || busqueda || "";

    if (!query) {
      await handleMostrarTodos();
      return;
    }

    try {
      const url = `${BASE_URL}/api.php?action=buscar_empresa&busqueda=${encodeURIComponent(query)}&tipoEntidad=empresas`;
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

  const handleFiltrarPorLetra = async (letra) => {
    try {
      const tipo = tipoEntidad;
      const url = `${BASE_URL}/api.php?action=obtener_letras_empresa&letra=${encodeURIComponent(letra)}&tipo=${tipo}`;
      const response = await fetch(url);
      const text = await response.text();
      console.log("Respuesta del servidor:", text);
      const data = JSON.parse(text);

      if (Array.isArray(data)) {
        setEmpresas(data);
        setEmpresasFiltradas(data);
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
      console.error("Error al obtener empresas:", error);
      setEmpresas([]);
      setEmpresasFiltradas([]);
      setError("Error al obtener las empresas.");
    }
  };


  const handleFiltrarPorMedioPago = async (medioPago) => {
    try {
      const url = `${BASE_URL}/api.php?action=filtro_empresas_mp&medio=${encodeURIComponent(medioPago)}&tipo=${tipoEntidad}`;
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
      const url = `${BASE_URL}/api.php?action=todos_empresas&tipo=${entidad}`;
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
      await handleFiltrarPorLetra(selectedValue, "empresas");
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
      const url = `${BASE_URL}/api.php?action=eliminar_empresa&idEmp=${empresaSeleccionada.idEmp}&razon_social=${encodeURIComponent(empresaSeleccionada.razon_social)}`;
      const response = await fetch(url, { method: 'GET' });

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
                <div className="scrollableE">
                  {empresasFiltradas.map((empresa, index) => {
                    const estadoPago = getEstadoPago(empresa.meses_pagados, empresa.Fechaunion);
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
        <ModalEliminarEmpresa
          empresaSeleccionada={empresaSeleccionada}
          onCancelar={handleCancelarEliminar}
          onEliminar={handleEliminarEmpresa}
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