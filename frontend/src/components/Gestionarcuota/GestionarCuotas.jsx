// src/components/Cuotas/GestionarCuotas.jsx
import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import axios from "axios";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExcel, faArrowLeft, faSearch, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import "./GestionarCuotas.css";
import {
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
} from '@fortawesome/free-solid-svg-icons';
import ModalMesCuotas from "./ModalMesCuotas";
import ModalPagos from "./ModalPagos";
import ModalPagosEmpresas from "./ModalPagosEmpresas";
import BASE_URL from "../../config/config";
import Toast from "../global/Toast";

// util de impresión
import {
  printComprobantesLote,
  printComprobanteItem
} from "../../utils/comprobantes";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.response.use(
  response => response.data,
  error => {
    console.error("Error en la petición:", error);
    throw error;
  }
);

// ===== Row =====
const Row = memo(({ index, style, data, selectedRow, viewType, activeTab, onRowClick, onPaymentClick, onPrintClick }) => {
  const item = data[index];
  const isSelected = selectedRow === index;
  const rowClass = isSelected ? "gcuotas-selected-row" : "";

  const actionButtons = useMemo(() => {
    if (!isSelected) return null;

    return (
      <div className="gcuotas-actions-inline">
        {/* Imprimir Fila */}
        <button
          className="gcuotas-action-button gcuotas-print-button"
          onClick={(e) => {
            e.stopPropagation();
            onPrintClick(item);
          }}
          title="Imprimir comprobante"
        >
          <FontAwesomeIcon icon={faPrint} />
        </button>

        {/* Registrar Pago (solo deudores) */}
        {activeTab === "deudores" && (
          <button
            className="gcuotas-action-button gcuotas-payment-button"
            onClick={(e) => {
              e.stopPropagation();
              onPaymentClick(item);
            }}
            title="Registrar pago"
          >
            <FontAwesomeIcon icon={faDollarSign} />
          </button>
        )}
      </div>
    );
  }, [activeTab, isSelected, item, onPaymentClick, onPrintClick]);

  if (!item || (!item.apellido && !item.razon_social)) {
    return (
      <div style={style} className={`gcuotas-virtual-row gcuotas-loading-row ${rowClass} ${viewType === 'empresa' ? 'gempresas' : 'gsocios'}`}>
        <div className="gcuotas-virtual-cell">Cargando...</div>
        <div className="gcuotas-virtual-cell"></div>
        <div className="gcuotas-virtual-cell"></div>
        {viewType === "socio" && <div className="gcuotas-virtual-cell"></div>}
        <div className="gcuotas-virtual-cell"></div>
        {activeTab === "deudores" && <div className="gcuotas-virtual-cell"></div>}
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
          <div className="gcuotas-virtual-cell">{item.domicilio}</div>
          <div className="gcuotas-virtual-cell">{item.displayCategoriaPrecio}</div>
          <div className="gcuotas-virtual-cell">{item.medio_pago || '-'}</div>
          <div className="gcuotas-virtual-cell gcuotas-virtual-actions">{actionButtons}</div>
        </>
      ) : (
        <>
          <div className="gcuotas-virtual-cell">{item.razon_social}</div>
          <div className="gcuotas-virtual-cell">{item.domicilio}</div>
          <div className="gcuotas-virtual-cell">{item.displayCategoriaPrecio}</div>
          <div className="gcuotas-virtual-cell">{item.medio_pago || '-'}</div>
          <div className="gcuotas-virtual-cell gcuotas-virtual-actions">{actionButtons}</div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.style === nextProps.style &&
    prevProps.data === nextProps.data &&
    prevProps.selectedRow === nextProps.selectedRow &&
    prevProps.viewType === nextProps.viewType &&
    prevProps.activeTab === nextProps.activeTab
  );
});

const LoadingIndicator = memo(() => (
  <div className="gcuotas-loading-container">
    <div className="gcuotas-loading-spinner"></div>
    <p>Cargando datos...</p>
  </div>
));

const NoMonthSelected = memo(() => (
  <div className="gcuotas-info-message">
    <FontAwesomeIcon icon={faCalendarAlt} size="3x" />
    <p>Por favor seleccione un mes para ver los datos</p>
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
    <small>Seleccione al menos un mes, medio de pago o ingrese un término de búsqueda</small>
  </div>
));

const GestionarCuotas = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pagado");
  const [sociosPagados, setSociosPagados] = useState([]);
  const [sociosDeudores, setSociosDeudores] = useState([]);
  const [empresasPagadas, setEmpresasPagadas] = useState([]);
  const [empresasDeudoras, setEmpresasDeudoras] = useState([]);
  const [meses, setMeses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewType, setViewType] = useState("socio");

  // impresión
  const [mostrarModalMes, setMostrarModalMes] = useState(false);
  const [mesesSeleccionadosImpresion, setMesesSeleccionadosImpresion] = useState([]);
  const [modoImpresionIndividual, setModoImpresionIndividual] = useState(false);
  const [selectedItemData, setSelectedItemData] = useState(null);

  const [mediosPago, setMediosPago] = useState([]);
  const [selectedMedioPago, setSelectedMedioPago] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [mostrarModalPagoSocio, setMostrarModalPagoSocio] = useState(false);
  const [mostrarModalPagoEmpresa, setMostrarModalPagoEmpresa] = useState(false);
  const [loading, setLoading] = useState({
    socios: false,
    empresas: false,
    meses: false,
    mediosPago: false
  });
  const [toast, setToast] = useState({
    show: false,
    tipo: '',
    mensaje: '',
    duracion: 3000
  });
  
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef(null);

  const cacheRef = useRef({
    socios: {
      pagado: {},
      deudor: {},
      lastUpdated: {}
    },
    empresas: {
      pagado: {},
      deudor: {},
      lastUpdated: {}
    },
    meses: [],
    mediosPago: [],
    cacheDuration: 30 * 60 * 1000 // 30 minutos
  });

  // Detección de móvil
  const isMobileRef = useRef(window.innerWidth <= 768);
  const [isMobile, setIsMobile] = useState(isMobileRef.current);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toasts
  const showToast = useCallback((tipo, mensaje, duracion = 3000) => {
    setToast({ show: true, tipo, mensaje, duracion });
  }, []);
  const hideToast = useCallback(() => setToast(prev => ({ ...prev, show: false })), []);
  const showErrorToast   = useCallback((m) => showToast('error', m), [showToast]);
  const showSuccessToast = useCallback((m) => showToast('exito', m), [showToast]);
  const showWarningToast = useCallback((m) => showToast('advertencia', m), [showToast]);

  // Formateo
  const formatData = useCallback((data) => {
    return data.map(item => {
      const categoria = item.categoria ? item.categoria : '-';
      const precio = item.precio_categoria ? `$${item.precio_categoria}` : '-';
      return {
        ...item,
        displayCategoriaPrecio: `${categoria} ${precio}`
      };
    });
  }, []);

  // === Helper de filtrado reutilizable (para lista principal y para badges) ===
  const filterDataGeneric = useCallback((arr) => {
    if (!arr || arr.length === 0) return [];
    let filtered = [...arr];

    if (selectedMedioPago) {
      const medioLower = selectedMedioPago.toLowerCase();
      filtered = filtered.filter(item => item.medio_pago?.toLowerCase() === medioLower);
    }
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        viewType === "socio"
          ? (item.apellido?.toLowerCase().includes(t) || item.nombre?.toLowerCase().includes(t))
          : (item.razon_social?.toLowerCase().includes(t))
      );
    }
    return filtered;
  }, [selectedMedioPago, searchTerm, viewType]);

  // === Datos filtrados (según activeTab) para la lista mostrada ===
  const datosFiltrados = useMemo(() => {
    let datosCrudos = [];
    if (viewType === "socio") {
      datosCrudos = activeTab === "pagado" ? sociosPagados : sociosDeudores;
    } else {
      datosCrudos = activeTab === "pagado" ? empresasPagadas : empresasDeudoras;
    }

    if (!selectedMonth && !selectedMedioPago && !searchTerm) return [];
    if (datosCrudos.length === 0) return [];

    return filterDataGeneric(datosCrudos);
  }, [
    viewType,
    activeTab,
    sociosPagados,
    sociosDeudores,
    empresasPagadas,
    empresasDeudoras,
    selectedMedioPago,
    searchTerm,
    selectedMonth,
    filterDataGeneric
  ]);

  // === Badges: contadores por pestaña con los mismos filtros (¡buscador incluido!) ===
  const countPagados = useMemo(() => {
    if (!selectedMonth && !selectedMedioPago && !searchTerm) return 0;
    const base = viewType === "socio" ? sociosPagados : empresasPagadas;
    return filterDataGeneric(base).length;
  }, [selectedMonth, selectedMedioPago, searchTerm, viewType, sociosPagados, empresasPagadas, filterDataGeneric]);

  const countDeudores = useMemo(() => {
    if (!selectedMonth && !selectedMedioPago && !searchTerm) return 0;
    const base = viewType === "socio" ? sociosDeudores : empresasDeudoras;
    return filterDataGeneric(base).length;
  }, [selectedMonth, selectedMedioPago, searchTerm, viewType, sociosDeudores, empresasDeudoras, filterDataGeneric]);

  // Paginación/infinite
  const datosFiltradosPaginated = useMemo(() => {
    return datosFiltrados.slice(0, offset + limit);
  }, [datosFiltrados, offset, limit]);

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
      if (entries[0].isIntersecting && hasMore) {
        loadMoreItems();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading.socios, loading.empresas, hasMore, loadMoreItems]);

  useEffect(() => {
    setOffset(0);
    setLimit(100);
    setHasMore(true);
    if (listRef.current) listRef.current.scrollTo(0);
  }, [selectedMonth, selectedMedioPago, searchTerm, viewType, activeTab]);

  // Carga Meses
  useEffect(() => {
    const fetchMeses = async () => {
      if (cacheRef.current.meses.length > 1) {
        setMeses(cacheRef.current.meses);
        return;
      }
      setLoading(prev => ({ ...prev, meses: true }));
      try {
        const data = await api.get("/api.php?action=meses_pagos");
        cacheRef.current.meses = data;
        setMeses(data);
      } catch (error) {
        console.error("Error al obtener los meses:", error);
        showErrorToast("Error al cargar los meses disponibles");
      } finally {
        setLoading(prev => ({ ...prev, meses: false }));
      }
    };
    fetchMeses();
  }, [showErrorToast]);

  // Carga Medios de pago
  useEffect(() => {
    const fetchMediosPago = async () => {
      if (cacheRef.current.mediosPago.length > 0) {
        setMediosPago(cacheRef.current.mediosPago);
        return;
      }
      setLoading(prev => ({ ...prev, mediosPago: true }));
      try {
        const data = await api.get("/api.php?action=obtener_datos");
        const mediosAdaptados = (data.mediosPago || []).map((item) => ({
          id: item.IdMedios_pago,
          nombre: item.Medio_Pago
        }));
        cacheRef.current.mediosPago = mediosAdaptados;
        setMediosPago(mediosAdaptados);
      } catch (error) {
        console.error("Error al obtener los medios de pago:", error);
        showErrorToast("Error al cargar los medios de pago");
      } finally {
        setLoading(prev => ({ ...prev, mediosPago: false }));
      }
    };
    fetchMediosPago();
  }, [showErrorToast]);

  // Carga Socios por mes o todos
  const cargarDatosPorMes = useCallback(async (mes, forceRefresh = false) => {
    if (loading.socios) return;
    const now = Date.now();
    const cache = cacheRef.current.socios;
    const isCacheValid = !forceRefresh && cache.lastUpdated[mes] && (now - cache.lastUpdated[mes] < cacheRef.current.cacheDuration);

    if (isCacheValid && cache.pagado[mes] && cache.deudor[mes]) {
      setSociosPagados(cache.pagado[mes]);
      setSociosDeudores(cache.deudor[mes]);
      return;
    }

    setLoading(prev => ({ ...prev, socios: true }));
    try {
      const [pagados, deudores] = await Promise.all([
        api.get(`/api.php?action=cuotas&tipo=socio&estado=pagado&mes=${mes}`),
        api.get(`/api.php?action=cuotas&tipo=socio&estado=deudor&mes=${mes}`)
      ]);
      const pagadosForm = formatData(pagados);
      const deudoresForm = formatData(deudores);

      cacheRef.current.socios.pagado[mes] = pagadosForm;
      cacheRef.current.socios.deudor[mes] = deudoresForm;
      cacheRef.current.socios.lastUpdated[mes] = Date.now();

      setSociosPagados(pagadosForm);
      setSociosDeudores(deudoresForm);
    } catch (error) {
      console.error(`Error cargando datos para el mes ${mes}:`, error);
      showErrorToast(`Error al cargar datos para el mes ${mes}`);
    } finally {
      setLoading(prev => ({ ...prev, socios: false }));
    }
  }, [formatData, loading.socios, showErrorToast]);

  const cargarDatosEmpresasPorMes = useCallback(async (mes, forceRefresh = false) => {
    if (loading.empresas) return;

    const now = Date.now();
    const cache = cacheRef.current.empresas;
    const isCacheValid = !forceRefresh && cache.lastUpdated[mes] && (now - cache.lastUpdated[mes] < cacheRef.current.cacheDuration);

    if (isCacheValid && cache.pagado[mes] && cache.deudor[mes]) {
      setEmpresasPagadas(cache.pagado[mes]);
      setEmpresasDeudoras(cache.deudor[mes]);
      return;
    }

    setLoading(prev => ({ ...prev, empresas: true }));
    try {
      const [pagadas, deudoras] = await Promise.all([
        api.get(`/api.php?action=cuotas&tipo=empresa&estado=pagado&mes=${mes}`),
        api.get(`/api.php?action=cuotas&tipo=empresa&estado=deudor&mes=${mes}`)
      ]);

      const pagadasForm = formatData(pagadas);
      const deudorasForm = formatData(deudoras);

      cacheRef.current.empresas.pagado[mes] = pagadasForm;
      cacheRef.current.empresas.deudor[mes] = deudorasForm;
      cacheRef.current.empresas.lastUpdated[mes] = Date.now();

      setEmpresasPagadas(pagadasForm);
      setEmpresasDeudoras(deudorasForm);
    } catch (error) {
      console.error(`Error cargando datos de empresas para el mes ${mes}:`, error);
      showErrorToast(`Error al cargar datos de empresas para el mes ${mes}`);
    } finally {
      setLoading(prev => ({ ...prev, empresas: false }));
    }
  }, [formatData, loading.empresas, showErrorToast]);

  const cargarTodosLosDatosSocios = useCallback(async (forceRefresh = false) => {
    if (loading.socios) return;

    setLoading(prev => ({ ...prev, socios: true }));
    try {
      const mesesDisponibles = cacheRef.current.meses.map(m => m.mes);
      const now = Date.now();

      const mesesFaltantes = forceRefresh 
        ? mesesDisponibles 
        : mesesDisponibles.filter(mes => {
            const cache = cacheRef.current.socios;
            return (
              !cache.pagado[mes] || 
              !cache.deudor[mes] || 
              now - (cache.lastUpdated[mes] || 0) >= cacheRef.current.cacheDuration
            );
          });

      if (mesesFaltantes.length === 0 && !forceRefresh) {
        const todosPagados = Object.values(cacheRef.current.socios.pagado).flat();
        const todosDeudores = Object.values(cacheRef.current.socios.deudor).flat();
        setSociosPagados(todosPagados);
        setSociosDeudores(todosDeudores);
        return;
      }

      const requests = mesesFaltantes.map(mes => 
        Promise.all([
          api.get(`/api.php?action=cuotas&tipo=socio&estado=pagado&mes=${mes}`),
          api.get(`/api.php?action=cuotas&tipo=socio&estado=deudor&mes=${mes}`)
        ])
      );

      const responses = await Promise.all(requests);
      
      let todosPagados = [];
      let todosDeudores = [];

      responses.forEach(([pagados, deudores], index) => {
        const mes = mesesFaltantes[index];
        const pagadosForm = formatData(pagados);
        const deudoresForm = formatData(deudores);

        cacheRef.current.socios.pagado[mes] = pagadosForm;
        cacheRef.current.socios.deudor[mes] = deudoresForm;
        cacheRef.current.socios.lastUpdated[mes] = Date.now();

        todosPagados = [...todosPagados, ...pagadosForm];
        todosDeudores = [...todosDeudores, ...deudoresForm];
      });

      if (!forceRefresh) {
        Object.keys(cacheRef.current.socios.pagado).forEach(mes => {
          if (!mesesFaltantes.includes(mes)) {
            todosPagados = [...todosPagados, ...cacheRef.current.socios.pagado[mes]];
            todosDeudores = [...todosDeudores, ...cacheRef.current.socios.deudor[mes]];
          }
        });
      }

      setSociosPagados(todosPagados);
      setSociosDeudores(todosDeudores);
    } catch (error) {
      console.error("Error cargando todos los datos de socios:", error);
      showErrorToast("Error al cargar los datos de socios");
    } finally {
      setLoading(prev => ({ ...prev, socios: false }));
    }
  }, [formatData, loading.socios, showErrorToast]);

  // Efectos de carga según selección
  useEffect(() => {
    if (viewType !== "socio") return;
    const shouldLoad = selectedMonth || selectedMedioPago || searchTerm;
    if (!shouldLoad) {
      setSociosPagados([]);
      setSociosDeudores([]);
      return;
    }
    const debounceTimer = setTimeout(() => {
      if (selectedMonth) {
        cargarDatosPorMes(selectedMonth);
      } else {
        cargarTodosLosDatosSocios();
      }
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(debounceTimer);
  }, [selectedMonth, viewType, selectedMedioPago, searchTerm, cargarDatosPorMes, cargarTodosLosDatosSocios]);

  useEffect(() => {
    if (viewType !== "empresa" || (!selectedMonth && !selectedMedioPago && !searchTerm)) {
      setEmpresasPagadas([]);
      setEmpresasDeudoras([]);
      return;
    }
    cargarDatosEmpresasPorMes(selectedMonth || "");
  }, [selectedMonth, viewType, selectedMedioPago, searchTerm, cargarDatosEmpresasPorMes]);

  // Handlers UI
  const handleVolverAtras = useCallback(() => navigate(-1), [navigate]);

  const handleMonthChange = useCallback((e) => {
    setSelectedMonth(e.target.value);
    setSelectedRow(null);
  }, []);

  const handleMedioPagoChange = useCallback((e) => {
    setSelectedMedioPago(e.target.value);
  }, []);

  const handleSearchChange = useCallback((e) => {
    if (!selectedMonth) return; // según tu lógica actual
    setSearchTerm(e.target.value);
  }, [selectedMonth]);

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

    if (viewType === "socio") {
      setMostrarModalPagoSocio(true);
    } else {
      setMostrarModalPagoEmpresa(true);
    }
  }, [viewType, showErrorToast]);

  const handlePagoRealizado = useCallback(async () => {
    try {
      showSuccessToast("Pago registrado correctamente");
      if (selectedMonth) {
        const cacheKey = viewType === "socio" ? cacheRef.current.socios : cacheRef.current.empresas;
        delete cacheKey.pagado[selectedMonth];
        delete cacheKey.deudor[selectedMonth];
        delete cacheKey.lastUpdated[selectedMonth];
      }
      if (viewType === "socio") {
        await cargarDatosPorMes(selectedMonth, true);
      } else {
        await cargarDatosEmpresasPorMes(selectedMonth, true);
      }
    } catch (error) {
      console.error("Error al actualizar datos después del pago:", error);
      showErrorToast("Pago registrado pero hubo un error al actualizar los datos");
    } finally {
      setMostrarModalPagoSocio(false);
      setMostrarModalPagoEmpresa(false);
      setSelectedItemData(null);
    }
  }, [selectedMonth, viewType, cargarDatosPorMes, cargarDatosEmpresasPorMes, showSuccessToast, showErrorToast]);

  const handleExportExcel = useCallback(() => {
    if (!selectedMonth && !selectedMedioPago && !searchTerm) {
      showWarningToast("Por favor aplique filtros antes de exportar");
      return;
    }
    if (!selectedMonth && viewType === "empresa") {
      showWarningToast("Por favor seleccione un mes primero");
      return;
    }
    if (loading.socios || loading.empresas) {
      showWarningToast("Espere a que terminen de cargarse los datos");
      return;
    }
    if (datosFiltrados.length === 0) {
      showWarningToast("No hay datos para exportar");
      return;
    }

    const dataExport = datosFiltrados.map((item) => ({
      ...item,
      Mes: selectedMonth || "Todos",
      Tipo: activeTab === "pagado" ? "Pagados" : "Deudores",
      MedioPago: selectedMedioPago || "Todos"
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, viewType === "socio" ? "Socios" : "Empresas");
    XLSX.writeFile(wb, `${viewType}_${selectedMonth || 'todos'}_${activeTab}_${selectedMedioPago || 'todos'}.xlsx`);
  }, [
    selectedMonth, 
    selectedMedioPago, 
    searchTerm, 
    viewType, 
    loading.socios, 
    loading.empresas, 
    datosFiltrados, 
    activeTab,
    showWarningToast
  ]);

  const handleImprimirRegistro = useCallback(() => {
    if (!selectedMonth && !selectedMedioPago && !searchTerm) {
      showWarningToast("Por favor aplique filtros antes de imprimir");
      return;
    }
    if (!selectedMonth && viewType === "empresa") {
      showWarningToast("Por favor seleccione un mes primero");
      return;
    }
    if (loading.socios || loading.empresas) {
      showWarningToast("Espere a que terminen de cargarse los datos");
      return;
    }
    if (datosFiltrados.length === 0) {
      showWarningToast("No hay datos para imprimir");
      return;
    }

    let content = `
      <html>
        <head>
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
          <h2> Registro - ${activeTab === "pagado" ? "Pagados" : "Deudores"} - ${selectedMonth ? `Mes: ${selectedMonth}` : 'Todos los meses'}</h2>
          ${selectedMedioPago ? `<h3>Medio de Pago: ${selectedMedioPago}</h3>` : ''}
          <table>
            <thead>
              <tr>
                ${viewType === "socio" ? "<th>APELLIDO</th><th>NOMBRE</th><th>MEDIO PAGO</th>" : "<th>EMPRESA</th><th>MEDIO PAGO</th>"}
              </tr>
            </thead>
            <tbody>
              ${datosFiltrados.map(item => `<tr>${viewType === "socio" ? 
                `<td>${item.apellido}</td><td>${item.nombre}</td><td>${item.medio_pago || '-'}</td>` : 
                `<td>${item.razon_social}</td><td>${item.medio_pago || '-'}</td>`}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "Imprimir", "width=800,height=600");
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  }, [
    selectedMonth, 
    selectedMedioPago, 
    searchTerm, 
    viewType, 
    loading.socios, 
    loading.empresas, 
    datosFiltrados, 
    activeTab,
    showWarningToast
  ]);

  // abrir modal para lote o individual
  const handleAbrirModalImpresion = useCallback(() => {
    if (!selectedMonth && !selectedMedioPago && !searchTerm) {
      showWarningToast("Por favor aplique filtros antes de imprimir");
      return;
    }
    if (!selectedMonth && viewType === "empresa") {
      showWarningToast("Por favor seleccione un mes primero");
      return;
    }
    if (loading.socios || loading.empresas) {
      showWarningToast("Espere a que terminen de cargarse los datos");
      return;
    }
    if (datosFiltrados.length === 0) {
      showWarningToast("No hay datos para imprimir");
      return;
    }

    setMesesSeleccionadosImpresion(selectedMonth ? [selectedMonth] : []);
    setModoImpresionIndividual(false);
    setSelectedItemData(null);
    setMostrarModalMes(true);
  }, [
    selectedMonth, selectedMedioPago, searchTerm, viewType,
    loading.socios, loading.empresas, datosFiltrados, showWarningToast
  ]);

  // click de imprimir fila única
  const handlePrintClick = useCallback((item) => {
    setSelectedItemData(item);
    setModoImpresionIndividual(true);
    setMesesSeleccionadosImpresion(selectedMonth ? [selectedMonth] : []);
    setMostrarModalMes(true);
  }, [selectedMonth]);

  // imprimir lote según meses
  const handleImprimirTodosComprobantes = useCallback((mesesSeleccionados) => {
    if (!Array.isArray(mesesSeleccionados) || mesesSeleccionados.length === 0) {
      showWarningToast("Debe seleccionar al menos un mes");
      return;
    }
    printComprobantesLote(datosFiltrados, viewType, activeTab, mesesSeleccionados);
    setMostrarModalMes(false);
  }, [datosFiltrados, viewType, activeTab, showWarningToast]);

  // imprimir una fila con meses
  const handleImprimirUnoConMeses = useCallback((item, mesesSeleccionados) => {
    if (!Array.isArray(mesesSeleccionados) || mesesSeleccionados.length === 0) {
      showWarningToast("Debe seleccionar al menos un mes");
      return;
    }
    printComprobanteItem(item, viewType, activeTab, mesesSeleccionados);
    setMostrarModalMes(false);
    setModoImpresionIndividual(false);
    setSelectedItemData(null);
  }, [viewType, activeTab, showWarningToast]);

  const listKey = useMemo(() => {
    return `${viewType}-${activeTab}-${selectedMonth}-${selectedMedioPago}-${searchTerm}`;
  }, [viewType, activeTab, selectedMonth, selectedMedioPago, searchTerm]);

  const renderTabla = useMemo(() => {
    if (!selectedMonth && !selectedMedioPago && !searchTerm) return <NoFiltersApplied />;
    if (!selectedMonth && viewType === "empresa") return <NoMonthSelected />;
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
                  <div className="gcuotas-mobile-row">
                    <span className="gcuotas-mobile-label">Nombre:</span>
                    <span>{item.apellido} {item.nombre}</span>
                  </div>
                  <div className="gcuotas-mobile-row">
                    <span className="gcuotas-mobile-label">Dirección:</span>
                    <span>{item.domicilio}</span>
                  </div>
                  <div className="gcuotas-mobile-row">
                    <span className="gcuotas-mobile-label">Categoría:</span>
                    <span>{item.displayCategoriaPrecio}</span>
                  </div>
                  <div className="gcuotas-mobile-row">
                    <span className="gcuotas-mobile-label">Medio Pago:</span>
                    <span>{item.medio_pago || '-'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="gcuotas-mobile-row">
                    <span className="gcuotas-mobile-label">Empresa:</span>
                    <span>{item.razon_social}</span>
                  </div>
                  <div className="gcuotas-mobile-row">
                    <span className="gcuotas-mobile-label">Dirección:</span>
                    <span>{item.domicilio}</span>
                  </div>
                  <div className="gcuotas-mobile-row">
                    <span className="gcuotas-mobile-label">Categoría:</span>
                    <span>{item.displayCategoriaPrecio}</span>
                  </div>
                  <div className="gcuotas-mobile-row">
                    <span className="gcuotas-mobile-label">Medio Pago:</span>
                    <span>{item.medio_pago || '-'}</span>
                  </div>
                </>
              )}
              
              {selectedRow === index && (
                <div className="gcuotas-mobile-actions">
                  <button
                    className="gcuotas-mobile-print-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintClick(item);
                    }}
                  >
                    <FontAwesomeIcon icon={faPrint} />
                    <span>Imprimir</span>
                  </button>

                  {activeTab === "deudores" && (
                    <button
                      className="gcuotas-mobile-payment-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePaymentClick(item);
                      }}
                    >
                      <FontAwesomeIcon icon={faDollarSign} />
                      <span>Registrar Pago</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading.socios || loading.empresas ? (
            <div className="gcuotas-loading-more"></div>
          ) : null}
        </div>
      );
    }

    const headerHeight = 50;
    const tableHeight = window.innerHeight * 0.85 - headerHeight;
    
    return (
      <div className="gcuotas-virtual-table" style={{ height: "85vh" }}>
        <div className={`gcuotas-virtual-header ${viewType === 'empresa' ? 'gempresas' : 'gsocios'}`}>
          {viewType === "socio" ? (
            <>
              <div className="gcuotas-virtual-cell">Apellido</div>
              <div className="gcuotas-virtual-cell">Nombre</div>
              <div className="gcuotas-virtual-cell">Dirección</div>
              <div className="gcuotas-virtual-cell">Categoría</div>
              <div className="gcuotas-virtual-cell">Medio Pago</div>
              <div className="gcuotas-virtual-cell">Acciones</div>
            </>
          ) : (
            <>
              <div className="gcuotas-virtual-cell">Razón Social</div>
              <div className="gcuotas-virtual-cell">Dirección</div>
              <div className="gcuotas-virtual-cell">Categoría</div>
              <div className="gcuotas-virtual-cell">Medio Pago</div>
              <div className="gcuotas-virtual-cell">Acciones</div>
            </>
          )}
        </div>

        <List
          ref={listRef}
          key={listKey}
          height={Math.max(tableHeight, 300)}
          itemCount={datosFiltradosPaginated.length + (hasMore ? 1 : 0)}
          itemSize={50}
          itemData={datosFiltradosPaginated}
          width={"100%"}
          onItemsRendered={({ visibleStopIndex }) => {
            if (visibleStopIndex >= datosFiltradosPaginated.length - 5 && hasMore) {
              loadMoreItems();
            }
          }}
        >
          {(props) => {
            if (props.index >= datosFiltradosPaginated.length) {
              return (
                <div style={props.style} className="gcuotas-loading-row"></div>
              );
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
              />
            );
          }}
        </List>
      </div>
    );
  }, [
    selectedMonth,
    selectedMedioPago,
    searchTerm,
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
    hasMore,
    loadMoreItems,
    lastItemRef,
    listKey
  ]);

  return (
    <div className="gcuotas-container">
      {toast.show && (
        <Toast
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          onClose={hideToast}
          duracion={toast.duracion}
        />
      )}

      {/* Modal de Meses */}
      {mostrarModalMes && (
        <ModalMesCuotas
          mesesSeleccionados={mesesSeleccionadosImpresion}
          onMesSeleccionadosChange={setMesesSeleccionadosImpresion}
          onCancelar={() => {
            setMostrarModalMes(false);
            setModoImpresionIndividual(false);
            setSelectedItemData(null);
          }}
          onImprimir={() => {
            if (modoImpresionIndividual && selectedItemData) {
              handleImprimirUnoConMeses(selectedItemData, mesesSeleccionadosImpresion);
            } else {
              handleImprimirTodosComprobantes(mesesSeleccionadosImpresion);
            }
          }}
        />
      )}

      {mostrarModalPagoSocio && selectedItemData && (
        <ModalPagos
          nombre={selectedItemData.nombre}
          apellido={selectedItemData.apellido}
          cerrarModal={() => {
            setMostrarModalPagoSocio(false);
            setSelectedItemData(null);
          }}
          onPagoRealizado={handlePagoRealizado}
        />
      )}

      {mostrarModalPagoEmpresa && selectedItemData && (
        <ModalPagosEmpresas
          razonSocial={selectedItemData.razon_social}
          cerrarModal={() => {
            setMostrarModalPagoEmpresa(false);
            setSelectedItemData(null);
          }}
          onPagoRealizado={handlePagoRealizado}
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

              {/* GRID para filtros: en móvil, Mes + Tipo a la par, Medio debajo */}
              <div className="gcuotas-select-container">
                <div className="gcuotas-input-group">
                  <label htmlFor="meses" className="gcuotas-input-label">
                    <FontAwesomeIcon icon={faCalendarAlt} /> Mes
                  </label>
                  <select
                    id="meses"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="gcuotas-dropdown"
                    disabled={loading.socios || loading.empresas}
                  >
                    <option value="">Seleccione un Mes</option>
                    {meses.map((mes, index) => (
                      <option key={index} value={mes.mes}>{mes.mes}</option>
                    ))}
                  </select>
                </div>

                <div className="gcuotas-input-group">
                  <label htmlFor="entidad" className="gcuotas-input-label">
                    <FontAwesomeIcon icon={faUsers} /> Tipo de vista
                  </label>
                  <select
                    id="entidad"
                    value={viewType}
                    onChange={(e) => {
                      setViewType(e.target.value);
                      setSelectedRow(null);
                    }}
                    className="gcuotas-dropdown"
                    disabled={loading.socios || loading.empresas}
                  >
                    <option value="socio">Socios</option>
                    <option value="empresa">Empresas</option>
                  </select>
                </div>

                <div className="gcuotas-input-group gcuotas-input-full">
                  <label htmlFor="medioPago" className="gcuotas-input-label">
                    <FontAwesomeIcon icon={faCreditCard} /> Medio de Pago
                  </label>
                  <select
                    id="medioPago"
                    value={selectedMedioPago}
                    onChange={handleMedioPagoChange}
                    className="gcuotas-dropdown"
                    disabled={loading.socios || loading.empresas}
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
                  onClick={() => {
                    setActiveTab("pagado");
                    setSelectedRow(null);
                  }}
                  disabled={loading.socios || loading.empresas}
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Pagado
                  <span className="gcuotas-tab-badge">{countPagados}</span>
                </button>
                <button
                  className={`gcuotas-tab-button ${activeTab === "deudores" ? "gcuotas-active-tab" : ""}`}
                  onClick={() => {
                    setActiveTab("deudores");
                    setSelectedRow(null);
                  }}
                  disabled={loading.socios || loading.empresas}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  Deudores
                  <span className="gcuotas-tab-badge">{countDeudores}</span>
                </button>
              </div>
            </div>
          </div>

          {/* En escritorio la caja de acciones sigue arriba; en móvil se reemplaza por bottom bar */}
          <div className="gcuotas-actions-card">
            <div className="gcuotas-actions-header">
              <FontAwesomeIcon icon={faCog} className="gcuotas-actions-icon" />
              <span>Acciones</span>
            </div>
            <div className="gcuotas-buttons-container">
              <button 
                className="gcuotas-button gcuotas-button-back" 
                onClick={handleVolverAtras}
                disabled={loading.socios || loading.empresas}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Volver Atrás</span>
              </button>
              <button 
                className="gcuotas-button gcuotas-button-export" 
                onClick={handleExportExcel}
                disabled={loading.socios || loading.empresas}
              >
                <FontAwesomeIcon icon={faFileExcel} />
                <span>Generar Excel</span>
              </button>
              <button 
                className="gcuotas-button gcuotas-button-print" 
                onClick={handleImprimirRegistro}
                disabled={loading.socios || loading.empresas}
              >
                <FontAwesomeIcon icon={faPrint} />
                <span>Registro</span>
              </button>
              <button 
                className="gcuotas-button gcuotas-button-print-all" 
                onClick={handleAbrirModalImpresion}
                disabled={loading.socios || loading.empresas}
              >
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
                disabled={loading.socios || loading.empresas || !selectedMonth}
              />
            </div>
          </div>
          <div className="gcuotas-summary-info">
            <span className="gcuotas-summary-item">
              <FontAwesomeIcon icon={faUsers} />
              Total: {selectedMonth || selectedMedioPago || searchTerm ? datosFiltrados.length : 0}
            </span>
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

        {/* Scroll propio para lista / tabla */}
        <div className="gcuotas-table-container">
          {renderTabla}
        </div>
      </div>

      {/* Barra de acciones fija en móvil */}
      {isMobile && (
        <div className="gcuotas-mobile-bottombar">
          <button 
            className="gcuotas-mbar-btn mbar-back" 
            onClick={handleVolverAtras}
            disabled={loading.socios || loading.empresas}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Volver</span>
          </button>

          <button 
            className="gcuotas-mbar-btn mbar-excel" 
            onClick={handleExportExcel}
            disabled={loading.socios || loading.empresas}
          >
            <FontAwesomeIcon icon={faFileExcel} />
            <span>Excel</span>
          </button>

          <button 
            className="gcuotas-mbar-btn mbar-registro" 
            onClick={handleImprimirRegistro}
            disabled={loading.socios || loading.empresas}
          >
            <FontAwesomeIcon icon={faPrint} />
            <span>Registro</span>
          </button>

          <button 
            className="gcuotas-mbar-btn mbar-imprimir" 
            onClick={handleAbrirModalImpresion}
            disabled={loading.socios || loading.empresas}
          >
            <FontAwesomeIcon icon={faPrint} />
            <span>Imprimir</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(GestionarCuotas);
