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
    setToastVisible(true); // solo mostramos, sin timeout acá
  };


  // Función para normalizar los datos de los socios
  const normalizarSocios = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(socio => ({
      ...socio,
      id: socio.idSocios || socio.id // Usa idSocios si existe, sino usa id
    }));
  };

  // Precargar todos los socios al montar el componente
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

  // Restaurar estado al cargar el componente
  useEffect(() => {
    const timer = setTimeout(() => {
      setCargando(true);
    }, 200);

    const restaurarEstado = async () => {
      try {
        // Obtener medios de pago
        const responseMediosPago = await fetch(`${BASE_URL}/api.php?action=obtener_datos`);
        if (responseMediosPago.ok) {
          const data = await responseMediosPago.json();
          if (Array.isArray(data.mediosPago)) {
            setMediosDePago(data.mediosPago);
          }
        }

        // Si viene de edición, recargar solo el socio editado
        if (location.state?.desdeEdicion && location.state.socioEditado) {
          const socioEditado = location.state.socioEditado;
          const entidad = localStorage.getItem("ultimaEntidad") || "socios";
          
          // Actualizar el socio en la lista
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

        // Restaurar búsqueda/filtros anteriores
        const ultimaAccion = localStorage.getItem("ultimaAccion");
        const ultimaBusqueda = localStorage.getItem("ultimaBusqueda");
        const ultimaLetra = localStorage.getItem("ultimaLetraSeleccionada");
        const ultimoMedioPago = localStorage.getItem("ultimoMedioPagoSeleccionado");
        const ultimaSeleccion = localStorage.getItem("ultimaSeleccion");
        const ultimosResultados = localStorage.getItem("ultimosResultados");

        // Si viene de edición o info, restaurar el estado anterior
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
        // Si viene de la página principal sin estado previo
        else if (location.state?.desdePrincipal && !ultimaAccion) {
          setSocios([]);
          setSociosFiltrados([]);
          setValorSeleccionado("Seleccionar");
        }
        // Si hay estado guardado (viene de recarga o navegación normal)
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

  // Resetear animación después de que se complete
  useEffect(() => {
    if (animarFilas) {
      const timer = setTimeout(() => setAnimarFilas(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [animarFilas]);

  // Cargar más registros progresivamente
  useEffect(() => {
    if (sociosFiltrados.length > 10 && mostrandoTodos) {
      const timer = setTimeout(() => {
        setSocios(sociosFiltrados);
        setAnimarFilas(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sociosFiltrados, mostrandoTodos]);

  // Búsqueda con debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (busqueda.trim().length > 0) {
        handleBusqueda(busqueda);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [busqueda]);

  // Manejar búsqueda
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
        // Filtrar en memoria si los datos ya fueron precargados
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
        // Si no hay datos precargados, usar API como antes
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
      setSocios(todosLosSocios.slice(0, 10)); // muestra los primeros 10
      setSociosFiltrados(todosLosSocios);
      setError(null);
      localStorage.setItem("ultimaAccion", "todos");
      localStorage.setItem("ultimaSeleccion", "todos");
      localStorage.removeItem("ultimaBusqueda");
      localStorage.removeItem("ultimosResultados");
      mostrarToast("Datos cargados correctamente");
      return;
    }

    // Si no se precargaron (por alguna razón), hacer fetch
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
    if (!fechaUnion) return 'rojo';

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
      return 'verde';
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

    if (impagos.length === 0) return 'verde';
    if (impagos.length <= 2) return 'amarillo';
    return 'rojo';
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
      id: id || idSocios, // Asegurarse de incluir el ID correcto
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
                  {socios.slice(0, mostrandoTodos ? sociosFiltrados.length : 10).map((socio, index) => {
                      const estadoPago = socio.estado_pago || getEstadoPago(socio.meses_pagados, socio.Fechaunion);
                      const rowClass = filaSeleccionada === index 
                        ? `selected-row ${estadoPago}` 
                        : index % 2 === 0 
                          ? `even-row ${estadoPago}` 
                          : `odd-row ${estadoPago}`;
                      
                      return (
                        <div
                          key={socio.id}
                          className={`row ${rowClass} ${animarFilas ? "animar" : ""}`}
                          style={animarFilas ? { animationDelay: `${index * 0.05}s` } : {}}
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
                                    handleEditarSocio(socio.id || socio.idSocios);
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