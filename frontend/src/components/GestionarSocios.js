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
  const [tipoEntidad, setTipoEntidad] = useState(localStorage.getItem("ultimaEntidad") || "socios"); // Estado para el tipo de entidad (socios o empresas)
  const [actualizar, setActualizar] = useState(false);
  const [primeraCarga, setPrimeraCarga] = useState(true);



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
        const ultimaLetraSeleccionada = localStorage.getItem("ultimaLetraSeleccionada");
        const ultimoMedioPagoSeleccionado = localStorage.getItem("ultimoMedioPagoSeleccionado");
  
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
            setLetraSeleccionada(ultimaSeleccion);
            await handleFiltrarPorLetra(ultimaSeleccion, tipoEntidad);
          } else {
            setMedioPagoSeleccionado(ultimaSeleccion);
            await handleFiltrarPorMedioPago(ultimaSeleccion);
          }
        } else if (ultimaLetraSeleccionada) {
          setLetraSeleccionada(ultimaLetraSeleccionada);
          await handleFiltrarPorLetra(ultimaLetraSeleccionada, tipoEntidad);
        } else if (ultimoMedioPagoSeleccionado) {
          setMedioPagoSeleccionado(ultimoMedioPagoSeleccionado);
          await handleFiltrarPorMedioPago(ultimoMedioPagoSeleccionado);
        } else {
          setSocios([]);
          setSociosFiltrados([]);
        }
      } catch (error) {
        setError("Hubo un problema al obtener los datos.");
        console.error("Error:", error);
      }
    };
  
    obtenerDatos();
  }, [actualizar, tipoEntidad]);

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
    setActualizar(prev => !prev); // Forzar actualización
  };

  const handleVolverAtras = async () => {
    const ultimaSeleccion = localStorage.getItem("ultimaSeleccion");
    const ultimaEntidad = localStorage.getItem("ultimaEntidad") || "socios";

    setTipoEntidad(ultimaEntidad);

    if (ultimaSeleccion === "todos") {
      await handleMostrarTodos();
    } else if (/^[A-Z]$/.test(ultimaSeleccion)) {
      await handleFiltrarPorLetra(ultimaSeleccion, ultimaEntidad);
    } else if (ultimaSeleccion) {
      setMedioPagoSeleccionado(ultimaSeleccion);
      await handleFiltrarPorMedioPago(ultimaSeleccion);
    }

    navigate(-1);
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
  
    // Guarda la selección en localStorage
    localStorage.setItem("ultimaSeleccion", selectedValue);
    localStorage.setItem("ultimaEntidad", tipoEntidad);
    
    // Limpia búsquedas previas
    localStorage.removeItem("ultimaBusqueda");
    localStorage.removeItem("ultimosResultados");
  
    // Después de la primera selección, ocultar "Seleccionar"
    setPrimeraCarga(false);
  
    if (selectedValue === "todos") {
      await handleMostrarTodos();
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      setBusqueda("");
    } else if (selectedValue === "") {
      setSocios([]);
      setSociosFiltrados([]);
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      setBusqueda("");
    } else if (/^[A-Z]$/.test(selectedValue)) {
      setLetraSeleccionada(selectedValue);
      setMedioPagoSeleccionado("");
      localStorage.setItem("ultimaLetraSeleccionada", selectedValue);
      await handleFiltrarPorLetra(selectedValue, tipoEntidad);
    } else {
      setMedioPagoSeleccionado(selectedValue);
      setLetraSeleccionada("");
      localStorage.setItem("ultimoMedioPagoSeleccionado", selectedValue);
      await handleFiltrarPorMedioPago(selectedValue);
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
          localStorage.setItem("ultimaSeleccion", medioPago);
        } else {
          setSocios([]);
          setSociosFiltrados([]);
        }
        setError(null);
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
      const entidad = localStorage.getItem("ultimaEntidad") || "socios"; // Recuperar la última entidad usada
      const url = `http://localhost:3001/todos_socios.php?tipo=${entidad}`;
      const response = await fetch(url);
  
      if (response.ok) {
        const data = await response.json();
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
      setError("Error al obtener los datos.");
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
    setActualizar(prev => !prev); // Forzar actualización
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
    setTipoEntidad(tipo); // Actualizar el estado
    localStorage.setItem("ultimaEntidad", tipo); // Guardar la selección en localStorage
  
    // Limpiar el estado de la selección anterior (letras o medios de pago)
    setLetraSeleccionada("");
    setMedioPagoSeleccionado("");
    localStorage.removeItem("ultimaLetraSeleccionada");
    localStorage.removeItem("ultimoMedioPagoSeleccionado");
  
    // Limpiar la tabla al cambiar el tipo de entidad
    setSocios([]);
    setSociosFiltrados([]);
  
    // Recargar los datos según el nuevo tipo de entidad
    if (tipo === "socios") {
      await handleMostrarTodos();
    } else if (tipo === "empresa") {
      await handleMostrarTodos();
    }
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
              <select
                id="alphabet"
                className="dropdown"
                value={letraSeleccionada || medioPagoSeleccionado || (primeraCarga ? "" : "todos")}
                onChange={handleSeleccion}
              >
                {primeraCarga && <option value="Seleccionar" disabled>Seleccionar</option>}
                <option value="todos">Todos</option>

                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].map((letter, index) => (
                  <option key={index} value={letter}>{letter}</option>
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



            <div className="entity-dropdown">
              <select
                id="entity"
                className="dropdown"
                value={tipoEntidad} // Controla el valor del select con el estado
                onChange={handleTipoEntidadChange}
              >
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