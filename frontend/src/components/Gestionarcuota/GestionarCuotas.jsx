import React, {
  useState,
  useEffect,
  useMemo,
  memo,
  useRef,
  useCallback,
} from "react";
import { FixedSizeList as List } from "react-window";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPrint,
  faFileExcel,
  faArrowLeft,
  faSearch,
  faDollarSign,
  faTimes,
  faMoneyCheckAlt,
  faFilter,
  faCalendarAlt,
  faUsers,
  faList,
  faCheckCircle,
  faExclamationTriangle,
  faExclamationCircle,
  faCog,
  faCreditCard,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import "./GestionarCuotas.css";

import ModalMesCuotas from "./modalcuotas/ModalMesCuotas";
import ModalPagos from "./modalcuotas/ModalPagos";
import ModalPagosEmpresas from "./modalcuotas/ModalPagosEmpresas";
import ModalEliminarPago from "./modalcuotas/ModalEliminarPago";
import ModalPagosMasivos from "./modalcuotas/ModalPagosMasivos";

import BASE_URL from "../../config/config";
import Toast from "../global/Toast";

import {
  printComprobantesLote,
  printComprobanteItem,
} from "../../utils/comprobantes";

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    const server = error?.response?.data;
    const msg =
      server?.mensaje || server?.error || error.message || "Error en la petición";
    console.error(`HTTP ${status || ""} – ${msg}`, server || error);
    return Promise.reject({ ...error, message: msg, server, status });
  }
);

/* ─────────────────────────────────────────────────────
   Hook: mide el contenedor de la tabla y devuelve la
   altura disponible para la lista virtualizada.
   El ResizeObserver reacciona cada vez que el espacio
   cambia (p.ej. cuando aparece/desaparece la bulk bar).
───────────────────────────────────────────────────── */
function useListHeight(containerRef) {
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const VIRTUAL_HEADER_H = 50; // altura fija de gcuotas-virtual-header

    const update = () => {
      const available = el.clientHeight - VIRTUAL_HEADER_H;
      setHeight(Math.max(available, 200));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return height;
}

/* ─────────────────────────────────────────────────────
   Componentes de estado vacío / carga
───────────────────────────────────────────────────── */
const LoadingIndicator = memo(() => (
  <div className="gcuotas-loading-container">
    <div className="gcuotas-loading-spinner"></div>
    <p>Cargando datos...</p>
  </div>
));

const NoMonthSelected = memo(() => (
  <div className="gcuotas-info-message">
    <FontAwesomeIcon icon={faCalendarAlt} size="3x" />
    <p>Seleccioná un mes para ver datos</p>
  </div>
));

const NoDataFound = memo(() => (
  <div className="gcuotas-info-message">
    <FontAwesomeIcon icon={faExclamationCircle} size="3x" />
    <p>No se encontraron datos para los filtros seleccionados</p>
  </div>
));

const NoFiltersApplied = memo(() => (
  <div className="gcuotas-info-message">
    <FontAwesomeIcon icon={faFilter} size="3x" />
    <p>Aplique filtros para ver los datos</p>
    <small>
      Seleccione <strong>año</strong> y <strong>mes</strong>, y opcionalmente
      medio de pago o búsqueda.
    </small>
  </div>
));

/* ─────────────────────────────────────────────────────
   Outer de react-window: agrega clase cuando hay scroll
───────────────────────────────────────────────────── */
const Outer = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  const localRef = useRef(null);

  const setRef = (node) => {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const update = () => {
      const hasScroll = el.scrollHeight > el.clientHeight + 1;
      el.classList.toggle("gcuotas-viewport-hasscroll", hasScroll);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={setRef} className={`gcuotas-viewport ${className || ""}`} {...rest} />
  );
});

/* ─────────────────────────────────────────────────────
   Fila virtualizada
───────────────────────────────────────────────────── */
const Row = memo(
  ({
    index, style, data, selectedId, viewType, activeTab,
    onRowClick, onPaymentClick, onPrintClick, onDeletePaymentClick,
    getItemId, bulkMode, bulkSelectedIds, onBulkToggle,
  }) => {
    const item = data[index];
    const itemId = item ? getItemId(item) : null;
    const isBulkSelected = bulkMode && itemId != null && bulkSelectedIds?.has(itemId);
    const isSelected = bulkMode
      ? isBulkSelected
      : selectedId != null && itemId != null && selectedId === itemId;

    const rowClass = [
      "gcuotas-virtual-row",
      viewType === "empresa" ? "gempresas" : "gsocios",
      isSelected ? (bulkMode ? "gcuotas-bulk-selected-row" : "gcuotas-selected-row") : "",
    ].filter(Boolean).join(" ");

    const actionButtons = useMemo(() => {
      if (bulkMode || !isSelected) return null;
      return (
        <div className="gcuotas-actions-inline">
          <button className="gcuotas-action-button gcuotas-print-button"
            onClick={(e) => { e.stopPropagation(); onPrintClick(item); }}
            title="Imprimir comprobante">
            <FontAwesomeIcon icon={faPrint} />
          </button>
          {activeTab === "deudores" && (
            <button className="gcuotas-action-button gcuotas-payment-button"
              onClick={(e) => { e.stopPropagation(); onPaymentClick(item); }}
              title="Registrar pago">
              <FontAwesomeIcon icon={faDollarSign} />
            </button>
          )}
          {activeTab === "pagado" && (
            <button className="gcuotas-action-button gcuotas-deletepay-button"
              onClick={(e) => { e.stopPropagation(); onDeletePaymentClick(item); }}
              title="Eliminar pago">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
      );
    }, [activeTab, bulkMode, isSelected, item, onPaymentClick, onPrintClick, onDeletePaymentClick]);

    if (!item || (!item.apellido && !item.razon_social)) {
      return (
        <div style={style} className={`${rowClass} gcuotas-loading-row`}>
          {bulkMode && <div className="gcuotas-virtual-cell gcuotas-bulk-check-cell" />}
          <div className="gcuotas-virtual-cell">Cargando...</div>
          {viewType === "socio" && <div className="gcuotas-virtual-cell" />}
          <div className="gcuotas-virtual-cell" /><div className="gcuotas-virtual-cell" />
          <div className="gcuotas-virtual-cell" />
        </div>
      );
    }

    return (
      <div style={style} className={rowClass}
        onClick={() => { if (!item) return; bulkMode ? onBulkToggle(item) : onRowClick(item); }}>
        {bulkMode && (
          <div className="gcuotas-virtual-cell gcuotas-bulk-check-cell">
            <label className="gcuotas-checkbox-wrap" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" className="gcuotas-checkbox"
                checked={!!isBulkSelected} onChange={() => onBulkToggle(item)} />
              <span className="gcuotas-checkbox-box" />
            </label>
          </div>
        )}
        {viewType === "socio" ? (
          <>
            <div className="gcuotas-virtual-cell">{item.apellido}</div>
            <div className="gcuotas-virtual-cell">{item.nombre}</div>
            <div className="gcuotas-virtual-cell">{item.displayCategoriaPrecio}</div>
            <div className="gcuotas-virtual-cell">{item.medio_pago || "-"}</div>
            <div className="gcuotas-virtual-cell gcuotas-virtual-actions">{actionButtons}</div>
          </>
        ) : (
          <>
            <div className="gcuotas-virtual-cell">{item.razon_social}</div>
            <div className="gcuotas-virtual-cell">{item.displayCategoriaPrecio}</div>
            <div className="gcuotas-virtual-cell">{item.medio_pago || "-"}</div>
            <div className="gcuotas-virtual-cell gcuotas-virtual-actions">{actionButtons}</div>
          </>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.index === next.index &&
    prev.style === next.style &&
    prev.data === next.data &&
    prev.selectedId === next.selectedId &&
    prev.viewType === next.viewType &&
    prev.activeTab === next.activeTab &&
    prev.bulkMode === next.bulkMode &&
    prev.bulkSelectedIds === next.bulkSelectedIds
);

/* ─────────────────────────────────────────────────────
   Tabla desktop separada como componente propio.
   useListHeight vive aquí: mide el wrapper y calcula
   el height real disponible para el List en todo momento.
───────────────────────────────────────────────────── */
const TablaDesktop = memo(({
  viewType, datosFiltrados, datosFiltradosPaginated,
  activeTab, selectedId, hasMore, isLoading,
  handleRowClick, handlePaymentClick, handlePrintClick, handleDeletePaymentClick,
  getItemId, itemKey, bulkMode, selectedIdsBulkSet,
  handleBulkToggle, selectedVisibleCount,
  handleAddFilteredToBulk, handleRemoveFilteredFromBulk,
  loadMoreItems, listRef, scrollOffsetRef,
}) => {
  const containerRef = useRef(null);
  const listHeight = useListHeight(containerRef);

  return (
    <div ref={containerRef} className="gcuotas-virtual-tables">

      {/* Cabecera de columnas */}
      <div className={`gcuotas-virtual-header ${viewType === "empresa" ? "gempresas" : "gsocios"}`}>
        {bulkMode && (
          <div className="gcuotas-virtual-cell gcuotas-bulk-check-cell">
            <label className="gcuotas-checkbox-wrap">
              <input type="checkbox" className="gcuotas-checkbox"
                checked={datosFiltrados.length > 0 && selectedVisibleCount === datosFiltrados.length}
                onChange={() => {
                  if (selectedVisibleCount === datosFiltrados.length) handleRemoveFilteredFromBulk();
                  else handleAddFilteredToBulk();
                }}
              />
              <span className="gcuotas-checkbox-box" />
            </label>
          </div>
        )}
        {viewType === "socio" ? (
          <>
            <div className="gcuotas-virtual-cell">Apellido</div>
            <div className="gcuotas-virtual-cell">Nombre</div>
            <div className="gcuotas-virtual-cell">Categoría</div>
            <div className="gcuotas-virtual-cell">Medio Pago</div>
            <div className="gcuotas-virtual-cell">Acciones</div>
          </>
        ) : (
          <>
            <div className="gcuotas-virtual-cell">Razón Social</div>
            <div className="gcuotas-virtual-cell">Categoría</div>
            <div className="gcuotas-virtual-cell">Medio Pago</div>
            <div className="gcuotas-virtual-cell">Acciones</div>
          </>
        )}
      </div>

      {/* Lista — altura dinámica, nunca fija */}
      <List
        ref={listRef}
        height={listHeight}
        itemCount={datosFiltradosPaginated.length + (hasMore ? 1 : 0)}
        itemSize={50}
        itemData={datosFiltradosPaginated}
        width="100%"
        outerElementType={Outer}
        itemKey={itemKey}
        onScroll={({ scrollOffset }) => { scrollOffsetRef.current = scrollOffset; }}
        onItemsRendered={({ visibleStopIndex }) => {
          if (visibleStopIndex >= datosFiltradosPaginated.length - 5 && hasMore) loadMoreItems();
        }}
      >
        {(props) => {
          if (props.index >= datosFiltradosPaginated.length)
            return <div style={props.style} className="gcuotas-loading-row" />;
          return (
            <Row
              {...props}
              selectedId={selectedId}
              viewType={viewType}
              activeTab={activeTab}
              onRowClick={handleRowClick}
              onPaymentClick={handlePaymentClick}
              onPrintClick={handlePrintClick}
              onDeletePaymentClick={handleDeletePaymentClick}
              getItemId={getItemId}
              bulkMode={bulkMode}
              bulkSelectedIds={selectedIdsBulkSet}
              onBulkToggle={handleBulkToggle}
            />
          );
        }}
      </List>

      {isLoading && (
        <div className="gcuotas-table-overlay-loading">
          <div className="gcuotas-loading-spinner" /><span>Cargando…</span>
        </div>
      )}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
const GestionarCuotas = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("pagado");
  const [viewType, setViewType] = useState("socio");

  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [meses, setMeses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [mediosPago, setMediosPago] = useState([]);
  const [selectedMedioPago, setSelectedMedioPago] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [sociosPagados, setSociosPagados] = useState([]);
  const [sociosDeudores, setSociosDeudores] = useState([]);
  const [empresasPagadas, setEmpresasPagadas] = useState([]);
  const [empresasDeudoras, setEmpresasDeudoras] = useState([]);

  const [mostrarModalMes, setMostrarModalMes] = useState(false);
  const [mesesSeleccionadosImpresion, setMesesSeleccionadosImpresion] = useState([]);
  const [modoImpresionIndividual, setModoImpresionIndividual] = useState(false);
  const [selectedItemData, setSelectedItemData] = useState(null);

  const [mostrarModalPagoSocio, setMostrarModalPagoSocio] = useState(false);
  const [mostrarModalPagoEmpresa, setMostrarModalPagoEmpresa] = useState(false);
  const [mostrarModalPagoMasivo, setMostrarModalPagoMasivo] = useState(false);
  const [itemsPagoMasivo, setItemsPagoMasivo] = useState([]);
  const [mostrarModalEliminarPago, setMostrarModalEliminarPago] = useState(false);
  const [itemEliminarPago, setItemEliminarPago] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIdsBulk, setSelectedIdsBulk] = useState([]);

  const [loading, setLoading] = useState({
    socios: false, empresas: false, meses: false, years: false, mediosPago: false,
  });
  const [toast, setToast] = useState({ show: false, tipo: "", mensaje: "", duracion: 3000 });

  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef(null);
  const scrollOffsetRef = useRef(0);

  const cacheRef = useRef({
    socios: { pagado: {}, deudor: {}, lastUpdated: {} },
    empresas: { pagado: {}, deudor: {}, lastUpdated: {} },
    meses: {}, years: null, mediosPago: [],
    cacheDuration: 30 * 60 * 1000,
  });

  const isClient = typeof window !== "undefined";
  const isMobileRef = useRef(isClient ? window.innerWidth <= 768 : false);
  const [isMobile, setIsMobile] = useState(isMobileRef.current);

  useEffect(() => {
    if (!isClient) return;
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isClient]);

  const showToast = useCallback(
    (tipo, mensaje, duracion = 3000) => setToast({ show: true, tipo, mensaje, duracion }), []
  );
  const hideToast = useCallback(() => setToast((p) => ({ ...p, show: false })), []);
  const showErrorToast   = useCallback((m) => showToast("error", m), [showToast]);
  const showSuccessToast = useCallback((m) => showToast("exito", m), [showToast]);
  const showWarningToast = useCallback((m) => showToast("advertencia", m), [showToast]);

  const getItemId = useCallback((item) => {
    if (!item) return null;
    if (viewType === "socio")
      return item.idSocios ?? item.id_socio ?? item.id ?? item.idSocio ?? null;
    return item.idEmp ?? item.id_empresa ?? item.idEmpresa ?? item.id ?? null;
  }, [viewType]);

  const selectedIdsBulkSet = useMemo(() => new Set(selectedIdsBulk), [selectedIdsBulk]);

  const formatData = useCallback((data) => {
    const arr = Array.isArray(data) ? data : [];
    return arr.map((item) => ({
      ...item,
      displayCategoriaPrecio:
        `${item.categoria || "-"} ${item.precio_categoria ? `$${item.precio_categoria}` : "-"}`,
    }));
  }, []);

  // ── Fetch años ──
  const fetchYears = useCallback(async () => {
    setLoading((p) => ({ ...p, years: true }));
    try {
      const data = await api.get("/api.php?action=anios_pagos");
      const lista = Array.isArray(data) ? data : Array.isArray(data?.anios) ? data.anios : [];
      const norm = lista
        .map((a) => (typeof a === "object" ? a.anio ?? a.year ?? a.y ?? a.value : a))
        .filter((v) => v != null).map((n) => parseInt(n, 10)).sort((a, b) => b - a);
      cacheRef.current.years = norm;
      setYears(norm);
      const current = new Date().getFullYear();
      setSelectedYear((prev) => {
        if (!prev) return norm.includes(current) ? String(current) : norm.length ? String(norm[0]) : "";
        if (!norm.includes(parseInt(prev, 10)))
          return norm.includes(current) ? String(current) : norm.length ? String(norm[0]) : "";
        return prev;
      });
    } catch (e) {
      showErrorToast(e.message || "No se pudieron cargar los años");
    } finally {
      setLoading((p) => ({ ...p, years: false }));
    }
  }, [showErrorToast]);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  // ── Fetch meses ──
  useEffect(() => {
    const fetchMeses = async () => {
      if (!selectedYear) { setMeses([]); return; }
      const key = selectedYear;
      if (Array.isArray(cacheRef.current.meses[key]) && cacheRef.current.meses[key].length) {
        let lista = cacheRef.current.meses[key];
        if (selectedMonth && !lista.some((m) => m.mes === selectedMonth))
          lista = [{ mes: selectedMonth, _extra: true }, ...lista];
        setMeses(lista); return;
      }
      setLoading((p) => ({ ...p, meses: true }));
      try {
        const data = await api.get(`/api.php?action=meses_pagos&anio=${encodeURIComponent(selectedYear)}`);
        let lista = Array.isArray(data) ? data : Array.isArray(data?.meses) ? data.meses : [];
        cacheRef.current.meses[key] = lista;
        if (selectedMonth && !lista.some((m) => m.mes === selectedMonth))
          lista = [{ mes: selectedMonth, _extra: true }, ...lista];
        setMeses(lista);
      } catch (error) {
        showErrorToast(error.message || "Error al cargar los meses disponibles");
      } finally {
        setLoading((p) => ({ ...p, meses: false }));
      }
    };
    fetchMeses();
  }, [selectedYear, selectedMonth, showErrorToast]);

  // ── Fetch medios de pago ──
  useEffect(() => {
    const fetchMediosPago = async () => {
      if (cacheRef.current.mediosPago.length > 0) { setMediosPago(cacheRef.current.mediosPago); return; }
      setLoading((p) => ({ ...p, mediosPago: true }));
      try {
        const data = await api.get("/api.php?action=obtener_datos");
        const raw = Array.isArray(data?.mediosPago) ? data.mediosPago : [];
        const mediosAdaptados = raw
          .map((item) => ({
            id: item.IdMedios_pago ?? item.id ?? item.idMedios_pago ?? item.id_medios_pago ?? null,
            nombre: item.Medio_Pago ?? item.medio_pago ?? item.nombre ?? "",
          })).filter((m) => m.nombre);
        cacheRef.current.mediosPago = mediosAdaptados;
        setMediosPago(mediosAdaptados);
      } catch (error) {
        showErrorToast(error.message || "Error al cargar los medios de pago");
      } finally {
        setLoading((p) => ({ ...p, mediosPago: false }));
      }
    };
    fetchMediosPago();
  }, [showErrorToast]);

  const cacheKey = (anio, mes) => `${anio || ""}|${mes || ""}`;

  // ── Cargar socios ──
  const cargarDatosPorMesSocios = useCallback(async (anio, mes, force = false) => {
    if (!anio || !mes || loading.socios) return;
    const key = cacheKey(anio, mes);
    const cache = cacheRef.current.socios;
    const isValid = !force && cache.lastUpdated[key] &&
      Date.now() - cache.lastUpdated[key] < cacheRef.current.cacheDuration;
    if (isValid && cache.pagado[key] && cache.deudor[key]) {
      setSociosPagados(cache.pagado[key]); setSociosDeudores(cache.deudor[key]); return;
    }
    setLoading((p) => ({ ...p, socios: true }));
    try {
      const qp = `&anio=${encodeURIComponent(anio)}`;
      const [pagados, deudores] = await Promise.all([
        api.get(`/api.php?action=cuotas&tipo=socio&estado=pagado&mes=${encodeURIComponent(mes)}${qp}`),
        api.get(`/api.php?action=cuotas&tipo=socio&estado=deudor&mes=${encodeURIComponent(mes)}${qp}`),
      ]);
      const p = formatData(pagados), d = formatData(deudores);
      cache.pagado[key] = p; cache.deudor[key] = d; cache.lastUpdated[key] = Date.now();
      setSociosPagados(p); setSociosDeudores(d);
    } catch (e) { showErrorToast(e.message || "Error al cargar datos de socios"); }
    finally { setLoading((p) => ({ ...p, socios: false })); }
  }, [formatData, loading.socios, showErrorToast]);

  // ── Cargar empresas ──
  const cargarDatosEmpresasPorMes = useCallback(async (anio, mes, force = false) => {
    if (!anio || !mes || loading.empresas) return;
    const key = cacheKey(anio, mes);
    const cache = cacheRef.current.empresas;
    const isValid = !force && cache.lastUpdated[key] &&
      Date.now() - cache.lastUpdated[key] < cacheRef.current.cacheDuration;
    if (isValid && cache.pagado[key] && cache.deudor[key]) {
      setEmpresasPagadas(cache.pagado[key]); setEmpresasDeudoras(cache.deudor[key]); return;
    }
    setLoading((p) => ({ ...p, empresas: true }));
    try {
      const qp = `&anio=${encodeURIComponent(anio)}`;
      const [pagadas, deudoras] = await Promise.all([
        api.get(`/api.php?action=cuotas&tipo=empresa&estado=pagado&mes=${encodeURIComponent(mes)}${qp}`),
        api.get(`/api.php?action=cuotas&tipo=empresa&estado=deudor&mes=${encodeURIComponent(mes)}${qp}`),
      ]);
      const p = formatData(pagadas), d = formatData(deudoras);
      cache.pagado[key] = p; cache.deudor[key] = d; cache.lastUpdated[key] = Date.now();
      setEmpresasPagadas(p); setEmpresasDeudoras(d);
    } catch (e) { showErrorToast(e.message || "Error al cargar datos de empresas"); }
    finally { setLoading((p) => ({ ...p, empresas: false })); }
  }, [formatData, loading.empresas, showErrorToast]);

  // ── Filtrado ──
  const filterDataGeneric = useCallback((arr) => {
    if (!arr || arr.length === 0) return [];
    let filtered = [...arr];
    if (selectedMedioPago) {
      const ml = selectedMedioPago.toLowerCase();
      filtered = filtered.filter((i) => (i.medio_pago || "").toLowerCase() === ml);
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter((i) =>
        viewType === "socio"
          ? (i.apellido || "").toLowerCase().includes(t) || (i.nombre || "").toLowerCase().includes(t)
          : (i.razon_social || "").toLowerCase().includes(t)
      );
    }
    return filtered;
  }, [selectedMedioPago, searchTerm, viewType]);

  const datosCrudosBase = useMemo(() => {
    if (viewType === "socio") return activeTab === "pagado" ? sociosPagados : sociosDeudores;
    return activeTab === "pagado" ? empresasPagadas : empresasDeudoras;
  }, [viewType, activeTab, sociosPagados, sociosDeudores, empresasPagadas, empresasDeudoras]);

  const filtrosCompletos = useMemo(() => Boolean(selectedYear && selectedMonth), [selectedYear, selectedMonth]);

  const datosFiltrados = useMemo(() => {
    if (!filtrosCompletos || datosCrudosBase.length === 0) return [];
    return filterDataGeneric(datosCrudosBase);
  }, [filtrosCompletos, datosCrudosBase, filterDataGeneric]);

  const selectedItemsBulk = useMemo(() => {
    if (!bulkMode || selectedIdsBulk.length === 0) return [];
    const ids = new Set(selectedIdsBulk);
    return datosCrudosBase.filter((item) => ids.has(getItemId(item)));
  }, [bulkMode, selectedIdsBulk, datosCrudosBase, getItemId]);

  const selectedVisibleCount = useMemo(() => {
    if (!bulkMode || selectedIdsBulk.length === 0) return 0;
    return datosFiltrados.reduce(
      (acc, item) => acc + (selectedIdsBulkSet.has(getItemId(item)) ? 1 : 0), 0
    );
  }, [bulkMode, selectedIdsBulk.length, datosFiltrados, getItemId, selectedIdsBulkSet]);

  const hiddenSelectedCount = useMemo(
    () => Math.max(selectedIdsBulk.length - selectedVisibleCount, 0),
    [selectedIdsBulk.length, selectedVisibleCount]
  );

  const countPagados = useMemo(() => {
    if (!filtrosCompletos) return 0;
    return filterDataGeneric(viewType === "socio" ? sociosPagados : empresasPagadas).length;
  }, [filtrosCompletos, viewType, sociosPagados, empresasPagadas, filterDataGeneric]);

  const countDeudores = useMemo(() => {
    if (!filtrosCompletos) return 0;
    return filterDataGeneric(viewType === "socio" ? sociosDeudores : empresasDeudoras).length;
  }, [filtrosCompletos, viewType, sociosDeudores, empresasDeudoras, filterDataGeneric]);

  const datosFiltradosPaginated = useMemo(
    () => datosFiltrados.slice(0, offset + limit),
    [datosFiltrados, offset, limit]
  );

  const loadMoreItems = useCallback(() => {
    if (!hasMore || loading.socios || loading.empresas) return;
    if (offset + limit < datosFiltrados.length) setOffset((p) => p + limit);
    else setHasMore(false);
  }, [hasMore, loading.socios, loading.empresas, offset, limit, datosFiltrados.length]);

  const observer = useRef();
  const lastItemRef = useCallback((node) => {
    if (loading.socios || loading.empresas) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) loadMoreItems();
    });
    if (node) observer.current.observe(node);
  }, [loading.socios, loading.empresas, hasMore, loadMoreItems]);

  useEffect(() => {
    setOffset(0); setHasMore(true);
    scrollOffsetRef.current = 0;
    listRef.current?.scrollTo(0);
    setSelectedId(null);
  }, [selectedYear, selectedMonth, viewType, activeTab]);

  useEffect(() => { setOffset(0); setHasMore(true); }, [selectedMedioPago, searchTerm]);

  useEffect(() => {
    if (selectedId == null) return;
    if (!datosFiltradosPaginated.some((it) => getItemId(it) === selectedId)) setSelectedId(null);
  }, [datosFiltradosPaginated, selectedId, getItemId]);

  useEffect(() => {
    setSelectedIdsBulk([]); setItemsPagoMasivo([]);
    if (activeTab !== "deudores") setBulkMode(false);
  }, [selectedYear, selectedMonth, viewType, activeTab]);

  useEffect(() => {
    if (!bulkMode) return;
    const validIds = new Set(datosCrudosBase.map((item) => getItemId(item)).filter((id) => id != null));
    setSelectedIdsBulk((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [bulkMode, datosCrudosBase, getItemId]);

  useEffect(() => {
    if (!filtrosCompletos) {
      setSociosPagados([]); setSociosDeudores([]);
      setEmpresasPagadas([]); setEmpresasDeudoras([]);
      setSelectedId(null); return;
    }
    if (viewType === "socio") cargarDatosPorMesSocios(selectedYear, selectedMonth);
    else cargarDatosEmpresasPorMes(selectedYear, selectedMonth);
  }, [viewType, filtrosCompletos, selectedYear, selectedMonth, cargarDatosPorMesSocios, cargarDatosEmpresasPorMes]);

  // ── Handlers ──
  const handleVolverAtras = useCallback(() => navigate(-1), [navigate]);
  const handleYearChange = useCallback((e) => setSelectedYear(e.target.value), []);
  const handleMonthChange = useCallback((e) => setSelectedMonth(e.target.value), []);
  const handleMedioPagoChange = useCallback((e) => setSelectedMedioPago(e.target.value), []);
  const handleSearchChange = useCallback((e) => {
    if (!selectedMonth || !selectedYear) return;
    setSearchTerm(e.target.value);
  }, [selectedMonth, selectedYear]);

  const handleRowClick = useCallback((item) => {
    const id = getItemId(item);
    if (!id || bulkMode) return;
    setSelectedId((prev) => (prev === id ? null : id));
  }, [getItemId, bulkMode]);

  const handleToggleBulkMode = useCallback(() => {
    setBulkMode((prev) => {
      const next = !prev;
      if (!next) { setSelectedIdsBulk([]); setItemsPagoMasivo([]); }
      return next;
    });
    setSelectedId(null);
    scrollOffsetRef.current = 0;
    listRef.current?.scrollTo(0);
  }, []);

  const handleBulkToggle = useCallback((item) => {
    const id = getItemId(item);
    if (!id) return;
    setSelectedIdsBulk((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, [getItemId]);

  const handleAddFilteredToBulk = useCallback(() => {
    const ids = datosFiltrados.map((item) => getItemId(item)).filter((id) => id != null);
    if (!ids.length) return;
    setSelectedIdsBulk((prev) => Array.from(new Set([...prev, ...ids])));
  }, [datosFiltrados, getItemId]);

  const handleRemoveFilteredFromBulk = useCallback(() => {
    const visibleIds = new Set(datosFiltrados.map((item) => getItemId(item)).filter((id) => id != null));
    setSelectedIdsBulk((prev) => prev.filter((id) => !visibleIds.has(id)));
  }, [datosFiltrados, getItemId]);

  const handleClearBulkSelection = useCallback(() => {
    setSelectedIdsBulk([]); setItemsPagoMasivo([]);
  }, []);

  const handlePaymentClick = useCallback((item) => {
    setSelectedItemData(item);
    const hasCategoria = !!item?.categoria && String(item.categoria).trim() !== "";
    const hasPrecio    = !!item?.precio_categoria && Number(item.precio_categoria) > 0;
    if (!hasCategoria || !hasPrecio) {
      showErrorToast(`${viewType === "socio" ? "El socio" : "La empresa"} no tiene categoría asignada.`);
      setSelectedItemData(null); return;
    }
    if (viewType === "socio") setMostrarModalPagoSocio(true);
    else setMostrarModalPagoEmpresa(true);
  }, [viewType, showErrorToast]);

  const handleAbrirModalPagoMasivo = useCallback(() => {
    if (!selectedYear || !selectedMonth) { showWarningToast("Seleccioná año y mes antes de registrar pagos masivos."); return; }
    if (!selectedItemsBulk.length) { showWarningToast("Seleccioná al menos un registro."); return; }
    const validos = selectedItemsBulk.filter((item) =>
      !!item?.categoria && String(item.categoria).trim() !== "" &&
      !!item?.precio_categoria && Number(item.precio_categoria) > 0
    );
    const omitidos = selectedItemsBulk.length - validos.length;
    if (!validos.length) { showErrorToast("Ninguno tiene categoría válida."); return; }
    if (omitidos > 0) showWarningToast(`Se omitirán ${omitidos} registro(s) sin categoría válida.`);
    setItemsPagoMasivo(validos);
    setMostrarModalPagoMasivo(true);
  }, [selectedYear, selectedMonth, selectedItemsBulk, showWarningToast, showErrorToast]);

  const refreshCacheBucketForCurrent = useCallback((tipo) => {
    const k = cacheKey(selectedYear, selectedMonth);
    const bucket = tipo === "socio" ? cacheRef.current.socios : cacheRef.current.empresas;
    delete bucket.pagado[k]; delete bucket.deudor[k]; delete bucket.lastUpdated[k];
  }, [selectedYear, selectedMonth]);

  const restoreScroll = useCallback(() => {
    requestAnimationFrame(() => { listRef.current?.scrollTo(scrollOffsetRef.current || 0); });
  }, []);

  const handlePagoRealizado = useCallback(async () => {
    try {
      showSuccessToast("Pago registrado correctamente");
      if (selectedYear && selectedMonth) refreshCacheBucketForCurrent(viewType);
      if (viewType === "socio") await cargarDatosPorMesSocios(selectedYear, selectedMonth, true);
      else await cargarDatosEmpresasPorMes(selectedYear, selectedMonth, true);
      await fetchYears(); restoreScroll();
    } catch (error) {
      showErrorToast(error.message || "Pago registrado pero hubo un error al refrescar");
    } finally {
      setMostrarModalPagoSocio(false); setMostrarModalPagoEmpresa(false);
      setMostrarModalPagoMasivo(false); setSelectedItemData(null);
      setItemsPagoMasivo([]); setSelectedIdsBulk([]); setBulkMode(false);
    }
  }, [selectedYear, selectedMonth, viewType, cargarDatosPorMesSocios, cargarDatosEmpresasPorMes,
      showSuccessToast, showErrorToast, refreshCacheBucketForCurrent, fetchYears, restoreScroll]);

  const handleDeletePaymentClick = useCallback((item) => {
    if (!selectedMonth || !selectedYear) { showWarningToast("Seleccioná año y mes para poder eliminar el pago."); return; }
    setItemEliminarPago({ ...item, tipo: viewType, mes: selectedMonth });
    setMostrarModalEliminarPago(true);
  }, [selectedMonth, selectedYear, viewType, showWarningToast]);

  const handleEliminarPagoConfirmado = useCallback(async () => {
    if (!itemEliminarPago) return;
    try {
      setLoading((p) => ({
        ...p,
        socios:   itemEliminarPago.tipo === "socio"   ? true : p.socios,
        empresas: itemEliminarPago.tipo === "empresa" ? true : p.empresas,
      }));
      const idPago  = itemEliminarPago.idPago ?? itemEliminarPago.id_pago ?? null;
      const idSocio = itemEliminarPago.idSocios ?? itemEliminarPago.id ?? itemEliminarPago.id_socio ?? null;
      const idEmp   = itemEliminarPago.idEmp ?? itemEliminarPago.idEmpresa ?? itemEliminarPago.id ?? itemEliminarPago.id_empresa ?? null;
      const id      = itemEliminarPago.tipo === "socio" ? idSocio : idEmp;
      const periodo = (cacheRef.current.meses[selectedYear] || []).find(
        (m) => m.mes === (itemEliminarPago.mes || selectedMonth)
      );
      const idMes = periodo?.idMes ?? periodo?.id_mes ?? null;
      const res = await api.post("/api.php?action=eliminar_pago", {
        tipo: itemEliminarPago.tipo, mes: itemEliminarPago.mes,
        id_pago: idPago, id, idMes, anio: selectedYear || undefined,
      });
      if (res?.ok) {
        showSuccessToast(res?.mensaje || "Pago eliminado correctamente");
        refreshCacheBucketForCurrent(itemEliminarPago.tipo);
        if (itemEliminarPago.tipo === "socio") await cargarDatosPorMesSocios(selectedYear, selectedMonth, true);
        else await cargarDatosEmpresasPorMes(selectedYear, selectedMonth, true);
        await fetchYears(); restoreScroll();
      } else { showErrorToast(res?.mensaje || "No se pudo eliminar el pago"); }
    } catch (err) { showErrorToast(err?.message || "Error al eliminar el pago"); }
    finally {
      setLoading((p) => ({ ...p, socios: false, empresas: false }));
      setMostrarModalEliminarPago(false); setItemEliminarPago(null);
    }
  }, [itemEliminarPago, selectedYear, selectedMonth, cargarDatosPorMesSocios, cargarDatosEmpresasPorMes,
      showSuccessToast, showErrorToast, refreshCacheBucketForCurrent, fetchYears, restoreScroll]);

  const requireYearMonthOrWarn = useCallback(() => {
    if (!selectedYear || !selectedMonth) { showWarningToast("Seleccioná año y mes antes de continuar"); return false; }
    if (loading.socios || loading.empresas) { showWarningToast("Esperá a que terminen de cargarse los datos"); return false; }
    if (!datosFiltrados.length) { showWarningToast("No hay datos"); return false; }
    return true;
  }, [selectedYear, selectedMonth, loading.socios, loading.empresas, datosFiltrados.length, showWarningToast]);

  const handleExportExcel = useCallback(() => {
    if (!requireYearMonthOrWarn()) return;
    const ws = XLSX.utils.json_to_sheet(datosFiltrados.map((item) => ({
      ...item, Año: selectedYear, Mes: selectedMonth,
      Tipo: activeTab === "pagado" ? "Pagados" : "Deudores",
      MedioPago: selectedMedioPago || "Todos",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, viewType === "socio" ? "Socios" : "Empresas");
    XLSX.writeFile(wb, `${viewType}_${selectedYear}_${selectedMonth}_${activeTab}_${selectedMedioPago || "todos"}.xlsx`);
  }, [requireYearMonthOrWarn, datosFiltrados, selectedYear, selectedMonth, activeTab, selectedMedioPago, viewType]);

  const handleImprimirRegistro = useCallback(() => {
    if (!requireYearMonthOrWarn()) return;
    const content = `<html><head><meta charset="utf-8"/><title>Registro</title>
      <style>body{font-family:Arial,sans-serif;}table{width:100%;border-collapse:collapse;margin-top:20px;}
      th,td{border:1px solid #ddd;padding:8px;}th{background:#0288d1;color:#fff;}
      tr:nth-child(even){background:#f9f9f9;}</style></head><body>
      <h2>${activeTab === "pagado" ? "Pagados" : "Deudores"} — Año: ${selectedYear} | Mes: ${selectedMonth}</h2>
      ${selectedMedioPago ? `<h3>Medio de Pago: ${selectedMedioPago}</h3>` : ""}
      <table><thead><tr>${viewType === "socio"
        ? "<th>APELLIDO</th><th>NOMBRE</th><th>MEDIO PAGO</th>"
        : "<th>EMPRESA</th><th>MEDIO PAGO</th>"}</tr></thead>
      <tbody>${datosFiltrados.map((item) => viewType === "socio"
        ? `<tr><td>${item.apellido||""}</td><td>${item.nombre||""}</td><td>${item.medio_pago||"-"}</td></tr>`
        : `<tr><td>${item.razon_social||""}</td><td>${item.medio_pago||"-"}</td></tr>`
      ).join("")}</tbody></table></body></html>`;
    const w = window.open("", "Imprimir", "width=800,height=600");
    if (!w) return;
    w.document.write(content); w.document.close(); w.focus(); w.print();
  }, [requireYearMonthOrWarn, activeTab, selectedYear, selectedMonth, selectedMedioPago, viewType, datosFiltrados]);

  const handleAbrirModalImpresion = useCallback(() => {
    if (!requireYearMonthOrWarn()) return;
    setMesesSeleccionadosImpresion([selectedMonth]);
    setModoImpresionIndividual(false); setSelectedItemData(null); setMostrarModalMes(true);
  }, [requireYearMonthOrWarn, selectedMonth]);

  const handlePrintClick = useCallback((item) => {
    if (!selectedYear || !selectedMonth) { showWarningToast("Seleccioná año y mes antes de imprimir"); return; }
    setSelectedItemData(item); setModoImpresionIndividual(true);
    setMesesSeleccionadosImpresion([selectedMonth]); setMostrarModalMes(true);
  }, [selectedYear, selectedMonth, showWarningToast]);

  const handleImprimirTodosComprobantes = useCallback((mesesSel) => {
    if (!Array.isArray(mesesSel) || !mesesSel.length) { showWarningToast("Debe seleccionar al menos un mes"); return; }
    printComprobantesLote(datosFiltrados, viewType, activeTab, mesesSel);
    setMostrarModalMes(false);
  }, [datosFiltrados, viewType, activeTab, showWarningToast]);

  const handleImprimirUnoConMeses = useCallback((item, mesesSel) => {
    if (!Array.isArray(mesesSel) || !mesesSel.length) { showWarningToast("Debe seleccionar al menos un mes"); return; }
    printComprobanteItem(item, viewType, activeTab, mesesSel);
    setMostrarModalMes(false); setModoImpresionIndividual(false); setSelectedItemData(null);
  }, [viewType, activeTab, showWarningToast]);

  const itemKey = useCallback((index, data) => {
    const it = data?.[index];
    const id = it ? getItemId(it) : null;
    return id ?? `row-${index}`;
  }, [getItemId]);

  const isLoading = loading.socios || loading.empresas;

  /* ── Contenido del área de tabla ── */
  const renderTablaContent = () => {
    if (!selectedYear) return <NoFiltersApplied />;
    if (!selectedMonth) return <NoMonthSelected />;
    if (isLoading && datosFiltrados.length === 0) return <LoadingIndicator />;
    if (!isLoading && datosFiltrados.length === 0) return <NoDataFound />;

    // Mobile: scroll nativo
    if (isMobileRef.current) {
      return (
        <div className="gcuotas-mobile-list" style={{ position: "relative" }}>
          {datosFiltradosPaginated.map((item, index) => {
            const id = getItemId(item);
            const isBulkSel = bulkMode && selectedIdsBulkSet.has(id);
            const selected = bulkMode
              ? isBulkSel
              : selectedId != null && id != null && selectedId === id;
            return (
              <div
                key={id ?? index}
                ref={index === datosFiltradosPaginated.length - 1 ? lastItemRef : null}
                className={["gcuotas-mobile-card",
                  selected ? (bulkMode ? "gcuotas-bulk-selected-card" : "gcuotas-selected-card") : ""
                ].filter(Boolean).join(" ")}
                onClick={() => { if (bulkMode) handleBulkToggle(item); else handleRowClick(item); }}
              >
                {bulkMode && (
                  <div className="gcuotas-mobile-row gcuotas-mobile-bulk-row">
                    <label className="gcuotas-mobile-bulk-label" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="gcuotas-checkbox"
                        checked={selectedIdsBulkSet.has(id)} onChange={() => handleBulkToggle(item)} />
                      <span className="gcuotas-checkbox-box" />
                      <span className="gcuotas-mobile-bulk-text">
                        {isBulkSel ? "Seleccionado" : "Seleccionar"}
                      </span>
                    </label>
                  </div>
                )}
                {viewType === "socio" ? (
                  <>
                    <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Nombre:</span><span>{item.apellido} {item.nombre}</span></div>
                    <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Dirección:</span><span>{item.domicilio}</span></div>
                    <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Categoría:</span><span>{item.displayCategoriaPrecio}</span></div>
                    <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Medio Pago:</span><span>{item.medio_pago || "-"}</span></div>
                  </>
                ) : (
                  <>
                    <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Empresa:</span><span>{item.razon_social}</span></div>
                    <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Dirección:</span><span>{item.domicilio}</span></div>
                    <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Categoría:</span><span>{item.displayCategoriaPrecio}</span></div>
                    <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Medio Pago:</span><span>{item.medio_pago || "-"}</span></div>
                  </>
                )}
                {!bulkMode && selected && (
                  <div className="gcuotas-mobile-actions">
                    <button className="gcuotas-mobile-print-button"
                      onClick={(e) => { e.stopPropagation(); handlePrintClick(item); }}>
                      <FontAwesomeIcon icon={faPrint} /><span>Imprimir</span>
                    </button>
                    {activeTab === "deudores" && (
                      <button className="gcuotas-mobile-payment-button"
                        onClick={(e) => { e.stopPropagation(); handlePaymentClick(item); }}>
                        <FontAwesomeIcon icon={faDollarSign} /><span>Registrar Pago</span>
                      </button>
                    )}
                    {activeTab === "pagado" && (
                      <button className="gcuotas-mobile-deletepay-button"
                        onClick={(e) => { e.stopPropagation(); handleDeletePaymentClick(item); }}>
                        <FontAwesomeIcon icon={faTimes} /><span>Eliminar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="gcuotas-table-overlay-loading">
              <div className="gcuotas-loading-spinner" /><span>Cargando…</span>
            </div>
          )}
        </div>
      );
    }

    // Desktop: componente con ResizeObserver
    return (
      <TablaDesktop
        viewType={viewType}
        datosFiltrados={datosFiltrados}
        datosFiltradosPaginated={datosFiltradosPaginated}
        activeTab={activeTab}
        selectedId={selectedId}
        hasMore={hasMore}
        isLoading={isLoading}
        handleRowClick={handleRowClick}
        handlePaymentClick={handlePaymentClick}
        handlePrintClick={handlePrintClick}
        handleDeletePaymentClick={handleDeletePaymentClick}
        getItemId={getItemId}
        itemKey={itemKey}
        bulkMode={bulkMode}
        selectedIdsBulkSet={selectedIdsBulkSet}
        handleBulkToggle={handleBulkToggle}
        selectedVisibleCount={selectedVisibleCount}
        handleAddFilteredToBulk={handleAddFilteredToBulk}
        handleRemoveFilteredFromBulk={handleRemoveFilteredFromBulk}
        loadMoreItems={loadMoreItems}
        listRef={listRef}
        scrollOffsetRef={scrollOffsetRef}
      />
    );
  };

  return (
    <div className="gcuotas-container">
      {toast.show && (
        <Toast tipo={toast.tipo} mensaje={toast.mensaje} onClose={hideToast} duracion={toast.duracion} />
      )}

      {mostrarModalMes && (
        <ModalMesCuotas
          mesesSeleccionados={mesesSeleccionadosImpresion}
          onMesSeleccionadosChange={setMesesSeleccionadosImpresion}
          onCancelar={() => { setMostrarModalMes(false); setModoImpresionIndividual(false); setSelectedItemData(null); }}
          onImprimir={() => {
            if (modoImpresionIndividual && selectedItemData)
              handleImprimirUnoConMeses(selectedItemData, mesesSeleccionadosImpresion);
            else handleImprimirTodosComprobantes(mesesSeleccionadosImpresion);
          }}
        />
      )}
      {mostrarModalPagoSocio && selectedItemData && (
        <ModalPagos nombre={selectedItemData.nombre} apellido={selectedItemData.apellido}
          cerrarModal={() => { setMostrarModalPagoSocio(false); setSelectedItemData(null); }}
          onPagoRealizado={handlePagoRealizado} />
      )}
      {mostrarModalPagoEmpresa && selectedItemData && (
        <ModalPagosEmpresas razonSocial={selectedItemData.razon_social}
          cerrarModal={() => { setMostrarModalPagoEmpresa(false); setSelectedItemData(null); }}
          onPagoRealizado={handlePagoRealizado} />
      )}
      {mostrarModalPagoMasivo && itemsPagoMasivo.length > 0 && (
        <ModalPagosMasivos tipoEntidad={viewType} items={itemsPagoMasivo} selectedYear={selectedYear}
          cerrarModal={() => { setMostrarModalPagoMasivo(false); setItemsPagoMasivo([]); }}
          onPagoRealizado={handlePagoRealizado} />
      )}
      {mostrarModalEliminarPago && itemEliminarPago && (
        <ModalEliminarPago tipo={itemEliminarPago.tipo} mes={itemEliminarPago.mes} item={itemEliminarPago}
          onCancelar={() => { setMostrarModalEliminarPago(false); setItemEliminarPago(null); }}
          onConfirmar={handleEliminarPagoConfirmado} />
      )}

      {/* ── Panel izquierdo ── */}
      <div className="gcuotas-left-section gcuotas-box">
        <div className="gcuotas-header-section">
          <h2 className="gcuotas-title">
            <FontAwesomeIcon icon={faMoneyCheckAlt} className="gcuotas-title-icon" />
            Gestionar Cuotas
          </h2>
          <div className="gcuotas-divider"></div>
        </div>

        <div className="gcuotas-scrollable-content">
          <div className="gcuotas-top-section">
            <div className="gcuotas-filter-card">
              <div className="gcuotas-filter-header">
                <div className="gcuotas-filter-header-left">
                  <FontAwesomeIcon icon={faFilter} className="gcuotas-filter-icon" />
                  <span>Filtros</span>
                </div>
              </div>
              <div className="gcuotas-select-container">
                <div className={`gcuotas-float ${selectedYear ? "has-value" : ""}`}>
                  <select id="anio" value={selectedYear} onChange={handleYearChange}
                    className="gcuotas-dropdown gcuotas-float__control"
                    disabled={loading.years || loading.meses || loading.socios || loading.empresas}>
                    {years.map((y, i) => <option key={i} value={y}>{y}</option>)}
                  </select>
                  <label htmlFor="anio" className="gcuotas-float__label">
                    <FontAwesomeIcon icon={faCalendarAlt} /><span>Año</span>
                  </label>
                </div>
                <div className={`gcuotas-float ${selectedMonth ? "has-value" : ""}`}>
                  <select id="meses" value={selectedMonth} onChange={handleMonthChange}
                    className="gcuotas-dropdown gcuotas-float__control"
                    disabled={!selectedYear || loading.meses || loading.socios || loading.empresas}>
                    <option value="" disabled>Mes</option>
                    {meses.map((m, i) => <option key={i} value={m.mes}>{m.mes}</option>)}
                  </select>
                  <label htmlFor="meses" className="gcuotas-float__label">
                    <FontAwesomeIcon icon={faCalendarAlt} /><span>Mes</span>
                  </label>
                </div>
                <div className={`gcuotas-float gcuotas-input-full ${viewType ? "has-value" : ""}`}>
                  <select id="entidad" value={viewType}
                    onChange={(e) => {
                      setViewType(e.target.value); setSelectedId(null);
                      setSelectedIdsBulk([]); setBulkMode(false);
                      scrollOffsetRef.current = 0; listRef.current?.scrollTo(0);
                    }}
                    className="gcuotas-dropdown gcuotas-float__control"
                    disabled={loading.socios || loading.empresas}>
                    <option value="socio">Socios</option>
                    <option value="empresa">Empresas</option>
                  </select>
                  <label htmlFor="entidad" className="gcuotas-float__label">
                    <FontAwesomeIcon icon={faUsers} /><span>Tipo de vista</span>
                  </label>
                </div>
                <div className={`gcuotas-float gcuotas-input-full ${selectedMedioPago ? "has-value" : ""}`}>
                  <select id="medioPago" value={selectedMedioPago} onChange={handleMedioPagoChange}
                    className="gcuotas-dropdown gcuotas-float__control"
                    disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
                    <option value="">Todos</option>
                    {mediosPago.map((m, i) => <option key={i} value={m.nombre}>{m.nombre}</option>)}
                  </select>
                  <label htmlFor="medioPago" className="gcuotas-float__label">
                    <FontAwesomeIcon icon={faCreditCard} /><span>Medio de Pago</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="gcuotas-tabs-card">
              <div className="gcuotas-tabs-header">
                <FontAwesomeIcon icon={faList} className="gcuotas-tabs-icon" /><span>Estado de cuotas</span>
              </div>
              <div className="gcuotas-tab-container">
                <button
                  className={`gcuotas-tab-button ${activeTab === "pagado" ? "gcuotas-active-tab" : ""}`}
                  onClick={() => { setActiveTab("pagado"); setSelectedId(null); setSelectedIdsBulk([]); setBulkMode(false); scrollOffsetRef.current = 0; listRef.current?.scrollTo(0); }}
                  disabled={loading.socios || loading.empresas}>
                  <FontAwesomeIcon icon={faCheckCircle} />Pagado
                  <span className="gcuotas-tab-badge">{countPagados}</span>
                </button>
                <button
                  className={`gcuotas-tab-button ${activeTab === "deudores" ? "gcuotas-active-tab" : ""}`}
                  onClick={() => { setActiveTab("deudores"); setSelectedId(null); setSelectedIdsBulk([]); scrollOffsetRef.current = 0; listRef.current?.scrollTo(0); }}
                  disabled={loading.socios || loading.empresas}>
                  <FontAwesomeIcon icon={faExclamationTriangle} />Deudores
                  <span className="gcuotas-tab-badge">{countDeudores}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="gcuotas-actions-card">
            <div className="gcuotas-actions-header">
              <FontAwesomeIcon icon={faCog} className="gcuotas-actions-icon" /><span>Acciones</span>
            </div>
            <div className="gcuotas-buttons-container">
              <button className="gcuotas-button gcuotas-button-back" onClick={handleVolverAtras} disabled={loading.socios || loading.empresas}>
                <FontAwesomeIcon icon={faArrowLeft} /><span>Volver Atrás</span>
              </button>
              <button className="gcuotas-button gcuotas-button-export" onClick={handleExportExcel} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
                <FontAwesomeIcon icon={faFileExcel} /><span>Generar Excel</span>
              </button>
              <button className="gcuotas-button gcuotas-button-print" onClick={handleImprimirRegistro} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
                <FontAwesomeIcon icon={faPrint} /><span>Registro</span>
              </button>
              <button className="gcuotas-button gcuotas-button-print-all" onClick={handleAbrirModalImpresion} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
                <FontAwesomeIcon icon={faPrint} /><span>Imprimir Todos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className={`gcuotas-right-section gcuotas-box ${isMobile ? "gcuotas-has-bottombar" : ""}`}>

        {/* Header fijo del panel */}
        <div className="gcuotas-table-header">
          <h3>
            <FontAwesomeIcon icon={activeTab === "pagado" ? faCheckCircle : faExclamationTriangle} />
            {activeTab === "pagado" ? "Pagadas" : "Pendientes"}
          </h3>
          <div className="gcuotas-input-group gcuotas-search-group">
            <div className="gcuotas-search-integrated">
              <FontAwesomeIcon icon={faSearch} className="gcuotas-search-icon" />
              <input id="search" type="text"
                placeholder={`Buscar ${viewType === "socio" ? "socio..." : "empresa..."}`}
                value={searchTerm} onChange={handleSearchChange}
                disabled={loading.socios || loading.empresas || !selectedMonth || !selectedYear} />
            </div>
          </div>
          <div className="gcuotas-header-right-actions">
            <div className="gcuotas-summary-info">
              <span className="gcuotas-summary-item">
                <FontAwesomeIcon icon={faUsers} />Total: {filtrosCompletos ? datosFiltrados.length : 0}
              </span>

              {selectedYear && (
                <span className="gcuotas-summary-item">
                  <FontAwesomeIcon icon={faCalendarAlt} />Año: {selectedYear}
                </span>
              )}
              {selectedMonth && (
                <span className="gcuotas-summary-item">
                  <FontAwesomeIcon icon={faCalendarAlt} />Mes: {selectedMonth}
                </span>
              )}
            </div>
            {activeTab === "deudores" && filtrosCompletos && (
              <button
                className={`gcuotas-bulk-toggle-btn ${bulkMode ? "gcuotas-bulk-toggle-btn--active" : ""}`}
                onClick={handleToggleBulkMode}
                disabled={loading.socios || loading.empresas}
                title={bulkMode ? "Desactivar selección múltiple" : "Activar selección múltiple"}>
                <FontAwesomeIcon icon={faLayerGroup} />
                <span>{bulkMode ? "Cancelar selección" : "Selección múltiple"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra bulk — alto variable; la lista se adapta automáticamente por ResizeObserver */}
        {bulkMode && activeTab === "deudores" && (
          <div className="gcuotas-bulk-bar">
            <div className="gcuotas-bulk-bar__info">
              <span className="gcuotas-bulk-bar__title">
                <FontAwesomeIcon icon={faLayerGroup} />Selección múltiple activa
              </span>
              <div className="gcuotas-bulk-bar__badges">
                <span className="gcuotas-bulk-badge gcuotas-bulk-badge--total">
                  {selectedIdsBulk.length} seleccionados
                </span>
                {selectedVisibleCount > 0 && (
                  <span className="gcuotas-bulk-badge gcuotas-bulk-badge--visible">
                    {selectedVisibleCount} visibles
                  </span>
                )}
                {hiddenSelectedCount > 0 && (
                  <span className="gcuotas-bulk-badge gcuotas-bulk-badge--hidden">
                    {hiddenSelectedCount} fuera del filtro
                  </span>
                )}
              </div>
            </div>
            <div className="gcuotas-bulk-bar__actions">
              <button className="gcuotas-bulk-btn gcuotas-bulk-btn--secondary"
                onClick={handleAddFilteredToBulk} disabled={datosFiltrados.length === 0}>
                + Agregar visibles ({datosFiltrados.length})
              </button>
              <button className="gcuotas-bulk-btn gcuotas-bulk-btn--secondary"
                onClick={handleRemoveFilteredFromBulk} disabled={selectedVisibleCount === 0}>
                − Quitar visibles ({selectedVisibleCount})
              </button>
              <button className="gcuotas-bulk-btn gcuotas-bulk-btn--danger"
                onClick={handleClearBulkSelection} disabled={selectedIdsBulk.length === 0}>
                <FontAwesomeIcon icon={faTimes} /> Limpiar
              </button>
              <button className="gcuotas-bulk-btn gcuotas-bulk-btn--primary"
                onClick={handleAbrirModalPagoMasivo} disabled={selectedIdsBulk.length === 0}>
                <FontAwesomeIcon icon={faDollarSign} />Pagar {selectedIdsBulk.length} seleccionados
              </button>
            </div>
          </div>
        )}

        {/* Contenedor de tabla: flex:1 → ocupa TODO el espacio restante */}
        <div className="gcuotas-table-container">
          {renderTablaContent()}
        </div>
      </div>

      {/* ── Bottom bar móvil ── */}
      {isMobile && (
        <div className="gcuotas-mobile-bottombar">
          <button className="gcuotas-mbar-btn mbar-back" onClick={handleVolverAtras} disabled={loading.socios || loading.empresas}>
            <FontAwesomeIcon icon={faArrowLeft} /><span>Volver</span>
          </button>
          <button className="gcuotas-mbar-btn mbar-excel" onClick={handleExportExcel} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
            <FontAwesomeIcon icon={faFileExcel} /><span>Excel</span>
          </button>
          <button className="gcuotas-mbar-btn mbar-registro" onClick={handleImprimirRegistro} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
            <FontAwesomeIcon icon={faPrint} /><span>Registro</span>
          </button>
          <button className="gcuotas-mbar-btn mbar-imprimir" onClick={handleAbrirModalImpresion} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
            <FontAwesomeIcon icon={faPrint} /><span>Imprimir</span>
          </button>
          {activeTab === "deudores" && filtrosCompletos && (
            <button
              className={`gcuotas-mbar-btn mbar-bulk ${bulkMode ? "mbar-bulk--active" : ""}`}
              onClick={handleToggleBulkMode}
              disabled={loading.socios || loading.empresas}>
              <FontAwesomeIcon icon={faLayerGroup} />
              <span>{bulkMode ? `Sel. (${selectedIdsBulk.length})` : "Multi"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(GestionarCuotas);