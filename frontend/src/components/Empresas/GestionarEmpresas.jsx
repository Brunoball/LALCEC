import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from "react";
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
    document.addEventListener("mousedown", handleClickOutside, { passive: true });
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
};

// Respeta prefers-reduced-motion
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
};

const getEmpresaId = (e) =>
  e?.id ?? e?.idEmp ?? e?.id_empresa ?? e?.idEmpresa ?? null;

// === Flag para reactivar cascada al volver de editar
const CASCADE_FLAG = "empresas_cascade_on_return";

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
  // deferimos la búsqueda para que el filtrado no “bloquee” al escribir
  const deferredBusqueda = useDeferredValue(busqueda);

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

  const reducedMotion = useReducedMotion();
  const cascadeTimerRef = useRef(null);

  useClickOutside(filtrosRef, () => {
    if (mostrarMenuFiltros) {
      setMostrarMenuFiltros(false);
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  });

  // Util pago
  const getEstadoPago = useCallback((mesesPagadosStr, fechaUnionStr) => {
    if (!fechaUnionStr) return "emp_rojo";
    const mesesPagadosArr =
      mesesPagadosStr?.split(",").map((m) => m.trim().toUpperCase()) || [];
    const MESES_ANIO = [
      "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
      "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
    ];
    const fechaUnion = new Date(
      fechaUnionStr?.includes?.("T")
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
    if (deuda === 0) return "emp_verde";
    if (deuda <= 2) return "emp_amarillo";
    return "emp_rojo";
  }, []);

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

  // Carga inicial (sin bloquear UI al máximo)
  useEffect(() => {
    let cancelled = false;
    const cargarDatosIniciales = async () => {
      try {
        const [mediosResponse, empresasResponse] = await Promise.all([
          fetch(`${BASE_URL}/api.php?action=obtener_datos_empresas`, { cache: "no-store" }),
          fetch(`${BASE_URL}/api.php?action=todos_empresas&tipo=empresas&_=${Date.now()}`, { cache: "no-store" }),
        ]);

        if (!mediosResponse.ok || !empresasResponse.ok) {
          throw new Error("No se pudo obtener datos");
        }

        const [mediosData, empresasData] = await Promise.all([
          mediosResponse.json(),
          empresasResponse.json(),
        ]);

        if (cancelled) return;

        if (Array.isArray(mediosData.mediosPago)) {
          setMediosDePago(mediosData.mediosPago);
        }

        const lista = Array.isArray(empresasData.empresas)
          ? empresasData.empresas
          : [];
        setEmpresas(lista);
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

    const id = window.requestIdleCallback
      ? window.requestIdleCallback(cargarDatosIniciales, { timeout: 500 })
      : setTimeout(cargarDatosIniciales, 0);

    return () => {
      cancelled = true;
      if (typeof id === "number") clearTimeout(id);
      else window.cancelIdleCallback?.(id);
    };
  }, [actualizar]);

  // ======== FILTRADO LOCAL (Memo + deferred) ========
  const empresasFiltradas = useMemo(() => {
    if (!datosCargados) return [];
    const filtros = filtrosActivos;
    const textoBusqueda = (deferredBusqueda || "").trim().toLowerCase();
    let resultado = empresas;

    if (filtros.letras.length > 0) {
      const setL = new Set(filtros.letras.map((l) => l.toUpperCase()));
      resultado = resultado.filter((empresa) =>
        setL.has((empresa.razon_social || "").charAt(0).toUpperCase())
      );
    }
    if (filtros.mediosPago.length > 0) {
      const setM = new Set(filtros.mediosPago);
      resultado = resultado.filter((empresa) => setM.has(empresa.medio_pago));
    }
    if (textoBusqueda !== "") {
      resultado = resultado.filter((empresa) =>
        (empresa.razon_social || "").toLowerCase().includes(textoBusqueda)
      );
    }
    if (!filtros.todos && filtros.letras.length === 0 && filtros.mediosPago.length === 0 && textoBusqueda === "") {
      return [];
    }
    return resultado;
  }, [empresas, filtrosActivos, deferredBusqueda, datosCargados]);

  // Disparar cascada cuando cambia el conjunto visible
  useEffect(() => {
    if (reducedMotion) return;
    if (!datosCargados) return;
    if (empresasFiltradas.length === 0) return;

    if (cascadeTimerRef.current) {
      clearTimeout(cascadeTimerRef.current);
      cascadeTimerRef.current = null;
    }
    setAnimacionCascada(true);
    cascadeTimerRef.current = setTimeout(() => {
      setAnimacionCascada(false);
      cascadeTimerRef.current = null;
    }, 600);
  }, [empresasFiltradas, datosCargados, reducedMotion]);

  // Al volver desde Editar
  useEffect(() => {
    if (!datosCargados) return;
    if (sessionStorage.getItem(CASCADE_FLAG) === "1") {
      setAnimacionCascada(true);
      setTimeout(() => setAnimacionCascada(false), 600);
      sessionStorage.removeItem(CASCADE_FLAG);
    }
  }, [datosCargados]);

  const toggleMenuFiltros = useCallback(() => {
    setMostrarMenuFiltros((v) => !v);
    if (mostrarMenuFiltros) {
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  }, [mostrarMenuFiltros]);

  const toggleSubmenu = useCallback((submenu) => {
    if (submenu === "alfabetico") {
      setMostrarSubmenuAlfabetico((v) => !v);
      setMostrarSubmenuTransferencia(false);
    } else if (submenu === "transferencia") {
      setMostrarSubmenuTransferencia((v) => !v);
      setMostrarSubmenuAlfabetico(false);
    }
  }, []);

  // Buscar (local)
  const handleBusquedaInputChange = useCallback((e) => {
    const value = e.target.value;
    setBusqueda(value);
    // persistencia liviana
    window.clearTimeout(handleBusquedaInputChange._t);
    handleBusquedaInputChange._t = window.setTimeout(() => {
      localStorage.setItem("empresasSearchTerm", value);
    }, 120);
  }, []);
  const handleBusqueda = useCallback(() => {
    if (reducedMotion) return;
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 400);
  }, [reducedMotion]);

  const handleClearSearch = useCallback(() => {
    setBusqueda("");
    localStorage.removeItem("empresasSearchTerm");
  }, []);

  const handleFiltrarPorLetra = useCallback((letra) => {
    setFiltrosActivos((prev) => {
      const exists = prev.letras.includes(letra);
      const newLetras = exists ? prev.letras.filter((l) => l !== letra) : [...prev.letras, letra];
      const next = {
        ...prev,
        letras: newLetras,
        todos: false,
        hasFilters: newLetras.length > 0 || prev.mediosPago.length > 0,
      };
      localStorage.setItem("empresasFilters", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleFiltrarPorMedioPago = useCallback((medio) => {
    setFiltrosActivos((prev) => {
      const exists = prev.mediosPago.includes(medio);
      const newMedios = exists ? prev.mediosPago.filter((m) => m !== medio) : [...prev.mediosPago, medio];
      const next = {
        ...prev,
        mediosPago: newMedios,
        todos: false,
        hasFilters: newMedios.length > 0 || prev.letras.length > 0,
      };
      localStorage.setItem("empresasFilters", JSON.stringify(next));
      return next;
    });
  }, []);

  const eliminarFiltroLetra = useCallback((letra) => {
    setFiltrosActivos((prev) => {
      const newLetras = prev.letras.filter((l) => l !== letra);
      const next = {
        ...prev,
        letras: newLetras,
        todos: false,
        hasFilters: newLetras.length > 0 || prev.mediosPago.length > 0,
      };
      localStorage.setItem("empresasFilters", JSON.stringify(next));
      return next;
    });
  }, []);

  const eliminarFiltroMedioPago = useCallback((medio) => {
    setFiltrosActivos((prev) => {
      const newMedios = prev.mediosPago.filter((m) => m !== medio);
      const next = {
        ...prev,
        mediosPago: newMedios,
        todos: false,
        hasFilters: newMedios.length > 0 || prev.letras.length > 0,
      };
      localStorage.setItem("empresasFilters", JSON.stringify(next));
      return next;
    });
  }, []);

  const limpiarFiltros = useCallback(() => {
    const reset = { letras: [], mediosPago: [], todos: false, hasFilters: false };
    setFiltrosActivos(reset);
    localStorage.setItem("empresasFilters", JSON.stringify(reset));
  }, []);

  const handleMostrarTodos = useCallback(() => {
    const allFilters = { letras: [], mediosPago: [], todos: true, hasFilters: false };
    setFiltrosActivos(allFilters);
    localStorage.setItem("empresasFilters", JSON.stringify(allFilters));
    if (!reducedMotion) {
      setAnimacionCascada(true);
      setTimeout(() => setAnimacionCascada(false), 600);
    }
  }, [reducedMotion]);

  // Navegación
  const handleVolverAtras = useCallback(() => {
    localStorage.removeItem("empresasFilters");
    localStorage.removeItem("empresasSearchTerm");
    navigate("/PaginaPrincipal");
  }, [navigate]);

  const handleAgregarEmpresa = useCallback(() => {
    navigate("/AgregarEmpresa");
    setActualizar((p) => !p);
  }, [navigate]);

  // setear flag antes de ir a Editar
  const handleEditarEmpresa = useCallback((razonSocial) => {
    sessionStorage.setItem(CASCADE_FLAG, "1");
    navigate(`/editarEmpresa/${razonSocial}`);
    setActualizar((p) => !p);
  }, [navigate]);

  // Tabla / tarjetas acciones
  const handleFilaSeleccionada = useCallback((index, empresa) => {
    setFilaSeleccionada((prev) => (prev === index ? null : index));
    setEmpresaSeleccionada(empresa);
  }, []);

  const handleConfirmarEliminar = useCallback((empresa) => {
    setEmpresaSeleccionada(empresa);
    setMostrarModalEliminar(true);
  }, []);

  const handleEliminarEmpresa = useCallback(async () => {
    if (!empresaSeleccionada) return;
    try {
      const idEmp = getEmpresaId(empresaSeleccionada);
      const url = `${BASE_URL}/api.php?action=eliminar_empresa&idEmp=${idEmp}&razon_social=${encodeURIComponent(
        empresaSeleccionada.razon_social
      )}`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();
      if (data?.success) {
        setEmpresas((prev) => prev.filter((e) => getEmpresaId(e) !== idEmp));
        setMostrarModalEliminar(false);
        setToastMensaje("Empresa eliminada correctamente");
        setToastTipo("exito");
        setMostrarToast(true);
      } else {
        setToastMensaje(data?.message || "Error al eliminar la empresa.");
        setToastTipo("error");
        setMostrarToast(true);
      }
    } catch (error) {
      console.error("Error al eliminar empresa:", error);
      setToastMensaje("Hubo un problema al eliminar la empresa.");
      setToastTipo("error");
      setMostrarToast(true);
    }
  }, [empresaSeleccionada]);

  // ====== BAJA EMPRESA ======
  const handleConfirmarBajaEmpresa = useCallback((empresa) => {
    setEmpresaABaja(empresa);
    setMostrarModalBaja(true);
  }, []);

  const handleConfirmarBajaEmpresaSubmit = useCallback(async (empresa, motivo) => {
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
  }, []);

  const handleMostrarInfoEmpresa = useCallback((empresa) => {
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
  }, []);

  // Exportar Excel (solo visibles)
  const exportarAExcel = useCallback(() => {
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
  }, [empresasFiltradas]);

  const aplicarFiltroAlfabetico = useCallback((letra) => {
    handleFiltrarPorLetra(letra);
    setMostrarSubmenuAlfabetico(false);
  }, [handleFiltrarPorLetra]);

  const aplicarFiltroTransferencia = useCallback((medio) => {
    handleFiltrarPorMedioPago(medio);
    setMostrarSubmenuTransferencia(false);
  }, [handleFiltrarPorMedioPago]);

  const cantidadVisibles =
    (filtrosActivos.todos ||
      filtrosActivos.letras.length > 0 ||
      filtrosActivos.mediosPago.length > 0 ||
      (deferredBusqueda || "").trim() !== "")
      ? empresasFiltradas.length
      : 0;

  return (
    <div className="emp_empresa-container">
      <div className="emp_empresa-box">
        {/* HEADER */}
        <div className="emp_front-row-emp">
          <span className="emp_empresa-title">Gestionar Empresas</span>

          {/* Búsqueda */}
          <div className="emp_search-input-container">
            <input
              id="search"
              type="text"
              placeholder="Buscar por nombre"
              className="emp_search-input"
              value={busqueda}
              onChange={handleBusquedaInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleBusqueda()}
              inputMode="search"
            />
            {busqueda && (
              <FontAwesomeIcon
                icon={faTimes}
                className="emp_clear-search-icon"
                onClick={handleClearSearch}
                title="Limpiar búsqueda"
              />
            )}
            <button className="emp_search-button" onClick={handleBusqueda} title="Buscar">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="emp_search-icon" />
            </button>
          </div>

          {/* Filtros */}
          <div className="emp_filtros-container" ref={filtrosRef}>
            <button className="emp_filtros-button" onClick={toggleMenuFiltros}>
              <FontAwesomeIcon icon={faFilter} className="emp_icon-button" />
              <span>Aplicar Filtros</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`emp_chevron-icon ${mostrarMenuFiltros ? "emp_rotate" : ""}`}
              />
            </button>

            {mostrarMenuFiltros && (
              <div className="emp_filtros-menu">
                <div
                  className="emp_filtros-menu-item"
                  onClick={() => toggleSubmenu("alfabetico")}
                >
                  <span>Filtrar de la A a la Z</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`emp_chevron-icon ${
                      mostrarSubmenuAlfabetico ? "emp_rotate" : ""
                    }`}
                  />
                </div>

                {mostrarSubmenuAlfabetico && (
                  <div className="emp_filtros-submenu">
                    <div className="emp_alfabeto-filtros">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letra) => (
                        <button
                          key={letra}
                          className={`emp_letra-filtro ${
                            filtrosActivos.letras.includes(letra) ? "emp_active" : ""
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
                  className="emp_filtros-menu-item"
                  onClick={() => toggleSubmenu("transferencia")}
                >
                  <span>Medios de Pago</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`emp_chevron-icon ${
                      mostrarSubmenuTransferencia ? "emp_rotate" : ""
                    }`}
                  />
                </div>

                {mostrarSubmenuTransferencia && (
                  <div className="emp_filtros-submenu">
                    {mediosDePago.map((medio) => {
                      const label = medio.Medio_Pago || String(medio);
                      return (
                        <div
                          key={label}
                          className={`emp_filtros-submenu-item ${
                            filtrosActivos.mediosPago.includes(label) ? "emp_active" : ""
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
                  className="emp_filtros-menu-item emp_mostrar-todas"
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

          <div className="emp_front-row">{error && <p className="emp_error">{error}</p>}</div>

          {/* Resumen filtros */}
          <div
            className={`emp_filtros-activos-container ${
              filtrosActivos.letras.length > 0 || filtrosActivos.mediosPago.length > 0
                ? "emp_show"
                : ""
            }`}
          >
            {(filtrosActivos.letras.length > 0 ||
              filtrosActivos.mediosPago.length > 0) && (
              <div className="emp_filtros-activos">
                <div className="emp_filtros-activos-header">
                  <span>Filtros aplicados:</span>
                </div>

                <button className="emp_limpiar-filtros-btn" onClick={limpiarFiltros}>
                  Limpiar todos
                </button>

                <div className="emp_filtros-activos-chips">
                  {filtrosActivos.letras.map((letra, index) => (
                    <div key={`letra-${index}`} className="emp_filtro-chip">
                      <span>Letra: {letra}</span>
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="emp_filtro-chip-close"
                        onClick={() => eliminarFiltroLetra(letra)}
                      />
                    </div>
                  ))}

                  {filtrosActivos.mediosPago.map((medio, index) => (
                    <div key={`medio-${index}`} className="emp_filtro-chip">
                      <span>Medio: {medio}</span>
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="emp_filtro-chip-close"
                        onClick={() => eliminarFiltroMedioPago(medio)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {errorMessage && <div className="emp_error-message-emp">{errorMessage}</div>}

        {/* CONTADOR + LEYENDA + LISTADO */}
        <div className="emp_empresas-list">
          <div className="emp_contenedor-list-items">
            <div className="emp_contador-container">
              <span className="emp_socios-totales emp_socios-desktop">
                Cant empresas: {cantidadVisibles}
              </span>
              <span className="emp_socios-totales emp_socios-mobile">
                Emp: {cantidadVisibles}
              </span>
              <FontAwesomeIcon icon={faBuilding} className="emp_icono-empresa" />
            </div>
            <div className="emp_estado-pagos-container">
              <div className="emp_estado-indicador emp_al-dia">
                <div className="emp_indicador-color"></div>
                <span>Al día</span>
              </div>
              <div className="emp_estado-indicador emp_debe-1-2">
                <div className="emp_indicador-color"></div>
                <span>Debe 1-2 meses</span>
              </div>
              {/* FIX: mismo bloque y clase base para “Debe 3+ meses” */}
              <div className="emp_estado-indicador emp_debe-3-mas">
                <div className="emp_indicador-color"></div>
                <span>Debe 3+ meses</span>
              </div>
            </div>
          </div>

          {/* ======= TABLA ======= */}
          <div className="emp_box-table">
            <div className="emp_header">
              <div className="emp_column-header emp_header-razon">Razón Social</div>
              <div className="emp_column-header emp_header-cuit">CUIT</div>
              <div className="emp_column-header emp_header-iva">Cond. IVA</div>
              <div className="emp_column-header emp_header-dom">Domicilio cobro</div>
              <div className="emp_column-header emp_header-obs">Observaciones</div>
              <div className="emp_column-header emp_header-medio">Medio de Pago</div>
              <div className="emp_column-header emp_icons-column">Acciones</div>
            </div>

            <div className="emp_body">
              {cargando ? (
                <div className="emp_loading-spinner-container">
                  <div className="emp_loading-spinner"></div>
                </div>
              ) : !datosCargados ? (
                <div className="emp_no-data-message">
                  <div className="emp_message-content">
                    <p>Cargando datos iniciales...</p>
                  </div>
                </div>
              ) : (filtrosActivos.todos ||
                  filtrosActivos.letras.length > 0 ||
                  filtrosActivos.mediosPago.length > 0 ||
                  (deferredBusqueda || "").trim() !== "") &&
                empresasFiltradas.length > 0 ? (
                <div
                  className={`emp_scrollableE ${animacionCascada ? "emp_cascade-animation" : ""}`}
                >
                  {empresasFiltradas.map((empresa, index) => {
                    const estadoPago = getEstadoPago(
                      empresa.meses_pagados,
                      empresa.Fechaunion
                    );
                    const rowClass =
                      filaSeleccionada === index
                        ? `emp_selected-row ${estadoPago}`
                        : index % 2 === 0
                        ? `emp_even-row ${estadoPago}`
                        : `emp_odd-row ${estadoPago}`;

                    const key = getEmpresaId(empresa) || empresa.cuit || `row-${index}`;

                    return (
                      <div
                        key={key}
                        className={`emp_row ${rowClass}`}
                        onClick={() => handleFilaSeleccionada(index, empresa)}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="emp_column emp_column-razon">
                          {empresa.razon_social}
                        </div>
                        <div className="emp_column emp_column-cuit">{empresa.cuit}</div>
                        <div className="emp_column emp_column-iva">
                          {empresa.descripcion_iva}
                        </div>
                        <div className="emp_column emp_column-dom">
                          {empresa.domicilio_2}
                        </div>
                        <div className="emp_column emp_column-obs">
                          {empresa.observacion}
                        </div>
                        <div className="emp_column emp_column-medio">
                          {empresa.medio_pago}
                        </div>
                        <div className="emp_column emp_icons-column">
                          {filaSeleccionada === index && (
                            <div className="emp_icons-container">
                              <button
                                className="emp_icon emp_btn-info"
                                title="Ver información"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMostrarInfoEmpresa(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faInfoCircle} />
                              </button>

                              <button
                                className="emp_icon emp_btn-edit"
                                title="Editar empresa"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditarEmpresa(empresa.razon_social);
                                }}
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>

                              <button
                                className="emp_icon emp_btn-delete"
                                title="Eliminar empresa"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarEliminar(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>

                              <button
                                className="emp_icon emp_btn-baja"
                                title="Dar de baja"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarBajaEmpresa(empresa);
                                }}
                              >
                                <FontAwesomeIcon icon={faUserMinus} />
                                <span className="emp_btn-baja-text"></span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="emp_no-data-message">
                  <div className="emp_message-content">
                    <p>Por favor aplicá búsqueda o filtros para ver las empresas</p>
                    <button className="emp_btn-show-all" onClick={handleMostrarTodos}>
                      Mostrar todas las empresas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======= TARJETAS (Mobile) ======= */}
          <div className={`emp_cards-wrapper ${animacionCascada ? "emp_cascade-animation" : ""}`}>
            {cargando ? (
              <div className="emp_no-data-message emp_no-data-mobile">
                <div className="emp_message-content">
                  <p>Cargando datos iniciales...</p>
                </div>
              </div>
            ) : !datosCargados ? (
              <div className="emp_no-data-message emp_no-data-mobile">
                <div className="emp_message-content">
                  <p>Cargando datos iniciales...</p>
                </div>
              </div>
            ) : (filtrosActivos.todos ||
                filtrosActivos.letras.length > 0 ||
                filtrosActivos.mediosPago.length > 0 ||
                (deferredBusqueda || "").trim() !== "") &&
              empresasFiltradas.length > 0 ? (
              empresasFiltradas.map((empresa, index) => {
                const estadoPago = getEstadoPago(
                  empresa.meses_pagados,
                  empresa.Fechaunion
                );
                const key = getEmpresaId(empresa) || empresa.cuit || `card-${index}`;
                return (
                  <div
                    className={`emp_card ${estadoPago}`}
                    key={key}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => handleFilaSeleccionada(index, empresa)}
                  >
                    <div className="emp_card-status-strip" />
                    <div className="emp_card-header">
                      <h3 className="emp_card-title">{empresa.razon_social}</h3>
                      <span
                        className={`emp_badge ${
                          estadoPago === "emp_verde"
                            ? "emp_badge-success"
                            : estadoPago === "emp_amarillo"
                            ? "emp_badge-warn"
                            : "emp_badge-danger"
                        }`}
                      >
                        {estadoPago === "emp_verde"
                          ? "Al día"
                          : estadoPago === "emp_amarillo"
                          ? "Debe 1-2"
                          : "Debe 3+"}
                      </span>
                    </div>

                    <div className="emp_card-body">
                      <div className="emp_card-row">
                        <span className="emp_card-label">CUIT</span>
                        <span className="emp_card-value emp_mono">{empresa.cuit}</span>
                      </div>
                      <div className="emp_card-row">
                        <span className="emp_card-label">Cond. IVA</span>
                        <span className="emp_card-value">{empresa.descripcion_iva}</span>
                      </div>
                      <div className="emp_card-row">
                        <span className="emp_card-label">Domicilio cobro</span>
                        <span className="emp_card-value">{empresa.domicilio_2}</span>
                      </div>
                      {empresa.observacion && (
                        <div className="emp_card-row">
                          <span className="emp_card-label">Obs.</span>
                          <span className="emp_card-value">{empresa.observacion}</span>
                        </div>
                      )}
                      <div className="emp_card-row">
                        <span className="emp_card-label">Medio de Pago</span>
                        <span className="emp_card-value">{empresa.medio_pago}</span>
                      </div>
                    </div>

                    <div className="emp_card-actions">
                      <button
                        className="emp_action-btn"
                        title="Información"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMostrarInfoEmpresa(empresa);
                        }}
                      >
                        <FontAwesomeIcon icon={faInfoCircle} />
                      </button>
                      <button
                        className="emp_action-btn"
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditarEmpresa(empresa.razon_social);
                        }}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        className="emp_action-btn"
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmarEliminar(empresa);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      <button
                        className="emp_action-btn emp_action-danger"
                        title="Dar de baja"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmarBajaEmpresa(empresa);
                        }}
                      >
                        <FontAwesomeIcon icon={faUserMinus} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="emp_no-data-message emp_no-data-mobile">
                <div className="emp_message-content">
                  <p>Usá la búsqueda o aplica filtros para ver resultados</p>
                  <button className="emp_btn-show-all" onClick={handleMostrarTodos}>
                    Mostrar todas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTONERA INFERIOR */}
        <div className="emp_down-container">
          <button
            className="emp_socio-button emp_hover-effect emp_volver-atras"
            onClick={handleVolverAtras}
            id="Backnow"
            aria-label="Volver"
            title="Volver"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="emp_socio-icon-button" />
            <p>Volver Atrás</p>
          </button>

          <div className="emp_botones-container">
            <button
              className="emp_socio-button emp_hover-effect"
              onClick={handleAgregarEmpresa}
              aria-label="Agregar"
              title="Agregar empresa"
            >
              <FontAwesomeIcon icon={faPlus} className="emp_socio-icon-button" />
              <FontAwesomeIcon
                icon={faBuilding}
                className="emp_icono-empresa emp_icono-celular-empresa"
              />
              <p>Agregar Empresa</p>
            </button>

            <button
              className="emp_socio-button emp_hover-effect"
              onClick={exportarAExcel}
              aria-label="Exportar"
              title="Exportar a Excel"
            >
              <FontAwesomeIcon icon={faFileExcel} className="emp_socio-icon-button" />
              <p>Exportar a Excel</p>
            </button>

            <button
              className="emp_socio-button emp_hover-effect emp_btn-baja-nav"
              onClick={() => navigate("/empresas_baja")}
              title="Dados de Baja"
              aria-label="Dados de Baja"
            >
              <FontAwesomeIcon icon={faUserMinus} className="emp_socio-icon-button" />
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
