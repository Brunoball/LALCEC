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
} from "@fortawesome/free-solid-svg-icons";
import ModalEliminar from "./modales_soc/ModalEliminar";
import ModalInfo from "./modales_soc/ModalInfoSocio";
import ModalBaja from "./modales_soc/ModalBaja";
import BASE_URL from "../../config/config";
import "./GestionarSocios.css";
import Toast from "../global/Toast";

/* ===== utils ===== */
const getSocioId = (s) =>
  s?.id ?? s?.idSocios ?? s?.id_socio ?? s?.idSocio ?? null;

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

/* ===== fila (row) ===== */
const SocioRow = React.memo(
  function SocioRow({ index, style, data }) {
    const {
      items,
      filaSeleccionada,
      onSelect,
      onEdit,
      onDelete,
      onInfo,
      onBaja,
    } = data;
    const socio = items[index];
    const selected = filaSeleccionada === index;

    const rowClass = selected
      ? `gestionarsocios-selected-row gestionarsocios-${socio.estadoPago}`
      : index % 2 === 0
      ? `gestionarsocios-even-row gestionarsocios-${socio.estadoPago}`
      : `gestionarsocios-odd-row gestionarsocios-${socio.estadoPago}`;

    return (
      <div
        style={style}
        className={`gestionarsocios-row ${rowClass}`}
        onClick={() => onSelect(index, socio)}
      >
        <div className="gestionarsocios-column gestionarsocios-column-ape">
          {socio.apellido}
        </div>
        <div className="gestionarsocios-column gestionarsocios-column-nom">
          {socio.nombre}
        </div>
        <div className="gestionarsocios-column gestionarsocios-column-cat">
          {socio.categoria} ${socio.precio_categoria || "0"}
        </div>
        <div className="gestionarsocios-column gestionarsocios-column-mp">
          {socio.medio_pago}
        </div>
        <div className="gestionarsocios-column gestionarsocios-column-dom">
          {socio.domicilio_2}
        </div>
        <div className="gestionarsocios-column gestionarsocios-column-obs">
          {socio.observacion}
        </div>
        <div className="gestionarsocios-column gestionarsocios-icons-column">
          {selected && (
            <div className="gestionarsocios-icons-container">
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="gestionarsocios-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onInfo(socio);
                }}
              />
              <FontAwesomeIcon
                icon={faEdit}
                className="gestionarsocios-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(socio);
                }}
              />
              <FontAwesomeIcon
                icon={faTrash}
                className="gestionarsocios-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(socio);
                }}
              />
              <FontAwesomeIcon
                icon={faUserMinus}
                className="gestionarsocios-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onBaja(socio);
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
  areEqual
);

/* ===== componente principal ===== */
const GestionarSocios = () => {
  const navigate = useNavigate();

  const [socios, setSocios] = useState([]);
  const [mediosDePago, setMediosDePago] = useState([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);

  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [mostrarModalBaja, setMostrarModalBaja] = useState(false);
  const [socioABaja, setSocioABaja] = useState(null);
  const [mostrarModalInfo, setMostrarModalInfo] = useState(false);
  const [infoSocio, setInfoSocio] = useState(null);
  const [mesesPagados, setMesesPagados] = useState([]);

  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [busqueda, setBusqueda] = useState(
    localStorage.getItem("sociosSearchTerm") || ""
  );
  const deferredBusqueda = useDeferredValue(busqueda);

  const [filtrosActivos, setFiltrosActivos] = useState(() => {
    const saved = localStorage.getItem("sociosFilters");
    return saved
      ? JSON.parse(saved)
      : { letras: [], mediosPago: [], todos: false, hasFilters: false };
  });

  const [mostrarMenuFiltros, setMostrarMenuFiltros] = useState(false);
  const [mostrarSubmenuAlfabetico, setMostrarSubmenuAlfabetico] =
    useState(false);
  const [mostrarSubmenuTransferencia, setMostrarSubmenuTransferencia] =
    useState(false);

  const [mostrarToast, setMostrarToast] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");
  const [toastTipo, setToastTipo] = useState("exito");

  const filtrosRef = useRef(null);
  useClickOutside(filtrosRef, () => {
    if (mostrarMenuFiltros) {
      setMostrarMenuFiltros(false);
      setMostrarSubmenuAlfabetico(false);
      setMostrarSubmenuTransferencia(false);
    }
  });

  const windowHeight = useWindowHeight(320); // ajustá según tu header

  /* ===== carga inicial ===== */
  const cargarSocios = useCallback(async () => {
    setCargando(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=todos_socios&tipo=socios`
      );
      if (!response.ok) throw new Error("No se pudo obtener socios");
      const data = await response.json();

      const normalizados = Array.isArray(data.socios)
        ? data.socios.map((s) => ({ id: getSocioId(s), ...s }))
        : [];
      setSocios(normalizados);

      // medios de pago únicos
      const medios = Array.from(
        new Set(normalizados.map((s) => s.medio_pago).filter(Boolean))
      ).sort();
      setMediosDePago(medios);

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarSocios();
  }, [cargarSocios]);

  /* ===== helpers ===== */
  const getEstadoPago = useCallback((mesesPagadosStr, fechaUnion) => {
    let mesesPagos = [];
    if (mesesPagadosStr && mesesPagadosStr !== "-" && mesesPagadosStr !== "NULL") {
      mesesPagos = mesesPagadosStr.split(",").map((m) => m.trim().toUpperCase());
    }
    const mesesAnio = [
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

    if (!fechaUnion || fechaUnion === "0000-00-00") {
      const hoy = new Date();
      const mesActual = hoy.getMonth();
      const mesesEsteAnio = mesesPagos.filter((m) => mesesAnio.includes(m));
      if (mesesEsteAnio.length >= mesActual + 1) return "al-dia";
      if (mesesEsteAnio.length >= mesActual - 1) return "debe-1-2";
      return "debe-3-mas";
    }

    let fechaAlta = new Date(fechaUnion);
    if (isNaN(fechaAlta.getTime())) return "debe-3-mas";

    const hoy = new Date();
    const mesesEsperados = [];
    for (let a = fechaAlta.getFullYear(); a <= hoy.getFullYear(); a++) {
      const desde = a === fechaAlta.getFullYear() ? fechaAlta.getMonth() : 0;
      const hasta = a === hoy.getFullYear() ? hoy.getMonth() : 11;
      for (let m = desde; m <= hasta; m++) mesesEsperados.push(mesesAnio[m]);
    }
    const impagos = mesesEsperados.filter((m) => !mesesPagos.includes(m));
    if (impagos.length === 0) return "al-dia";
    if (impagos.length <= 2) return "debe-1-2";
    return "debe-3-mas";
  }, []);

  const sociosConEstados = useMemo(
    () =>
      socios.map((s) => ({
        ...s,
        estadoPago: getEstadoPago(s.meses_pagados, s.fecha_union),
      })),
    [socios, getEstadoPago]
  );

  // Filtrado en memoria con valor diferido de búsqueda
  const sociosFiltrados = useMemo(() => {
    let resultados = sociosConEstados;

    if (deferredBusqueda?.trim()) {
      const term = deferredBusqueda.toLowerCase();
      resultados = resultados.filter(
        (s) =>
          (s.nombre && s.nombre.toLowerCase().includes(term)) ||
          (s.apellido && s.apellido.toLowerCase().includes(term))
      );
    }
    if (filtrosActivos.letras.length > 0) {
      const setL = new Set(filtrosActivos.letras.map((l) => l.toUpperCase()));
      resultados = resultados.filter((s) =>
        s.apellido ? setL.has(s.apellido[0]?.toUpperCase()) : false
      );
    }
    if (filtrosActivos.mediosPago.length > 0) {
      const setM = new Set(filtrosActivos.mediosPago);
      resultados = resultados.filter((s) => setM.has(s.medio_pago));
    }
    return resultados;
  }, [sociosConEstados, deferredBusqueda, filtrosActivos]);

  /* ===== acciones UI ===== */
  const handleBusquedaInputChange = (e) => {
    const value = e.target.value;
    setBusqueda(value);
    localStorage.setItem("sociosSearchTerm", value);
    if (value.trim() !== "") {
      const reset = { letras: [], mediosPago: [], todos: false, hasFilters: false };
      setFiltrosActivos(reset);
      localStorage.setItem("sociosFilters", JSON.stringify(reset));
    }
  };

  const limpiarFiltros = () => {
    const reset = { letras: [], mediosPago: [], todos: false, hasFilters: false };
    setFiltrosActivos(reset);
    localStorage.setItem("sociosFilters", JSON.stringify(reset));
  };

  const handleFiltrarPorLetra = (letra) => {
    setBusqueda("");
    localStorage.removeItem("sociosSearchTerm");
    setFiltrosActivos((prev) => {
      const inc = prev.letras.includes(letra)
        ? prev.letras.filter((l) => l !== letra)
        : [...prev.letras, letra];
      const next = {
        ...prev,
        letras: inc,
        todos: false,
        hasFilters: inc.length > 0 || prev.mediosPago.length > 0,
      };
      localStorage.setItem("sociosFilters", JSON.stringify(next));
      return next;
    });
  };

  const handleFiltrarPorMedioPago = (medio) => {
    setBusqueda("");
    localStorage.removeItem("sociosSearchTerm");
    setFiltrosActivos((prev) => {
      const inc = prev.mediosPago.includes(medio)
        ? prev.mediosPago.filter((m) => m !== medio)
        : [...prev.mediosPago, medio];
      const next = {
        ...prev,
        mediosPago: inc,
        todos: false,
        hasFilters: inc.length > 0 || prev.letras.length > 0,
      };
      localStorage.setItem("sociosFilters", JSON.stringify(next));
      return next;
    });
  };

  const handleMostrarTodos = () => {
    setBusqueda("");
    localStorage.removeItem("sociosSearchTerm");
    const all = { letras: [], mediosPago: [], todos: true, hasFilters: false };
    setFiltrosActivos(all);
    localStorage.setItem("sociosFilters", JSON.stringify(all));
  };

  const onSelect = (index, socio) => {
    setFilaSeleccionada((prev) => (prev === index ? null : index));
    setSocioSeleccionado(socio);
  };

  const handleEditarSocio = (socio) => {
    const id = getSocioId(socio);
    if (!id) return;
    navigate(`/editarSocio/${id}`);
  };

  const handleConfirmarEliminar = (socio) => {
    setSocioSeleccionado(socio);
    setMostrarModalEliminar(true);
  };

  const handleMostrarInfoSocio = (socio) => {
    const meses = socio.meses_pagados
      ? socio.meses_pagados.split(",").map((m) => m.trim().toUpperCase())
      : [];
    setInfoSocio(socio);
    setMesesPagados(meses);
    setMostrarModalInfo(true);
  };

  const handleConfirmarBaja = (socio) => {
    setSocioABaja(socio);
    setMostrarModalBaja(true);
  };

  const handleCancelarEliminar = () => setMostrarModalEliminar(false);

  const exportarAExcel = () => {
    if (sociosFiltrados.length === 0) {
      setToastMensaje("No hay socios para exportar.");
      setToastTipo("error");
      setMostrarToast(true);
      return;
    }
    const datos = sociosFiltrados.map(({ id, nombre, apellido, ...resto }) => ({
      id,
      apellido,
      nombre,
      ...resto,
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Socios");
    XLSX.writeFile(wb, "Socios.xlsx");
    setToastMensaje("Exportación a Excel completada");
    setToastTipo("exito");
    setMostrarToast(true);
  };

  const handleEliminarSocio = async () => {
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
        setSocios((prev) => prev.filter((s) => getSocioId(s) !== idSel));
        setMostrarModalEliminar(false);
        setToastMensaje("Socio eliminado correctamente");
        setToastTipo("exito");
        setMostrarToast(true);
      } else {
        setToastMensaje(data?.mensaje || "Error al eliminar");
        setToastTipo("error");
        setMostrarToast(true);
      }
    } catch (e) {
      setToastMensaje("Problema al eliminar el socio");
      setToastTipo("error");
      setMostrarToast(true);
    }
  };

  // ⬇️ Recibe (socio, motivo) desde ModalBaja y llama al endpoint
  const handleConfirmarBajaSocio = async (socio, motivo) => {
    const id = getSocioId(socio);
    const m = (motivo || "").trim();

    if (!id || !m) {
      setToastMensaje("Motivo requerido para dar de baja.");
      setToastTipo("error");
      setMostrarToast(true);
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
        // Remover de la lista en memoria
        setSocios((prev) => prev.filter((s) => getSocioId(s) !== id));
        setMostrarModalBaja(false);

        setToastMensaje(result?.mensaje || result?.message || "Socio dado de baja");
        setToastTipo("exito");
        setMostrarToast(true);
      } else {
        setToastMensaje(result?.mensaje || result?.message || "No se pudo dar de baja");
        setToastTipo("error");
        setMostrarToast(true);
      }
    } catch (e) {
      setToastMensaje("Problema al dar de baja");
      setToastTipo("error");
      setMostrarToast(true);
    }
  };

  /* ===== render ===== */
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

  return (
    <div className="gestionarsocios-container">
      <div className="gestionarsocios-box">
        <div className="gestionarsocios-front-row">
          <h2 className="gestionarsocios-title">Gestionar Socios</h2>
          <div className="gestionarsocios-front-row-inner">
            <div className="gestionarsocios-search-bar">
              <input
                id="search"
                type="text"
                placeholder="Buscar por nombre o apellido"
                className="gestionarsocios-search-input"
                value={busqueda}
                onChange={handleBusquedaInputChange}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              {busqueda && (
                <FontAwesomeIcon
                  icon={faTimes}
                  className="gestionarsocios-clear-search-icon"
                  onClick={() => {
                    setBusqueda("");
                    localStorage.removeItem("sociosSearchTerm");
                  }}
                />
              )}
              <button className="gestionarsocios-search-button" onClick={() => {}}>
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="gestionarsocios-icon-button"
                />
              </button>
            </div>

            <div className="gestionarsocios-filtros-container" ref={filtrosRef}>
              <button
                className="gestionarsocios-filtros-button"
                onClick={() => setMostrarMenuFiltros((v) => !v)}
              >
                <FontAwesomeIcon
                  icon={faFilter}
                  className="gestionarsocios-icon-button"
                />
                <span>Aplicar Filtros</span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`gestionarsocios-chevron-icon ${
                    mostrarMenuFiltros ? "rotate" : ""
                  }`}
                />
              </button>

              {mostrarMenuFiltros && (
                <div className="gestionarsocios-filtros-menu">
                  <div
                    className="gestionarsocios-filtros-menu-item"
                    onClick={() =>
                      setMostrarSubmenuAlfabetico((v) => !v)
                    }
                  >
                    <span>Filtrar de la A a la Z</span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`gestionarsocios-chevron-icon ${
                        mostrarSubmenuAlfabetico ? "rotate" : ""
                      }`}
                    />
                  </div>

                  {mostrarSubmenuAlfabetico && (
                    <div className="gestionarsocios-filtros-submenu">
                      <div className="gestionarsocios-alfabeto-filtros">
                        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letra) => (
                          <button
                            key={letra}
                            className={`gestionarsocios-letra-filtro ${
                              filtrosActivos.letras.includes(letra)
                                ? "active"
                                : ""
                            }`}
                            onClick={() => handleFiltrarPorLetra(letra)}
                          >
                            {letra}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className="gestionarsocios-filtros-menu-item"
                    onClick={() =>
                      setMostrarSubmenuTransferencia((v) => !v)
                    }
                  >
                    <span>Medios de Pago</span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`gestionarsocios-chevron-icon ${
                        mostrarSubmenuTransferencia ? "rotate" : ""
                      }`}
                    />
                  </div>

                  {mostrarSubmenuTransferencia && (
                    <div className="gestionarsocios-filtros-submenu">
                      {mediosDePago.map((medio) => (
                        <div
                          key={medio}
                          className="gestionarsocios-filtros-submenu-item"
                          onClick={() => handleFiltrarPorMedioPago(medio)}
                        >
                          {medio}
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className="gestionarsocios-filtros-menu-item gestionarsocios-mostrar-todas"
                    onClick={() => {
                      handleMostrarTodos();
                      setMostrarMenuFiltros(false);
                    }}
                  >
                    <span>Mostrar Todos</span>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="gestionarsocios-error">{error}</p>}
          </div>
        </div>

        {(filtrosActivos.letras.length > 0 ||
          filtrosActivos.mediosPago.length > 0) && (
          <div className="gestionarsocios-filtros-activos-container show">
            <div className="gestionarsocios-filtros-activos">
              <div className="gestionarsocios-filtros-activos-header">
                <span>Filtros aplicados:</span>
              </div>
              <button
                className="gestionarsocios-limpiar-filtros-btn"
                onClick={limpiarFiltros}
              >
                Limpiar todos
              </button>

              <div className="gestionarsocios-filtros-activos-chips">
                {filtrosActivos.letras.map((letra) => (
                  <div key={`letra-${letra}`} className="gestionarsocios-filtro-chip">
                    <span>Letra: {letra}</span>
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="gestionarsocios-filtro-chip-close"
                      onClick={() => handleFiltrarPorLetra(letra)}
                    />
                  </div>
                ))}

                {filtrosActivos.mediosPago.map((medio) => (
                  <div key={`medio-${medio}`} className="gestionarsocios-filtro-chip">
                    <span>Medio: {medio}</span>
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="gestionarsocios-filtro-chip-close"
                      onClick={() => handleFiltrarPorMedioPago(medio)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="gestionarsocios-list">
          <div className="gestionarsocios-contenedor-contadorYiconos">
            <div className="gestionarsocios-contador-container">
              <span className="gestionarsocios-socios-totales">
                Cant socios: {sociosFiltrados.length}
              </span>
            </div>

            <div className="gestionarsocios-estado-pagos-container">
              <div className="gestionarsocios-estado-indicador gestionarsocios-al-dia">
                <div className="gestionarsocios-indicador-color"></div>
                <span>Al día</span>
              </div>
              <div className="gestionarsocios-estado-indicador gestionarsocios-debe-1-2">
                <div className="gestionarsocios-indicador-color"></div>
                <span>Debe 1-2 meses</span>
              </div>
              <div className="gestionarsocios-estado-indicador gestionarsocios-debe-3-mas">
                <div className="gestionarsocios-indicador-color"></div>
                <span>Debe 3+ meses</span>
              </div>
            </div>
          </div>

          <div className="gestionarsocios-box-table">
            <div
              className="gestionarsocios-header"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(120px,1.2fr) minmax(120px,1.2fr) minmax(100px,1fr) minmax(100px,1fr) minmax(150px,1.2fr) minmax(150px,1.2fr) minmax(100px,1fr)",
              }}
            >
              <div className="gestionarsocios-column-header gestionarsocios-header-ape">
                Apellido
              </div>
              <div className="gestionarsocios-column-header gestionarsocios-header-nom">
                Nombre
              </div>
              <div className="gestionarsocios-column-header gestionarsocios-header-cat">
                Cat/precio
              </div>
              <div className="gestionarsocios-column-header gestionarsocios-header-mp">
                Medio de Pago
              </div>
              <div className="gestionarsocios-column-header gestionarsocios-header-dom">
                Domicilio Cobro
              </div>
              <div className="gestionarsocios-column-header gestionarsocios-header-obs">
                Observación
              </div>
              <div className="gestionarsocios-column-header gestionarsocios-icons-column"></div>
            </div>

            <div className="gestionarsocios-body">
              {cargando ? (
                <div className="gestionarsocios-loading-spinner-container">
                  <div className="gestionarsocios-loading-spinner"></div>
                </div>
              ) : sociosFiltrados.length > 0 ? (
                <List
                  height={Math.max(300, windowHeight)}
                  itemCount={sociosFiltrados.length}
                  itemSize={46}
                  width="100%"
                  overscanCount={10}
                  itemData={itemData}
                >
                  {SocioRow}
                </List>
              ) : (
                <div className="gestionarsocios-no-data-container">
                  <button
                    className="gestionarsocios-show-all-button"
                    onClick={handleMostrarTodos}
                  >
                    Mostrar todos los socios
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="gestionarsocios-down-container">
          <div className="gestionarsocios-botones-container">
            <button
              className="gestionarsocios-button gestionarsocios-volver-atras"
              onClick={() => {
                localStorage.removeItem("sociosFilters");
                localStorage.removeItem("sociosSearchTerm");
                navigate(-1);
              }}
            >
              <FontAwesomeIcon
                icon={faArrowLeft}
                className="gestionarsocios-icon-button"
              />
              <p>Volver Atrás</p>
            </button>

            <div className="gestionarsocios-conedor-botones">
              <button className="gestionarsocios-button" onClick={() => navigate("/Agregarsocio")}>
                <FontAwesomeIcon
                  icon={faUserPlus}
                  className="gestionarsocios-icon-button"
                />
                <p>Agregar Socio</p>
              </button>

              <button className="gestionarsocios-button" onClick={exportarAExcel}>
                <FontAwesomeIcon
                  icon={faFileExcel}
                  className="gestionarsocios-icon-button"
                />
                <p>Exportar a Excel</p>
              </button>

              <button
                className="gestionarsocios-button"
                onClick={() => navigate("/socios_baja")}
              >
                <FontAwesomeIcon
                  icon={faUserMinus}
                  className="gestionarsocios-icon-button"
                />
                <p>Dados de Baja</p>
              </button>
            </div>
          </div>
        </div>
      </div>

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
          onConfirmar={handleConfirmarBajaSocio} // <-- recibe (socio, motivo)
        />
      )}

      {mostrarToast && (
        <Toast
          tipo={toastTipo}
          mensaje={toastMensaje}
          onClose={() => setMostrarToast(false)}
          duracion={2500}
        />
      )}
    </div>
  );
};

export default GestionarSocios;
