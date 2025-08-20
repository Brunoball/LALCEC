import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useDeferredValue,
  useTransition,
  memo,
} from "react";
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

/* ================================
   Constantes & Utils
================================ */
const MESES_ANIO = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

const CACHE_KEY = "empresas_cache_v2";
const CACHE_TTL_MS = 5 * 60 * 1000;
const CASCADE_FLAG = "empresas_cascade_on_return";
const CHUNK_SIZE = 120;

const nowTs = () => Date.now();
const safeJSON = {
  parse: (v, d = null) => { try { return JSON.parse(v); } catch { return d; } },
  stringify: (v) => { try { return JSON.stringify(v); } catch { return ""; } },
};

// Hook: click fuera
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) callback?.();
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

/* ===== Abreviador genérico SOLO para tarjetas ===== */
const shortMedio = (label = "") => {
  const raw = String(label).trim();
  if (!raw) return "";
  const words = raw.split(/[\s\-_]+/).filter(Boolean);
  if (words.length > 1) {
    const initials = words.map(w => w[0]).join("").slice(0, 6);
    if (initials.length >= 2) return initials.toLowerCase();
  }
  if (raw.length <= 8) return raw.toLowerCase();
  return raw.slice(0, 7).toLowerCase();
};

/* ================================
   Subcomponentes memoizados
================================ */
const Row = memo(function Row({
  empresa,
  index,
  selected,
  onSelect,
  onInfo,
  onEdit,
  onDelete,
  onBaja,
}) {
  const estadoPago = useMemo(() => {
    const mesesPagadosStr = empresa?.meses_pagados;
    const fechaUnionStr = empresa?.Fechaunion;
    if (!fechaUnionStr) return "emp_rojo";

    const arr = mesesPagadosStr
      ? mesesPagadosStr.split(",").map((m) => m.trim().toUpperCase())
      : [];
    const setPagos = new Set(arr);

    const fechaUnion = new Date(
      fechaUnionStr?.includes?.("T")
        ? fechaUnionStr
        : `${fechaUnionStr}T00:00:00-03:00`
    );
    const hoy = new Date();

    const a0 = fechaUnion.getFullYear();
    const m0 = fechaUnion.getMonth();
    const a1 = hoy.getFullYear();
    const m1 = hoy.getMonth();

    let deuda = 0;
    for (let a = a0; a <= a1; a++) {
      const desde = a === a0 ? m0 : 0;
      const hasta = a === a1 ? m1 : 11;
      for (let m = desde; m <= hasta; m++) {
        const mesTxt = MESES_ANIO[m];
        if (!setPagos.has(mesTxt)) deuda++;
      }
    }
    if (deuda === 0) return "emp_verde";
    if (deuda <= 2) return "emp_amarillo";
    return "emp_rojo";
  }, [empresa?.meses_pagados, empresa?.Fechaunion]);

  const rowClass =
    selected
      ? `emp_selected-row ${estadoPago}`
      : index % 2 === 0
      ? `emp_even-row ${estadoPago}`
      : `emp_odd-row ${estadoPago}`;

  const key = getEmpresaId(empresa) || empresa?.cuit || `row-${index}`;

  return (
    <div
      key={key}
      className={`emp_row ${rowClass}`}
      onClick={() => onSelect(index, empresa)}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="emp_column emp_column-razon">{empresa?.razon_social}</div>
      <div className="emp_column emp_column-cuit">{empresa?.cuit}</div>
      <div className="emp_column emp_column-iva">{empresa?.descripcion_iva}</div>
      <div className="emp_column emp_column-dom">{empresa?.domicilio_2}</div>
      <div className="emp_column emp_column-obs">{empresa?.observacion}</div>

      {/* Medio de Pago: SIEMPRE COMPLETO en la tabla (igual web y mobile) */}
      <div className="emp_column emp_column-medio">{empresa?.medio_pago}</div>

      <div className="emp_column emp_icons-column">
        {selected && (
          <div className="emp_icons-container">
            <button
              className="emp_icon emp_btn-info"
              title="Ver información"
              onClick={(e) => { e.stopPropagation(); onInfo(empresa); }}
            >
              <FontAwesomeIcon icon={faInfoCircle} />
            </button>

            <button
              className="emp_icon emp_btn-edit"
              title="Editar empresa"
              onClick={(e) => { e.stopPropagation(); onEdit(empresa?.razon_social); }}
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>

            <button
              className="emp_icon emp_btn-delete"
              title="Eliminar empresa"
              onClick={(e) => { e.stopPropagation(); onDelete(empresa); }}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>

            <button
              className="emp_icon emp_btn-baja"
              title="Dar de baja"
              onClick={(e) => { e.stopPropagation(); onBaja(empresa); }}
            >
              <FontAwesomeIcon icon={faUserMinus} />
              <span className="emp_btn-baja-text"></span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const Card = memo(function Card({
  empresa,
  index,
  onSelect,
  onInfo,
  onEdit,
  onDelete,
  onBaja,
}) {
  const estadoPago = useMemo(() => {
    const mesesPagadosStr = empresa?.meses_pagados;
    const fechaUnionStr = empresa?.Fechaunion;
    if (!fechaUnionStr) return "emp_rojo";

    const arr = mesesPagadosStr
      ? mesesPagadosStr.split(",").map((m) => m.trim().toUpperCase())
      : [];
    const setPagos = new Set(arr);

    const fechaUnion = new Date(
      fechaUnionStr?.includes?.("T")
        ? fechaUnionStr
        : `${fechaUnionStr}T00:00:00-03:00`
    );
    const hoy = new Date();

    const a0 = fechaUnion.getFullYear();
    const m0 = fechaUnion.getMonth();
    const a1 = hoy.getFullYear();
    const m1 = hoy.getMonth();

    let deuda = 0;
    for (let a = a0; a <= a1; a++) {
      const desde = a === a0 ? m0 : 0;
      const hasta = a === a1 ? m1 : 11;
      for (let m = desde; m <= hasta; m++) {
        const mesTxt = MESES_ANIO[m];
        if (!setPagos.has(mesTxt)) deuda++;
      }
    }
    if (deuda === 0) return "emp_verde";
    if (deuda <= 2) return "emp_amarillo";
    return "emp_rojo";
  }, [empresa?.meses_pagados, empresa?.Fechaunion]);

  const key = getEmpresaId(empresa) || empresa?.cuit || `card-${index}`;

  return (
    <div
      className={`emp_card ${estadoPago}`}
      key={key}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onSelect(index, empresa)}
    >
      <div className="emp_card-status-strip" />
      <div className="emp_card-header">
        <h3 className="emp_card-title">{empresa?.razon_social}</h3>
        <span
          className={`emp_badge ${
            estadoPago === "emp_verde"
              ? "emp_badge-success"
              : estadoPago === "emp_amarillo"
              ? "emp_badge-warn"
              : "emp_badge-danger"
          }`}
        >
          {estadoPago === "emp_verde" ? "Al día" : estadoPago === "emp_amarillo" ? "Debe 1-2" : "Debe 3+"}
        </span>
      </div>

      <div className="emp_card-body">
        <div className="emp_card-row">
          <span className="emp_card-label">CUIT</span>
          <span className="emp_card-value emp_mono">{empresa?.cuit}</span>
        </div>
        <div className="emp_card-row">
          <span className="emp_card-label">Cond. IVA</span>
          <span className="emp_card-value">{empresa?.descripcion_iva}</span>
        </div>
        <div className="emp_card-row">
          <span className="emp_card-label">Domicilio cobro</span>
          <span className="emp_card-value">{empresa?.domicilio_2}</span>
        </div>
        {empresa?.observacion && (
          <div className="emp_card-row">
            <span className="emp_card-label">Obs.</span>
            <span className="emp_card-value">{empresa?.observacion}</span>
          </div>
        )}
        <div className="emp_card-row">
          <span className="emp_card-label">Medio de Pago</span>
          {/* En tarjeta: abreviado dinámico */}
          <span className="emp_card-value">{shortMedio(empresa?.medio_pago)}</span>
        </div>
      </div>

      <div className="emp_card-actions">
        <button
          className="emp_action-btn"
          title="Información"
          onClick={(e) => { e.stopPropagation(); onInfo(empresa); }}
        >
          <FontAwesomeIcon icon={faInfoCircle} />
        </button>
        <button
          className="emp_action-btn"
          title="Editar"
          onClick={(e) => { e.stopPropagation(); onEdit(empresa?.razon_social); }}
        >
          <FontAwesomeIcon icon={faEdit} />
        </button>
        <button
          className="emp_action-btn"
          title="Eliminar"
          onClick={(e) => { e.stopPropagation(); onDelete(empresa); }}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
        <button
          className="emp_action-btn emp_action-danger"
          title="Dar de baja"
          onClick={(e) => { e.stopPropagation(); onBaja(empresa); }}
        >
          <FontAwesomeIcon icon={faUserMinus} />
        </button>
      </div>
    </div>
  );
});

/* ================================
   Componente principal
================================ */
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

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const deferredBusqueda = useDeferredValue(busqueda);

  const [mostrarMenuFiltros, setMostrarMenuFiltros] = useState(false);
  const [mostrarSubmenuAlfabetico, setMostrarSubmenuAlfabetico] = useState(false);
  const [mostrarSubmenuTransferencia, setMostrarSubmenuTransferencia] = useState(false);

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
  const abortRef = useRef(null);
  const [, startTransition] = useTransition();

  // Render incremental
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);

  const bumpVisibleGradually = useCallback((target) => {
    setVisibleCount((prev) => (prev >= target ? prev : Math.min(prev + CHUNK_SIZE, target)));
  }, []);

  useEffect(() => {
    if (!datosCargados) return;
    const total = empresas.length;
    if (total === 0) return;
    let rafId = 0;
    const step = () => {
      setVisibleCount((prev) => (prev >= total ? prev : Math.min(prev + CHUNK_SIZE, total)));
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [datosCargados, empresas.length]);

  useClickOutside(filtrosRef, () => {
    if (mostrarMenuFiltros) {
      setMostrarMenuFiltros(false);
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  });

  // Cargar filtros guardados
  useEffect(() => {
    const savedFilters = localStorage.getItem("empresasFilters");
    const savedSearch = localStorage.getItem("empresasSearchTerm");
    if (savedFilters) setFiltrosActivos(safeJSON.parse(savedFilters, filtrosActivos));
    if (savedSearch) setBusqueda(savedSearch);
  }, []); // eslint-disable-line

  // Toast post-acción
  useEffect(() => {
    if (!primeraCarga && actualizar) {
      setToastMensaje("Operación realizada correctamente");
      setToastTipo("exito");
      setMostrarToast(true);
    }
  }, [actualizar, primeraCarga]);

  // Carga inicial con caché + AbortController
  useEffect(() => {
    let cancelled = false;

    const fromCache = safeJSON.parse(sessionStorage.getItem(CACHE_KEY));
    const isFresh =
      fromCache &&
      typeof fromCache === "object" &&
      nowTs() - (fromCache.timestamp || 0) < CACHE_TTL_MS;

    const loadFromNetwork = async () => {
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch {}
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const [mediosResponse, empresasResponse] = await Promise.all([
          fetch(`${BASE_URL}/api.php?action=obtener_datos_empresas`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(
            `${BASE_URL}/api.php?action=todos_empresas&tipo=empresas&_=${Date.now()}`,
            { cache: "no-store", signal: controller.signal }
          ),
        ]);

        if (!mediosResponse.ok || !empresasResponse.ok) {
          throw new Error("No se pudo obtener datos");
        }

        const [mediosData, empresasData] = await Promise.all([
          mediosResponse.json(),
          empresasResponse.json(),
        ]);

        if (cancelled) return;

        const mp = Array.isArray(mediosData?.mediosPago) ? mediosData.mediosPago : [];
        const lista = Array.isArray(empresasData?.empresas) ? empresasData.empresas : [];

        startTransition(() => {
          setMediosDePago(mp);
          setEmpresas(lista);
          setError(null);
          setDatosCargados(true);
          setVisibleCount(CHUNK_SIZE);
        });

        sessionStorage.setItem(
          CACHE_KEY,
          safeJSON.stringify({
            timestamp: nowTs(),
            version: 1,
            mediosDePago: mp,
            empresas: lista,
          })
        );
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Error:", err);
        setError("Error al cargar los datos iniciales");
      } finally {
        if (!cancelled) {
          setCargando(false);
          setPrimeraCarga(false);
        }
      }
    };

    if (isFresh && !actualizar) {
      const mp = fromCache.mediosDePago || [];
      const lista = fromCache.empresas || [];
      startTransition(() => {
        setMediosDePago(mp);
        setEmpresas(lista);
        setError(null);
        setDatosCargados(true);
        setVisibleCount(CHUNK_SIZE);
      });
      setCargando(false);
      setPrimeraCarga(false);
    } else {
      const id = window.requestIdleCallback
        ? window.requestIdleCallback(loadFromNetwork, { timeout: 500 })
        : setTimeout(loadFromNetwork, 0);

      return () => {
        cancelled = true;
        if (typeof id === "number") clearTimeout(id);
        else window.cancelIdleCallback?.(id);
        abortRef.current?.abort?.();
      };
    }

    return () => {
      cancelled = true;
      abortRef.current?.abort?.();
    };
  }, [actualizar]);

  /* ======== FILTRADO LOCAL ======== */
  const empresasFiltradas = useMemo(() => {
    if (!datosCargados) return [];
    const filtros = filtrosActivos;
    const texto = (deferredBusqueda || "").trim().toLowerCase();

    if (!filtros.todos && filtros.letras.length === 0 && filtros.mediosPago.length === 0 && texto === "") {
      return [];
    }

    let resultado = empresas;

    if (filtros.letras.length > 0) {
      const setL = new Set(filtros.letras.map((l) => l.toUpperCase()));
      resultado = resultado.filter((empresa) =>
        setL.has((empresa?.razon_social || "").charAt(0).toUpperCase())
      );
    }

    if (filtros.mediosPago.length > 0) {
      const setM = new Set(filtros.mediosPago);
      resultado = resultado.filter((empresa) => setM.has(empresa?.medio_pago));
    }

    if (texto !== "") {
      resultado = resultado.filter((empresa) =>
        (empresa?.razon_social || "").toLowerCase().includes(texto)
      );
    }

    return resultado;
  }, [empresas, filtrosActivos, deferredBusqueda, datosCargados]);

  // Cascada
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

    setVisibleCount(Math.min(CHUNK_SIZE, empresasFiltradas.length));
    let id;
    const grow = () => {
      bumpVisibleGradually(empresasFiltradas.length);
      id = requestAnimationFrame(grow);
    };
    id = requestAnimationFrame(grow);
    return () => cancelAnimationFrame(id);
  }, [empresasFiltradas, datosCargados, reducedMotion, bumpVisibleGradually]);

  // Al volver desde Editar
  useEffect(() => {
    if (!datosCargados) return;
    if (sessionStorage.getItem(CASCADE_FLAG) === "1") {
      setAnimacionCascada(true);
      setTimeout(() => setAnimacionCascada(false), 600);
      sessionStorage.removeItem(CASCADE_FLAG);
    }
  }, [datosCargados]);

  /* =============================
     Helpers para la chip junto al contador
  ==============================*/
  const persistFilters = useCallback((next) => {
    localStorage.setItem("empresasFilters", safeJSON.stringify(next));
  }, []);

  /* === Selección ÚNICA: o 1 letra o 1 medio, nunca ambos === */
  const handleFiltrarPorLetra = useCallback((letra) => {
    startTransition(() => {
      setFiltrosActivos((prev) => {
        const yaSeleccionada = prev.letras[0] === letra;
        const newLetras = yaSeleccionada ? [] : [letra];
        const next = {
          letras: newLetras,
          mediosPago: [],
          todos: false,
          hasFilters: newLetras.length > 0,
        };
        persistFilters(next);
        return next;
      });
    });
  }, [persistFilters]);

  const handleFiltrarPorMedioPago = useCallback((medio) => {
    startTransition(() => {
      setFiltrosActivos((prev) => {
        const yaSeleccionado = prev.mediosPago[0] === medio;
        const newMedios = yaSeleccionado ? [] : [medio];
        const next = {
          letras: [],
          mediosPago: newMedios,
          todos: false,
          hasFilters: newMedios.length > 0,
        };
        persistFilters(next);
        return next;
      });
    });
  }, [persistFilters]);

  const eliminarFiltroLetra = useCallback((letra) => {
    startTransition(() => {
      setFiltrosActivos((prev) => {
        const newLetras = prev.letras.filter((l) => l !== letra);
        const next = {
          letras: newLetras,
          mediosPago: [],
          todos: false,
          hasFilters: newLetras.length > 0,
        };
        persistFilters(next);
        return next;
      });
    });
  }, [persistFilters]);

  const eliminarFiltroMedioPago = useCallback((medio) => {
    startTransition(() => {
      setFiltrosActivos((prev) => {
        const newMedios = prev.mediosPago.filter((m) => m !== medio);
        const next = {
          letras: [],
          mediosPago: newMedios,
          todos: false,
          hasFilters: newMedios.length > 0,
        };
        persistFilters(next);
        return next;
      });
    });
  }, [persistFilters]);

  const limpiarFiltros = useCallback(() => {
    const reset = { letras: [], mediosPago: [], todos: false, hasFilters: false };
    startTransition(() => setFiltrosActivos(reset));
    persistFilters(reset);
  }, [persistFilters]);

  const handleMostrarTodos = useCallback(() => {
    const allFilters = { letras: [], mediosPago: [], todos: true, hasFilters: false };
    startTransition(() => setFiltrosActivos(allFilters));
    persistFilters(allFilters);
    if (!reducedMotion) {
      setAnimacionCascada(true);
      setTimeout(() => setAnimacionCascada(false), 600);
    }
  }, [persistFilters, reducedMotion]);

  // === Menú de filtros ===
  const toggleMenuFiltros = useCallback(() => {
    setMostrarMenuFiltros((v) => {
      const next = !v;
      if (next) {
        setMostrarSubmenuAlfabetico(false);
        setMostrarSubmenuTransferencia(false);
      }
      return next;
    });
  }, []);

  const toggleSubmenu = useCallback((submenu) => {
    if (submenu === "alfabetico") {
      setMostrarSubmenuAlfabetico((v) => !v);
      setMostrarSubmenuTransferencia(false);
    } else if (submenu === "transferencia") {
      setMostrarSubmenuTransferencia((v) => !v);
      setMostrarSubmenuAlfabetico(false);
    }
  }, []);

  // Búsqueda
  const handleBusquedaInputChange = useCallback((e) => {
    const value = e.target.value;
    startTransition(() => setBusqueda(value));

    window.clearTimeout(handleBusquedaInputChange._t);
    handleBusquedaInputChange._t = window.setTimeout(() => {
      localStorage.setItem("empresasSearchTerm", value);
    }, 150);
  }, []);

  const handleBusqueda = useCallback(() => {
    if (reducedMotion) return;
    setAnimacionCascada(true);
    setTimeout(() => setAnimacionCascada(false), 300);
  }, [reducedMotion]);

  const handleClearSearch = useCallback(() => {
    startTransition(() => setBusqueda(""));
    localStorage.removeItem("empresasSearchTerm");
  }, []);

  // Navegación
  const handleVolverAtras = useCallback(() => {
    localStorage.removeItem("empresasFilters");
    localStorage.removeItem("empresasSearchTerm");
    navigate("/PaginaPrincipal");
  }, [navigate]);

  const handleAgregarEmpresa = useCallback(() => {
    navigate("/AgregarEmpresa");
    setActualizar((p) => !p);
    sessionStorage.removeItem(CACHE_KEY);
  }, [navigate]);

  const handleEditarEmpresa = useCallback(
    (razonSocial) => {
      sessionStorage.setItem(CASCADE_FLAG, "1");
      navigate(`/editarEmpresa/${razonSocial}`);
      setActualizar((p) => !p);
      sessionStorage.removeItem(CACHE_KEY);
    },
    [navigate]
  );

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
        startTransition(() => {
          setEmpresas((prev) => prev.filter((e) => getEmpresaId(e) !== idEmp));
        });
        setMostrarModalEliminar(false);
        setToastMensaje("Empresa eliminada correctamente");
        setToastTipo("exito");
        setMostrarToast(true);
        sessionStorage.removeItem(CACHE_KEY);
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
        startTransition(() => {
          setEmpresas((prev) => prev.filter((e) => getEmpresaId(e) !== id));
        });
        setMostrarModalBaja(false);
        setEmpresaABaja(null);
        setToastMensaje(result?.mensaje || "Empresa dada de baja");
        setToastTipo("exito");
        setMostrarToast(true);
        sessionStorage.removeItem(CACHE_KEY);
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
    try {
      const mesesP = empresa?.meses_pagados
        ? empresa.meses_pagados.split(",").map((m) => m.trim().toUpperCase())
        : [];
      setInfoEmpresa(empresa);
      setMesesPagados(mesesP);
      setMostrarModalInfo(true);
    } catch (error) {
      console.error("Error al procesar información:", error);
      setErrorMessage(`Error: ${error.message}`);
      setTimeout(() => setErrorMessage(""), 5000);
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

  const aplicarFiltroAlfabetico = useCallback(
    (letra) => {
      handleFiltrarPorLetra(letra);
      setMostrarSubmenuAlfabetico(false);
    },
    [handleFiltrarPorLetra]
  );

  const aplicarFiltroTransferencia = useCallback(
    (medio) => {
      handleFiltrarPorMedioPago(medio);
      setMostrarSubmenuTransferencia(false);
    },
    [handleFiltrarPorMedioPago]
  );

  const cantidadVisibles =
    (filtrosActivos.todos ||
      filtrosActivos.letras.length > 0 ||
      filtrosActivos.mediosPago.length > 0 ||
      (deferredBusqueda || "").trim() !== "")
      ? empresasFiltradas.length
      : 0;

  // Subconjunto incremental que realmente se pinta
  const subEmpresas = useMemo(() => {
    if (!empresasFiltradas) return [];
    return empresasFiltradas.slice(0, visibleCount);
  }, [empresasFiltradas, visibleCount]);

  /* ========= Mini chip junto al contador ========= */
  const firstLetter = filtrosActivos.letras[0];
  const firstMedio = filtrosActivos.mediosPago[0];

  // Desktop: "Letra: X" o "Medio: X" | Mobile: "X"
  const chipValue = firstLetter || firstMedio || null;
  const chipKind = firstLetter ? "Letra" : firstMedio ? "Medio" : "";

  const removeFirstChip = () => {
    if (firstLetter) eliminarFiltroLetra(firstLetter);
    if (firstMedio) eliminarFiltroMedioPago(firstMedio);
  };

  return (
    <div className="emp_empresa-container">
      <div className="emp_empresa-box">
        {/* HEADER */}
        <div className="emp_front-row-emp">
          {/* Título */}
          <span className="emp_empresa-title emp_title-wrap">Gestionar Empresas</span>

          {/* Búsqueda */}
          <div className="emp_search-input-container emp_search-wrap">
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
          <div className="emp_filtros-container emp_filters-wrap" ref={filtrosRef}>
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
                    className={`emp_chevron-icon ${mostrarSubmenuAlfabetico ? "emp_rotate" : ""}`}
                  />
                </div>

                {mostrarSubmenuAlfabetico && (
                  <div className="emp_filtros-submenu">
                    <div className="emp_alfabeto-filtros">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letra) => (
                        <button
                          key={letra}
                          className={`emp_letra-filtro ${filtrosActivos.letras.includes(letra) ? "emp_active" : ""}`}
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
                    className={`emp_chevron-icon ${mostrarSubmenuTransferencia ? "emp_rotate" : ""}`}
                  />
                </div>

                {mostrarSubmenuTransferencia && (
                  <div className="emp_filtros-submenu">
                    {mediosDePago.map((medio) => {
                      const label = medio.Medio_Pago || String(medio);
                      const isActive = filtrosActivos.mediosPago.includes(label);
                      return (
                        <div
                          key={label}
                          className={`emp_filtros-submenu-item ${isActive ? "emp_active" : ""}`}
                          onClick={() => aplicarFiltroTransferencia(label)}
                          title={`Filtrar por ${label}`}
                        >
                          {/* IGUAL en web y mobile: texto completo */}
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
        </div>

        {errorMessage && <div className="emp_error-message-emp">{errorMessage}</div>}

        {/* CONTADOR + CHIP + LISTADO */}
        <div className="emp_empresas-list">
          <div className="emp_contenedor-list-items">
            {/* Contador + chip */}
            <div className="emp_left-inline">
              <div className="emp_contador-container">
                <span className="emp_socios-desktop">Cant empresas: {cantidadVisibles}</span>
                <span className="emp_socios-mobile">{cantidadVisibles}</span>
                <FontAwesomeIcon icon={faBuilding} className="emp_icono-empresa" />
              </div>

              {chipValue && (
                <div className="emp_chip-mini" title="Filtro activo">
                  {/* Desktop: muestra prefijo + valor */}
                  <span className="emp_chip-mini-text emp_socios-desktop">
                    {chipKind}: {chipValue}
                  </span>
                  {/* Mobile: solo el valor (sin 'Letra:' / 'Medio:') */}
                  <span className="emp_chip-mini-text emp_socios-mobile">

                    {chipValue}
                  </span>

                  <button
                    className="emp_chip-mini-close"
                    onClick={removeFirstChip}
                    aria-label="Quitar filtro"
                    title="Quitar este filtro"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Leyenda estados */}
{/* Leyenda estados */}
<div className="emp_estado-pagos-container">
  <div className="emp_estado-indicador emp_al-dia">
    <div className="emp_indicador-color"></div>
    <span className="emp_legend-desktop">Al día</span>
    <span className="emp_legend-mobile">Al dia</span>
  </div>

  <div className="emp_estado-indicador emp_debe-1-2">
    <div className="emp_indicador-color"></div>
    <span className="emp_legend-desktop">Debe 1-2 meses</span>
    <span className="emp_legend-mobile">1-2</span>
  </div>

  <div className="emp_estado-indicador emp_debe-3-mas">
    <div className="emp_indicador-color"></div>
    <span className="emp_legend-desktop">Debe 3+</span>
    <span className="emp_legend-mobile">3+</span>
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
                <div className={`emp_scrollableE ${animacionCascada ? "emp_cascade-animation" : ""}`}>
                  {subEmpresas.map((empresa, index) => (
                    <Row
                      key={getEmpresaId(empresa) || empresa?.cuit || `row-${index}`}
                      empresa={empresa}
                      index={index}
                      selected={filaSeleccionada === index}
                      onSelect={handleFilaSeleccionada}
                      onInfo={handleMostrarInfoEmpresa}
                      onEdit={handleEditarEmpresa}
                      onDelete={handleConfirmarEliminar}
                      onBaja={handleConfirmarBajaEmpresa}
                    />
                  ))}
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

          {/* ======= TARJETAS ======= */}
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
              subEmpresas.map((empresa, index) => (
                <Card
                  key={getEmpresaId(empresa) || empresa?.cuit || `card-${index}`}
                  empresa={empresa}
                  index={index}
                  onSelect={handleFilaSeleccionada}
                  onInfo={handleMostrarInfoEmpresa}
                  onEdit={handleEditarEmpresa}
                  onDelete={handleConfirmarEliminar}
                  onBaja={handleConfirmarBajaEmpresa}
                />
              ))
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
