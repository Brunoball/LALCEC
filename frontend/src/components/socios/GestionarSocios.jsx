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
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, onOut]);
};

const useWindowHeight = (offset = 0) => {
  const [h, setH] = useState(() => window.innerHeight - offset);
  useEffect(() => {
    const onResize = () => setH(window.innerHeight - offset);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [offset]);
  return h;
};

// Monta UNA vista según ancho (evita render doble)
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

/* =====================
   Row virtualizado (tabla)
===================== */
const SocioRow = React.memo(
  function SocioRow({ index, style, data }) {
    const socio = data.items[index];
    const selected = data.filaSeleccionada === index;

    const rowClass = selected
      ? `gessoc_selected-row ${socio._estadoClase}`
      : index % 2 === 0
      ? `gessoc_even-row ${socio._estadoClase}`
      : `gessoc_odd-row ${socio._estadoClase}`;

    return (
      <div
        /* delay escalonado para efecto cascada */
        style={{ ...style, animationDelay: `${(index % 20) * 0.04}s` }}
        className={`gessoc_row ${rowClass}`}
        onClick={() => data.onSelect(index, socio)}
      >
        <div className="gessoc_column gessoc_column-razon">{socio.apellido}</div>
        <div className="gessoc_column gessoc_column-razon">{socio.nombre}</div>
        <div className="gessoc_column gessoc_column-iva">
          {socio.categoria} ${socio.precio_categoria || "0"}
        </div>
        <div className="gessoc_column gessoc_column-medio">{socio.medio_pago}</div>
        <div className="gessoc_column gessoc_column-dom">{socio.domicilio_2}</div>
        <div className="gessoc_column gessoc_column-obs">{socio.observacion}</div>
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
   Componente principal
===================== */
const GestionarSocios = () => {
  const navigate = useNavigate();
  const filtrosRef = useRef(null);

  /* ---------- Estado base ---------- */
  const [sociosRaw, setSociosRaw] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // NUEVO: control de carga diferida
  const [dataLoaded, setDataLoaded] = useState(false); // se pone true cuando realmente se trae del server o cache
  const CACHE_KEY = "sociosCache:v1"; // CACHE: cambiar versión si cambia el shape

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
    setTimeout(() => setToast({ show: false, tipo: "exito", msg: "" }), ms);
  }, []);

  /* ---------- Persistencia filtros (micro debounce) ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem("sociosSearchTerm", busqueda);
    }, 120);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem("sociosFilters", JSON.stringify(filtrosActivos));
    }, 120);
    return () => clearTimeout(t);
  }, [filtrosActivos]);

  /* ---------- Cargar desde cache (no fetch) al entrar ---------- */
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY); // CACHE
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setSociosRaw(parsed); // no mostramos nada hasta que apliquen filtro, pero ya está en memoria
          setDataLoaded(true);  // marcado como cargado desde cache
        }
      }
    } catch {
      /* ignore */
    }
    // NO hacemos fetch aquí: la carga real se dispara solo al aplicar filtros/búsqueda/mostrar todos
    // Mantiene la UI fija sin mini recarga inicial.
  }, []);

  /* ---------- Función de carga perezosa ---------- */
  const ensureDataLoaded = useCallback(async () => {
    if (dataLoaded && sociosRaw.length > 0) return; // ya tenemos algo útil (cache o previa)

    // Intento 1: cache (sincrónico, instantáneo)
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSociosRaw(parsed);
          setDataLoaded(true);
          return; // listo al toque
        }
      }
    } catch {
      /* ignore cache errors */
    }

    // Intento 2: fetch real (primera vez sin cache)
    setCargando(true);
    try {
      const resp = await fetch(
        `${BASE_URL}/api.php?action=todos_socios&tipo=socios`
      );
      if (!resp.ok) throw new Error("No se pudo obtener socios");
      const data = await resp.json();
      const arr = Array.isArray(data.socios) ? data.socios : [];
      setSociosRaw(arr);
      setError(null);
      setDataLoaded(true);
      // CACHE
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(arr));
      } catch {
        /* ignore */
      }
    } catch (e) {
      console.error(e);
      setError("Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }, [dataLoaded, sociosRaw.length]);

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

  /* ---------- Catálogo de medios ---------- */
  const mediosDePago = useMemo(() => {
    const set = new Set();
    for (let i = 0; i < socios.length; i++) {
      const m = socios[i]._medioStr;
      if (m) set.add(m);
    }
    return Array.from(set).sort();
  }, [socios]);

  /* ---------- Filtrado en un solo loop ---------- */
  const sociosFiltrados = useMemo(() => {
    const term = (deferredBusqueda || "").trim().toLowerCase();
    const useSearch = term.length > 0;

    const letrasArr = filtrosActivos.letras?.length ? filtrosActivos.letras : null;
    const mediosArr = filtrosActivos.mediosPago?.length ? filtrosActivos.mediosPago : null;

    // IMPORTANTE:
    // Si no hay búsqueda ni filtros ni "todos", NO devolvemos nada (UI vacía)
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

  /* ---------- Handlers UI (estables) ---------- */
  const handleBusquedaInputChange = useCallback(async (e) => {
    const value = e.target.value;
    setBusqueda(value);
    // primera interacción de búsqueda → carga perezosa
    if (!dataLoaded) {
      await ensureDataLoaded();
    }
  }, [dataLoaded, ensureDataLoaded]);

  const limpiarFiltros = useCallback(() => {
    setFiltrosActivos({ letras: [], mediosPago: [], todos: false });
    setBusqueda("");
    setFilaSeleccionada(null);
    setSocioSeleccionado(null);
  }, []);

  const handleFiltrarPorLetra = useCallback(async (letra) => {
    setBusqueda("");
    setFiltrosActivos((prev) => {
      const exists = prev.letras.includes(letra);
      const letras = exists
        ? prev.letras.filter((l) => l !== letra)
        : [...prev.letras, letra];
      return { ...prev, letras, todos: false };
    });
    if (!dataLoaded) await ensureDataLoaded();
  }, [dataLoaded, ensureDataLoaded]);

  const handleFiltrarPorMedioPago = useCallback(async (medio) => {
    setBusqueda("");
    setFiltrosActivos((prev) => {
      const exists = prev.mediosPago.includes(medio);
      const mediosPago = exists
        ? prev.mediosPago.filter((m) => m !== medio)
        : [...prev.mediosPago, medio];
      return { ...prev, mediosPago, todos: false };
    });
    if (!dataLoaded) await ensureDataLoaded();
  }, [dataLoaded, ensureDataLoaded]);

  const handleMostrarTodos = useCallback(async () => {
    setBusqueda("");
    setFiltrosActivos({ letras: [], mediosPago: [], todos: true });
    setMostrarMenuFiltros(false);
    setFilaSeleccionada(null);
    setSocioSeleccionado(null);
    await ensureDataLoaded(); // <- “al toque” si hay cache; si no, trae y cachea
  }, [ensureDataLoaded]);

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

  /* ---------- Acciones al servidor ---------- */
  const handleEliminarSocio = useCallback(async () => {
    if (!socioSeleccionado) return;
    try {
      const idSel = getSocioId(socioSeleccionado);
      const response = await fetch(`${BASE_URL}/api.php?action=eliminar_socio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_socio: idSel }),
      });
      const data = await response.json();
      if (data?.exito || data?.success) {
        setSociosRaw((prev) => {
          const next = prev.filter((s) => getSocioId(s) !== idSel);
          // CACHE: reflejar eliminación inmediata
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
        setMostrarModalEliminar(false);
        showToast("Socio eliminado correctamente");
      } else {
        showToast(data?.mensaje || "Error al eliminar", "error");
      }
    } catch {
      showToast("Problema al eliminar el socio", "error");
    }
  }, [socioSeleccionado, showToast]);

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
            // CACHE: reflejar baja inmediata
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
          setMostrarModalBaja(false);
          showToast(result?.mensaje || "Socio dado de baja");
        } else {
          showToast(result?.mensaje || "No se pudo dar de baja", "error");
        }
      } catch {
        showToast("Problema al dar de baja", "error");
      }
    },
    [showToast]
  );

  /* ---------- Menú filtros: cierre al click afuera ---------- */
  useClickOutside(filtrosRef, () => {
    if (mostrarMenuFiltros) {
      setMostrarMenuFiltros(false);
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  });

  /* ---------- itemData estable para la lista ---------- */
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

  /* ---------- Altura lista ---------- */
  // Offset estimado: header, filtros, paddings, etc.
  const windowHeight = useWindowHeight(360);
  const listHeight = useMemo(() => clamp(windowHeight, 300, 880), [windowHeight]);

  /* ---------- Contador visibles ---------- */
  const cantidadVisibles = useMemo(() => sociosFiltrados.length, [sociosFiltrados]);

  /* ---------- Exportar Excel ---------- */
  const exportarAExcel = useCallback(async () => {
    // si aún no cargamos datos y quieren exportar, cargar primero
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
  }, [sociosFiltrados, showToast, dataLoaded, ensureDataLoaded]);

  /* ---------- Solo montamos la vista correspondiente ---------- */
  const isMobile = useMediaQuery("(max-width: 900px)");

  /* === NUEVO: clave para re-montar la lista y re-disparar la cascada === */
  const cascadeKey = useMemo(() => {
    return [
      deferredBusqueda,
      filtrosActivos.todos ? "ALL" : "SOME",
      filtrosActivos.letras.join("|"),
      filtrosActivos.mediosPago.join("|"),
    ].join("::");
  }, [deferredBusqueda, filtrosActivos]);

  /* === Overscan grande para cascada suave === */
  const overscanAll = useMemo(
    () => Math.max(6, sociosFiltrados.length),
    [sociosFiltrados.length]
  );

  /* =====================
         RENDER
  ===================== */
  return (
    <div className="gessoc_empresa-container">
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
        <div className="gessoc_front-row-emp">
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
            />
            {busqueda && (
              <FontAwesomeIcon
                icon={faTimes}
                className="gessoc_clear-search-icon"
                onClick={() => setBusqueda("")}
                title="Limpiar búsqueda"
              />
            )}
            <button
              className="gessoc_search-button"
              title="Buscar"
              onClick={async () => {
                if (!dataLoaded) await ensureDataLoaded();
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
                    className={`gessoc_chevron-icon ${
                      mostrarSubmenuAlfabetico ? "gessoc_rotate" : ""
                    }`}
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
                    className={`gessoc_chevron-icon ${
                      mostrarSubmenuTransferencia ? "gessoc_rotate" : ""
                    }`}
                  />
                </div>

                {mostrarSubmenuTransferencia && (
                  <div className="gessoc_filtros-submenu">
                    {mediosDePago.map((medio) => (
                      <div
                        key={medio}
                        className={`gessoc_filtros-submenu-item ${
                          filtrosActivos.mediosPago.includes(medio) ? "gessoc_active" : ""
                        }`}
                        onClick={() => handleFiltrarPorMedioPago(medio)}
                        title={`Filtrar por ${medio}`}
                      >
                        {medio}
                      </div>
                    ))}
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

          {/* Resumen filtros */}
          <div
            className={`gessoc_filtros-activos-container ${
              filtrosActivos.letras.length > 0 || filtrosActivos.mediosPago.length > 0
                ? "gessoc_show"
                : ""
            }`}
          >
            {(filtrosActivos.letras.length > 0 ||
              filtrosActivos.mediosPago.length > 0) && (
              <div className="gessoc_filtros-activos">
                <div className="gessoc_filtros-activos-header">
                  <span>Filtros aplicados:</span>
                </div>
                <button className="gessoc_limpiar-filtros-btn" onClick={limpiarFiltros}>
                  Limpiar todos
                </button>
                <div className="gessoc_filtros-activos-chips">
                  {filtrosActivos.letras.map((letra) => (
                    <div key={`letra-${letra}`} className="gessoc_filtro-chip">
                      <span>Letra: {letra}</span>
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="gessoc_filtro-chip-close"
                        onClick={() => handleFiltrarPorLetra(letra)}
                      />
                    </div>
                  ))}
                  {filtrosActivos.mediosPago.map((medio) => (
                    <div key={`medio-${medio}`} className="gessoc_filtro-chip">
                      <span>Medio: {medio}</span>
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="gessoc_filtro-chip-close"
                        onClick={() => handleFiltrarPorMedioPago(medio)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="gessoc_error">{error}</p>}
        </div>

        {/* CONTADOR + LEYENDA + LISTADO */}
        <div className="gessoc_empresas-list">
          <div className="gessoc_contenedor-list-items">
            <div className="gessoc_contador-container">
              <span className="gessoc_socios-totales gessoc_socios-desktop">
                Cant socios: {cantidadVisibles}
              </span>
              <span className="gessoc_socios-totales gessoc_socios-mobile">
                Soc: {cantidadVisibles}
              </span>
              <FontAwesomeIcon icon={faUsers} className="gessoc_icono-empresa" />
            </div>

            <div className="gessoc_estado-pagos-container">
              <div className="gessoc_estado-indicador gessoc_al-dia">
                <div className="gessoc_indicador-color"></div>
                <span>Al día</span>
              </div>
              <div className="gessoc_estado-indicador gessoc_debe-1-2">
                <div className="gessoc_indicador-color"></div>
                <span>Debe 1-2 meses</span>
              </div>
              <div className="gessoc_estado-indicador gessoc_debe-3-mas">
                <div className="gessoc_indicador-color"></div>
                <span>Debe 3+ meses</span>
              </div>
            </div>
          </div>

          {/* ======= SOLO UNA VISTA MONTA ======= */}
          {!isMobile ? (
            /* TABLA (Desktop) */
            <div className="gessoc_box-table">
              <div className="gessoc_header" style={{ width: "100%" }}>
                <div className="gessoc_column-header">Apellido</div>
                <div className="gessoc_column-header">Nombre</div>
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
                  <div
                    key={cascadeKey}
                    className="gessoc_scrollableE gessoc_cascade-animation"
                    style={{ padding: 0, height: listHeight }}
                  >
                    <List
                      key={cascadeKey}
                      height={listHeight}
                      itemCount={sociosFiltrados.length}
                      itemSize={48}
                      width="100%"
                      overscanCount={overscanAll}
                      itemData={itemData}
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
            <div className="gessoc_cards-wrapper" key={cascadeKey}>
              {sociosFiltrados.length > 0 ? (
                sociosFiltrados.map((socio, index) => (
                  <div
                    className={`gessoc_card ${socio._estadoClase}`}
                    key={`card-${socio.id || index}`}
                    onClick={() => onSelect(index, socio)}
                    style={{ animationDelay: `${(index % 20) * 0.03}s` }}
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
                      {socio.observacion && (
                        <div className="gessoc_card-row">
                          <span className="gessoc_card-label">Obs.</span>
                          <span className="gessoc_card-value">{socio.observacion}</span>
                        </div>
                      )}
                    </div>

                    <div className="gessoc_card-actions">
                      <button
                        className="gessoc_action-btn"
                        title="Información"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMostrarInfoSocio(socio);
                        }}
                      >
                        <FontAwesomeIcon icon={faInfoCircle} />
                      </button>
                      <button
                        className="gessoc_action-btn"
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditarSocio(socio);
                        }}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        className="gessoc_action-btn"
                        title="Eliminar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmarEliminar(socio);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      <button
                        className="gessoc_action-btn gessoc_action-danger"
                        title="Dar de baja"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmarBaja(socio);
                        }}
                      >
                        <FontAwesomeIcon icon={faUserMinus} />
                      </button>
                    </div>
                  </div>
                ))
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
        <div className="gessoc_down-container">
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
