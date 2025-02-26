import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowLeft, faEdit, faTrash, faSearch, faDollar, faFileExcel } from "@fortawesome/free-solid-svg-icons";
import ModalPagos from "./ModalPagos"; // Asegúrate de importar el ModalPagos
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
  const [tipoEntidad, setTipoEntidad] = useState("socios");
  const [actualizar, setActualizar] = useState(false);

  useEffect(() => {
    const obtenerDatos = async () => {
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

        const ultimaBusqueda = localStorage.getItem("ultimaBusqueda");
        const ultimosResultados = localStorage.getItem("ultimosResultados");
        const ultimaSeleccion = localStorage.getItem("ultimaSeleccion");

        if (ultimaBusqueda) {
          setBusqueda(ultimaBusqueda);
          await handleBusqueda(ultimaBusqueda);
        } else if (ultimosResultados) {
          setBusqueda(ultimaBusqueda);
          setSociosFiltrados(JSON.parse(ultimosResultados));
        } else if (ultimaSeleccion) {
          if (ultimaSeleccion === "todos") {
            await handleMostrarTodos();
          } else if (/^[A-Z]$/.test(ultimaSeleccion)) {
            await handleFiltrarPorLetra(ultimaSeleccion);
          } else {
            setMedioPagoSeleccionado(ultimaSeleccion);
            await handleFiltrarPorMedioPago(ultimaSeleccion);
          }
        } else {
          // No cargar datos automáticamente si no hay selección o búsqueda
          setSocios([]);
          setSociosFiltrados([]);
        }
      } catch (error) {
        setError("Hubo un problema al obtener los datos.");
        console.error("Error:", error);
      }
    };

    obtenerDatos();
  }, [actualizar]);

  const handleBusqueda = async (busquedaParam) => {
    let query = busquedaParam || busqueda || "";

    if (!query) return;

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

  const handleAgregarSocio = () => {
    navigate("/Agregarsocio");
  };

  const handleVolverAtras = () => {
    navigate(-1);
    setActualizar(prev => !prev);
  };

  const handleFiltrarPorLetra = async (letra, tipo) => {
    try {
      let url = `http://localhost:3001/obtener_letra.php?letra=${letra}&tipo=${tipo}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log("Respuesta del servidor:", data);
        setSocios(Array.isArray(data) ? data : []);
        setSociosFiltrados(Array.isArray(data) ? data : []);
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

  const handleSeleccion = async (e) => {
    const selectedValue = e.target.value;
    localStorage.setItem("ultimaSeleccion", selectedValue);
    localStorage.removeItem("ultimaBusqueda");
    localStorage.removeItem("ultimosResultados");

    const tipoSeleccionadoElement = document.getElementById("entity");
    const tipoSeleccionado = tipoSeleccionadoElement ? tipoSeleccionadoElement.value : "socios"; // Default a "socios"

    if (selectedValue === "todos") {
      handleMostrarTodos();
    } else if (/^[A-Z]$/.test(selectedValue)) {
      handleFiltrarPorLetra(selectedValue, tipoSeleccionado);
    } else if (selectedValue === "") {
      // Si no se selecciona nada, limpiar la tabla
      setSocios([]);
      setSociosFiltrados([]);
    } else {
      setMedioPagoSeleccionado(selectedValue);
      handleFiltrarPorMedioPago(selectedValue);
    }
  };

  const handleFiltrarPorMedioPago = async (medioPago) => {
    console.log("Filtrando por medio de pago:", medioPago);

    try {
      const tipoSeleccionadoElement = document.getElementById("entity");
      const tipoSeleccionado = tipoSeleccionadoElement ? tipoSeleccionadoElement.value : "socios"; // Obtener el tipo de entidad seleccionado

      const url = `http://localhost:3001/filtro_mp.php?medio=${encodeURIComponent(medioPago)}&tipo=${tipoSeleccionado}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log("Respuesta del servidor:", data);

        if (Array.isArray(data) && data.length > 0) {
          setSocios(data);
          setSociosFiltrados(data);
        } else {
          console.warn("No se encontraron socios para este medio de pago.");
          setSocios([]);
          setSociosFiltrados([]);
        }
        setError(null);
      } else {
        console.error("Error en la respuesta del servidor:", response.status);
        setSocios([]);
        setSociosFiltrados([]);
        setError("Error al obtener los socios.");
      }
    } catch (error) {
      console.error("Error al obtener socios por medio de pago:", error);
      setSocios([]);
      setSociosFiltrados([]);
      setError("Error al obtener los socios.");
    }
  };

  const handleMostrarTodos = async () => {
    try {
      const tipoSeleccionadoElement = document.getElementById("entity");
      const tipoSeleccionado = tipoSeleccionadoElement ? tipoSeleccionadoElement.value : "socios";

      const url = `http://localhost:3001/todos_socios.php?tipo=${tipoSeleccionado}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setSocios(Array.isArray(data.socios) ? data.socios : []);
        setSociosFiltrados(Array.isArray(data.socios) ? data.socios : []);
        setError(null);

        localStorage.removeItem("ultimaBusqueda");
        localStorage.removeItem("ultimosResultados");
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

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const handlePagoSocio = (socio) => {
    setSocioSeleccionado(socio);
    setMostrarModal(true);
  };

  const handleTipoEntidadChange = async (e) => {
    const tipo = e.target.value;
    setTipoEntidad(tipo);
    console.log("Tipo de entidad seleccionado:", tipo);

    // Limpiar la tabla al cambiar el tipo de entidad
    setSocios([]);
    setSociosFiltrados([]);
  };

  const exportarAExcel = () => {
    if (sociosFiltrados.length === 0) {
      setErrorMessage("Datos incompletos: No hay socios para exportar");

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);

      return;
    }

    const datosReordenados = sociosFiltrados.map(({ idSocios, nombre, apellido, ...resto }) => ({
      idSocios,
      apellido,
      nombre,
      ...resto,
    }));

    const ws = XLSX.utils.json_to_sheet(datosReordenados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Socios");

    XLSX.writeFile(wb, "Socios.xlsx");

    setErrorMessage("");
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
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBusqueda(busqueda)}
              />
              <button className="search-button" onClick={() => handleBusqueda(busqueda)}>
                <FontAwesomeIcon icon={faSearch} className="icon-button" />
              </button>
            </div>

            <div className="alphabet-dropdown">
              <select id="alphabet" className="dropdown" onChange={handleSeleccion}>
                <option value="">Seleccionar</option>
                <option value="todos">Todos</option>
                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].map((letter, index) => (
                  <option key={index} value={letter}>
                    {letter}
                  </option>
                ))}
                {mediosDePago.length > 0 ? (
                  mediosDePago.map((medio, index) => (
                    <option key={index} value={medio.Medio_Pago}>
                      {medio.Medio_Pago}
                    </option>
                  ))
                ) : (
                  <option>No hay medios de pago disponibles</option>
                )}
              </select>
            </div>

            <div className="entity-dropdown">
              <select id="entity" className="dropdown" onChange={handleTipoEntidadChange}>
                <option value="socios">Socios</option>
                <option value="empresa">Empresas</option>
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

        {error && <p className="error-message">{error}</p>}

        <div className="socios-list">
          <div className="box-table">
            <div className="header">
              <div className="column-header header-ape">Apellido</div>
              <div className="column-header header-nom">Nombre</div>
              <div className="column-header header-cat">Cat/precio</div>
              <div className="column-header header-mp">Medio de Pago</div>
              <div className="column-header header-dom">Domicilio</div>
              <div className="column-header header-obs">Observacion</div>
              <div className="column-header icons-column"></div>
            </div>

            <div className="body">
              {sociosFiltrados.length > 0 ? (
                <div className="scrollable">
                  {sociosFiltrados.map((socio, index) => {
                    console.log(`Socio ${index}:`, socio);
                    return (
                      <div
                        key={index}
                        className={`row ${filaSeleccionada === index ? "selected-row" : index % 2 === 0 ? "even-row" : "odd-row"}`}
                        onClick={() => handleFilaSeleccionada(index, socio)}
                      >
                        <div className="column column-ape">{socio.apellido || "No disponible"}</div>
                        <div className="column column-nom">{socio.nombre || "No disponible"}</div>
                        <div className="column column-cat">{socio.categoria || "No disponible"} ${socio.precio_categoria || "0"}</div>
                        <div className="column column-mp">{socio.medio_pago || "No disponible"}</div>
                        <div className="column column-dom">{socio.domicilio || "No disponible"} {socio.numero || ""}</div>
                        <div className="column column-obs">{socio.observacion}</div>
                        <div className="column icons-column">
                          {filaSeleccionada === index && (
                            <div className="icons-container">
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
                    No hay socios para esta letra o búsqueda.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="buttons-container-socios">
          <span className="socios-totales">
            Cant socios: {sociosFiltrados.length}
          </span>

          <div className="buttons-container">
            <button className="socio-button" onClick={handleAgregarSocio}>
              <FontAwesomeIcon icon={faPlus} className="socio-icon-button" />
              Agregar Socio
            </button>

            <button className="socio-button btn-export" onClick={exportarAExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="socio-icon-button" />
              Exportar a Excel
            </button>

            <button className="socio-button-back" onClick={handleVolverAtras}>
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
        />
      )}
    </div>
  );
};

export default GestionarSocios;