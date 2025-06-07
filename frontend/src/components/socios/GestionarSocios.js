import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowLeft, faEdit, faTrash, faSearch, faFileExcel, faInfoCircle, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import ModalEliminar from "./modales_soc/ModalEliminar";
import ModalInfo from "./modales_soc/ModalInfoSocio";
import './GestionarSocios.css';
import BASE_URL from "../../config/config";
import Toast from "../global/Toast";

const GestionarSocios = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [socios, setSocios] = useState([]);
  const [mediosDePago, setMediosDePago] = useState([]);
  const [letraSeleccionada, setLetraSeleccionada] = useState("");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [sociosFiltrados, setSociosFiltrados] = useState([]);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tipoEntidad, setTipoEntidad] = useState(localStorage.getItem("ultimaEntidad") || "socios");
  const [actualizar, setActualizar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [infoSocio, setInfoSocio] = useState(null);
  const [mesesPagados, setMesesPagados] = useState([]);
  const [valorSeleccionado, setValorSeleccionado] = useState(localStorage.getItem("ultimaSeleccion") || "Seleccionar");
  const [todosLosSocios, setTodosLosSocios] = useState([]);
  const [mostrandoTodos, setMostrandoTodos] = useState(false);
  const [animarFilas, setAnimarFilas] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");
  const [toastTipo, setToastTipo] = useState("exito");

  const mostrarToast = (mensaje, tipo = "exito") => {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastVisible(true);
  };

  const normalizarSocios = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(socio => ({
      ...socio,
      id: socio.idSocios || socio.id
    }));
  };

  useEffect(() => {
    const precargarTodosLosSocios = async () => {
      try {
        const entidad = localStorage.getItem("ultimaEntidad") || "socios";
        const response = await fetch(`${BASE_URL}/api.php?action=todos_socios&tipo=${entidad}`);
        if (response.ok) {
          const data = await response.json();
          const lista = normalizarSocios(Array.isArray(data.socios) ? data.socios : []);
          setTodosLosSocios(lista);
        }
      } catch (error) {
        console.warn("Error al precargar socios:", error);
      }
    };

    precargarTodosLosSocios();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCargando(true);
    }, 200);

    const restaurarEstado = async () => {
      try {
        const responseMediosPago = await fetch(`${BASE_URL}/api.php?action=obtener_datos`);
        if (responseMediosPago.ok) {
          const data = await responseMediosPago.json();
          if (Array.isArray(data.mediosPago)) {
            setMediosDePago(data.mediosPago);
          }
        }

        if (location.state?.desdeEdicion && location.state.socioEditado) {
          const socioEditado = location.state.socioEditado;
          const entidad = localStorage.getItem("ultimaEntidad") || "socios";
          
          setSocios(prevSocios => 
            prevSocios.map(socio => 
              socio.id === socioEditado.id ? socioEditado : socio
            )
          );
          
          setSociosFiltrados(prevSocios => 
            prevSocios.map(socio => 
              socio.id === socioEditado.id ? socioEditado : socio
            )
          );
          
          setTodosLosSocios(prevSocios => 
            prevSocios.map(socio => 
              socio.id === socioEditado.id ? socioEditado : socio
            )
          );
          
          mostrarToast("Socio actualizado correctamente");
          setCargando(false);
          return;
        }

        const ultimaAccion = localStorage.getItem("ultimaAccion");
        const ultimaBusqueda = localStorage.getItem("ultimaBusqueda");
        const ultimaLetra = localStorage.getItem("ultimaLetraSeleccionada");
        const ultimoMedioPago = localStorage.getItem("ultimoMedioPagoSeleccionado");
        const ultimaSeleccion = localStorage.getItem("ultimaSeleccion");
        const ultimosResultados = localStorage.getItem("ultimosResultados");

        if (location.state?.desdeSubpagina) {
          if (ultimaAccion === "busqueda" && ultimaBusqueda) {
            setBusqueda(ultimaBusqueda);
            if (ultimosResultados) {
              const resultados = normalizarSocios(JSON.parse(ultimosResultados));
              setSocios(resultados.slice(0, 10));
              setSociosFiltrados(resultados);
              setAnimarFilas(true);
              mostrarToast("Datos cargados correctamente");
            } else {
              await handleBusqueda(ultimaBusqueda);
            }
          } 
          else if (ultimaAccion === "letra" && ultimaLetra) {
            setLetraSeleccionada(ultimaLetra);
            setValorSeleccionado(ultimaLetra);
            await handleFiltrarPorLetra(ultimaLetra, tipoEntidad);
          }
          else if (ultimaAccion === "medioPago" && ultimoMedioPago) {
            setMedioPagoSeleccionado(ultimoMedioPago);
            setValorSeleccionado(ultimoMedioPago);
            await handleFiltrarPorMedioPago(ultimoMedioPago);
          }
          else if (ultimaAccion === "todos") {
            setValorSeleccionado("todos");
            await handleMostrarTodos();
          }
        } 
        else if (location.state?.desdePrincipal && !ultimaAccion) {
          setSocios([]);
          setSociosFiltrados([]);
          setValorSeleccionado("Seleccionar");
        }
        else if (ultimaAccion) {
          if (ultimaAccion === "busqueda" && ultimaBusqueda) {
            setBusqueda(ultimaBusqueda);
            if (ultimosResultados) {
              const resultados = normalizarSocios(JSON.parse(ultimosResultados));
              setSocios(resultados.slice(0, 10));
              setSociosFiltrados(resultados);
              setAnimarFilas(true);
              mostrarToast("Datos cargados correctamente");
            } else {
              await handleBusqueda(ultimaBusqueda);
            }
          }
          else if (ultimaAccion === "letra" && ultimaLetra) {
            setLetraSeleccionada(ultimaLetra);
            setValorSeleccionado(ultimaLetra);
            await handleFiltrarPorLetra(ultimaLetra, tipoEntidad);
          }
          else if (ultimaAccion === "medioPago" && ultimoMedioPago) {
            setMedioPagoSeleccionado(ultimoMedioPago);
            setValorSeleccionado(ultimoMedioPago);
            await handleFiltrarPorMedioPago(ultimoMedioPago);
          }
          else if (ultimaAccion === "todos") {
            setValorSeleccionado("todos");
            await handleMostrarTodos();
          }
        }
      } catch (error) {
        console.error("Error al restaurar estado:", error);
        setError("Hubo un problema al cargar los datos.");
      } finally {
        setTimeout(() => setCargando(false), 500);
      }
    };

    restaurarEstado();
    return () => clearTimeout(timer);
  }, [location.state, tipoEntidad, actualizar]);

  useEffect(() => {
    if (animarFilas) {
      const timer = setTimeout(() => setAnimarFilas(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [animarFilas]);

  useEffect(() => {
    if (sociosFiltrados.length > 10 && mostrandoTodos) {
      const timer = setTimeout(() => {
        setSocios(sociosFiltrados);
        setAnimarFilas(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sociosFiltrados, mostrandoTodos]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (busqueda.trim().length > 0) {
        handleBusqueda(busqueda);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [busqueda]);

  const handleBusqueda = async (busquedaParam) => {
    let query = busquedaParam || busqueda || "";

    if (!query) {
      await handleMostrarTodos();
      return;
    }

    try {
      const url = `${BASE_URL}/api.php?action=buscar_socio&busqueda=${encodeURIComponent(query)}&tipoEntidad=${tipoEntidad}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const sociosNormalizados = normalizarSocios(Array.isArray(data) ? data : []);

        if (sociosNormalizados.length > 0) {
          setSocios(sociosNormalizados.slice(0, 10));
          setSociosFiltrados(sociosNormalizados);
          setAnimarFilas(true);
          localStorage.setItem("ultimaAccion", "busqueda");
          localStorage.setItem("ultimaBusqueda", query);
          localStorage.setItem("ultimosResultados", JSON.stringify(sociosNormalizados));
          setValorSeleccionado("Seleccionar");
          setMostrandoTodos(false);
          mostrarToast("Datos cargados correctamente");
        } else {
          setSocios([]);
          setSociosFiltrados([]);
          mostrarToast("No se encontraron resultados", "info");
        }
      } else {
        setSocios([]);
        setSociosFiltrados([]);
        mostrarToast("Error al cargar los datos", "error");
      }
    } catch (err) {
      console.error("Error en la búsqueda:", err);
      setSocios([]);
      setSociosFiltrados([]);
      mostrarToast("Error al realizar la búsqueda", "error");
    }
  };

  const handleBusquedaInputChange = (e) => {
    const value = e.target.value;
    setBusqueda(value);
  
    if (value.length > 0) {
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      setValorSeleccionado("Seleccionar");
      localStorage.removeItem("ultimaSeleccion");
    }
  };

  const handleVolverAtras = async () => {
    navigate(-1);
  };

  const handleFiltrarPorLetra = async (letra, tipo) => {
    try {
      if (todosLosSocios.length > 0) {
        const filtrados = todosLosSocios.filter(
          (socio) => socio.apellido && socio.apellido.toUpperCase().startsWith(letra)
        );

        setSocios(filtrados.slice(0, 10));
        setSociosFiltrados(filtrados);
        setAnimarFilas(true);
        localStorage.setItem("ultimaAccion", "letra");
        localStorage.setItem("ultimaLetraSeleccionada", letra);
        localStorage.setItem("ultimaSeleccion", letra);
        localStorage.removeItem("ultimaBusqueda");
        localStorage.removeItem("ultimosResultados");
        setError(null);
        setMostrandoTodos(false);
        mostrarToast("Datos cargados correctamente");
      } else {
        const url = `${BASE_URL}/api.php?action=obtener_letra&letra=${encodeURIComponent(letra)}&tipo=${encodeURIComponent(tipo)}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          const sociosNormalizados = normalizarSocios(Array.isArray(data) ? data : []);
          setSocios(sociosNormalizados.slice(0, 10));
          setSociosFiltrados(sociosNormalizados);
          setAnimarFilas(true);
          localStorage.setItem("ultimaAccion", "letra");
          localStorage.setItem("ultimaLetraSeleccionada", letra);
          localStorage.setItem("ultimaSeleccion", letra);
          localStorage.removeItem("ultimaBusqueda");
          localStorage.removeItem("ultimosResultados");
          setError(null);
          setMostrandoTodos(false);
          mostrarToast("Datos cargados correctamente");
        } else {
          setSocios([]);
          setSociosFiltrados([]);
          mostrarToast("No se encontraron resultados", "info");
        }
      }
    } catch (error) {
      setSocios([]);
      setSociosFiltrados([]);
      setError("Error al obtener los socios.");
      console.error("Error al obtener socios:", error);
      mostrarToast("Error al cargar los datos", "error");
    }
  };

  const handleFiltrarPorMedioPago = async (medioPago) => {
    try {
      const url = `${BASE_URL}/api.php?action=filtro_mp&medio=${encodeURIComponent(medioPago)}&tipo=${tipoEntidad}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const sociosNormalizados = normalizarSocios(Array.isArray(data) ? data : []);

        if (sociosNormalizados.length > 0) {
          setSocios(sociosNormalizados.slice(0, 10));
          setSociosFiltrados(sociosNormalizados);
          setAnimarFilas(true);
          localStorage.setItem("ultimaAccion", "medioPago");
          localStorage.setItem("ultimoMedioPagoSeleccionado", medioPago);
          localStorage.setItem("ultimaSeleccion", medioPago);
          localStorage.removeItem("ultimaBusqueda");
          localStorage.removeItem("ultimosResultados");
          setError(null);
          setMostrandoTodos(false);
          mostrarToast("Datos cargados correctamente");
        } else {
          setSocios([]);
          setSociosFiltrados([]);
          mostrarToast("No se encontraron resultados", "info");
        }
      } else {
        setSocios([]);
        setSociosFiltrados([]);
        setError("Error al obtener los socios.");
        mostrarToast("Error al cargar los datos", "error");
      }
    } catch (error) {
      setSocios([]);
      setSociosFiltrados([]);
      setError("Error al obtener los socios.");
      mostrarToast("Error al cargar los datos", "error");
    }
  };

  const handleMostrarTodos = async () => {
    setMostrandoTodos(true);
    setAnimarFilas(true);
    
    if (todosLosSocios.length > 0) {
      setSocios(todosLosSocios.slice(0, 10));
      setSociosFiltrados(todosLosSocios);
      setError(null);
      localStorage.setItem("ultimaAccion", "todos");
      localStorage.setItem("ultimaSeleccion", "todos");
      localStorage.removeItem("ultimaBusqueda");
      localStorage.removeItem("ultimosResultados");
      mostrarToast("Datos cargados correctamente");
      return;
    }

    try {
      const entidad = localStorage.getItem("ultimaEntidad") || "socios";
      const url = `${BASE_URL}/api.php?action=todos_socios&tipo=${entidad}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const lista = normalizarSocios(Array.isArray(data.socios) ? data.socios : []);
        setSocios(lista.slice(0, 10));
        setSociosFiltrados(lista);
        setTodosLosSocios(lista);
        setError(null);
        localStorage.setItem("ultimaAccion", "todos");
        localStorage.setItem("ultimaSeleccion", "todos");
        localStorage.removeItem("ultimaBusqueda");
        localStorage.removeItem("ultimosResultados");
        mostrarToast("Datos cargados correctamente");
      }
    } catch (error) {
      setSocios([]);
      setSociosFiltrados([]);
      setError("Error al obtener los datos.");
      mostrarToast("Error al cargar los datos", "error");
    }
  };

  const handleAgregarSocio = () => {
    navigate("/Agregarsocio");
    setActualizar(prev => !prev);
  };

  const handleSeleccion = async (e) => {
    const selectedValue = e.target.value;

    setBusqueda(""); 
    setValorSeleccionado(selectedValue);

    localStorage.setItem("ultimaSeleccion", selectedValue);
    localStorage.setItem("ultimaEntidad", tipoEntidad);

    if (selectedValue === "Seleccionar") {
      setSocios([]);
      setSociosFiltrados([]);
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      localStorage.setItem("ultimaAccion", "seleccionar");
      setMostrandoTodos(false);
    } else if (selectedValue === "todos") {
      await handleMostrarTodos();
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
    } else if (/^[A-Z]$/.test(selectedValue)) {
      setLetraSeleccionada(selectedValue);
      setMedioPagoSeleccionado("");
      await handleFiltrarPorLetra(selectedValue, tipoEntidad);
    } else {
      setMedioPagoSeleccionado(selectedValue);
      setLetraSeleccionada("");
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

  const handleEditarSocio = (id) => {
    const socio = socios.find(s => s.id === id) || sociosFiltrados.find(s => s.id === id);
    navigate(`/editarSocio/${id}`, {
      state: {
        desdeSubpagina: true,
        socioSeleccionado: socio
      }
    });
  };

  const handleEliminarSocio = async () => {
    if (socioSeleccionado) {
      try {
        const response = await fetch(
          `${BASE_URL}/api.php?action=eliminar_socio&nombre=${encodeURIComponent(socioSeleccionado.nombre)}&apellido=${encodeURIComponent(socioSeleccionado.apellido)}`,
          { method: 'GET' }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.message === "Socio eliminado correctamente") {
            setSocios(socios.filter(
              socio => socio.nombre !== socioSeleccionado.nombre || socio.apellido !== socioSeleccionado.apellido
            ));
            setSociosFiltrados(sociosFiltrados.filter(
              socio => socio.nombre !== socioSeleccionado.nombre || socio.apellido !== socioSeleccionado.apellido
            ));
            setTodosLosSocios(todosLosSocios.filter(
              socio => socio.nombre !== socioSeleccionado.nombre || socio.apellido !== socioSeleccionado.apellido
            ));
            setMostrarModalEliminar(false);
            mostrarToast("Socio eliminado correctamente");
          } else {
            mostrarToast("Error al eliminar el socio", "error");
          }
        }
      } catch (error) {
        console.error("Error al eliminar socio:", error);
        mostrarToast("Hubo un problema al eliminar el socio", "error");
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

  const getEstadoPago = (mesesPagados, fechaUnion) => {
    if (!fechaUnion) return 'soc_rojo';

    const mesesPagos = (mesesPagados && mesesPagados !== '-') 
      ? mesesPagados.split(',').map(m => m.trim().toUpperCase()) 
      : [];

    const mesesAnio = [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
    ];

    const fechaAlta = new Date(fechaUnion);
    const hoy = new Date();

    const mesAlta = fechaAlta.getMonth();
    const añoAlta = fechaAlta.getFullYear();
    const mesHoy = hoy.getMonth();
    const añoHoy = hoy.getFullYear();

    if (añoAlta > añoHoy || (añoAlta === añoHoy && mesAlta > mesHoy)) {
      return 'soc_verde';
    }

    const mesesEsperados = [];
    for (let año = añoAlta; año <= añoHoy; año++) {
      const desde = (año === añoAlta) ? mesAlta : 0;
      const hasta = (año === añoHoy) ? mesHoy : 11;

      for (let mes = desde; mes <= hasta; mes++) {
        const nombreMes = mesesAnio[mes];
        mesesEsperados.push(nombreMes);
      }
    }

    const impagos = mesesEsperados.filter(mes => !mesesPagos.includes(mes));

    if (impagos.length === 0) return 'soc_verde';
    if (impagos.length <= 2) return 'soc_amarillo';
    return 'soc_rojo';
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
  
    const datosReordenados = sociosFiltrados.map(({ id, idSocios, nombre, apellido, ...resto }) => ({
      id: id || idSocios,
      apellido,
      nombre,
      ...resto,
    }));
    
    const ws = XLSX.utils.json_to_sheet(datosReordenados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipoEntidad === "socios" ? "Socios" : "Empresas");
  
    XLSX.writeFile(wb, nombreArchivo);
  
    setErrorMessage("");
    mostrarToast("Datos exportados correctamente");
  };

  return (
    <div className="soc_container">
      <div className="soc_box">
        <div className="soc_front-row">
          <h2 className="soc_title">Gestionar Socios</h2>
          <div className="soc_front-row-inner">
            <div className="soc_search-bar">
              <input
                id="search"
                type="text"
                placeholder="Buscar por nombre o apellido"
                className="soc_search-input"
                value={busqueda}
                onChange={handleBusquedaInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleBusqueda(busqueda)}
              />
              <button className="soc_search-button" onClick={() => handleBusqueda(busqueda)}>
                <FontAwesomeIcon icon={faSearch} className="soc_icon-button" />
              </button>
            </div>

            <div className="soc_alphabet-dropdown">
              <select
                id="alphabet"
                className="soc_dropdown"
                value={valorSeleccionado}
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

            {error && <p className="soc_error">{error}</p>}
          </div>
        </div>

        {errorMessage && (
          <div className="soc_error-message">
            {errorMessage}
          </div>
        )}

        <div className="soc_list">
          <div className="soc_box-table">
            <div className="soc_header">
              <div className="soc_column-header soc_header-ape">Apellido</div>
              <div className="soc_column-header soc_header-nom">Nombre</div>
              <div className="soc_column-header soc_header-cat">Cat/precio</div>
              <div className="soc_column-header soc_header-mp">Medio de Pago</div>
              <div className="soc_column-header soc_header-dom">Domicilio Cobro</div>
              <div className="soc_column-header soc_header-obs">Observacion</div>
              <div className="soc_column-header soc_icons-column"></div>
            </div>

            <div className="soc_body">
              {cargando ? (
                <div className="soc_row">
                  <div className="soc_not-socio" colSpan="5">
                    Cargando...
                  </div>
                </div>
              ) : sociosFiltrados.length > 0 ? (
                <div className="soc_scrollable">
                  {socios.slice(0, mostrandoTodos ? sociosFiltrados.length : 10).map((socio, index) => {
                      const estadoPago = socio.estado_pago || getEstadoPago(socio.meses_pagados, socio.Fechaunion);
                      const rowClass = filaSeleccionada === index 
                        ? `soc_selected-row ${estadoPago}` 
                        : index % 2 === 0 
                          ? `soc_even-row ${estadoPago}` 
                          : `soc_odd-row ${estadoPago}`;
                      
                      return (
                        <div
                          key={socio.id}
                          className={`soc_row ${rowClass} ${animarFilas ? "soc_animar" : ""}`}
                          style={animarFilas ? { animationDelay: `${index * 0.05}s` } : {}}
                          onClick={() => handleFilaSeleccionada(index, socio)}
                        >

                          <div className="soc_column soc_column-ape">{socio.apellido}</div>
                          <div className="soc_column soc_column-nom">{socio.nombre}</div>
                          <div className="soc_column soc_column-cat">{socio.categoria} ${socio.precio_categoria || "0"}</div>
                          <div className="soc_column soc_column-mp">{socio.medio_pago}</div>
                          <div className="soc_column soc_column-dom">{socio.domicilio_2}</div>
                          <div className="soc_column soc_column-obs">{socio.observacion}</div>
                          <div className="soc_column soc_icons-column">
                            {filaSeleccionada === index && (
                              <div className="soc_icons-container">
                                <FontAwesomeIcon
                                  icon={faInfoCircle}
                                  className="soc_icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMostrarInfoSocio(socio);
                                  }}
                                />
                                <FontAwesomeIcon
                                  icon={faEdit}
                                  className="soc_icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditarSocio(socio.id || socio.idSocios);
                                  }}
                                />
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className="soc_icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmarEliminar(socio);
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
                <div className="soc_row">
                  <div className="soc_not-socio" colSpan="5">
                    {letraSeleccionada || medioPagoSeleccionado || busqueda
                      ? "No hay socios para esta letra, medio de pago o búsqueda."
                      : "Seleccione una opción para mostrar los socios."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="soc_down-container">
          <div className="soc_contador-container">
            <span className="soc_socios-totales">
              Cant socios: {sociosFiltrados.length}
            </span>
          </div>

          <div className="soc_botones-container">
            <button className="soc_button" onClick={handleAgregarSocio}>
              <FontAwesomeIcon icon={faUserPlus} className="soc_icon-button" />
              <p>Agregar Socio</p>
            </button>

            <button className="soc_button" onClick={exportarAExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="soc_icon-button" />
              <p>Exportar a Excel</p>
            </button>

            <button className="soc_button" onClick={handleVolverAtras}>
              <FontAwesomeIcon icon={faArrowLeft} className="soc_icon-button" />
              <p>Volver Atrás</p>
            </button>
          </div>

          <div className="soc_estado-pagos-container">
            <div className="soc_estado-indicador soc_al-dia">
              <div className="soc_indicador-color"></div>
              <span>Al día</span>
            </div>
            <div className="soc_estado-indicador soc_debe-1-2">
              <div className="soc_indicador-color"></div>
              <span>Debe 1-2 meses</span>
            </div>
            <div className="soc_estado-indicador soc_debe-3-mas">
              <div className="soc_indicador-color"></div>
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

      {mostrarModalInfo && infoSocio && (
        <ModalInfo
          infoSocio={infoSocio}
          mesesPagados={mesesPagados}
          onCerrar={() => setMostrarModalInfo(false)}
        />
      )}

      {toastVisible && (
        <Toast
          tipo={toastTipo}
          mensaje={toastMensaje}
          onClose={() => setToastVisible(false)}
        />
      )}
    </div>
  );
};

export default GestionarSocios;