// src/components/Cuotas/GestionarCuotas.jsx
import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPrint, faFileExcel, faArrowLeft, faSearch, faDollarSign, faTimes,
  faMoneyCheckAlt, faFilter, faCalendarAlt, faUsers, faList, faCheckCircle,
  faExclamationTriangle, faExclamationCircle, faCog, faCreditCard
} from '@fortawesome/free-solid-svg-icons';
import "./GestionarCuotas.css";

// ⬇️ Modales
import ModalMesCuotas from "./modalcuotas/ModalMesCuotas";
import ModalPagos from "./modalcuotas/ModalPagos";
import ModalPagosEmpresas from "./modalcuotas/ModalPagosEmpresas";
import ModalEliminarPago from "./modalcuotas/ModalEliminarPago";

import BASE_URL from "../../config/config";
import Toast from "../global/Toast";

// util de impresión
import {
  printComprobantesLote,
  printComprobanteItem
} from "../../utils/comprobantes";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Interceptor: retorna response.data y propaga error formateado
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    const server = error?.response?.data;
    const msg = server?.mensaje || server?.error || error.message || "Error en la petición";
    console.error(`HTTP ${status || ""} – ${msg}`, server || error);
    return Promise.reject({ ...error, message: msg, server, status });
  }
);

// ===== Fila virtualizada =====
const Row = memo(
  ({ index, style, data, selectedRow, viewType, activeTab, onRowClick, onPaymentClick, onPrintClick, onDeletePaymentClick }) => {
    const item = data[index];
    const isSelected = selectedRow === index;
    const rowClass = isSelected ? "gcuotas-selected-row" : "";

    const actionButtons = useMemo(() => {
      if (!isSelected) return null;
      const canDeletePago = activeTab === "pagado";

      return (
        <div className="gcuotas-actions-inline">
          <button
            className="gcuotas-action-button gcuotas-print-button"
            onClick={(e) => { e.stopPropagation(); onPrintClick(item); }}
            title="Imprimir comprobante"
          >
            <FontAwesomeIcon icon={faPrint} />
          </button>

          {activeTab === "deudores" && (
            <button
              className="gcuotas-action-button gcuotas-payment-button"
              onClick={(e) => { e.stopPropagation(); onPaymentClick(item); }}
              title="Registrar pago"
            >
              <FontAwesomeIcon icon={faDollarSign} />
            </button>
          )}

          {canDeletePago && (
            <button
              className="gcuotas-action-button gcuotas-deletepay-button"
              onClick={(e) => { e.stopPropagation(); onDeletePaymentClick(item); }}
              title="Eliminar pago"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
      );
    }, [activeTab, isSelected, item, onPaymentClick, onPrintClick, onDeletePaymentClick]);

    if (!item || (!item.apellido && !item.razon_social)) {
      return (
        <div style={style} className={`gcuotas-virtual-row gcuotas-loading-row ${rowClass} ${viewType === 'empresa' ? 'gempresas' : 'gsocios'}`}>
          <div className="gcuotas-virtual-cell">Cargando...</div>
          {viewType === "socio" && <div className="gcuotas-virtual-cell"></div>}
          <div className="gcuotas-virtual-cell"></div>
          <div className="gcuotas-virtual-cell"></div>
          <div className="gcuotas-virtual-cell"></div>
        </div>
      );
    }

    return (
      <div
        style={style}
        className={`gcuotas-virtual-row ${rowClass} ${viewType === 'empresa' ? 'gempresas' : 'gsocios'}`}
        onClick={() => onRowClick(index)}
      >
        {viewType === "socio" ? (
          <>
            <div className="gcuotas-virtual-cell">{item.apellido}</div>
            <div className="gcuotas-virtual-cell">{item.nombre}</div>
            <div className="gcuotas-virtual-cell">{item.displayCategoriaPrecio}</div>
            <div className="gcuotas-virtual-cell">{item.medio_pago || '-'}</div>
            <div className="gcuotas-virtual-cell gcuotas-virtual-actions">{actionButtons}</div>
          </>
        ) : (
          <>
            <div className="gcuotas-virtual-cell">{item.razon_social}</div>
            <div className="gcuotas-virtual-cell">{item.displayCategoriaPrecio}</div>
            <div className="gcuotas-virtual-cell">{item.medio_pago || '-'}</div>
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
    prev.selectedRow === next.selectedRow &&
    prev.viewType === next.viewType &&
    prev.activeTab === next.activeTab
);

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
    <small>Seleccione <strong>año</strong> y <strong>mes</strong>, y opcionalmente medio de pago o búsqueda.</small>
  </div>
));

const Outer = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return <div ref={ref} className={`gcuotas-viewport ${className || ""}`} {...rest} />;
});

const GestionarCuotas = () => {
  const navigate = useNavigate();

  // ===== Estado de pestañas / vista =====
  const [activeTab, setActiveTab] = useState("pagado"); // "pagado" | "deudores"
  const [viewType, setViewType] = useState("socio");    // "socio" | "empresa"

  // ===== Filtros =====
  const [years, setYears] = useState([]);               // listado de años (sin "Todos")
  const [selectedYear, setSelectedYear] = useState(""); // año elegido (por defecto: actual si existe)
  const [meses, setMeses] = useState([]);               // meses del año elegido
  const [selectedMonth, setSelectedMonth] = useState(""); // MES OBLIGATORIO (sin "Todos")
  const [mediosPago, setMediosPago] = useState([]);
  const [selectedMedioPago, setSelectedMedioPago] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // ===== Datos =====
  const [sociosPagados, setSociosPagados] = useState([]);
  const [sociosDeudores, setSociosDeudores] = useState([]);
  const [empresasPagadas, setEmpresasPagadas] = useState([]);
  const [empresasDeudoras, setEmpresasDeudoras] = useState([]);

  // ===== Modales e impresión / pago / eliminar =====
  const [mostrarModalMes, setMostrarModalMes] = useState(false);
  const [mesesSeleccionadosImpresion, setMesesSeleccionadosImpresion] = useState([]);
  const [modoImpresionIndividual, setModoImpresionIndividual] = useState(false);
  const [selectedItemData, setSelectedItemData] = useState(null);

  const [mostrarModalPagoSocio, setMostrarModalPagoSocio] = useState(false);
  const [mostrarModalPagoEmpresa, setMostrarModalPagoEmpresa] = useState(false);

  const [mostrarModalEliminarPago, setMostrarModalEliminarPago] = useState(false);
  const [itemEliminarPago, setItemEliminarPago] = useState(null);

  // ===== UI =====
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState({
    socios: false,
    empresas: false,
    meses: false,
    years: false,
    mediosPago: false
  });
  const [toast, setToast] = useState({ show: false, tipo: '', mensaje: '', duracion: 3000 });

  // ===== Virtual/infinite =====
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef(null);

  // ===== Cache =====
  const cacheRef = useRef({
    socios: { pagado: {}, deudor: {}, lastUpdated: {} },      // clave = `${anio}|${mes}`
    empresas: { pagado: {}, deudor: {}, lastUpdated: {} },    // clave = `${anio}|${mes}`
    meses: {},     // meses por año: {'2025': [...]}
    years: null,   // array de años
    mediosPago: [],
    cacheDuration: 30 * 60 * 1000
  });

  // Detección móvil
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
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

  // Toast helpers
  const showToast = useCallback((tipo, mensaje, duracion = 3000) => setToast({ show: true, tipo, mensaje, duracion }), []);
  const hideToast = useCallback(() => setToast(prev => ({ ...prev, show: false })), []);
  const showErrorToast   = useCallback((m) => showToast('error', m), [showToast]);
  const showSuccessToast = useCallback((m) => showToast('exito', m), [showToast]);
  const showWarningToast = useCallback((m) => showToast('advertencia', m), [showToast]);

  // Formateo datos
  const formatData = useCallback((data) => {
    const arr = Array.isArray(data) ? data : [];
    return arr.map(item => {
      const categoria = item.categoria ? item.categoria : '-';
      const precio = item.precio_categoria ? `$${item.precio_categoria}` : '-';
      return { ...item, displayCategoriaPrecio: `${categoria} ${precio}` };
    });
  }, []);

  // ===== Fetch AÑOS (reutilizable) =====
  const fetchYears = useCallback(async () => {
    setLoading(prev => ({ ...prev, years: true }));
    try {
      const data = await api.get("/api.php?action=anios_pagos");
      const lista = Array.isArray(data) ? data : (Array.isArray(data?.anios) ? data.anios : []);
      const norm = lista
        .map(a => (typeof a === "object" ? (a.anio ?? a.year ?? a.y ?? a.value) : a))
        .filter(v => v != null)
        .map(n => parseInt(n, 10))
        .sort((a,b) => b - a);
      cacheRef.current.years = norm;
      setYears(norm);

      // Selección por defecto: año actual si existe, si no, el más reciente
      const current = new Date().getFullYear();
      if (!selectedYear) {
        if (norm.includes(current)) {
          setSelectedYear(String(current));
        } else if (norm.length) {
          setSelectedYear(String(norm[0]));
        } else {
          setSelectedYear("");
        }
      } else {
        // Si el año seleccionado desapareció, reasignamos año pero YA NO limpiamos el mes seleccionado
        if (!norm.includes(parseInt(selectedYear, 10))) {
          if (norm.includes(current)) setSelectedYear(String(current));
          else setSelectedYear(norm.length ? String(norm[0]) : "");
          // ✅ NO limpiar selectedMonth: se mantiene el mes elegido anteriormente
        }
      }
    } catch (e) {
      console.error("Error al obtener años:", e);
      showErrorToast(e.message || "No se pudieron cargar los años");
    } finally {
      setLoading(prev => ({ ...prev, years: false }));
    }
  }, [selectedYear, showErrorToast]);

  // Montaje: cargar años
  useEffect(() => { fetchYears(); }, [fetchYears]);

  // ===== Fetch MESES (requiere AÑO) =====
  useEffect(() => {
    const fetchMeses = async () => {
      if (!selectedYear) { setMeses([]); return; }

      const key = selectedYear;
      if (Array.isArray(cacheRef.current.meses[key]) && cacheRef.current.meses[key].length) {
        // Aseguramos que el mes seleccionado siga visible aunque no esté en el listado
        let listaCache = cacheRef.current.meses[key];
        if (selectedMonth && !listaCache.some(m => m.mes === selectedMonth)) {
          listaCache = [{ mes: selectedMonth, _extra: true }, ...listaCache];
        }
        setMeses(listaCache);
        return;
      }
      setLoading(prev => ({ ...prev, meses: true }));
      try {
        const url = `/api.php?action=meses_pagos&anio=${encodeURIComponent(selectedYear)}`;
        const data = await api.get(url);
        let lista = Array.isArray(data) ? data : (Array.isArray(data?.meses) ? data.meses : []);
        cacheRef.current.meses[key] = lista;

        // ✅ Mantener el mes seleccionado: si no viene en la lista, lo agregamos temporalmente
        if (selectedMonth && !lista.some(m => m.mes === selectedMonth)) {
          lista = [{ mes: selectedMonth, _extra: true }, ...lista];
        }
        setMeses(lista);

        // ❌ Ya NO limpiamos el selectedMonth si no está: lo preservamos
        // if (selectedMonth && !lista.some(m => m.mes === selectedMonth)) {
        //   setSelectedMonth("");
        // }
      } catch (error) {
        console.error("Error al obtener los meses:", error);
        showErrorToast(error.message || "Error al cargar los meses disponibles");
      } finally {
        setLoading(prev => ({ ...prev, meses: false }));
      }
    };
    fetchMeses();
  }, [selectedYear, selectedMonth, showErrorToast]);

  // ===== Fetch MEDIOS DE PAGO =====
  useEffect(() => {
    const fetchMediosPago = async () => {
      if (cacheRef.current.mediosPago.length > 0) {
        setMediosPago(cacheRef.current.mediosPago);
        return;
      }
      setLoading(prev => ({ ...prev, mediosPago: true }));
      try {
        const data = await api.get("/api.php?action=obtener_datos");
        const raw = Array.isArray(data?.mediosPago) ? data.mediosPago : [];
        const mediosAdaptados = raw.map((item) => ({
          id: item.IdMedios_pago ?? item.id ?? item.idMedios_pago ?? item.id_medios_pago ?? null,
          nombre: item.Medio_Pago ?? item.medio_pago ?? item.nombre ?? ""
        })).filter(m => m.nombre);
        cacheRef.current.mediosPago = mediosAdaptados;
        setMediosPago(mediosAdaptados);
      } catch (error) {
        console.error("Error al obtener los medios de pago:", error);
        showErrorToast(error.message || "Error al cargar los medios de pago");
      } finally {
        setLoading(prev => ({ ...prev, mediosPago: false }));
      }
    };
    fetchMediosPago();
  }, [showErrorToast]);

  const cacheKey = (anio, mes) => `${anio || ''}|${mes || ''}`;

  // ===== Cargas SOCIOS por (AÑO,MES) =====
  const cargarDatosPorMesSocios = useCallback(async (anio, mes, force = false) => {
    if (!anio || !mes) return;
    if (loading.socios) return;

    const key = cacheKey(anio, mes);
    const now = Date.now();
    const cache = cacheRef.current.socios;
    const isValid = !force && cache.lastUpdated[key] && (now - cache.lastUpdated[key] < cacheRef.current.cacheDuration);

    if (isValid && cache.pagado[key] && cache.deudor[key]) {
      setSociosPagados(cache.pagado[key]);
      setSociosDeudores(cache.deudor[key]);
      return;
    }

    setLoading(prev => ({ ...prev, socios: true }));
    try {
      const qpYear = `&anio=${encodeURIComponent(anio)}`;
      const [pagados, deudores] = await Promise.all([
        api.get(`/api.php?action=cuotas&tipo=socio&estado=pagado&mes=${encodeURIComponent(mes)}${qpYear}`),
        api.get(`/api.php?action=cuotas&tipo=socio&estado=deudor&mes=${encodeURIComponent(mes)}${qpYear}`)
      ]);
      const p = formatData(pagados);
      const d = formatData(deudores);
      cacheRef.current.socios.pagado[key] = p;
      cacheRef.current.socios.deudor[key] = d;
      cacheRef.current.socios.lastUpdated[key] = Date.now();
      setSociosPagados(p);
      setSociosDeudores(d);
    } catch (e) {
      console.error(`Error socios ${mes}/${anio}:`, e);
      showErrorToast(e.message || "Error al cargar datos de socios");
    } finally {
      setLoading(prev => ({ ...prev, socios: false }));
    }
  }, [formatData, loading.socios, showErrorToast]);

  // ===== Cargas EMPRESAS por (AÑO,MES) =====
  const cargarDatosEmpresasPorMes = useCallback(async (anio, mes, force = false) => {
    if (!anio || !mes) return;
    if (loading.empresas) return;

    const key = cacheKey(anio, mes);
    const now = Date.now();
    const cache = cacheRef.current.empresas;
    const isValid = !force && cache.lastUpdated[key] && (now - cache.lastUpdated[key] < cacheRef.current.cacheDuration);

    if (isValid && cache.pagado[key] && cache.deudor[key]) {
      setEmpresasPagadas(cache.pagado[key]);
      setEmpresasDeudoras(cache.deudor[key]);
      return;
    }

    setLoading(prev => ({ ...prev, empresas: true }));
    try {
      const qpYear = `&anio=${encodeURIComponent(anio)}`;
      const [pagadas, deudoras] = await Promise.all([
        api.get(`/api.php?action=cuotas&tipo=empresa&estado=pagado&mes=${encodeURIComponent(mes)}${qpYear}`),
        api.get(`/api.php?action=cuotas&tipo=empresa&estado=deudor&mes=${encodeURIComponent(mes)}${qpYear}`)
      ]);
      const p = formatData(pagadas);
      const d = formatData(deudoras);
      cacheRef.current.empresas.pagado[key] = p;
      cacheRef.current.empresas.deudor[key] = d;
      cacheRef.current.empresas.lastUpdated[key] = Date.now();
      setEmpresasPagadas(p);
      setEmpresasDeudoras(d);
    } catch (e) {
      console.error(`Error empresas ${mes}/${anio}:`, e);
      showErrorToast(e.message || "Error al cargar datos de empresas");
    } finally {
      setLoading(prev => ({ ...prev, empresas: false }));
    }
  }, [formatData, loading.empresas, showErrorToast]);

  // ===== Filtrado genérico (siempre con año+mes seleccionados) =====
  const filterDataGeneric = useCallback((arr) => {
    if (!arr || arr.length === 0) return [];
    let filtered = [...arr];

    if (selectedMedioPago) {
      const medioLower = selectedMedioPago.toLowerCase();
      filtered = filtered.filter(item => (item.medio_pago || '').toLowerCase() === medioLower);
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        viewType === "socio"
          ? ((item.apellido || '').toLowerCase().includes(t) || (item.nombre || '').toLowerCase().includes(t))
          : ((item.razon_social || '').toLowerCase().includes(t))
      );
    }
    return filtered;
  }, [selectedMedioPago, searchTerm, viewType]);

  // ===== Base según pestaña/vista =====
  const datosCrudosBase = useMemo(() => {
    if (viewType === "socio") {
      return activeTab === "pagado" ? sociosPagados : sociosDeudores;
    }
    return activeTab === "pagado" ? empresasPagadas : empresasDeudoras;
  }, [viewType, activeTab, sociosPagados, sociosDeudores, empresasPagadas, empresasDeudoras]);

  // ===== Condición requerida: AÑO Y MES seleccionados =====
  const filtrosCompletos = useMemo(() => {
    return Boolean(selectedYear && selectedMonth);
  }, [selectedYear, selectedMonth]);

  const datosFiltrados = useMemo(() => {
    if (!filtrosCompletos) return [];
    if (datosCrudosBase.length === 0) return [];
    return filterDataGeneric(datosCrudosBase);
  }, [filtrosCompletos, datosCrudosBase, filterDataGeneric]);

  const countPagados = useMemo(() => {
    if (!filtrosCompletos) return 0;
    const base = viewType === "socio" ? sociosPagados : empresasPagadas;
    return filterDataGeneric(base).length;
  }, [filtrosCompletos, viewType, sociosPagados, empresasPagadas, filterDataGeneric]);

  const countDeudores = useMemo(() => {
    if (!filtrosCompletos) return 0;
    const base = viewType === "socio" ? sociosDeudores : empresasDeudoras;
    return filterDataGeneric(base).length;
  }, [filtrosCompletos, viewType, sociosDeudores, empresasDeudoras, filterDataGeneric]);

  // Paginación / infinite
  const datosFiltradosPaginated = useMemo(() => datosFiltrados.slice(0, offset + limit), [datosFiltrados, offset, limit]);

  const loadMoreItems = useCallback(() => {
    if (!hasMore || loading.socios || loading.empresas) return;
    if (offset + limit < datosFiltrados.length) {
      setOffset(prev => prev + limit);
    } else {
      setHasMore(false);
    }
  }, [hasMore, loading.socios, loading.empresas, offset, limit, datosFiltrados.length]);

  const observer = useRef();
  const lastItemRef = useCallback(node => {
    if (loading.socios || loading.empresas) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) loadMoreItems();
    });
    if (node) observer.current.observe(node);
  }, [loading.socios, loading.empresas, hasMore, loadMoreItems]);

  // reset paginación cuando cambian filtros
  useEffect(() => {
    setOffset(0);
    setLimit(100);
    setHasMore(true);
    if (listRef.current) listRef.current.scrollTo(0);
  }, [selectedYear, selectedMonth, selectedMedioPago, searchTerm, viewType, activeTab]);

  // ===== Efectos de carga según filtros =====
  // SOCIOS y EMPRESAS: siempre requieren AÑO+MES
  useEffect(() => {
    if (!filtrosCompletos) {
      setSociosPagados([]);
      setSociosDeudores([]);
      setEmpresasPagadas([]);
      setEmpresasDeudoras([]);
      return;
    }
    const deb = setTimeout(() => {
      if (viewType === "socio") {
        cargarDatosPorMesSocios(selectedYear, selectedMonth);
      } else {
        cargarDatosEmpresasPorMes(selectedYear, selectedMonth);
      }
    }, searchTerm ? 300 : 0);

    return () => clearTimeout(deb);
  }, [viewType, filtrosCompletos, selectedYear, selectedMonth, selectedMedioPago, searchTerm, cargarDatosPorMesSocios, cargarDatosEmpresasPorMes]);

  // ===== Handlers UI =====
  const handleVolverAtras = useCallback(() => navigate(-1), [navigate]);

  const handleYearChange = useCallback((e) => {
    setSelectedYear(e.target.value);
    setSelectedRow(null);
    // ✅ Ya NO limpiamos el mes al cambiar de año: se preserva el seleccionado
  }, []);

  const handleMonthChange = useCallback((e) => {
    setSelectedMonth(e.target.value);
    setSelectedRow(null);
  }, []);

  const handleMedioPagoChange = useCallback((e) => {
    setSelectedMedioPago(e.target.value);
  }, []);

  const handleSearchChange = useCallback((e) => {
    // Habilito búsqueda SOLO si hay AÑO y MES
    if (!selectedMonth || !selectedYear) return;
    setSearchTerm(e.target.value);
  }, [selectedMonth, selectedYear]);

  const handleRowClick = useCallback((index) => {
    if (typeof index !== "number" || index < 0) return;
    setSelectedRow(prev => (prev === index ? null : index));
  }, []);

  useEffect(() => {
    if (selectedRow === null) return;
    if (selectedRow >= datosFiltradosPaginated.length) {
      setSelectedRow(null);
    }
  }, [datosFiltradosPaginated.length, selectedRow]);

  const handlePaymentClick = useCallback((item) => {
    setSelectedItemData(item);

    const hasCategoria = !!item?.categoria && String(item.categoria).trim() !== "";
    const hasPrecioCategoria = !!item?.precio_categoria && Number(item.precio_categoria) > 0;

    if (!hasCategoria || !hasPrecioCategoria) {
      const sujeto = viewType === "socio" ? "El socio" : "La empresa";
      showErrorToast(`${sujeto} no tiene categoría asignada. No se puede registrar el pago.`);
      setSelectedItemData(null);
      return;
    }

    if (viewType === "socio") setMostrarModalPagoSocio(true);
    else setMostrarModalPagoEmpresa(true);
  }, [viewType, showErrorToast]);

  const refreshCacheBucketForCurrent = useCallback((tipo) => {
    const k = cacheKey(selectedYear, selectedMonth);
    const bucket = tipo === "socio" ? cacheRef.current.socios : cacheRef.current.empresas;
    delete bucket.pagado[k];
    delete bucket.deudor[k];
    delete bucket.lastUpdated[k];
  }, [selectedYear, selectedMonth]);

  const handlePagoRealizado = useCallback(async () => {
    try {
      showSuccessToast("Pago registrado correctamente");
      if (selectedYear && selectedMonth) {
        refreshCacheBucketForCurrent(viewType);
      }
      if (viewType === "socio") await cargarDatosPorMesSocios(selectedYear, selectedMonth, true);
      else await cargarDatosEmpresasPorMes(selectedYear, selectedMonth, true);

      // ⬇️ IMPORTANTE: Actualizar años después de registrar un pago
      await fetchYears();
    } catch (error) {
      console.error("Post-pago:", error);
      showErrorToast(error.message || "Pago registrado pero hubo un error al refrescar");
    } finally {
      setMostrarModalPagoSocio(false);
      setMostrarModalPagoEmpresa(false);
      setSelectedItemData(null);
    }
  }, [selectedYear, selectedMonth, viewType, cargarDatosPorMesSocios, cargarDatosEmpresasPorMes, showSuccessToast, showErrorToast, refreshCacheBucketForCurrent, fetchYears]);

  // Eliminar pago
  const handleDeletePaymentClick = useCallback((item) => {
    if (!selectedMonth || !selectedYear) {
      showWarningToast("Seleccioná año y mes para poder eliminar el pago.");
      return;
    }
    setItemEliminarPago({ ...item, tipo: viewType, mes: selectedMonth });
    setMostrarModalEliminarPago(true);
  }, [selectedMonth, selectedYear, viewType, showWarningToast]);

  const handleEliminarPagoConfirmado = useCallback(async () => {
    if (!itemEliminarPago) return;
    try {
      setLoading(prev => ({
        ...prev,
        socios: itemEliminarPago.tipo === "socio" ? true : prev.socios,
        empresas: itemEliminarPago.tipo === "empresa" ? true : prev.empresas,
      }));

      const idPago = itemEliminarPago.idPago ?? itemEliminarPago.id_pago ?? null;
      const idSocio = itemEliminarPago.idSocios ?? itemEliminarPago.id ?? itemEliminarPago.id_socio ?? null;
      const idEmp   = itemEliminarPago.idEmp ?? itemEliminarPago.idEmpresa ?? itemEliminarPago.id ?? null;
      const id      = itemEliminarPago.tipo === "socio" ? idSocio : idEmp;

      const keyAnio = selectedYear;
      const periodo = (cacheRef.current.meses[keyAnio] || []).find(m => m.mes === (itemEliminarPago.mes || selectedMonth));
      const idMes   = periodo?.idMes ?? periodo?.id_mes ?? null;

      const payload = { tipo: itemEliminarPago.tipo, mes: itemEliminarPago.mes, id_pago: idPago, id, idMes, anio: selectedYear || undefined };
      const res = await api.post(`/api.php?action=eliminar_pago`, payload);

      if (res?.ok) {
        showSuccessToast(res?.mensaje || "Pago eliminado correctamente");

        // limpiar cache de (año,mes) actual y recargar
        refreshCacheBucketForCurrent(itemEliminarPago.tipo);
        if (itemEliminarPago.tipo === "socio") await cargarDatosPorMesSocios(selectedYear, selectedMonth, true);
        else await cargarDatosEmpresasPorMes(selectedYear, selectedMonth, true);

        // ⬇️ IMPORTANTE: refrescar AÑOS después de eliminar
        await fetchYears();
      } else {
        showErrorToast(res?.mensaje || "No se pudo eliminar el pago");
        setLoading(prev => ({
          ...prev,
          socios: itemEliminarPago.tipo === "socio" ? false : prev.socios,
          empresas: itemEliminarPago.tipo === "empresa" ? false : prev.empresas,
        }));
      }
    } catch (err) {
      console.error(err);
      showErrorToast(err?.message || "Error al eliminar el pago");
      setLoading(prev => ({
        ...prev,
        socios: itemEliminarPago.tipo === "socio" ? false : prev.socios,
        empresas: itemEliminarPago.tipo === "empresa" ? false : prev.empresas,
      }));
    } finally {
      setMostrarModalEliminarPago(false);
      setItemEliminarPago(null);
    }
  }, [itemEliminarPago, selectedYear, selectedMonth, cargarDatosPorMesSocios, cargarDatosEmpresasPorMes, showSuccessToast, showErrorToast, refreshCacheBucketForCurrent, fetchYears]);

  // ===== Export / Print =====
  const requireYearMonthOrWarn = useCallback((fn) => {
    if (!selectedYear || !selectedMonth) {
      showWarningToast("Seleccioná año y mes antes de continuar");
      return false;
    }
    if (loading.socios || loading.empresas) {
      showWarningToast("Esperá a que terminen de cargarse los datos");
      return false;
    }
    if (datosFiltrados.length === 0) {
      showWarningToast("No hay datos");
      return false;
    }
    return true;
  }, [selectedYear, selectedMonth, loading.socios, loading.empresas, datosFiltrados.length, showWarningToast]);

  const handleExportExcel = useCallback(() => {
    if (!requireYearMonthOrWarn()) return;

    const dataExport = datosFiltrados.map((item) => ({
      ...item,
      Año: selectedYear,
      Mes: selectedMonth,
      Tipo: activeTab === "pagado" ? "Pagados" : "Deudores",
      MedioPago: selectedMedioPago || "Todos"
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, viewType === "socio" ? "Socios" : "Empresas");
    const fname = `${viewType}_${selectedYear}_${selectedMonth}_${activeTab}_${selectedMedioPago || 'todos'}.xlsx`;
    XLSX.writeFile(wb, fname);
  }, [requireYearMonthOrWarn, datosFiltrados, selectedYear, selectedMonth, activeTab, selectedMedioPago, viewType]);

  const handleImprimirRegistro = useCallback(() => {
    if (!requireYearMonthOrWarn()) return;

    let content = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Registro</title>
          <style>
            body { font-family: Arial, sans-serif; }
            h2 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #0288d1; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h2> Registro - ${activeTab === "pagado" ? "Pagados" : "Deudores"} - Año: ${selectedYear} | Mes: ${selectedMonth}</h2>
          ${selectedMedioPago ? `<h3>Medio de Pago: ${selectedMedioPago}</h3>` : ''}
          <table>
            <thead>
              <tr>
                ${viewType === "socio" ? "<th>APELLIDO</th><th>NOMBRE</th><th>MEDIO PAGO</th>" : "<th>EMPRESA</th><th>MEDIO PAGO</th>"}
              </tr>
            </thead>
            <tbody>
              ${datosFiltrados.map(item => `<tr>${viewType === "socio" ?
                `<td>${item.apellido || ""}</td><td>${item.nombre || ""}</td><td>${item.medio_pago || '-'}</td>` :
                `<td>${item.razon_social || ""}</td><td>${item.medio_pago || '-'}</td>`}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const w = window.open("", "Imprimir", "width=800,height=600");
    if (!w) return;
    w.document.write(content);
    w.document.close();
    w.focus();
    w.print();
  }, [requireYearMonthOrWarn, activeTab, selectedYear, selectedMonth, selectedMedioPago, viewType, datosFiltrados]);

  const handleAbrirModalImpresion = useCallback(() => {
    if (!requireYearMonthOrWarn()) return;
    setMesesSeleccionadosImpresion([selectedMonth]); // como pediste, siempre mes específico
    setModoImpresionIndividual(false);
    setSelectedItemData(null);
    setMostrarModalMes(true);
  }, [requireYearMonthOrWarn, selectedMonth]);

  const handlePrintClick = useCallback((item) => {
    if (!selectedYear || !selectedMonth) {
      showWarningToast("Seleccioná año y mes antes de imprimir");
      return;
    }
    setSelectedItemData(item);
    setModoImpresionIndividual(true);
    setMesesSeleccionadosImpresion([selectedMonth]);
    setMostrarModalMes(true);
  }, [selectedYear, selectedMonth, showWarningToast]);

  const handleImprimirTodosComprobantes = useCallback((mesesSel) => {
    if (!Array.isArray(mesesSel) || mesesSel.length === 0) {
      showWarningToast("Debe seleccionar al menos un mes");
      return;
    }
    printComprobantesLote(datosFiltrados, viewType, activeTab, mesesSel);
    setMostrarModalMes(false);
  }, [datosFiltrados, viewType, activeTab, showWarningToast]);

  const handleImprimirUnoConMeses = useCallback((item, mesesSel) => {
    if (!Array.isArray(mesesSel) || mesesSel.length === 0) {
      showWarningToast("Debe seleccionar al menos un mes");
      return;
    }
    printComprobanteItem(item, viewType, activeTab, mesesSel);
    setMostrarModalMes(false);
    setModoImpresionIndividual(false);
    setSelectedItemData(null);
  }, [viewType, activeTab, showWarningToast]);

  // Key de lista virtual
  const listKey = useMemo(() => {
    return `${viewType}-${activeTab}-${selectedYear}-${selectedMonth}-${selectedMedioPago}-${searchTerm}`;
  }, [viewType, activeTab, selectedYear, selectedMonth, selectedMedioPago, searchTerm]);

  // Render tabla
  const renderTabla = useMemo(() => {
    if (!selectedYear) return <NoFiltersApplied />;
    if (!selectedMonth) return <NoMonthSelected />;
    if (loading.socios || loading.empresas) return <LoadingIndicator />;
    if (datosFiltrados.length === 0) return <NoDataFound />;

    if (isMobileRef.current) {
      return (
        <div className="gcuotas-mobile-list">
          {datosFiltradosPaginated.map((item, index) => (
            <div
              key={index}
              ref={index === datosFiltradosPaginated.length - 1 ? lastItemRef : null}
              className={`gcuotas-mobile-card ${selectedRow === index ? "gcuotas-selected-card" : ""}`}
              onClick={() => handleRowClick(index)}
            >
              {viewType === "socio" ? (
                <>
                  <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Nombre:</span><span>{item.apellido} {item.nombre}</span></div>
                  <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Dirección:</span><span>{item.domicilio}</span></div>
                  <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Categoría:</span><span>{item.displayCategoriaPrecio}</span></div>
                  <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Medio Pago:</span><span>{item.medio_pago || '-'}</span></div>
                </>
              ) : (
                <>
                  <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Empresa:</span><span>{item.razon_social}</span></div>
                  <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Dirección:</span><span>{item.domicilio}</span></div>
                  <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Categoría:</span><span>{item.displayCategoriaPrecio}</span></div>
                  <div className="gcuotas-mobile-row"><span className="gcuotas-mobile-label">Medio Pago:</span><span>{item.medio_pago || '-'}</span></div>
                </>
              )}

              {selectedRow === index && (
                <div className="gcuotas-mobile-actions">
                  <button className="gcuotas-mobile-print-button" onClick={(e) => { e.stopPropagation(); handlePrintClick(item); }}>
                    <FontAwesomeIcon icon={faPrint} /><span>Imprimir</span>
                  </button>
                  {activeTab === "deudores" && (
                    <button className="gcuotas-mobile-payment-button" onClick={(e) => { e.stopPropagation(); handlePaymentClick(item); }}>
                      <FontAwesomeIcon icon={faDollarSign} /><span>Registrar Pago</span>
                    </button>
                  )}
                  {activeTab === "pagado" && (
                    <button className="gcuotas-mobile-deletepay-button" onClick={(e) => { e.stopPropagation(); handleDeletePaymentClick(item); }}>
                      <FontAwesomeIcon icon={faTimes} /><span>Eliminar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {(loading.socios || loading.empresas) ? <div className="gcuotas-loading-more"></div> : null}
        </div>
      );
    }

    const headerHeight = 50;
    const tableHeight = Math.max((isClient ? window.innerHeight : 800) * 0.85 - headerHeight, 300);

    return (
      <div className="gcuotas-virtual-tables" style={{ height: "85vh" }}>
        <div className={`gcuotas-virtual-header ${viewType === 'empresa' ? 'gempresas' : 'gsocios'}`}>
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

        <List
          ref={listRef}
          key={listKey}
          height={tableHeight}
          itemCount={datosFiltradosPaginated.length + (hasMore ? 1 : 0)}
          itemSize={50}
          itemData={datosFiltradosPaginated}
          width={"100%"}
          outerElementType={Outer}
          onItemsRendered={({ visibleStopIndex }) => {
            if (visibleStopIndex >= datosFiltradosPaginated.length - 5 && hasMore) loadMoreItems();
          }}
        >
          {(props) => {
            if (props.index >= datosFiltradosPaginated.length) {
              return <div style={props.style} className="gcuotas-loading-row"></div>;
            }
            return (
              <Row
                {...props}
                selectedRow={selectedRow}
                viewType={viewType}
                activeTab={activeTab}
                onRowClick={handleRowClick}
                onPaymentClick={handlePaymentClick}
                onPrintClick={handlePrintClick}
                onDeletePaymentClick={handleDeletePaymentClick}
              />
            );
          }}
        </List>
      </div>
    );
  }, [
    selectedYear,
    selectedMonth,
    viewType,
    loading.socios,
    loading.empresas,
    datosFiltrados,
    datosFiltradosPaginated,
    activeTab,
    selectedRow,
    handleRowClick,
    handlePaymentClick,
    handlePrintClick,
    handleDeletePaymentClick,
    hasMore,
    loadMoreItems,
    lastItemRef,
    listKey,
    isClient
  ]);

  // ===== Render =====
  return (
    <div className="gcuotas-container">
      {toast.show && <Toast tipo={toast.tipo} mensaje={toast.mensaje} onClose={hideToast} duracion={toast.duracion} />}

      {/* Modal de Meses (impresión) */}
      {mostrarModalMes && (
        <ModalMesCuotas
          mesesSeleccionados={mesesSeleccionadosImpresion}
          onMesSeleccionadosChange={setMesesSeleccionadosImpresion}
          onCancelar={() => { setMostrarModalMes(false); setModoImpresionIndividual(false); setSelectedItemData(null); }}
          onImprimir={() => {
            if (modoImpresionIndividual && selectedItemData) {
              handleImprimirUnoConMeses(selectedItemData, mesesSeleccionadosImpresion);
            } else {
              handleImprimirTodosComprobantes(mesesSeleccionadosImpresion);
            }
          }}
        />
      )}

      {/* Modal Pago Socio */}
      {mostrarModalPagoSocio && selectedItemData && (
        <ModalPagos
          nombre={selectedItemData.nombre}
          apellido={selectedItemData.apellido}
          cerrarModal={() => { setMostrarModalPagoSocio(false); setSelectedItemData(null); }}
          onPagoRealizado={handlePagoRealizado}
        />
      )}

      {/* Modal Pago Empresa */}
      {mostrarModalPagoEmpresa && selectedItemData && (
        <ModalPagosEmpresas
          razonSocial={selectedItemData.razon_social}
          cerrarModal={() => { setMostrarModalPagoEmpresa(false); setSelectedItemData(null); }}
          onPagoRealizado={handlePagoRealizado}
        />
      )}

      {/* Modal eliminar pago */}
      {mostrarModalEliminarPago && itemEliminarPago && (
        <ModalEliminarPago
          tipo={itemEliminarPago.tipo}
          mes={itemEliminarPago.mes}
          item={itemEliminarPago}
          onCancelar={() => { setMostrarModalEliminarPago(false); setItemEliminarPago(null); }}
          onConfirmar={handleEliminarPagoConfirmado}
        />
      )}

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
                {/* Año (SIN "Todos") */}
                <div className="gcuotas-input-group">
                  <label htmlFor="anio" className="gcuotas-input-label">
                    <FontAwesomeIcon icon={faCalendarAlt} /> Año
                  </label>
                  <select
                    id="anio"
                    value={selectedYear}
                    onChange={handleYearChange}
                    className="gcuotas-dropdown"
                    disabled={loading.years || loading.meses || loading.socios || loading.empresas}
                  >
                    {years.map((y, i) => (
                      <option key={i} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Mes (SIN "Todos") */}
                <div className="gcuotas-input-group">
                  <label htmlFor="meses" className="gcuotas-input-label">
                    <FontAwesomeIcon icon={faCalendarAlt} /> Mes
                  </label>
                  <select
                    id="meses"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="gcuotas-dropdown"
                    disabled={!selectedYear || loading.meses || loading.socios || loading.empresas}
                  >
                    <option value="" disabled>Seleccioná un mes</option>
                    {meses.map((m, index) => (
                      <option key={index} value={m.mes}>{m.mes}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de vista */}
                <div className="gcuotas-input-group">
                  <label htmlFor="entidad" className="gcuotas-input-label">
                    <FontAwesomeIcon icon={faUsers} /> Tipo de vista
                  </label>
                  <select
                    id="entidad"
                    value={viewType}
                    onChange={(e) => { setViewType(e.target.value); setSelectedRow(null); }}
                    className="gcuotas-dropdown"
                    disabled={loading.socios || loading.empresas}
                  >
                    <option value="socio">Socios</option>
                    <option value="empresa">Empresas</option>
                  </select>
                </div>

                {/* Medio de pago */}
                <div className="gcuotas-input-group gcuotas-input-full">
                  <label htmlFor="medioPago" className="gcuotas-input-label">
                    <FontAwesomeIcon icon={faCreditCard} /> Medio de Pago
                  </label>
                  <select
                    id="medioPago"
                    value={selectedMedioPago}
                    onChange={handleMedioPagoChange}
                    className="gcuotas-dropdown"
                    disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}
                  >
                    <option value="">Todos</option>
                    {mediosPago.map((medio, index) => (
                      <option key={index} value={medio.nombre}>{medio.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="gcuotas-tabs-card">
              <div className="gcuotas-tabs-header">
                <FontAwesomeIcon icon={faList} className="gcuotas-tabs-icon" />
                <span>Estado de cuotas</span>
              </div>
              <div className="gcuotas-tab-container">
                <button
                  className={`gcuotas-tab-button ${activeTab === "pagado" ? "gcuotas-active-tab" : ""}`}
                  onClick={() => { setActiveTab("pagado"); setSelectedRow(null); }}
                  disabled={loading.socios || loading.empresas}
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Pagado
                  <span className="gcuotas-tab-badge">{countPagados}</span>
                </button>
                <button
                  className={`gcuotas-tab-button ${activeTab === "deudores" ? "gcuotas-active-tab" : ""}`}
                  onClick={() => { setActiveTab("deudores"); setSelectedRow(null); }}
                  disabled={loading.socios || loading.empresas}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  Deudores
                  <span className="gcuotas-tab-badge">{countDeudores}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="gcuotas-actions-card">
            <div className="gcuotas-actions-header">
              <FontAwesomeIcon icon={faCog} className="gcuotas-actions-icon" />
              <span>Acciones</span>
            </div>
            <div className="gcuotas-buttons-container">
              <button className="gcuotas-button gcuotas-button-back" onClick={handleVolverAtras} disabled={loading.socios || loading.empresas}>
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Volver Atrás</span>
              </button>
              <button className="gcuotas-button gcuotas-button-export" onClick={handleExportExcel} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
                <FontAwesomeIcon icon={faFileExcel} />
                <span>Generar Excel</span>
              </button>
              <button className="gcuotas-button gcuotas-button-print" onClick={handleImprimirRegistro} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
                <FontAwesomeIcon icon={faPrint} />
                <span>Registro</span>
              </button>
              <button className="gcuotas-button gcuotas-button-print-all" onClick={handleAbrirModalImpresion} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
                <FontAwesomeIcon icon={faPrint} />
                <span>Imprimir Todos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`gcuotas-right-section gcuotas-box ${isMobile ? 'gcuotas-has-bottombar' : ''}`}>
        <div className="gcuotas-table-header">
          <h3>
            <FontAwesomeIcon icon={activeTab === "pagado" ? faCheckCircle : faExclamationTriangle} />
            {activeTab === "pagado" ? "Cuotas Pagadas" : "Cuotas Pendientes"}
          </h3>
            <div className="gcuotas-input-group gcuotas-search-group">
              <div className="gcuotas-search-integrated">
                <FontAwesomeIcon icon={faSearch} className="gcuotas-search-icon" />
                <input
                  id="search"
                  type="text"
                  placeholder={`Buscar ${viewType === "socio" ? "socio..." : "empresa..."}`}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  disabled={loading.socios || loading.empresas || (!selectedMonth || !selectedYear)}
                />
              </div>
            </div>
          <div className="gcuotas-summary-info">
            <span className="gcuotas-summary-item">
              <FontAwesomeIcon icon={faUsers} />
              Total: {filtrosCompletos ? datosFiltrados.length : 0}
            </span>
            {selectedYear && (
              <span className="gcuotas-summary-item">
                <FontAwesomeIcon icon={faCalendarAlt} />
                Año: {selectedYear}
              </span>
            )}
            {selectedMonth && (
              <span className="gcuotas-summary-item">
                <FontAwesomeIcon icon={faCalendarAlt} />
                Mes: {selectedMonth}
              </span>
            )}
            {selectedMedioPago && (
              <span className="gcuotas-summary-item">
                <FontAwesomeIcon icon={faCreditCard} />
                Medio: {selectedMedioPago}
              </span>
            )}
          </div>
        </div>

        <div className="gcuotas-table-container">
          {renderTabla}
        </div>
      </div>

      {isMobile && (
        <div className="gcuotas-mobile-bottombar">
          <button className="gcuotas-mbar-btn mbar-back" onClick={handleVolverAtras} disabled={loading.socios || loading.empresas}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Volver</span>
          </button>
          <button className="gcuotas-mbar-btn mbar-excel" onClick={handleExportExcel} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
            <FontAwesomeIcon icon={faFileExcel} />
            <span>Excel</span>
          </button>
          <button className="gcuotas-mbar-btn mbar-registro" onClick={handleImprimirRegistro} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
            <FontAwesomeIcon icon={faPrint} />
            <span>Registro</span>
          </button>
          <button className="gcuotas-mbar-btn mbar-imprimir" onClick={handleAbrirModalImpresion} disabled={loading.socios || loading.empresas || !selectedYear || !selectedMonth}>
            <FontAwesomeIcon icon={faPrint} />
            <span>Imprimir</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(GestionarCuotas);
