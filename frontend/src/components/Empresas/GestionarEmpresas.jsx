import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faArrowLeft,
  faEdit,
  faTrash,
  faTimes,
  faFilter,
  faChevronDown,
  faMagnifyingGlass,
  faInfoCircle,
  faUserMinus,
  faBuilding,
  faFileExcel,
} from "@fortawesome/free-solid-svg-icons";
import "./GestionarEmpresas.css";
import ModalEliminarEmpresa from "./modales_emp/ModalEliminarEmpresa";
import ModalInfoEmpresa from "./modales_emp/ModalInfoEmpresa";
import ModalBajaEmpresa from "./modales_emp/ModalBajaEmpresa";
import BASE_URL from "../../config/config";
import Toast from "../global/Toast";

// Hook: click fuera
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
};

const getEmpresaId = (e) =>
  e?.id ?? e?.idEmp ?? e?.id_empresa ?? e?.idEmpresa ?? null;

const GestionarEmpresas = () => {
  const navigate = useNavigate();

  // Data base
  const [empresas, setEmpresas] = useState([]);
  const [mediosDePago, setMediosDePago] = useState([]);

  // UI / estado
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [empresaABaja, setEmpresaABaja] = useState(null);
  const [infoEmpresa, setInfoEmpresa] = useState(null);

  // Errores, carga y toasts
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarToast, setMostrarToast] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");
  const [toastTipo, setToastTipo] = useState("exito");

  // Filtros locales
  const [busqueda, setBusqueda] = useState("");
  const [empresasFiltradas, setEmpresasFiltradas] = useState([]);
  const [mostrarMenuFiltros, setMostrarMenuFiltros] = useState(false);
  const [mostrarSubmenuAlfabetico, setMostrarSubmenuAlfabetico] = useState(false);
  const [mostrarSubmenuTransferencia, setMostrarSubmenuTransferencia] =
    useState(false);
  const [animacionCascada, setAnimacionCascada] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [actualizar, setActualizar] = useState(false);

  const [filtrosActivos, setFiltrosActivos] = useState({
    letras: [],
    mediosPago: [],
    todos: false,
    hasFilters: false,
  });

  // modales
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [mostrarModalBaja, setMostrarModalBaja] = useState(false);

  // otros
  const [mesesPagados, setMesesPagados] = useState([]);
  const filtrosRef = useRef(null);
  useClickOutside(filtrosRef, () => {
    if (mostrarMenuFiltros) {
      setMostrarMenuFiltros(false);
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  });

  // Util pago
  const getEstadoPago = (mesesPagadosStr, fechaUnionStr) => {
    if (!fechaUnionStr) return "rojo";
    const mesesPagadosArr =
      mesesPagadosStr?.split(",").map((m) => m.trim().toUpperCase()) || [];
    const MESES_ANIO = [
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ];
    const fechaUnion = new Date(
      fechaUnionStr.includes("T")
        ? fechaUnionStr
        : `${fechaUnionStr}T00:00:00-03:00`
    );
    const fechaHoy = new Date();
    const añoUnion = fechaUnion.getFullYear();
    const mesUnion = fechaUnion.getMonth();
    const añoHoy = fechaHoy.getFullYear();
    const mesHoy = fechaHoy.getMonth();

    const mesesEsperados = [];
    for (let año = añoUnion; año <= añoHoy; año++) {
      const desde = año === añoUnion ? mesUnion : 0;
      const hasta = año === añoHoy ? mesHoy : 11;
      for (let mes = desde; mes <= hasta; mes++) {
        mesesEsperados.push(MESES_ANIO[mes]);
      }
    }
    const deuda = mesesEsperados.filter((mes) => !mesesPagadosArr.includes(mes)).length;
    if (deuda === 0) return "verde";
    if (deuda <= 2) return "amarillo";
    return "rojo";
  };

  // Cargar filtros guardados
  useEffect(() => {
    const savedFilters = localStorage.getItem("empresasFilters");
    const savedSearch = localStorage.getItem("empresasSearchTerm");
    if (savedFilters) setFiltrosActivos(JSON.parse(savedFilters));
    if (savedSearch) setBusqueda(savedSearch);
  }, []);

  // Toast post-acción
  useEffect(() => {
    if (!primeraCarga && actualizar) {
      setToastMensaje("Operación realizada correctamente");
      setToastTipo("exito");
      setMostrarToast(true);
    }
  }, [actualizar, primeraCarga]);

  // Carga inicial: **solo** traemos datos completos una vez (empresas + medios). Todo lo demás se filtra local.
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        const [mediosResponse, empresasResponse] = await Promise.all([
          fetch(`${BASE_URL}/api.php?action=obtener_datos_empresas`),
          fetch(`${BASE_URL}/api.php?action=todos_empresas&tipo=empresas`),
        ]);

        const mediosData = await mediosResponse.json();
        const empresasData = await empresasResponse.json();

        if (Array.isArray(mediosData.mediosPago)) {
          setMediosDePago(mediosData.mediosPago);
        }

        const lista = Array.isArray(empresasData.empresas)
          ? empresasData.empresas
          : [];
        setEmpresas(lista);

        // Restaurar filtros/búsqueda, pero usando **solo** filtrado local
        const savedFilters = localStorage.getItem("empresasFilters");
        const savedSearch = localStorage.getItem("empresasSearchTerm");

        let base = [...lista];

        if (savedFilters) {
          const parsed = JSON.parse(savedFilters);
          setFiltrosActivos(parsed);
          if (parsed.letras.length > 0) {
            base = base.filter((empresa) =>
              parsed.letras.some((letra) =>
                (empresa.razon_social || "")
                  .toUpperCase()
                  .startsWith(letra)
              )
            );
          }
          if (parsed.mediosPago.length > 0) {
            base = base.filter((empresa) =>
              parsed.mediosPago.includes(empresa.medio_pago)
            );
          }
        }

        if (savedSearch && savedSearch.trim() !== "") {
          setBusqueda(savedSearch);
          base = base.filter((empresa) =>
            (empresa.razon_social || "")
              .toLowerCase()
              .includes(savedSearch.toLowerCase())
          );
        }

        setEmpresasFiltradas(base);
        setError(null);
        setDatosCargados(true);
      } catch (err) {
        console.error("Error:", err);
        setError("Error al cargar los datos iniciales");
      } finally {
        setCargando(false);
        setPrimeraCarga(false);
      }
    };

    cargarDatosIniciales();
  }, [actualizar]);

  // ======== FILTRADO LOCAL ========

  const aplicarFiltradoLocal = (listaBase, filtros, textoBusqueda) => {
    let resultado = [...listaBase];

    // Filtro por letras
    if (filtros.letras.length > 0) {
      resultado = resultado.filter((empresa) =>
        filtros.letras.some((letra) =>
          (empresa.razon_social || "").toUpperCase().startsWith(letra)
        )
      );
    }
    // Filtro por medios de pago
    if (filtros.mediosPago.length > 0) {
      resultado = resultado.filter((empresa) =>
        filtros.mediosPago.includes(empresa.medio_pago)
      );
    }
    // Búsqueda por texto
    if ((textoBusqueda || "").trim() !== "") {
      const q = textoBusqueda.toLowerCase();
      resultado = resultado.filter((empresa) =>
        (empresa.razon_social || "").toLowerCase().includes(q)
      );
    }
    return resultado;
  };

  // Reaplicar filtros cada vez que cambian
  useEffect(() => {
    if (!datosCargados) return;
    const res = aplicarFiltradoLocal(empresas, filtrosActivos, busqueda);
    setEmpresasFiltradas(res);
  }, [filtrosActivos, empresas, datosCargados, busqueda]);

  const toggleMenuFiltros = () => {
    setMostrarMenuFiltros(!mostrarMenuFiltros);
    if (mostrarMenuFiltros) {
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  };
  const toggleSubmenu = (submenu) => {
    switch (submenu) {
      case "alfabetico":
        setMostrarSubmenuAlfabetico(!mostrarSubmenuAlfabetico);
        setMostrarSubmenuTransferencia(false);
        break;
      case "transferencia":
        setMostrarSubmenuTransferencia(!mostrarSubmenuTransferencia);
        setMostrarSubmenuAlfabetico(false);
        break;
      default:
        break;
    }
  };

  // Buscar (local)
  const handleBusquedaInputChange = (e) => {
    const value = e.target.value;
    setBusqueda(value);
    localStorage.setItem("empresasSearchTerm", value);
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };

  const handleBusqueda = () => {
    // Nada que hacer: ya filtramos por estado; forzamos animación
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };

  const handleClearSearch = () => {
    setBusqueda("");
    localStorage.removeItem("empresasSearchTerm");
    // No limpiamos filtros, solo la búsqueda
    const res = aplicarFiltradoLocal(empresas, filtrosActivos, "");
    setEmpresasFiltradas(res);
  };

  const handleFiltrarPorLetra = (letra) => {
    const newLetras = filtrosActivos.letras.includes(letra)
      ? filtrosActivos.letras.filter((l) => l !== letra)
      : [...filtrosActivos.letras, letra];

    const newFilters = {
      ...filtrosActivos,
      letras: newLetras,
      todos: false,
      hasFilters: newLetras.length > 0 || filtrosActivos.mediosPago.length > 0,
    };

    setFiltrosActivos(newFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(newFilters));
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };

  const handleFiltrarPorMedioPago = (medio) => {
    const newMedios = filtrosActivos.mediosPago.includes(medio)
      ? filtrosActivos.mediosPago.filter((m) => m !== medio)
      : [...filtrosActivos.mediosPago, medio];

    const newFilters = {
      ...filtrosActivos,
      mediosPago: newMedios,
      todos: false,
      hasFilters: newMedios.length > 0 || filtrosActivos.letras.length > 0,
    };

    setFiltrosActivos(newFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(newFilters));
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };

  const eliminarFiltroLetra = (letra) => {
    const newLetras = filtrosActivos.letras.filter((l) => l !== letra);
    const newFilters = {
      ...filtrosActivos,
      letras: newLetras,
      todos: false,
      hasFilters: newLetras.length > 0 || filtrosActivos.mediosPago.length > 0,
    };
    setFiltrosActivos(newFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(newFilters));
  };

  const eliminarFiltroMedioPago = (medio) => {
    const newMedios = filtrosActivos.mediosPago.filter((m) => m !== medio);
    const newFilters = {
      ...filtrosActivos,
      mediosPago: newMedios,
      todos: false,
      hasFilters: newMedios.length > 0 || filtrosActivos.letras.length > 0,
    };
    setFiltrosActivos(newFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(newFilters));
  };

  const limpiarFiltros = () => {
    const reset = { letras: [], mediosPago: [], todos: false, hasFilters: false };
    setFiltrosActivos(reset);
    localStorage.setItem("empresasFilters", JSON.stringify(reset));
    setEmpresasFiltradas(aplicarFiltradoLocal(empresas, reset, busqueda));
  };

  const handleMostrarTodos = () => {
    const allFilters = { letras: [], mediosPago: [], todos: true, hasFilters: false };
    setFiltrosActivos(allFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(allFilters));
    setEmpresasFiltradas(empresas);
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 600);
  };

  // Navegación
  const handleVolverAtras = () => {
    localStorage.removeItem("empresasFilters");
    localStorage.removeItem("empresasSearchTerm");
    navigate("/PaginaPrincipal");
  };
  const handleAgregarEmpresa = () => {
    navigate("/AgregarEmpresa");
    setActualizar((p) => !p);
  };

  // Tabla acciones
  const handleFilaSeleccionada = (index, empresa) => {
    setFilaSeleccionada(filaSeleccionada === index ? null : index);
    setEmpresaSeleccionada(empresa);
  };

  const handleEditarEmpresa = (razonSocial) => {
    navigate(`/editarEmpresa/${razonSocial}`);
    setActualizar((p) => !p);
  };

  const handleConfirmarEliminar = (empresa) => {
    setEmpresaSeleccionada(empresa);
    setMostrarModalEliminar(true);
  };

  const handleEliminarEmpresa = async () => {
    if (!empresaSeleccionada) return;
    try {
      const url = `${BASE_URL}/api.php?action=eliminar_empresa&idEmp=${empresaSeleccionada.idEmp}&razon_social=${encodeURIComponent(
        empresaSeleccionada.razon_social
      )}`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();
      if (data.success) {
        setEmpresas((prev) => prev.filter((e) => e.idEmp !== empresaSeleccionada.idEmp));
        setEmpresasFiltradas((prev) =>
          prev.filter((e) => e.idEmp !== empresaSeleccionada.idEmp)
        );
        setMostrarModalEliminar(false);
        setToastMensaje("Empresa eliminada correctamente");
        setToastTipo("exito");
        setMostrarToast(true);
      } else {
        setToastMensaje(data.message || "Error al eliminar la empresa.");
        setToastTipo("error");
        setMostrarToast(true);
      }
    } catch (error) {
      console.error("Error al eliminar empresa:", error);
      setToastMensaje("Hubo un problema al eliminar la empresa.");
      setToastTipo("error");
      setMostrarToast(true);
    }
  };

  // ====== BAJA EMPRESA ======
  const handleConfirmarBajaEmpresa = (empresa) => {
    setEmpresaABaja(empresa);
    setMostrarModalBaja(true);
  };

  const handleConfirmarBajaEmpresaSubmit = async (empresa, motivo) => {
    const id = getEmpresaId(empresa);
    const m = (motivo || "").trim();
    if (!id || !m) {
      setToastMensaje("Motivo requerido para dar de baja.");
      setToastTipo("error");
      setMostrarToast(true);
      return;
    }
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=estado_empresa&op=dar_baja`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_empresa: id, motivo: m }),
        }
      );
      const result = await response.json();
      if (response.ok && (result?.success || result?.exito)) {
        setEmpresas((prev) => prev.filter((e) => getEmpresaId(e) !== id));
        setEmpresasFiltradas((prev) => prev.filter((e) => getEmpresaId(e) !== id));
        setMostrarModalBaja(false);
        setEmpresaABaja(null);
        setToastMensaje(result?.mensaje || "Empresa dada de baja");
        setToastTipo("exito");
        setMostrarToast(true);
      } else {
        setToastMensaje(result?.mensaje || "No se pudo dar de baja");
        setToastTipo("error");
        setMostrarToast(true);
      }
    } catch (e) {
      setToastMensaje("Problema al dar de baja");
      setToastTipo("error");
      setMostrarToast(true);
    }
  };

  const handleMostrarInfoEmpresa = (empresa) => {
    setCargando(true);
    try {
      const mesesP = empresa.meses_pagados
        ? empresa.meses_pagados.split(",").map((m) => m.trim().toUpperCase())
        : [];
      setInfoEmpresa(empresa);
      setMesesPagados(mesesP);
      setMostrarModalInfo(true);
    } catch (error) {
      console.error("Error al procesar información:", error);
      setErrorMessage(`Error: ${error.message}`);
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setCargando(false);
    }
  };

  // Exportar Excel (solo visibles)
  const exportarAExcel = () => {
    const visibles = empresasFiltradas;
    if (!visibles || visibles.length === 0) {
      setToastMensaje("No hay datos para exportar");
      setToastTipo("error");
      setMostrarToast(true);
      return;
    }
    const validas = visibles.filter(
      (emp) =>
        emp &&
        emp.razon_social &&
        emp.cuit &&
        emp.descripcion_iva &&
        emp.domicilio_2 &&
        emp.medio_pago
    );
    if (validas.length === 0) {
      setToastMensaje("No hay datos válidos para exportar a Excel");
      setToastTipo("error");
      setMostrarToast(true);
      return;
    }
    const nombreArchivo = "Empresas.xlsx";
    const datosReordenados = validas.map(({ idEmpresas, nombre, ...resto }) => resto);
    const ws = XLSX.utils.json_to_sheet(datosReordenados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empresas");
    XLSX.writeFile(wb, nombreArchivo);

    setToastMensaje("Exportación a Excel completada");
    setToastTipo("exito");
    setMostrarToast(true);
  };

  // UI helpers
  const aplicarFiltroAlfabetico = (letra) => {
    handleFiltrarPorLetra(letra);
    setMostrarSubmenuAlfabetico(false);
  };
  const aplicarFiltroTransferencia = (medio) => {
    handleFiltrarPorMedioPago(medio);
    setMostrarSubmenuTransferencia(false);
  };

  const cantidadVisibles =
    (filtrosActivos.todos ||
      filtrosActivos.letras.length > 0 ||
      filtrosActivos.mediosPago.length > 0 ||
      busqueda.trim() !== "")
      ? empresasFiltradas.length
      : 0;

  return (
    <div className="empresa-container">
      <div className="empresa-box">
        <div className="front-row-emp">
          <span className="empresa-title">Gestionar Empresas</span>

          {/* Búsqueda local */}
          <div className="search-input-container">
            <input
              id="search"
              type="text"
              placeholder="Buscar por nombre"
              className="search-input"
              value={busqueda}
              onChange={handleBusquedaInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleBusqueda()}
            />
            {busqueda && (
              <FontAwesomeIcon
                icon={faTimes}
                className="clear-search-icon"
                onClick={handleClearSearch}
                title="Limpiar búsqueda"
              />
            )}
            <button className="search-button" onClick={handleBusqueda} title="Buscar">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
            </button>
          </div>

          {/* Filtros (front-only) */}
          <div className="filtros-container" ref={filtrosRef}>
            <button className="filtros-button" onClick={toggleMenuFiltros}>
              <FontAwesomeIcon icon={faFilter} className="icon-button" />
              <span>Aplicar Filtros</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`chevron-icon ${mostrarMenuFiltros ? "rotate" : ""}`}
              />
            </button>

            {mostrarMenuFiltros && (
              <div className="filtros-menu">
                <div
                  className="filtros-menu-item"
                  onClick={() => toggleSubmenu("alfabetico")}
                >
                  <span>Filtrar de la A a la Z</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`chevron-icon ${
                      mostrarSubmenuAlfabetico ? "rotate" : ""
                    }`}
                  />
                </div>

                {mostrarSubmenuAlfabetico && (
                  <div className="filtros-submenu">
                    <div className="alfabeto-filtros">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letra) => (
                        <button
                          key={letra}
                          className={`letra-filtro ${
                            filtrosActivos.letras.includes(letra) ? "active" : ""
                          }`}
                          onClick={() => aplicarFiltroAlfabetico(letra)}
                          title={`Filtrar por ${letra}`}
                        >
                          {letra}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className="filtros-menu-item"
                  onClick={() => toggleSubmenu("transferencia")}
                >
                  <span>Medios de Pago</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`chevron-icon ${
                      mostrarSubmenuTransferencia ? "rotate" : ""
                    }`}
                  />
                </div>

                {mostrarSubmenuTransferencia && (
                  <div className="filtros-submenu">
                    {mediosDePago.map((medio) => {
                      const label = medio.Medio_Pago || String(medio);
                      return (
                        <div
                          key={label}
                          className={`filtros-submenu-item ${
                            filtrosActivos.mediosPago.includes(label) ? "active" : ""
                          }`}
                          onClick={() => aplicarFiltroTransferencia(label)}
                          title={`Filtrar por ${label}`}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  className="filtros-menu-item mostrar-todas"
                  onClick={() => {
                    handleMostrarTodos();
                    setMostrarMenuFiltros(false);
                  }}
                >
                  <span>Mostrar Todas</span>
                </div>
              </div>
            )}
          </div>

          <div className="front-row">{error && <p className="error">{error}</p>}</div>
        </div>

        {/* FILTROS ACTIVOS */}
        <div
          className={`filtros-activos-container ${
            filtrosActivos.letras.length > 0 || filtrosActivos.mediosPago.length > 0
              ? "show"
              : ""
          }`}
        >
          {(filtrosActivos.letras.length > 0 ||
            filtrosActivos.mediosPago.length > 0) && (
            <div className="filtros-activos">
              <div className="filtros-activos-header">
                <span>Filtros aplicados:</span>
              </div>

              <button className="limpiar-filtros-btn" onClick={limpiarFiltros}>
                Limpiar todos
              </button>

              <div className="filtros-activos-chips">
                {filtrosActivos.letras.map((letra, index) => (
                  <div key={`letra-${index}`} className="filtro-chip">
                    <span>Letra: {letra}</span>
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="filtro-chip-close"
                      onClick={() => eliminarFiltroLetra(letra)}
                    />
                  </div>
                ))}

                {filtrosActivos.mediosPago.map((medio, index) => (
                  <div key={`medio-${index}`} className="filtro-chip">
                    <span>Medio: {medio}</span>
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="filtro-chip-close"
                      onClick={() => eliminarFiltroMedioPago(medio)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {errorMessage && <div className="error-message-emp">{errorMessage}</div>}

        {/* TABLA */}
        <div className="empresas-list">
          <div className="contenedor-list-items">
            <div className="contador-container">
              <span className="socios-totales">
                Cant empresas: {cantidadVisibles}
                <FontAwesomeIcon icon={faBuilding} className="icono-empresa" />
              </span>
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

          <div className="box-table">
            <div className="header">
              <div className="column-header header-razon">Razón Social</div>
              <div className="column-header header-cuit">CUIT</div>
              <div className="column-header header-iva">Cond. IVA</div>
              <div className="column-header header-dom">Domicilio cobro</div>
              <div className="column-header header-obs">Observaciones</div>
              <div className="column-header header-medio">Medio de Pago</div>
              <div className="column-header icons-column">Acciones</div>
            </div>

            <div className="body">
              {cargando ? (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : !datosCargados ? (
                <div className="no-data-message">
                  <div className="message-content">
                    <p>Cargando datos iniciales...</p>
                  </div>
                </div>
              ) : (filtrosActivos.todos ||
                  filtrosActivos.letras.length > 0 ||
                  filtrosActivos.mediosPago.length > 0 ||
                  busqueda.trim() !== "") &&
                empresasFiltradas.length > 0 ? (
                <div
                  className={`scrollableE ${animacionCascada ? "cascade-animation" : ""}`}
                >
                  {empresasFiltradas.map((empresa, index) => {
                    const estadoPago = getEstadoPago(
                      empresa.meses_pagados,
                      empresa.Fechaunion
                    );
                    const rowClass =
                      filaSeleccionada === index
                        ? `selected-row ${estadoPago}`
                        : index % 2 === 0
                        ? `even-row ${estadoPago}`
                        : `odd-row ${estadoPago}`;

                    return (
                      <div
                        key={`${empresa.idEmp || empresa.cuit || index}`}
                        className={`row ${rowClass}`}
                        onClick={() => handleFilaSeleccionada(index, empresa)}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="column column-razon">
                          {empresa.razon_social}
                        </div>
                        <div className="column column-cuit">{empresa.cuit}</div>
                        <div className="column column-iva">
                          {empresa.descripcion_iva}
                        </div>
                        <div className="column column-dom">
                          {empresa.domicilio_2}
                        </div>
                        <div className="column column-obs">
                          {empresa.observacion}
                        </div>
                        <div className="column column-medio">
                          {empresa.medio_pago}
                        </div>
                        <div className="column icons-column">
                          {filaSeleccionada === index && (
                            <div className="icons-container">
                              <button
                                className="icon btn-info"
                                title="Ver información"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMostrarInfoEmpresa(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faInfoCircle} />
                              </button>

                              <button
                                className="icon btn-edit"
                                title="Editar empresa"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditarEmpresa(empresa.razon_social);
                                }}
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>

                              <button
                                className="icon btn-delete"
                                title="Eliminar empresa"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarEliminar(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>

                              {/* Dar de baja (estética mejorada) */}
                              <button
                                className="icon btn-baja"
                                title="Dar de baja"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarBajaEmpresa(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faUserMinus} />
                                <span className="btn-baja-text">Baja</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-data-message">
                  <div className="message-content">
                    <p>Por favor aplicá búsqueda o filtros para ver las empresas</p>
                    <button className="btn-show-all" onClick={handleMostrarTodos}>
                      Mostrar todas las empresas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTONERA INFERIOR */}
        <div className="down-container">
          <button
            className="socio-button hover-effect volver-atras"
            onClick={handleVolverAtras}
            id="Backnow"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="socio-icon-button" />
            <p>Volver Atrás</p>
          </button>

          <div className="botones-container">
            <button className="socio-button hover-effect" onClick={handleAgregarEmpresa}>
              <FontAwesomeIcon icon={faPlus} className="socio-icon-button" />
              <FontAwesomeIcon
                icon={faBuilding}
                className="icono-empresa icono-celular-empresa"
              />
              <p>Agregar Empresa</p>
            </button>

            <button className="socio-button hover-effect" onClick={exportarAExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="socio-icon-button" />
              <p>Exportar a Excel</p>
            </button>

            <button
              className="socio-button hover-effect btn-baja-nav"
              onClick={() => navigate("/empresas_baja")}
              title="Ir a empresas dadas de baja"
            >
              <FontAwesomeIcon icon={faUserMinus} className="socio-icon-button" />
              <p>Dados de Baja</p>
            </button>
          </div>
        </div>
      </div>

      {mostrarModalEliminar && (
        <ModalEliminarEmpresa
          empresaSeleccionada={empresaSeleccionada}
          onCancelar={() => setMostrarModalEliminar(false)}
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

      {mostrarModalBaja && empresaABaja && (
        <ModalBajaEmpresa
          empresa={empresaABaja}
          onCancelar={() => setMostrarModalBaja(false)}
          onConfirmar={handleConfirmarBajaEmpresaSubmit}
        />
      )}

      {mostrarToast && (
        <Toast
          tipo={toastTipo}
          mensaje={toastMensaje}
          onClose={() => setMostrarToast(false)}
          duracion={3000}
        />
      )}
    </div>
  );
};

export default GestionarEmpresas;
