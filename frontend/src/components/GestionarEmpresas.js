import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faArrowLeft, faEdit, faTrash, faSearch, faDollar, faFileExcel, faPrint } from "@fortawesome/free-solid-svg-icons";
import ModalPagos from "./ModalPagos"; // Asegúrate de importar el ModalPagos
import "./GestionarEmpresas.css";

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
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [cargando, setCargando] = useState(false);

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
        const ultimosResultados = localStorage.getItem("ultimosResultados");
        const ultimaSeleccion = localStorage.getItem("ultimaSeleccion");
        const ultimaLetraSeleccionada = localStorage.getItem("ultimaLetraSeleccionada");
        const ultimoMedioPagoSeleccionado = localStorage.getItem("ultimoMedioPagoSeleccionado");

        if (ultimaBusqueda) {
          setBusqueda(ultimaBusqueda);
          await handleBusqueda(ultimaBusqueda);
        } else if (ultimosResultados) {
          setBusqueda(ultimaBusqueda);
          setEmpresasFiltradas(JSON.parse(ultimosResultados));
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
          setEmpresas([]);
          setEmpresasFiltradas([]);
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

  // Función para editar una empresa
  const handleEditarEmpresa = (razonSocial) => {
    navigate(`/editarEmpresa/${razonSocial}`);
    setActualizar(prev => !prev);
  };

  // Función para buscar empresas
  const handleBusqueda = async (busquedaParam) => {
    let query = busquedaParam || busqueda || "";

    if (!query) {
      setEmpresas([]);
      setEmpresasFiltradas([]);
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

    localStorage.setItem("ultimaSeleccion", selectedValue);
    localStorage.setItem("ultimaEntidad", tipoEntidad);

    localStorage.removeItem("ultimaBusqueda");
    localStorage.removeItem("ultimosResultados");

    setPrimeraCarga(false);

    if (selectedValue === "todos") {
      await handleMostrarTodos();
      setLetraSeleccionada("");
      setMedioPagoSeleccionado("");
      setBusqueda("");
    } else if (selectedValue === "") {
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

  // Función para filtrar empresas por medio de pago
  const handleFiltrarPorMedioPago = async (medioPago) => {
    try {
      const url = `http://localhost:3001/filtro_mp.php?medio=${encodeURIComponent(medioPago)}&tipo=${tipoEntidad}`;
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
      setError("Error al obtener los datos.");
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
    if (empresaSeleccionada) {
      try {
        const response = await fetch(
          `http://localhost:3001/eliminar_empresa.php?nombre=${empresaSeleccionada.nombre}`,
          { method: 'GET' }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.message === "Empresa eliminada correctamente") {
            setEmpresas(empresas.filter(empresa => empresa.nombre !== empresaSeleccionada.nombre));
            setEmpresasFiltradas(empresasFiltradas.filter(empresa => empresa.nombre !== empresaSeleccionada.nombre));
            setMostrarModalEliminar(false);
          } else {
            alert("Error al eliminar la empresa.");
          }
        }
      } catch (error) {
        console.error("Error al eliminar empresa:", error);
        alert("Hubo un problema al eliminar la empresa.");
      }
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
      setErrorMessage("Datos incompletos: No hay empresas para exportar");

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);

      return;
    }

    const nombreArchivo = tipoEntidad === "empresas" ? "Empresas.xlsx" : "Empresas.xlsx";

    const datosReordenados = empresasFiltradas.map(({ idEmpresas, nombre, ...resto }) => ({
      idEmpresas,
      nombre,
      ...resto,
    }));

    const ws = XLSX.utils.json_to_sheet(datosReordenados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipoEntidad === "empresas" ? "Empresas" : "Empresas");

    XLSX.writeFile(wb, nombreArchivo);

    setErrorMessage("");
  };

  // Función para imprimir todos los comprobantes
  const handleImprimirTodosComprobantes = async () => {
    try {
      const response = await fetch("http://localhost:3001/listar_empresas.php");
      const result = await response.json();

      if (!result.success || !Array.isArray(result.empresas) || result.empresas.length === 0) {
        alert("No se encontraron empresas.");
        return;
      }

      const empresas = result.empresas;

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
                    margin: 5mm 0;
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
                    padding-left: 10mm;
                    padding-top: 13mm;
                }
                .talon-cobrador {
                    width: 60mm;
                    padding-left: 13mm;
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

      empresas.forEach((empresa) => {
        const { nombre, domicilio, numero, categoria, precioCategoria, cobrador } = empresa;
        const mesesPagados = "Marzo";
        const totalPagar = precioCategoria;

        comprobantesHTML += `
          <div class="contenedor">
              <div class="comprobante">
                  <div class="talon-empresa">
                      <p><strong>Empresa:</strong> ${nombre}</p>
                      <p><strong>Domicilio:</strong> ${domicilio} ${numero}</p>
                      <p><strong>Categoría / Monto:</strong> ${categoria} / $${totalPagar}</p>
                      <p><strong>Período:</strong> ${mesesPagados}</p>
                      <p><strong>Cobrador:</strong> ${cobrador}</p>
                      <p>Por consultas comunicarse al 03564-15205778</p>
                  </div>
                  <div class="talon-cobrador">
                      <p><strong>Nombre:</strong> ${nombre}</p>
                      <p><strong>Categoría / Monto:</strong> ${categoria} / $${totalPagar}</p>
                      <p><strong>Período:</strong> ${mesesPagados}</p>
                      <p><strong>Cobrador:</strong> ${cobrador}</p>
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
      alert("Ocurrió un error al obtener los datos de las empresas.");
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
              <div className="column-header header-dom">Domicilio</div>
              <div className="column-header header-obs">Observaciones</div>
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
                        <div className="column column-iva">{empresa.cond_iva}</div>
                        <div className="column column-dom">{empresa.domicilio} {empresa.numero || ""}</div>
                        <div className="column column-obs">{empresa.observacion}</div>
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

        <div className="buttons-container-empresas">
          <span className="empresas-totales">
            Cant empresas: {empresasFiltradas.length}
          </span>

          <div className="buttons-container">
            <button className="empresa-button" onClick={handleAgregarEmpresa}>
              <FontAwesomeIcon icon={faPlus} className="empresa-icon-button" />
              Agregar Empresa
            </button>

            <button className="empresa-button btn-export" onClick={exportarAExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="empresa-icon-button" />
              Exportar a Excel
            </button>

            <button className="empresa-button-back" onClick={handleVolverAtras}>
              <FontAwesomeIcon icon={faArrowLeft} className="empresa-icon-button" />
              Volver Atrás
            </button>
            <button className="empresa-button btn-print" onClick={handleImprimirTodosComprobantes}>
              <FontAwesomeIcon icon={faPrint} className="empresa-icon-button" />
              Imprimir Comprobante
            </button>
          </div>
        </div>
      </div>

      {mostrarModalEliminar && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="modal-title">¿Deseas eliminar esta empresa?</h3>
            <p className="modal-text">{`${empresaSeleccionada.nombre}`}</p>

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
        <ModalPagos
          nombre={empresaSeleccionada.nombre}
          cerrarModal={cerrarModal}
        />
      )}
    </div>
  );
};

export default GestionarEmpresas;