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
  const [mediosDePago, setMediosDePago] = useState([]); // Estado para los medios de pago
  const [letraSeleccionada, setLetraSeleccionada] = useState("");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [sociosFiltrados, setSociosFiltrados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false); // Estado para mostrar el modal de pagos
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false); // Modal confirmación de eliminación
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); 
  const [tipoEntidad, setTipoEntidad] = useState("socios"); // Estado para el tipo de entidad seleccionada
  const [actualizar, setActualizar] = useState(false);

  // Llamamos a obtener los medios de pago cuando el componente se monta
  useEffect(() => {
    const obtenerDatos = async () => {
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
  
        // Restaurar búsqueda o selección previa
        const ultimaBusqueda = localStorage.getItem("ultimaBusqueda");
        const ultimosResultados = localStorage.getItem("ultimosResultados");
        const ultimaSeleccion = localStorage.getItem("ultimaSeleccion");
  
        if (ultimaBusqueda) {
          setBusqueda(ultimaBusqueda);
          await handleBusqueda(ultimaBusqueda); // Ejecuta la búsqueda con el último término
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
          await handleMostrarTodos(); // Carga inicial si no hay datos previos
        }
      } catch (error) {
        setError("Hubo un problema al obtener los datos.");
        console.error("Error:", error);
      }
    };
  
    obtenerDatos();
  }, [actualizar]); // Se ejecuta cuando 'actualizar' cambia

  const handleBusqueda = async (busquedaParam) => {
    let query = busquedaParam || busqueda || "";
  
    if (typeof query === 'object' && query !== null) {
      if (query instanceof HTMLElement) {
        console.error("Error: Se pasó un elemento DOM a la búsqueda, lo que no es válido.");
        query = "";
      } else {
        try {
          query = JSON.stringify(query);
        } catch (e) {
          console.error("Error al convertir a JSON:", e);
          query = "";
        }
      }
    } else {
      query = String(query).trim();
    }
  
    console.log("Buscando con el término:", query);
  
    if (!query) return;
  
    try {
      const response = await fetch(`http://localhost:3001/buscarSocio.php?busqueda=${encodeURIComponent(query)}`);
  
      if (response.ok) {
        const socios = await response.json();
  
        if (Array.isArray(socios) && socios.length > 0) {
          setSocios(socios);
          setSociosFiltrados(socios);
  
          localStorage.setItem("ultimaBusqueda", query);
          localStorage.setItem("ultimosResultados", JSON.stringify(socios));
          localStorage.removeItem("ultimaSeleccion");
  
          setFilaSeleccionada(null);
          setSocioSeleccionado(null);
          setError(null);
        } else {
          setSocios([]);
          setSociosFiltrados([]);
          setError("No se encontraron resultados.");
        }
      } else {
        setError("Error al buscar socios");
        setSocios([]);
        setSociosFiltrados([]);
      }
    } catch (err) {
      console.error("Error en la búsqueda:", err);
      setError("Error en la búsqueda");
      setSocios([]);
      setSociosFiltrados([]);
    }
  };

  const handleAgregarSocio = () => {
    navigate("/Agregarsocio");
  };

  const handleVolverAtras = () => {
    navigate(-1);
    setActualizar(prev => !prev); // Fuerza la recarga
  };
  
  const handleSeleccion = async (e) => {
    const selectedValue = e.target.value;
    localStorage.setItem("ultimaSeleccion", selectedValue);
    localStorage.removeItem("ultimaBusqueda");
    localStorage.removeItem("ultimosResultados");
  
    if (selectedValue === "todos") {
      handleMostrarTodos();
    } else if (/^[A-Z]$/.test(selectedValue)) {
      handleFiltrarPorLetra(selectedValue);
    } else {
      setMedioPagoSeleccionado(selectedValue);
      handleFiltrarPorMedioPago(selectedValue);
    }
  };

  const handleFiltrarPorMedioPago = async (medioPago) => {
    console.log("Filtrando por medio de pago:", medioPago);
  
    try {
      const url = `http://localhost:3001/filtro_mp.php?action=obtener_socios_por_medio_pago&medio=${encodeURIComponent(medioPago)}`;
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

  const handleFiltrarPorLetra = async (letra) => {
    try {
      let url = `http://localhost:3001/obtener_letra.php?action=obtener_socios&letra=${letra}`;
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

  const handleMostrarTodos = async () => {
    try {
      let url = `http://localhost:3001/todos_socios.php`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setSocios(Array.isArray(data.socios) ? data.socios : []);
        setSociosFiltrados(Array.isArray(data.socios) ? data.socios : []);
        setError(null);

        // Limpiar la última búsqueda y los resultados del localStorage
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
    
    // **Guardar selección en localStorage para mantener la selección después de la búsqueda**
    if (socio) {
      localStorage.setItem("socioSeleccionado", JSON.stringify(socio));
    } else {
      localStorage.removeItem("socioSeleccionado");
    }
  };
  
  const handleEditarSocio = (nombre, apellido) => {
    navigate(`/editarSocio/${nombre}/${apellido}`);
    setActualizar(prev => !prev); // Fuerza actualización después de editar
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
            setMostrarModalEliminar(false); // Cierra el modal
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
    setMostrarModalEliminar(true); // Muestra el modal de confirmación
  };

  const handleCancelarEliminar = () => {
    setMostrarModalEliminar(false); // Cierra el modal sin eliminar
  };

  const cerrarModal = () => {
    setMostrarModal(false); // Cierra el modal de pagos
  };

  const handlePagoSocio = (socio) => {
    setSocioSeleccionado(socio);
    setMostrarModal(true); // Show the payment modal
  };

  const exportarAExcel = () => {
    if (sociosFiltrados.length === 0) {
      setErrorMessage("Datos incompletos: No hay socios para exportar");
  
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
  
      return;
    }
  
    // Reordenar las propiedades de los objetos
    const datosReordenados = sociosFiltrados.map(({ idSocios, nombre, apellido, ...resto }) => ({
      idSocios, // Primera columna (A)
      apellido, // Segunda columna (B)
      nombre,   // Tercera columna (C)
      ...resto,  // Mantiene las demás propiedades en su orden original
    }));
  
    // Crear una hoja de cálculo con los datos reordenados
    const ws = XLSX.utils.json_to_sheet(datosReordenados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Socios");
  
    // Descargar el archivo Excel
    XLSX.writeFile(wb, "Socios.xlsx");
  
    // Limpiar el mensaje de error después de la exportación exitosa
    setErrorMessage("");
  };

  const handleTipoEntidadChange = async (e) => {
    const tipo = e.target.value;
    setTipoEntidad(tipo);
    console.log("Tipo de entidad seleccionado:", tipo);
  
    try {
      const response = await fetch(`http://localhost:3001/obtener_entidad.php?tipo=${tipo}`);
      console.log("Estado de la respuesta:", response.status);
  
      if (!response.ok) {
        console.error("Error en la solicitud, código de respuesta:", response.status);
        setError("Error en la solicitud.");
        return;
      }
  
      const textResponse = await response.text();
      console.log("Respuesta en bruto del servidor:", textResponse);
  
      try {
        const data = JSON.parse(textResponse);
        console.log("Datos obtenidos del servidor:", data);
  
        if (Array.isArray(data)) {
          setSocios(data);
          setSociosFiltrados(data); // Asegúrate de actualizar también los socios filtrados
          setError(null);
        } else {
          console.error("Datos no son un array:", data);
          setError("Respuesta del servidor no válida.");
        }
      } catch (jsonError) {
        console.error("Error al parsear JSON:", jsonError);
        setError("Error al procesar los datos.");
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      setError("Error al obtener los datos.");
    }
  };

  useEffect(() => {
    console.log("Socios actualizados:", socios);
    console.log("Socios Filtrados en el Render:", sociosFiltrados);

  }, [socios]);

  
  

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
                onKeyDown={(e) => e.key === "Enter" && handleBusqueda(busqueda)} // Ejecutar búsqueda con Enter
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
                  <div className="column-header icons-column"></div> {/* Nueva columna para los iconos */}
              </div>

              <div className="body">
    {sociosFiltrados.length > 0 ? (
        <div className="scrollable">
            {sociosFiltrados.map((socio, index) => {
                console.log(`Socio ${index}:`, socio); // Depuración
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
                        <div className="column column-obs">{socio.observacion || "Sin observaciones"}</div>
                        {/* Columna vacía para los iconos en la fila */}
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
          {/* Contador de socios */}
          <span className="socios-totales">
            Cant socios: {sociosFiltrados.length}
          </span>
          
            <div className="buttons-container">
              {/* Botones */}
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
  
      {/* Modal de confirmación de eliminación */}
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
