import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowLeft, faEdit, faTrash, faSearch, faDollar, faFileExcel, faPrint } from "@fortawesome/free-solid-svg-icons";
import ModalPagosEmpresas from './ModalPagosEmpresas';
import "./GestionarEmpresas.css";

const GestionarEmpresas = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [mediosDePago, setMediosDePago] = useState([]);
  const [letraSeleccionada, setLetraSeleccionada] = useState("");
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState(localStorage.getItem("ultimaBusqueda") || "");
  const [empresasFiltradas, setEmpresasFiltradas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [medioPagoSeleccionado, setMedioPagoSeleccionado] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tipoEntidad, setTipoEntidad] = useState(localStorage.getItem("ultimaEntidad") || "empresas");
  const [actualizar, setActualizar] = useState(false);
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [seleccionActual, setSeleccionActual] = useState("Seleccionar");

  // Ejecutar la búsqueda automáticamente cuando cambia `busqueda` o `tipoEntidad`
  useEffect(() => {
    const ejecutarBusqueda = async () => {
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
  
        const ultimaBusqueda = localStorage.getItem("ultimaBusqueda");
        const ultimaSeleccion = localStorage.getItem("ultimaSeleccion");
  
        if (ultimaBusqueda) {
          setBusqueda(ultimaBusqueda);
          await handleBusqueda(ultimaBusqueda); // Realiza la búsqueda usando la última consulta
        } else if (ultimaSeleccion === "Seleccionar") {
          // Si la última opción fue "Seleccionar", dejamos la tabla en blanco
          setEmpresas([]);
          setEmpresasFiltradas([]);
        } else if (ultimaSeleccion === "todos") {
          await handleMostrarTodos();
        } else if (/^[A-Z]$/.test(ultimaSeleccion)) {
          setLetraSeleccionada(ultimaSeleccion);
          await handleFiltrarPorLetra(ultimaSeleccion, tipoEntidad);
        } else if (ultimaSeleccion) {
          setMedioPagoSeleccionado(ultimaSeleccion);
          await handleFiltrarPorMedioPago(ultimaSeleccion);
        } else {
          setEmpresas([]); // Deja la tabla en blanco si no hay opción guardada
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
      setEmpresas([]);
      setEmpresasFiltradas([]);
      localStorage.removeItem("ultimaBusqueda"); // Limpiar la última búsqueda
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
          localStorage.setItem("ultimaBusqueda", query); // Guardar la última búsqueda
          localStorage.setItem("ultimaSeleccion", ""); // Limpiar la selección de filtros
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


  // Función para editar una empresa
  const handleEditarEmpresa = (razonSocial) => {
    navigate(`/editarEmpresa/${razonSocial}`);
    setActualizar(prev => !prev);
  };


  // Función para agregar una nueva empresa
  const handleAgregarEmpresa = () => {
    navigate("/AgregarEmpresa");
    setActualizar(prev => !prev);
  };

  // Función para volver atrás
  const handleVolverAtras = async () => {
    const ultimaSeleccion = localStorage.getItem("ultimaSeleccion");
    const ultimaEntidad = localStorage.getItem("ultimaEntidad") || "empresas";

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

  // Función para filtrar empresas por letra
  const handleFiltrarPorLetra = async (letra, tipo) => {
    try {
      let url = `http://localhost:3001/obtener_letras_empresa.php?letra=${letra}&tipo=${tipo}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log("Respuesta del servidor:", data);
        setEmpresas(Array.isArray(data) ? data : []);
        setEmpresasFiltradas(Array.isArray(data) ? data : []);
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

  // Función para manejar la selección de filtros
  const handleSeleccion = async (e) => {
    const selectedValue = e.target.value;
    setSeleccionActual(selectedValue); // Actualiza la selección actual en el select
  
    localStorage.setItem("ultimaSeleccion", selectedValue);
    localStorage.setItem("ultimaEntidad", tipoEntidad);
  
    if (selectedValue === "todos") {
      await handleMostrarTodos();
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      setBusqueda("");
    } else if (selectedValue === "Seleccionar") {
      setEmpresas([]);
      setEmpresasFiltradas([]);
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
        const url = `http://localhost:3001/filtro_empresas_mp.php?medio=${encodeURIComponent(medioPago)}&tipo=${tipoEntidad}`;
        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                setEmpresas(data);
                setEmpresasFiltradas(data);
                localStorage.setItem("ultimaSeleccion", medioPago);
            } else {
                setEmpresas([]);
                setEmpresasFiltradas([]);
            }
            setError(null);
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

  // Función para mostrar todas las empresas
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






  // Función para seleccionar una fila
  const handleFilaSeleccionada = (index, empresa) => {
    setFilaSeleccionada(filaSeleccionada === index ? null : index);
    setEmpresaSeleccionada(empresa);

    if (empresa) {
      localStorage.setItem("empresaSeleccionada", JSON.stringify(empresa));
    } else {
      localStorage.removeItem("empresaSeleccionada");
    }
  };

  // Función para eliminar una empresa
  const handleEliminarEmpresa = async () => {
    if (!empresaSeleccionada || !empresaSeleccionada.idEmp || !empresaSeleccionada.razon_social) {
      console.error("Error: No se ha seleccionado una empresa/socio válido.");
      return;
    }
  
    try {
      const response = await fetch(
        `http://localhost:3001/eliminar_empresa.php?idEmp=${empresaSeleccionada.idEmp}&razon_social=${encodeURIComponent(empresaSeleccionada.razon_social)}`
      );
  
      if (!response.ok) {
        throw new Error("Error en la solicitud");
      }
  
      const data = await response.json();
  
      if (data.success) {
        // Actualizar la lista de empresas/socios después de eliminar
        setEmpresasFiltradas(empresasFiltradas.filter(empresa => empresa.idEmp !== empresaSeleccionada.idEmp));
        
        // Cerrar el modal de eliminación
        setMostrarModalEliminar(false);
      } else {
        console.error("Error: " + data.message);
      }
    } catch (error) {
      console.error("Error al eliminar empresa/socio:", error);
    }
  };



  // Función para confirmar la eliminación de una empresa
  const handleConfirmarEliminar = (empresa) => {
    setEmpresaSeleccionada(empresa);
    setMostrarModalEliminar(true);
  };

  // Función para cancelar la eliminación de una empresa
  const handleCancelarEliminar = () => {
    setMostrarModalEliminar(false);
  };

  // Función para cerrar el modal de pagos
  const cerrarModal = () => {
    setMostrarModal(false);
  };

  // Función para manejar el pago de una empresa
  const handlePagoEmpresa = (empresa) => {
    setEmpresaSeleccionada(empresa);
    setMostrarModal(true);
  };




































// Función para exportar datos a Excel
const exportarAExcel = () => {
  if (empresasFiltradas.length === 0) {
    setErrorMessage("Datos incompletos: No hay empresas para exportar.");

    setTimeout(() => {
      setErrorMessage("");
    }, 3000);

    return;
  }

  const nombreArchivo = "Empresas.xlsx";

  // Eliminar las columnas idEmpresas y nombre antes de crear el archivo Excel
  const datosReordenados = empresasFiltradas.map(({ idEmpresas, nombre, ...resto }) => resto);

  const ws = XLSX.utils.json_to_sheet(datosReordenados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Empresas");

  XLSX.writeFile(wb, nombreArchivo);

  setErrorMessage("");
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

    // Función auxiliar para reemplazar null o undefined con una cadena vacía
    const limpiarDato = (valor) => (valor == null ? "" : valor);

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
      // Limpiar todos los datos para evitar null o undefined
      const razon_social = limpiarDato(empresa.razon_social);
      const domicilio_2 = limpiarDato(empresa.domicilio_2);
      const categoria = limpiarDato(empresa.categoria);
      const precioCategoria = limpiarDato(empresa.precio_categoria);
      const medio_pago = limpiarDato(empresa.medio_pago);
      const mesesPagados = new Date().toLocaleString('default', { month: 'long' }).toUpperCase();

      comprobantesHTML += `
          <div class="contenedor">
              <div class="comprobante">
                  <div class="talon-empresa">
                      <p><strong>Empresa:</strong> ${razon_social}</p>
                      <p><strong>Domicilio:</strong> ${domicilio_2}</p>
                      <p><strong>Categoría / Monto:</strong> ${categoria} / $${precioCategoria}</p>
                      <p><strong>Período:</strong> ${mesesPagados}</p>
                      <p><strong>Cobrador:</strong> ${medio_pago}</p>
                      <p>Por consultas comunicarse al 03564-15205778</p>
                  </div>
                  <div class="talon-cobrador">
                      <p><strong>Nombre:</strong> ${razon_social}</p>
                      <p><strong>Categoría / Monto:</strong> ${categoria} / $${precioCategoria}</p>
                      <p><strong>Período:</strong> ${mesesPagados}</p>
                      <p><strong>Cobrador:</strong> ${medio_pago}</p>
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
              onChange={(e) => {
                setBusqueda(e.target.value);
                setSeleccionActual("Seleccionar"); // Reiniciar el select
                localStorage.setItem("ultimaSeleccion", "Seleccionar");
              }}
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
              value={seleccionActual}
              onChange={(e) => {
                handleSeleccion(e);
                setBusqueda(""); // Limpiar el buscador cuando se selecciona una opción
              }}
            >
              <option value="Seleccionar">Seleccionar</option>
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

          {error && <p className="error">{error}</p>}
        </div>
      </div>







        {errorMessage && (
          <div className="error-message-emp">
            {errorMessage}
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

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
                    return (
                      <div
                        key={index}
                        className={`row ${filaSeleccionada === index ? "selected-row" : index % 2 === 0 ? "even-row" : "odd-row"}`}
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

        <div className="down-container-empresas">
          <div className="contador-container">
            <span className="empresas-totales">
              Cant empresas: {empresasFiltradas.length}
            </span>
          </div>

          <div className="botones-container">
            <button className="socio-button" onClick={handleAgregarEmpresa}>
              <FontAwesomeIcon icon={faPlus} className="socio-icon-button" />
              Agregar Empresa
            </button>

            <button className="socio-button" onClick={exportarAExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="socio-icon-button" />
              Exportar a Excel
            </button>

            <button className="socio-button" onClick={handleImprimirTodosComprobantes}>
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
            <h3 className="modal-title">¿Deseas eliminar esta empresa?</h3>
            <p className="modal-text">{`${empresaSeleccionada.razon_social}`}</p>

            <div className="modal-buttons">
              <button className="modal-button cancel-button" onClick={handleCancelarEliminar}>
                Cancelar
              </button>
              <button className="modal-button accept-button" onClick={handleEliminarEmpresa}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModal && (
        <ModalPagosEmpresas
          razonSocial={empresaSeleccionada.razon_social}
          cerrarModal={cerrarModal}
        />
      )}
    </div>
  );
};

export default GestionarEmpresas;