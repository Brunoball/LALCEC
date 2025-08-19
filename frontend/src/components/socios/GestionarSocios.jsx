// src/components/socios/GestionarSocios.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useDeferredValue,
} from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { FixedSizeList as List, areEqual } from "react-window";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEdit,
  faTrash,
  faFileExcel,
  faInfoCircle,
  faUserPlus,
  faUserMinus,
  faTimes,
  faFilter,
  faChevronDown,
  faMagnifyingGlass,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import ModalEliminar from "./modales_soc/ModalEliminar";
import ModalInfo from "./modales_soc/ModalInfoSocio";
import ModalBaja from "./modales_soc/ModalBaja";
import BASE_URL from "../../config/config";
import "./GestionarSocios.css";
import Toast from "../global/Toast";

/* =====================
   Utils súper livianos
===================== */
const getSocioId = (s) =>
  s?.id ?? s?.idSocios ?? s?.id_socio ?? s?.idSocio ?? null;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const useClickOutside = (ref, onOut) => {
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOut?.();
    };
    document.addEventListener("mousedown", h, { passive: true });
    return () => document.removeEventListener("mousedown", h);
  }, [ref, onOut]);
};

const useWindowHeight = (offset = 0) => {
  const [h, setH] = useState(() => window.innerHeight - offset);
  useEffect(() => {
    const onResize = () => setH(window.innerHeight - offset);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [offset]);
  return h;
};

// Prefiere una sola vista según media-query
const useMediaQuery = (query) => {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const handler = () => setMatch(m.matches);
    if (m.addEventListener) m.addEventListener("change", handler);
    else m.addListener(handler);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", handler);
      else m.removeListener(handler);
    };
  }, [query]);
  return match;
};

// Detecta preferencia de "reduced motion"
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

// Normalizador común (mapea objeto/string a label)
const medioLabel = (m) => {
  if (m == null) return "";
  if (typeof m === "string") return m.trim();
  // mismo esquema que Empresas: { Medio_Pago: "Transferencia", ... }
  return String(m.Medio_Pago ?? m.label ?? m.name ?? "").trim();
};

/* =====================
   Row virtualizado (tabla desktop)
===================== */
const SocioRow = React.memo(
  function SocioRow({ index, style, data }) {
    const stagger = clamp(index, 0, 14);
    const socio = data.items[index];
    const selected = data.filaSeleccionada === index;

    const rowClass = selected
      ? `gessoc_selected-row ${socio._estadoClase}`
      : index % 2 === 0
      ? `gessoc_even-row ${socio._estadoClase}`
      : `gessoc_odd-row ${socio._estadoClase}`;

    return (
      <div
        style={{ ...style, "--stagger": stagger }}
        className={`gessoc_row gessoc_cascade ${rowClass}`}
        onClick={() => data.onSelect(index, socio)}
      >
        <div className="gessoc_column gessoc_column-razon">
          {socio.apellido} {socio.nombre}
        </div>
        <div className="gessoc_column gessoc_column-iva">
          {socio.categoria} ${socio.precio_categoria || "0"}
        </div>
        <div className="gessoc_column gessoc_column-medio">
          {socio.medio_pago}
        </div>
        <div className="gessoc_column gessoc_column-dom">{socio.domicilio_2}</div>
        <div className="gessoc_column gessoc_column-obs">
          {socio.observacion && String(socio.observacion).trim() !== ""
            ? socio.observacion
            : "-"}
        </div>
        <div className="gessoc_column gessoc_icons-column">
          {selected && (
            <div className="gessoc_icons-container">
              <button
                className="gessoc_icon gessoc_btn-info"
                title="Ver información"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onInfo(socio);
                }}
              >
                <FontAwesomeIcon icon={faInfoCircle} />
              </button>
              <button
                className="gessoc_icon gessoc_btn-edit"
                title="Editar socio"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onEdit(socio);
                }}
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button
                className="gessoc_icon gessoc_btn-delete"
                title="Eliminar socio"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete(socio);
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
              <button
                className="gessoc_icon gessoc_btn-baja"
                title="Dar de baja"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onBaja(socio);
                }}
              >
                <FontAwesomeIcon icon={faUserMinus} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
  areEqual
);

/* =====================
   Row virtualizado (tarjetas mobile) — gap real
===================== */
const SocioCardRow = React.memo(
  function SocioCardRow({ index, style, data }) {
    const socio = data.items[index];
    const gap = data.gap ?? 12;
    const stagger = clamp(index, 0, 14);

    const top =
      typeof style.top === "number" ? style.top : parseFloat(style.top) || 0;
    const height =
      typeof style.height === "number"
        ? style.height
        : parseFloat(style.height) || 0;

    const rowStyle = {
      ...style,
      top: top + gap / 2,
      height: height - gap,
      "--stagger": stagger,
    };

    return (
      <div
        style={rowStyle}
        className={`gessoc_card gessoc_cascade ${socio._estadoClase}`}
        onClick={() => data.onSelect(index, socio)}
      >
        <div className="gessoc_card-status-strip" />
        <div className="gessoc_card-header">
          <h3 className="gessoc_card-title">
            {socio.apellido} {socio.nombre}
          </h3>
          <span
            className={`gessoc_badge ${
              socio._estadoClase === "gessoc_verde"
                ? "gessoc_badge-success"
                : socio._estadoClase === "gessoc_amarillo"
                ? "gessoc_badge-warn"
                : "gessoc_badge-danger"
            }`}
          >
            {socio._estadoClase === "gessoc_verde"
              ? "Al día"
              : socio._estadoClase === "gessoc_amarillo"
              ? "Debe 1-2"
              : "Debe 3+"}
          </span>
        </div>

        <div className="gessoc_card-body">
          <div className="gessoc_card-row">
            <span className="gessoc_card-label">Categoría</span>
            <span className="gessoc_card-value">
              {socio.categoria} ${socio.precio_categoria || "0"}
            </span>
          </div>
          <div className="gessoc_card-row">
            <span className="gessoc_card-label">Medio de Pago</span>
            <span className="gessoc_card-value">{socio.medio_pago}</span>
          </div>
          <div className="gessoc_card-row">
            <span className="gessoc_card-label">Domicilio cobro</span>
            <span className="gessoc_card-value">{socio.domicilio_2}</span>
          </div>

          {/* SIEMPRE mostrar Observaciones; usar "-" si falta */}
          <div className="gessoc_card-row">
            <span className="gessoc_card-label">Obs.</span>
            <span className="gessoc_card-value">
              {socio.observacion && String(socio.observacion).trim() !== ""
                ? socio.observacion
                : "-"}
            </span>
          </div>
        </div>

        <div className="gessoc_card-actions">
          <button
            className="gessoc_action-btn"
            title="Información"
            onClick={(e) => {
              e.stopPropagation();
              data.onInfo(socio);
            }}
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </button>
          <button
            className="gessoc_action-btn"
            title="Editar"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit(socio);
            }}
          >
            <FontAwesomeIcon icon={faEdit} />
          </button>
          <button
            className="gessoc_action-btn"
            title="Eliminar"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(socio);
            }}
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
          <button
            className="gessoc_action-btn gessoc_action-danger"
            title="Dar de baja"
            onClick={(e) => {
              e.stopPropagation();
              data.onBaja(socio);
            }}
          >
            <FontAwesomeIcon icon={faUserMinus} />
          </button>
        </div>
      </div>
    );
  },
  areEqual
);

/* =====================
   Componente principal
===================== */
const GestionarSocios = () => {
  const navigate = useNavigate();
  const filtrosRef = useRef(null);

  // NEW: refs para medir header y footer en mobile
  const headerRef = useRef(null);
  const footerRef = useRef(null);

  /* ---------- Estado base ---------- */
  const [sociosRaw, setSociosRaw] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // control de carga diferida
  const [dataLoaded, setDataLoaded] = useState(false);
  const CACHE_KEY = "sociosCache:v1";

  /* ---------- Revalidación ---------- */
  const refreshingRef = useRef(false);
  const [lastSync, setLastSync] = useState(0);

  /* ---------- Selecciones / modales ---------- */
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);

  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [mostrarModalBaja, setMostrarModalBaja] = useState(false);
  const [socioABaja, setSocioABaja] = useState(null);
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [infoSocio, setInfoSocio] = useState(null);
  const [mesesPagados, setMesesPagados] = useState([]);

  /* ---------- Búsqueda + Filtros ---------- */
  const [busqueda, setBusqueda] = useState(
    localStorage.getItem("sociosSearchTerm") || ""
  );
  const deferredBusqueda = useDeferredValue(busqueda);

  const [filtrosActivos, setFiltrosActivos] = useState(() => {
    const saved = localStorage.getItem("sociosFilters");
    return saved
      ? JSON.parse(saved)
      : { letras: [], mediosPago: [], todos: false };
  });

  const [mostrarMenuFiltros, setMostrarMenuFiltros] = useState(false);
  const [mostrarSubmenuAlfabetico, setMostrarSubmenuAlfabetico] =
    useState(false);
  const [mostrarSubmenuTransferencia, setMostrarSubmenuTransferencia] =
    useState(false);

  /* ---------- Toast ---------- */
  const [toast, setToast] = useState({ show: false, tipo: "exito", msg: "" });
  const showToast = useCallback((msg, tipo = "exito", ms = 2500) => {
    setToast({ show: true, tipo, msg });
    window.setTimeout(() => setToast({ show: false, tipo: "exito", msg: "" }), ms);
  }, []);

  /* ---------- Persistencia filtros (micro debounce) ---------- */
  useEffect(() => {
    const t = window.setTimeout(() => {
      localStorage.setItem("sociosSearchTerm", busqueda);
    }, 120);
    return () => window.clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      localStorage.setItem("sociosFilters", JSON.stringify(filtrosActivos));
    }, 120);
    return () => window.clearTimeout(t);
  }, [filtrosActivos]);

  /* ---------- Exclusividad de filtros ---------- */
  const setExclusiveFilter = useCallback((mode, value = null) => {
    switch (mode) {
      case "search":
        setBusqueda(value ?? "");
        setFiltrosActivos({ letras: [], mediosPago: [], todos: false });
        break;
      case "letra":
        setBusqueda("");
        setFiltrosActivos({
          letras: value ? [value] : [],
          mediosPago: [],
          todos: false,
        });
        break;
      case "medio":
        setBusqueda("");
        setFiltrosActivos({
          letras: [],
          mediosPago: value ? [value] : [],
          todos: false,
        });
        break;
      case "todos":
        setBusqueda("");
        setFiltrosActivos({ letras: [], mediosPago: [], todos: true });
        break;
      case "none":
      default:
        setBusqueda("");
        setFiltrosActivos({ letras: [], mediosPago: [], todos: false });
        break;
    }
  }, []);

  /* ---------- Cargar desde cache ---------- */
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setSociosRaw(parsed);
          setDataLoaded(true);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* ---------- Revalidación (siempre trae lo último) ---------- */
  const revalidate = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const url = `${BASE_URL}/api.php?action=todos_socios&tipo=socios&_=${Date.now()}`;
      const resp = await fetch(url, { method: "GET", cache: "no-store" });
      if (!resp.ok) throw new Error("No se pudo obtener socios (revalidate)");
      const data = await resp.json();
      const arr = Array.isArray(data.socios) ? data.socios : [];

      const old = sociosRaw;
      let shouldUpdate = arr.length !== old.length;

      if (!shouldUpdate) {
        const byId = (s) => getSocioId(s) ?? -1;
        for (let i = 0; i < arr.length; i++) {
          const a = arr[i];
          const b = old[i];
          if (byId(a) !== byId(b)) {
            shouldUpdate = true;
            break;
          }
          if (
            a.nombre !== b?.nombre ||
            a.apellido !== b?.apellido ||
            a.categoria !== b?.categoria ||
            a.precio_categoria !== b?.precio_categoria ||
            a.medio_pago !== b?.medio_pago ||
            a.domicilio_2 !== b?.domicilio_2 ||
            a.observacion !== b?.observacion ||
            a.meses_pagados !== b?.meses_pagados ||
            a.fecha_union !== b?.fecha_union
          ) {
            shouldUpdate = true;
            break;
          }
        }
      }

      if (shouldUpdate) {
        setSociosRaw(arr);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(arr));
        } catch {}
        setLastSync(Date.now());
      }
      setError(null);
      setDataLoaded(true);
    } catch (e) {
      console.error(e);
      // mantenemos último bueno
    } finally {
      refreshingRef.current = false;
    }
  }, [sociosRaw]);

  /* ---------- Carga perezosa inicial + revalidación ---------- */
  const ensureDataLoaded = useCallback(async () => {
    if (dataLoaded && sociosRaw.length > 0) return;
    setCargando(true);
    try {
      const resp = await fetch(
        `${BASE_URL}/api.php?action=todos_socios&tipo=socios&_=${Date.now()}`,
        { method: "GET", cache: "no-store" }
      );
      if (!resp.ok) throw new Error("No se pudo obtener socios");
      const data = await resp.json();
      const arr = Array.isArray(data.socios) ? data.socios : [];
      setSociosRaw(arr);
      setError(null);
      setDataLoaded(true);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(arr));
      } catch {}
    } catch (e) {
      console.error(e);
      setError("Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }, [dataLoaded, sociosRaw.length]);

  useEffect(() => {
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(() => revalidate())
      : setTimeout(revalidate, 0);
    return () => {
      if (typeof id === "number") clearTimeout(id);
      else window.cancelIdleCallback?.(id);
    };
  }, [revalidate]);

  useEffect(() => {
    const onFocus = () => revalidate();
    const onVis = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    const onPageShow = () => revalidate();
    window.addEventListener("focus", onFocus, { passive: true });
    document.addEventListener("visibilitychange", onVis, { passive: true });
    window.addEventListener("pageshow", onPageShow, { passive: true });
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [revalidate]);

  /* ---------- Pre-procesamiento liviano ---------- */
  const getEstadoPago = useCallback((mesesPagadosStr, fechaUnion) => {
    let pagosSet = null;
    if (mesesPagadosStr && mesesPagadosStr !== "-" && mesesPagadosStr !== "NULL") {
      pagosSet = new Set(
        mesesPagadosStr.split(",").map((m) => m.trim().toUpperCase())
      );
    } else {
      pagosSet = new Set();
    }
    const mesesAnio = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
    ];

    const hoy = new Date();
    const alta = new Date(fechaUnion || "");
    if (isNaN(alta.getTime())) {
      const mesActual = hoy.getMonth();
      let pagadosEsteAño = 0;
      for (let i = 0; i <= mesActual; i++) if (pagosSet.has(mesesAnio[i])) pagadosEsteAño++;
      const faltan = (mesActual + 1) - pagadosEsteAño;
      if (faltan <= 0) return "al-dia";
      if (faltan <= 2) return "debe-1-2";
      return "debe-3-mas";
    }

    let faltan = 0;
    for (let y = alta.getFullYear(); y <= hoy.getFullYear(); y++) {
      const desde = y === alta.getFullYear() ? alta.getMonth() : 0;
      const hasta = y === hoy.getFullYear() ? hoy.getMonth() : 11;
      for (let m = desde; m <= hasta; m++) if (!pagosSet.has(mesesAnio[m])) faltan++;
    }
    if (faltan === 0) return "al-dia";
    if (faltan <= 2) return "debe-1-2";
    return "debe-3-mas";
  }, []);

  const socios = useMemo(() => {
    return sociosRaw.map((s) => {
      const id = getSocioId(s);
      const nombre = s?.nombre ?? "";
      const apellido = s?.apellido ?? "";
      const medio = s?.medio_pago ?? "";
      const dom2 = s?.domicilio_2 ?? "";
      const categoria = s?.categoria ?? "";
      const precioCat = s?.precio_categoria ?? s?.precio ?? s?.precioCat ?? null;

      const estado = getEstadoPago(s?.meses_pagados, s?.fecha_union);
      const estadoClase =
        estado === "al-dia"
          ? "gessoc_verde"
          : estado === "debe-1-2"
          ? "gessoc_amarillo"
          : "gessoc_rojo";

      return {
        ...s,
        id,
        nombre,
        apellido,
        medio_pago: medio,
        domicilio_2: dom2,
        categoria,
        precio_categoria: precioCat,
        estadoPago: estado,
        _estadoClase: estadoClase,
        _nombreLower: nombre.toLowerCase(),
        _apellidoLower: apellido.toLowerCase(),
        _letraApe: (apellido[0] || "").toUpperCase(),
        _medioStr: String(medio),
      };
    });
  }, [sociosRaw, getEstadoPago]);

  /* ---------- Medios de pago (API + fallback) ---------- */
  const [mediosDePago, setMediosDePago] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const cargarMedios = async () => {
      const trySocios = async () => {
        try {
          const r = await fetch(`${BASE_URL}/api.php?action=obtener_datos_socios`, { cache: "no-store" });
          if (!r.ok) throw new Error("obtener_datos_socios no OK");
          const j = await r.json();
          const arr = Array.isArray(j?.mediosPago) ? j.mediosPago : [];
          const labels = arr.map(medioLabel).filter(Boolean);
          if (labels.length) return labels;
          throw new Error("Sin labels en obtener_datos_socios");
        } catch {
          return null;
        }
      };

      const tryEmpresas = async () => {
        try {
          const r = await fetch(`${BASE_URL}/api.php?action=obtener_datos_empresas`, { cache: "no-store" });
          if (!r.ok) throw new Error("obtener_datos_empresas no OK");
          const j = await r.json();
          const arr = Array.isArray(j?.mediosPago) ? j.mediosPago : [];
          const labels = arr.map(medioLabel).filter(Boolean);
          if (labels.length) return labels;
          throw new Error("Sin labels en obtener_datos_empresas");
        } catch {
          return null;
        }
      };

      const deriveFromSocios = () => {
        const set = new Map();
        for (const s of socios) {
          const raw = medioLabel(s?.medio_pago ?? s?._medioStr ?? "");
          if (!raw) continue;
          set.set(raw.toUpperCase(), raw);
        }
        return Array.from(set.values());
      };

      let labels = await trySocios();
      if (!labels) labels = await tryEmpresas();
      if (!labels) labels = deriveFromSocios();

      labels.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

      if (!cancelled) setMediosDePago(labels);
    };

    cargarMedios();
    return () => { cancelled = true; };
  }, [BASE_URL, socios]);

  /* ---------- Filtrado ---------- */
  const sociosFiltrados = useMemo(() => {
    const term = (deferredBusqueda || "").trim().toLowerCase();
    const useSearch = term.length > 0;

    const letrasArr = filtrosActivos.letras?.length ? filtrosActivos.letras : null;
    const mediosArr = filtrosActivos.mediosPago?.length ? filtrosActivos.mediosPago : null;

    if (!useSearch && !letrasArr && !mediosArr && !filtrosActivos.todos) {
      return [];
    }

    const letrasSet = letrasArr ? new Set(letrasArr.map((l) => l.toUpperCase())) : null;
    const mediosSet = mediosArr ? new Set(mediosArr) : null;

    const out = [];
    for (let i = 0; i < socios.length; i++) {
      const s = socios[i];

      if (useSearch) {
        if (
          s._nombreLower.indexOf(term) === -1 &&
          s._apellidoLower.indexOf(term) === -1
        ) {
          continue;
        }
      }
      if (letrasSet && !letrasSet.has(s._letraApe)) continue;
      if (mediosSet && !mediosSet.has(s._medioStr)) continue;

      out.push(s);
    }
    return out;
  }, [socios, deferredBusqueda, filtrosActivos]);

  /* ---------- Handlers (exclusivos) ---------- */
  const handleBusquedaInputChange = useCallback(
    async (e) => {
      const value = e.target.value;
      setExclusiveFilter("search", value);

      if (!dataLoaded) {
        window.requestIdleCallback
          ? window.requestIdleCallback(() => ensureDataLoaded())
          : ensureDataLoaded();
      } else {
        window.requestIdleCallback
          ? window.requestIdleCallback(() => revalidate())
          : setTimeout(revalidate, 0);
      }
    },
    [dataLoaded, ensureDataLoaded, revalidate, setExclusiveFilter]
  );

  const limpiarFiltros = useCallback(() => {
    setExclusiveFilter("none");
    setFilaSeleccionada(null);
    setSocioSeleccionado(null);
  }, [setExclusiveFilter]);

  const handleFiltrarPorLetra = useCallback(
    async (letra) => {
      const isSame = filtrosActivos.letras?.[0] === letra;
      setExclusiveFilter(isSame ? "none" : "letra", isSame ? null : letra);

      if (!dataLoaded) await ensureDataLoaded();
      else revalidate();
    },
    [
      dataLoaded,
      ensureDataLoaded,
      revalidate,
      filtrosActivos.letras,
      setExclusiveFilter,
    ]
  );

  const handleFiltrarPorMedioPago = useCallback(
    async (medio) => {
      const actual = filtrosActivos.mediosPago?.[0] ?? null;
      const isSame = actual === medio;
      setExclusiveFilter(isSame ? "none" : "medio", isSame ? null : medio);

      if (!dataLoaded) await ensureDataLoaded();
      else revalidate();
    },
    [
      dataLoaded,
      ensureDataLoaded,
      revalidate,
      filtrosActivos.mediosPago,
      setExclusiveFilter,
    ]
  );

  const handleMostrarTodos = useCallback(async () => {
    setExclusiveFilter("todos");
    setMostrarMenuFiltros(false);
    setFilaSeleccionada(null);
    setSocioSeleccionado(null);
    await ensureDataLoaded();
    revalidate();
  }, [ensureDataLoaded, revalidate, setExclusiveFilter]);

  const onSelect = useCallback((index, socio) => {
    setFilaSeleccionada((prev) => (prev === index ? null : index));
    setSocioSeleccionado(socio);
  }, []);

  const handleEditarSocio = useCallback(
    (socio) => {
      const id = getSocioId(socio);
      if (!id) return;
      navigate(`/editarSocio/${id}`);
    },
    [navigate]
  );

  const handleConfirmarEliminar = useCallback((socio) => {
    setSocioSeleccionado(socio);
    setMostrarModalEliminar(true);
  }, []);

  const handleMostrarInfoSocio = useCallback((socio) => {
    const meses = socio.meses_pagados
      ? socio.meses_pagados.split(",").map((m) => m.trim().toUpperCase())
      : [];
    setInfoSocio(socio);
    setMesesPagados(meses);
    setMostrarModalInfo(true);
  }, []);

  const handleConfirmarBaja = useCallback((socio) => {
    setSocioABaja(socio);
    setMostrarModalBaja(true);
  }, []);

  const handleCancelarEliminar = useCallback(() => {
    setMostrarModalEliminar(false);
  }, []);

  /* ---------- Acciones server ---------- */
  const handleEliminarSocio = useCallback(
    async () => {
      if (!socioSeleccionado) return;
      try {
        const idSel = getSocioId(socioSeleccionado);
        const response = await fetch(
          `${BASE_URL}/api.php?action=eliminar_socio`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_socio: idSel }),
          }
        );
        const data = await response.json();
        if (data?.exito || data?.success) {
          setSociosRaw((prev) => {
            const next = prev.filter((s) => getSocioId(s) !== idSel);
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
          setMostrarModalEliminar(false);
          showToast("Socio eliminado correctamente");
          revalidate();
        } else {
          showToast(data?.mensaje || "Error al eliminar", "error");
        }
      } catch {
        showToast("Problema al eliminar el socio", "error");
      }
    },
    [socioSeleccionado, showToast, revalidate]
  );

  const handleConfirmarBajaSocio = useCallback(
    async (socio, motivo) => {
      const id = getSocioId(socio);
      const m = (motivo || "").trim();
      if (!id || !m) {
        showToast("Motivo requerido para dar de baja.", "error");
        return;
      }
      try {
        const response = await fetch(
          `${BASE_URL}/api.php?action=dar_baja&op=dar_baja`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idSocio: id, motivo: m }),
          }
        );
        const result = await response.json();
        if (response.ok && (result?.exito || result?.success)) {
          setSociosRaw((prev) => {
            const next = prev.filter((s) => getSocioId(s) !== id);
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
          setMostrarModalBaja(false);
          showToast(result?.mensaje || "Socio dado de baja");
          revalidate();
        } else {
          showToast(result?.mensaje || "No se pudo dar de baja", "error");
        }
      } catch {
        showToast("Problema al dar de baja", "error");
      }
    },
    [showToast, revalidate]
  );

  /* ---------- cierre menú filtros al click afuera ---------- */
  useClickOutside(filtrosRef, () => {
    if (mostrarMenuFiltros) {
      setMostrarMenuFiltros(false);
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  });

  /* ---------- itemData ---------- */
  const itemData = useMemo(
    () => ({
      items: sociosFiltrados,
      filaSeleccionada,
      onSelect,
      onEdit: handleEditarSocio,
      onDelete: handleConfirmarEliminar,
      onInfo: handleMostrarInfoSocio,
      onBaja: handleConfirmarBaja,
    }),
    [
      sociosFiltrados,
      filaSeleccionada,
      onSelect,
      handleEditarSocio,
      handleConfirmarEliminar,
      handleMostrarInfoSocio,
      handleConfirmarBaja,
    ]
  );

  /* ---------- Layout/Altura lista ---------- */
  const isMobile = useMediaQuery("(max-width: 900px)");
  const reducedMotion = useReducedMotion();

  // Altura base para desktop (con tu offset)
  const baseWindowHeight = useWindowHeight(isMobile ? 0 : 360);

  // NEW: alto disponible exacto para mobile midiendo header + footer
  const [availableHeight, setAvailableHeight] = useState(520);

  useEffect(() => {
    const calc = () => {
      const H = window.innerHeight;
      const hHeader = headerRef.current?.offsetHeight ?? 0;
      const hFooter = footerRef.current?.offsetHeight ?? 0;
      // Ajustá este paddingExtra si tu CSS cambia (coincidir con paddings de la zona de lista)
      const paddingExtras = isMobile ? 16 + 60 : 24;
      const h = Math.max(330, H - hHeader - hFooter - paddingExtras);
      setAvailableHeight(h);
    };

    // calcular al montar
    calc();

    // eventos que cambian el viewport en mobile
    window.addEventListener("resize", calc, { passive: true });
    window.addEventListener("orientationchange", calc, { passive: true });

    // observar cambios dinámicos en header/footer
    const ro = new ResizeObserver(calc);
    if (headerRef.current) ro.observe(headerRef.current);
    if (footerRef.current) ro.observe(footerRef.current);

    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", calc);
      ro.disconnect();
    };
  }, [isMobile]);

  const desktopRowHeight = 48;
  const cardGap = 12;
  const mobileCardHeight = 226;
  const itemSizeMobile = mobileCardHeight + cardGap;
  const overscan = isMobile ? 6 : 10;

  const listHeight = useMemo(
    () => (isMobile ? availableHeight : clamp(baseWindowHeight, 300, 880)),
    [isMobile, availableHeight, baseWindowHeight]
  );

  /* ---------- Contador visibles ---------- */
  const cantidadVisibles = useMemo(
    () => sociosFiltrados.length,
    [sociosFiltrados]
  );

  /* ---------- Exportar Excel ---------- */
  const exportarAExcel = useCallback(
    async () => {
      if (!dataLoaded) await ensureDataLoaded();
      if (sociosFiltrados.length === 0) {
        showToast("No hay socios para exportar.", "error");
        return;
      }
      const datos = sociosFiltrados.map(
        ({
          id,
          nombre,
          apellido,
          categoria,
          precio_categoria,
          medio_pago,
          domicilio_2,
          observacion,
          ...rest
        }) => ({
          id,
          apellido,
          nombre,
          categoria,
          precio_categoria,
          medio_pago,
          domicilio_2,
          observacion,
          ...rest,
        })
      );
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Socios");
      XLSX.writeFile(wb, "Socios.xlsx");
      showToast("Exportación a Excel completada");
    },
    [sociosFiltrados, showToast, dataLoaded, ensureDataLoaded]
  );

  /* =====================
         RENDER
  ===================== */
  return (
    <div className={`gessoc_empresa-container ${isMobile ? "gessoc_mobile" : ""}`}>
      {toast.show && (
        <Toast
          tipo={toast.tipo}
          mensaje={toast.msg}
          onClose={() => setToast({ show: false, tipo: "exito", msg: "" })}
          duracion={2400}
        />
      )}

      <div className="gessoc_empresa-box">
        {/* HEADER */}
        <div
          className={`gessoc_front-row-emp ${isMobile ? "gessoc_front-row-emp--mobile" : ""}`}
          ref={headerRef}
        >
          <span className="gessoc_empresa-title">Gestionar Socios</span>

          {/* Búsqueda */}
          <div className="gessoc_search-input-container">
            <input
              id="search"
              type="text"
              placeholder="Buscar por nombre o apellido"
              className="gessoc_search-input"
              value={busqueda}
              onChange={handleBusquedaInputChange}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              inputMode="search"
            />
            {busqueda && (
              <FontAwesomeIcon
                icon={faTimes}
                className="gessoc_clear-search-icon"
                onClick={() => setExclusiveFilter("none")}
                title="Limpiar búsqueda"
              />
            )}
            <button
              className="gessoc_search-button"
              title="Buscar"
              onClick={async () => {
                if (!dataLoaded) await ensureDataLoaded();
                revalidate();
              }}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="gessoc_search-icon" />
            </button>
          </div>

          {/* Filtros */}
          <div className="gessoc_filtros-container" ref={filtrosRef}>
            <button
              className="gessoc_filtros-button"
              onClick={() => setMostrarMenuFiltros((v) => !v)}
            >
              <FontAwesomeIcon icon={faFilter} className="gessoc_icon-button" />
              <span>Aplicar Filtros</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`gessoc_chevron-icon ${mostrarMenuFiltros ? "gessoc_rotate" : ""}`}
              />
            </button>

            {mostrarMenuFiltros && (
              <div className="gessoc_filtros-menu">
                <div
                  className="gessoc_filtros-menu-item"
                  onClick={() => setMostrarSubmenuAlfabetico((v) => !v)}
                >
                  <span>Filtrar de la A a la Z</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`gessoc_chevron-icon ${mostrarSubmenuAlfabetico ? "gessoc_rotate" : ""}`}
                  />
                </div>

                {mostrarSubmenuAlfabetico && (
                  <div className="gessoc_filtros-submenu">
                    <div className="gessoc_alfabeto-filtros">
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letra) => (
                        <button
                          key={letra}
                          className={`gessoc_letra-filtro ${
                            filtrosActivos.letras.includes(letra) ? "gessoc_active" : ""
                          }`}
                          onClick={() => handleFiltrarPorLetra(letra)}
                          title={`Filtrar por ${letra}`}
                        >
                          {letra}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className="gessoc_filtros-menu-item"
                  onClick={() => setMostrarSubmenuTransferencia((v) => !v)}
                >
                  <span>Medios de Pago</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`gessoc_chevron-icon ${mostrarSubmenuTransferencia ? "gessoc_rotate" : ""}`}
                  />
                </div>

                {mostrarSubmenuTransferencia && (
                  <div className="gessoc_filtros-submenu">
                    {mediosDePago.map((medio) => {
                      const label = medioLabel(medio);
                      if (!label) return null;
                      const isActive = filtrosActivos.mediosPago.includes(label);
                      return (
                        <div
                          key={label}
                          className={`gessoc_filtros-submenu-item ${isActive ? "gessoc_active" : ""}`}
                          onClick={() => handleFiltrarPorMedioPago(label)}
                          title={`Filtrar por ${label}`}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  className="gessoc_filtros-menu-item gessoc_mostrar-todas"
                  onClick={handleMostrarTodos}
                >
                  <span>Mostrar Todos</span>
                </div>
              </div>
            )}
          </div>

          {error && <p className="gessoc_error">{error}</p>}
        </div>

        {/* CONTADOR + CHIPS + LEYENDA + LISTADO */}
        <div className="gessoc_empresas-list">
          <div className="gessoc_contenedor-list-items">
            <div className="gessoc_contador-container">
              <span className="gessoc_socios-totales gessoc_socios-desktop">
                Cant socios: {cantidadVisibles}
              </span>
              <span className="gessoc_socios-totales gessoc_socios-mobile">
                <FontAwesomeIcon icon={faUsers} className="gessoc_icono-empresa" />
                {cantidadVisibles}
              </span>
            </div>

            {/* CHIPS de filtros activos */}
            <div className="gessoc_filtros-activos-container">
              {filtrosActivos.letras?.length > 0 && (
                <div className="gessoc_filter-chip">
                  <span className="gessoc_filter-chip-text">
                    Letra: {filtrosActivos.letras[0]}
                  </span>
                  {filtrosActivos.letras.length > 1 && (
                    <span className="gessoc_filter-chip-more">
                      +{filtrosActivos.letras.length - 1}
                    </span>
                  )}
                  <button
                    className="gessoc_filter-chip-close"
                    onClick={() => limpiarFiltros()}
                    title="Quitar filtro por letra"
                    aria-label="Quitar filtro por letra"
                  >
                    ×
                  </button>
                </div>
              )}

              {filtrosActivos.mediosPago?.length > 0 && (
                <div className="gessoc_filter-chip gessoc_chip-medio">
                  <span className="gessoc_filter-chip-text">Medio: </span>
                  <span className="texto">{filtrosActivos.mediosPago[0]}</span>
                  {filtrosActivos.mediosPago.length > 1 && (
                    <span className="gessoc_filter-chip-more">
                      +{filtrosActivos.mediosPago.length - 1}
                    </span>
                  )}
                  <button
                    className="gessoc_filter-chip-close"
                    onClick={() => limpiarFiltros()}
                    title="Quitar filtro de medio de pago"
                    aria-label="Quitar filtro de medio de pago"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Leyenda de estados */}
            <div className="gessoc_estado-pagos-container">
              <div className="gessoc_estado-indicador gessoc_al-dia">
                <div className="gessoc_indicador-color"></div>
                <span>{isMobile ? "al dia" : "Al día"}</span>
              </div>
              <div className="gessoc_estado-indicador gessoc_debe-1-2">
                <div className="gessoc_indicador-color"></div>
                <span>{isMobile ? "1-2" : "Debe 1-2 meses"}</span>
              </div>
              <div className="gessoc_estado-indicador gessoc_debe-3-mas">
                <div className="gessoc_indicador-color"></div>
                <span>{isMobile ? "3+" : "Debe 3+ meses"}</span>
              </div>
            </div>
          </div>

          {/* ======= SOLO UNA VISTA MONTA ======= */}
          {!isMobile ? (
            /* TABLA (Desktop) */
            <div className="gessoc_box-table">
              <div className="gessoc_header" style={{ width: "100%" }}>
                <div className="gessoc_column-header">Apellido y Nombre</div>
                <div className="gessoc_column-header">Cat/Precio</div>
                <div className="gessoc_column-header">Medio de Pago</div>
                <div className="gessoc_column-header">Domicilio Cobro</div>
                <div className="gessoc_column-header">Observación</div>
                <div className="gessoc_column-header gessoc_icons-column">Acciones</div>
              </div>

              <div className="gessoc_body">
                {cargando ? (
                  <div className="gessoc_loading-spinner-container">
                    <div className="gessoc_loading-spinner"></div>
                  </div>
                ) : sociosFiltrados.length > 0 ? (
                  <div className="gessoc_scrollableE" style={{ padding: 0, height: listHeight }}>
                    <List
                      height={listHeight}
                      itemCount={sociosFiltrados.length}
                      itemSize={desktopRowHeight}
                      width="100%"
                      overscanCount={overscan}
                      itemData={itemData}
                      itemKey={(idx, data) => data.items[idx]?.id ?? idx}
                    >
                      {SocioRow}
                    </List>
                  </div>
                ) : (
                  <div className="gessoc_no-data-message" style={{ width: "100%" }}>
                    <div className="gessoc_message-content">
                      <p>Usá la búsqueda o aplicá filtros para ver los socios</p>
                      <button className="gessoc_btn-show-all" onClick={handleMostrarTodos}>
                        Mostrar todos los socios
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TARJETAS (Mobile) */
            <div className="gessoc_cards_wrapper_virtual">
              {cargando ? (
                <div className="gessoc_loading-spinner-container">
                  <div className="gessoc_loading-spinner"></div>
                </div>
              ) : sociosFiltrados.length > 0 ? (
                <List
                  height={listHeight}
                  itemCount={sociosFiltrados.length}
                  itemSize={itemSizeMobile}
                  width="100%"
                  overscanCount={overscan}
                  itemData={{ ...itemData, gap: cardGap }}
                  className="gessoc_cards_list"
                  itemKey={(idx, data) => data.items[idx]?.id ?? idx}
                >
                  {SocioCardRow}
                </List>
              ) : (
                <div className="gessoc_no-data-message gessoc_no-data-mobile">
                  <div className="gessoc_message-content">
                    <p>Usá la búsqueda o aplicá filtros para ver resultados</p>
                    <button className="gessoc_btn-show-all" onClick={handleMostrarTodos}>
                      Mostrar todos los socios
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTONERA INFERIOR */}
        <div className="gessoc_down-container" ref={footerRef}>
          <button
            className="gessoc_socio-button gessoc_hover-effect gessoc_volver-atras"
            onClick={() => {
              localStorage.removeItem("sociosFilters");
              localStorage.removeItem("sociosSearchTerm");
              navigate("/PaginaPrincipal");
            }}
            aria-label="Volver"
            title="Volver"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="gessoc_socio-icon-button" />
            <p>Volver Atrás</p>
          </button>

          <div className="gessoc_botones-container">
            <button
              className="gessoc_socio-button gessoc_hover-effect"
              onClick={() => navigate("/Agregarsocio")}
              aria-label="Agregar"
              title="Agregar socio"
            >
              <FontAwesomeIcon icon={faUserPlus} className="gessoc_socio-icon-button" />
              <p>Agregar Socio</p>
            </button>

            <button
              className="gessoc_socio-button gessoc_hover-effect"
              onClick={exportarAExcel}
              aria-label="Exportar"
              title="Exportar a Excel"
            >
              <FontAwesomeIcon icon={faFileExcel} className="gessoc_socio-icon-button" />
              <p>Exportar a Excel</p>
            </button>

            <button
              className="gessoc_socio-button gessoc_hover-effect gessoc_btn-baja-nav"
              onClick={() => navigate("/socios_baja")}
              title="Dados de Baja"
              aria-label="Dados de Baja"
            >
              <FontAwesomeIcon icon={faUserMinus} className="gessoc_socio-icon-button" />
              <p>Dados de Baja</p>
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
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

      {mostrarModalBaja && socioABaja && (
        <ModalBaja
          socio={socioABaja}
          onCancelar={() => setMostrarModalBaja(false)}
          onConfirmar={handleConfirmarBajaSocio}
        />
      )}
    </div>
  );
};

export default GestionarSocios;
