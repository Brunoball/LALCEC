// src/components/Contable/DashboardContable.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import BASE_URL from "../../config/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDollarSign,
  faTags,
  faCalendarAlt,
  faExclamationTriangle,
  faTimes,
  faListAlt,
  faTable,
  faBuilding,
  faUser,
  faCreditCard,
  faChartPie,
  faArrowLeft,
  faFileExcel,          // 👈 NUEVO
} from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx"; // 👈 NUEVO

// Modal unificado:
import ContableChartsModal from "./modalcontable/ContableChartsModal";

export default function DashboardContable() {
  const navigate = useNavigate();

  // ===== Años =====
  const [anios, setAnios] = useState([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState("");

  // Filtros
  const [mesSeleccionado, setMesSeleccionado] = useState("Selecciona un mes");
  const [tipoEntidad, setTipoEntidad] = useState("socio");
  const [medioSeleccionado, setMedioSeleccionado] = useState("todos");

  // Datos base
  const [meses, setMeses] = useState(["Selecciona un mes"]);
  const [datosMeses, setDatosMeses] = useState([]); // socios
  const [datosEmpresas, setDatosEmpresas] = useState([]); // empresas
  const [preciosCategorias, setPreciosCategorias] = useState({});

  // Medios de pago
  const [mediosPago, setMediosPago] = useState([]);

  // Derivados (por mes)
  const [categoriasAgrupadas, setCategoriasAgrupadas] = useState([]);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [registrosMes, setRegistrosMes] = useState([]);

  // UI (errores)
  const [error, setError] = useState(null);

  // Modal Gráficos
  const [mostrarModalGraficos, setMostrarModalGraficos] = useState(false);

  // Vista detalle/resumen (ahora la cambian las pestañas)
  const [mostrarTablaDetalle, setMostrarTablaDetalle] = useState(false);

  // Helper fetch con cache buster
  const fetchData = async (url) => {
    const timestamp = new Date().getTime();
    const urlWithCacheBuster = url.includes("?")
      ? `${url}&timestamp=${timestamp}`
      : `${url}?timestamp=${timestamp}`;

    const response = await fetch(urlWithCacheBuster, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (!data) throw new Error("No data received from server");

    return data;
  };

  // ===== Cargar años =====
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const resp = await fetchData(`${BASE_URL}/api.php?action=anios_pagos`);
        const lista = Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.anios)
          ? resp.anios
          : [];
        const norm = lista
          .map((a) =>
            typeof a === "object" ? a.anio ?? a.year ?? a.y ?? a.value : a
          )
          .filter((v) => v != null)
          .map((n) => parseInt(n, 10))
          .sort((a, b) => b - a);

        setAnios(norm);

        const current = new Date().getFullYear();
        if (norm.length === 0) {
          setAnioSeleccionado("");
        } else if (norm.includes(current)) {
          setAnioSeleccionado(String(current));
        } else {
          setAnioSeleccionado(String(norm[0]));
        }
      } catch (err) {
        console.error("Error al cargar años:", err);
        setError("Error al cargar los años de pagos.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Carga de datos dependiente del AÑO =====
  useEffect(() => {
    if (!anioSeleccionado) {
      setDatosMeses([]);
      setDatosEmpresas([]);
      setMeses(["Selecciona un mes"]);
      setMesSeleccionado("Selecciona un mes");
      return;
    }

    (async () => {
      try {
        setError(null);

        const [dataContable, dataEmpresas, dataPrecios, dataMediosPago] =
          await Promise.all([
            fetchData(
              `${BASE_URL}/api.php?action=contable&anio=${encodeURIComponent(
                anioSeleccionado
              )}`
            ),
            fetchData(
              `${BASE_URL}/api.php?action=contable_emp&anio=${encodeURIComponent(
                anioSeleccionado
              )}`
            ),
            fetchData(`${BASE_URL}/api.php?action=precios_cat_mes`),
            fetchData(`${BASE_URL}/api.php?action=obtener_medios_pago`),
          ]);

        if (!dataContable?.success || !Array.isArray(dataContable.data)) {
          throw new Error("Formato inválido en datos contables (socios).");
        }
        if (!dataEmpresas?.success || !Array.isArray(dataEmpresas.data)) {
          throw new Error("Formato inválido en datos contables (empresas).");
        }
        if (!dataPrecios || typeof dataPrecios !== "object" || Array.isArray(dataPrecios)) {
          throw new Error("Formato inválido en precios de categorías.");
        }
        if (!dataMediosPago?.success || !Array.isArray(dataMediosPago.data)) {
          throw new Error("Formato inválido en medios de pago.");
        }

        setDatosMeses(dataContable.data);
        setDatosEmpresas(dataEmpresas.data);
        setPreciosCategorias(dataPrecios);

        const mesesDisponibles =
          Object.keys(dataPrecios).length > 0
            ? Object.keys(dataPrecios)
            : [
                ...new Set([
                  ...dataContable.data.map((m) => m.nombre),
                  ...dataEmpresas.data.map((m) => m.nombre),
                ]),
              ];

        setMeses(["Selecciona un mes", ...mesesDisponibles.filter(Boolean)]);

        const listaMedios = dataMediosPago.data
          .map((m) => m?.nombre)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "es"));
        setMediosPago(listaMedios);

        if (
          mesSeleccionado !== "Selecciona un mes" &&
          !mesesDisponibles.includes(mesSeleccionado)
        ) {
          setMesSeleccionado("Selecciona un mes");
        }
      } catch (err) {
        console.error("Error en carga de datos contables:", err);
        setError("Error al cargar datos del año seleccionado.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anioSeleccionado]);

  // === Resumen ANUAL ===
  const pagosAnuales = useMemo(() => {
    const fuente = tipoEntidad === "socio" ? datosMeses : datosEmpresas;
    const todosPagos = fuente.flatMap((m) =>
      Array.isArray(m?.pagos) ? m.pagos : []
    );
    if (medioSeleccionado === "todos") return todosPagos;
    return todosPagos.filter(
      (p) => (p?.Medio_Pago || "").toString().trim() === medioSeleccionado
    );
  }, [datosMeses, datosEmpresas, tipoEntidad, medioSeleccionado]);

  const totalAnual = useMemo(
    () => pagosAnuales.reduce((acc, p) => acc + (parseFloat(p?.Precio) || 0), 0),
    [pagosAnuales]
  );

  const totalRegistrosAnual = useMemo(
    () => pagosAnuales.length,
    [pagosAnuales]
  );

  const totalCategoriasAnual = useMemo(() => {
    const set = new Set(
      pagosAnuales.map((p) => p?.Nombre_Categoria).filter(Boolean)
    );
    return set.size;
  }, [pagosAnuales]);

  // Recalcular por mes
  useEffect(() => {
    if (mesSeleccionado !== "Selecciona un mes") {
      updateMonthData();
    } else {
      setCategoriasAgrupadas([]);
      setRegistrosMes([]);
      setTotalRecaudado(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSeleccionado, tipoEntidad, medioSeleccionado]);

  const agruparPorCategoria = (pagos) => {
    const agrupado = {};
    pagos.forEach((pago) => {
      if (!pago?.Nombre_Categoria) return;
      if (!agrupado[pago.Nombre_Categoria]) {
        agrupado[pago.Nombre_Categoria] = {
          nombre: pago.Nombre_Categoria,
          total: 0,
          cantidad: 0,
          registros: [],
        };
      }
      const precio = parseFloat(pago.Precio) || 0;
      agrupado[pago.Nombre_Categoria].total += precio;
      agrupado[pago.Nombre_Categoria].cantidad += 1;
      agrupado[pago.Nombre_Categoria].registros.push(pago);
    });
    return Object.values(agrupado);
  };

  const updateMonthData = () => {
    try {
      const mesData =
        tipoEntidad === "socio"
          ? datosMeses.find((m) => m?.nombre === mesSeleccionado)
          : datosEmpresas.find((m) => m?.nombre === mesSeleccionado);

      const preciosMesActual = preciosCategorias[mesSeleccionado] || [];
      let pagos = Array.isArray(mesData?.pagos) ? mesData.pagos : [];

      if (medioSeleccionado !== "todos") {
        pagos = pagos.filter(
          (p) => (p?.Medio_Pago || "").toString().trim() === medioSeleccionado
        );
      }

      const totalFiltrado = pagos.reduce(
        (acc, p) => acc + (parseFloat(p?.Precio) || 0),
        0
      );

      const pagosAgrupados = agruparPorCategoria(pagos);

      const categoriasCombinadas = preciosMesActual.map((catPrecio) => {
        const categoriaPagos =
          pagosAgrupados.find((c) => c.nombre === catPrecio.nombreCategoria) || {
            total: 0,
            cantidad: 0,
            registros: [],
          };
        return {
          nombre: catPrecio.nombreCategoria,
          precio: catPrecio.precio,
          total: categoriaPagos.total,
          cantidad: categoriaPagos.cantidad,
          registros: categoriaPagos.registros,
        };
      });

      setCategoriasAgrupadas(categoriasCombinadas);
      setTotalRecaudado(totalFiltrado);
      setRegistrosMes(pagos);
    } catch (err) {
      console.error("Error al actualizar datos del mes:", err);
      setError("Error al procesar datos del mes seleccionado.");
      setCategoriasAgrupadas([]);
      setRegistrosMes([]);
      setTotalRecaudado(0);
    }
  };

  // Handlers
  const volver = () => navigate(-1);
  const handleMesChange = (e) => setMesSeleccionado(e.target.value);
  const handleTipoEntidadChange = (e) => setTipoEntidad(e.target.value);
  const handleMedioPagoChange = (e) => setMedioSeleccionado(e.target.value);
  const abrirModalGraficos = () => setMostrarModalGraficos(true);
  const cerrarModalGraficos = () => setMostrarModalGraficos(false);

  const handleAnioChange = (e) => {
    const nuevo = e.target.value;
    setAnioSeleccionado(nuevo);
    setMesSeleccionado("Selecciona un mes");
  };

  const handleExportExcel = () => {
    try {
      if (!anioSeleccionado) {
        setError("Seleccioná un año antes de exportar a Excel.");
        return;
      }

      // Si no hay datos en la vista actual:
      if (mostrarTablaDetalle && registrosMes.length === 0) {
        setError("No hay datos de detalle para exportar.");
        return;
      }
      if (!mostrarTablaDetalle && categoriasAgrupadas.length === 0) {
        setError("No hay datos de resumen para exportar.");
        return;
      }

      const wb = XLSX.utils.book_new();

      if (mostrarTablaDetalle) {
        // Exportar tabla de detalle
        const rows = registrosMes.map((registro) => ({
          [tipoEntidad === "socio" ? "Socio" : "Razón social"]:
            tipoEntidad === "socio"
              ? `${registro.Apellido}, ${registro.Nombre}`
              : registro.Razon_Social || registro.Nombre_Empresa,
          Categoría: registro.Nombre_Categoria,
          Monto: Number(registro.Precio) || 0,
          "Medio de Pago": registro.Medio_Pago || "",
          "Fecha de Pago": registro.fechaPago || "",
          "Mes Pagado": registro.Mes_Pagado || "",
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Detalle");
      } else {
        // Exportar resumen por categoría
        const rows = categoriasAgrupadas.map((cat) => ({
          Categoría: cat.nombre,
          "Precio Mensual": Number(cat.precio) || 0,
          "Cantidad Registros": cat.cantidad || 0,
          Subtotal: Number(cat.total) || 0,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Resumen");
      }

      const periodo =
        mesSeleccionado !== "Selecciona un mes"
          ? `${anioSeleccionado || ""}_${mesSeleccionado}`
          : `${anioSeleccionado || "sin_anio"}`;

      const nombreArchivo = `contable_${
        mostrarTablaDetalle ? "detalle" : "resumen"
      }_${periodo.replace(/\s+/g, "_")}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
    } catch (err) {
      console.error("Error al exportar a Excel:", err);
      setError("No se pudo exportar a Excel.");
    }
  };

  const labelEntidad = tipoEntidad === "socio" ? "Socio" : "Razón social";

  // === Tarjetas resumen (anual vs mes) ===
  const tarjetas = useMemo(() => {
    const usandoMes = mesSeleccionado !== "Selecciona un mes";
    const total = usandoMes ? totalRecaudado : totalAnual;
    const categorias = usandoMes
      ? categoriasAgrupadas.length
      : totalCategoriasAnual;
    const registros = usandoMes ? registrosMes.length : totalRegistrosAnual;

    const subtituloBase = usandoMes
      ? `En ${mesSeleccionado}`
      : `En ${anioSeleccionado || "el año seleccionado"}`;
    const subtituloMedio =
      medioSeleccionado !== "todos" ? ` · ${medioSeleccionado}` : "";

    return {
      total,
      categorias,
      registros,
      subtitulo: `${subtituloBase}${subtituloMedio}`,
    };
  }, [
    mesSeleccionado,
    totalRecaudado,
    categoriasAgrupadas.length,
    registrosMes.length,
    totalAnual,
    totalCategoriasAnual,
    totalRegistrosAnual,
    medioSeleccionado,
    anioSeleccionado,
  ]);

  return (
    <div className="dashboard-contable-fullscreen">
      <div className="contable-fullscreen-container">
        {error && (
          <div className="contable-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="contable-close-error"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        <div className="contable-header">
          <h1 className="contable-title">
            <FontAwesomeIcon icon={faDollarSign} /> Panel Contable
          </h1>
          <button className="contable-back-button" onClick={volver}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Volver</span>
          </button>
        </div>

        {/* ===== Layout 2 columnas: Filtros izquierda / Contenido derecha ===== */}
        <div className="contable-main-layout">
          {/* === Panel de filtros (izquierda) === */}
          <aside className="contable-filters-panel">
            <h2 className="contable-filters-title">
              <span className="contable-filters-icon">
                <FontAwesomeIcon icon={faCalendarAlt} />
              </span>
              <span>Filtros</span>
            </h2>

            <div className="contable-filters-body">
              {/* Fila Año + Mes */}
              <div className="contable-filters-row">
                {/* Año */}
                <div className="contable-filter-group">
                  <span className="contable-filter-label">Año</span>
                  <div className="contable-year-selector">
                    <select
                      value={anioSeleccionado}
                      onChange={handleAnioChange}
                      className="contable-year-select"
                      title="Filtrar por año"
                    >
                      {anios.length === 0 ? (
                        <option value="">Sin años</option>
                      ) : (
                        anios.map((y, idx) => (
                          <option key={idx} value={y}>
                            {y}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Mes */}
                <div className="contable-filter-group">
                  <span className="contable-filter-label">Mes</span>
                  <div className="contable-month-selector">
                    <select
                      value={mesSeleccionado}
                      onChange={handleMesChange}
                      className="contable-month-select"
                      disabled={!anioSeleccionado}
                    >
                      {meses.map((mes, index) => (
                        <option key={index} value={mes}>
                          {mes === "Selecciona un mes" ? "Mes" : mes}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tipo de entidad */}
              <div className="contable-filter-group">
                <span className="contable-filter-label">Tipo</span>
                <div className="contable-entity-selector">
                  <FontAwesomeIcon
                    icon={tipoEntidad === "socio" ? faUser : faBuilding}
                  />
                  <select
                    value={tipoEntidad}
                    onChange={handleTipoEntidadChange}
                    className="contable-entity-select"
                    disabled={!anioSeleccionado}
                  >
                    <option value="socio">Socios</option>
                    <option value="empresa">Empresas</option>
                  </select>
                </div>
              </div>

              {/* Medio de pago */}
              <div className="contable-filter-group">
                <span className="contable-filter-label">Medio de pago</span>
                <div className="contable-payment-selector">
                  <FontAwesomeIcon icon={faCreditCard} />
                  <select
                    value={medioSeleccionado}
                    onChange={handleMedioPagoChange}
                    className="contable-payment-select"
                    title="Filtrar por medio de pago"
                    disabled={!anioSeleccionado}
                  >
                    <option value="todos">Todos los medios</option>
                    {mediosPago.map((mp, idx) => (
                      <option key={idx} value={mp}>
                        {mp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Botones inferiores del panel de filtros */}
            <div className="contable-filters-footer">
              <button
                className="contable-charts-button"
                type="button"
                onClick={abrirModalGraficos}
                title="Ver gráficos Socios vs Empresas"
                disabled={!anioSeleccionado}
              >
                <FontAwesomeIcon icon={faChartPie} />
                Ver Gráficos
              </button>

              <button
                className="contable-excel-button"
                type="button"
                onClick={handleExportExcel}
                title="Exportar a Excel"
                disabled={
                  !anioSeleccionado ||
                  (mesSeleccionado === "Selecciona un mes" &&
                    categoriasAgrupadas.length === 0 &&
                    registrosMes.length === 0)
                }
              >
                <FontAwesomeIcon icon={faFileExcel} />
                Excel
              </button>
            </div>
          </aside>

          {/* === Panel de contenido (derecha) === */}
          <section className="contable-content-panel">
            {/* Encabezado del panel + pestañas */}
            <div className="contable-content-header">
              <div className="contable-content-title">
                <h2>
                  <FontAwesomeIcon
                    icon={mostrarTablaDetalle ? faTable : faTags}
                  />{" "}
                  {mostrarTablaDetalle
                    ? "Detalle de pagos"
                    : "Resumen por categoría"}
                </h2>
                <p className="contable-content-subtitle">
                  {mesSeleccionado !== "Selecciona un mes"
                    ? `${mesSeleccionado} · ${
                        tipoEntidad === "socio" ? "Socios" : "Empresas"
                      }`
                    : anioSeleccionado
                    ? `${anioSeleccionado} · ${
                        tipoEntidad === "socio" ? "Socios" : "Empresas"
                      }`
                    : "Selecciona filtros para ver información"}
                </p>
              </div>

              {/* Pestañas tipo pill (Resumen / Detalle) */}
              <div className="contable-tabs">
                <button
                  type="button"
                  className={`contable-tab ${
                    !mostrarTablaDetalle ? "active" : ""
                  }`}
                  onClick={() => setMostrarTablaDetalle(false)}
                >
                  <FontAwesomeIcon icon={faTags} />
                  <span>Resumen</span>
                </button>
                <button
                  type="button"
                  className={`contable-tab ${
                    mostrarTablaDetalle ? "active" : ""
                  }`}
                  onClick={() => setMostrarTablaDetalle(true)}
                >
                  <FontAwesomeIcon icon={faTable} />
                  <span>Detalle</span>
                </button>
              </div>
            </div>

            {/* Tarjetas resumen dentro del panel derecho */}
            <div className="contable-summary-area">
              <div className="contable-summary-cards">
                {/* Total recaudado */}
                <div className="contable-summary-card total-card">
                  <div className="contable-card-icon">
                    <FontAwesomeIcon icon={faDollarSign} />
                  </div>
                  <div className="contable-card-content">
                    <h3>Total recaudado</h3>
                    <p>
                      ${(tarjetas.total || 0).toLocaleString("es-AR")}
                    </p>
                    <small className="contable-card-subtext">
                      {tarjetas.subtitulo}
                    </small>
                  </div>
                </div>

                {/* Categorías */}
                <div className="contable-summary-card">
                  <div className="contable-card-icon">
                    <FontAwesomeIcon icon={faTags} />
                  </div>
                  <div className="contable-card-content">
                    <h3>Categorías</h3>
                    <p>{tarjetas.categorias}</p>
                    <small className="contable-card-subtext">
                      {mesSeleccionado !== "Selecciona un mes"
                        ? `En ${mesSeleccionado}`
                        : `En ${
                            anioSeleccionado || "el año seleccionado"
                          }`}
                    </small>
                  </div>
                </div>

                {/* Total registros */}
                <div className="contable-summary-card">
                  <div className="contable-card-icon">
                    <FontAwesomeIcon icon={faListAlt} />
                  </div>
                  <div className="contable-card-content">
                    <h3>Registros</h3>
                    <p>{tarjetas.registros}</p>
                    <small className="contable-card-subtext">
                      {mesSeleccionado !== "Selecciona un mes"
                        ? `En ${mesSeleccionado}`
                        : `En ${
                            anioSeleccionado || "el año seleccionado"
                          }`}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección principal de tabla / tarjetas (derecha) */}
            <div className="contable-categories-section">
              <div className="contable-categories-scroll-container">
                {!anioSeleccionado ? (
                  <p className="contable-no-data">
                    Seleccione un año para ver información.
                  </p>
                ) : mesSeleccionado === "Selecciona un mes" ? (
                  <p className="contable-no-data">
                    Seleccione un mes para ver el detalle o el resumen por
                    categoría.
                  </p>
                ) : mostrarTablaDetalle ? (
                  <div className="contable-detail-table-container">
                    <table className="contable-detail-table">
                      <thead>
                        <tr>
                          <th>{labelEntidad}</th>
                          <th>Categoría</th>
                          <th>Monto</th>
                          <th>Medio de Pago</th>
                          <th>Fecha de Pago</th>
                          <th>Mes Pagado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrosMes.length > 0 ? (
                          registrosMes.map((registro, index) => (
                            <tr key={index}>
                              <td data-label={labelEntidad}>
                                {tipoEntidad === "socio"
                                  ? `${registro.Apellido}, ${registro.Nombre}`
                                  : registro.Razon_Social ||
                                    registro.Nombre_Empresa}
                              </td>
                              <td data-label="Categoría">
                                {registro.Nombre_Categoria}
                              </td>
                              <td data-label="Monto">
                                $
                                {(registro.Precio || 0).toLocaleString(
                                  "es-AR"
                                )}
                              </td>
                              <td data-label="Medio de Pago">
                                {registro.Medio_Pago || "-"}
                              </td>
                              <td data-label="Fecha de Pago">
                                {registro.fechaPago}
                              </td>
                              <td data-label="Mes Pagado">
                                {registro.Mes_Pagado}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="contable-no-data">
                              No hay registros para mostrar en este mes
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="contable-categories-cards">
                    {categoriasAgrupadas.length > 0 ? (
                      categoriasAgrupadas.map((categoria, i) => (
                        <div className="contable-category-card" key={i}>
                          <div className="contable-category-header">
                            <div className="contable-category-header-content">
                              <h3>{categoria.nombre}</h3>
                              <div className="price-display">
                                <span className="monthly-price">
                                  $
                                  {categoria.precio?.toLocaleString(
                                    "es-AR"
                                  ) || "0"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="contable-category-body">
                            <div className="contable-category-info">
                              <span className="contable-category-label">
                                Registros:
                              </span>
                              <span className="contable-category-value">
                                {categoria.cantidad}
                              </span>
                            </div>
                            <div className="contable-category-info">
                              <span className="contable-category-label">
                                Subtotal:
                              </span>
                              <span className="contable-category-value">
                                $
                                {categoria.total.toLocaleString("es-AR")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="contable-no-data">
                        No hay datos para mostrar para este mes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ==== MODAL GRÁFICOS (unificado) ==== */}
      <ContableChartsModal
        open={mostrarModalGraficos}
        onClose={cerrarModalGraficos}
        datosMeses={datosMeses}
        datosEmpresas={datosEmpresas}
        mesSeleccionado={mesSeleccionado}
        medioSeleccionado={medioSeleccionado}
      />
    </div>
  );
}
