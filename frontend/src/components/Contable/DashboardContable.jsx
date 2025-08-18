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
} from "@fortawesome/free-solid-svg-icons";

// Modal unificado:
import ContableChartsModal from "./modalcontable/ContableChartsModal";

export default function DashboardContable() {
  const navigate = useNavigate();

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

  // Derivados
  const [categoriasAgrupadas, setCategoriasAgrupadas] = useState([]);
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [registrosMes, setRegistrosMes] = useState([]);

  // UI (sin usar para bloquear UI; sólo para manejar errores)
  const [error, setError] = useState(null);

  // Modal Gráficos
  const [mostrarModalGraficos, setMostrarModalGraficos] = useState(false);

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

  // Carga inicial SIN mostrar “cargando”
  useEffect(() => {
    sessionStorage.removeItem("datos_contables");
    sessionStorage.removeItem("precios_categorias");

    (async () => {
      try {
        setError(null);

        const [dataContable, dataEmpresas, dataPrecios, dataMediosPago] =
          await Promise.all([
            fetchData(`${BASE_URL}/api.php?action=contable`),
            fetchData(`${BASE_URL}/api.php?action=contable_emp`),
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
      } catch (err) {
        console.error("Error en carga inicial:", err);
        setError("Error al cargar datos. Verifique la conexión o intente más tarde.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalcular al cambiar filtros/mes
  useEffect(() => {
    if (mesSeleccionado !== "Selecciona un mes") {
      updateMonthData();
    } else {
      // Limpiar al no tener mes
      setCategoriasAgrupadas([]);
      setRegistrosMes([]);
      setTotalRecaudado(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSeleccionado, tipoEntidad, medioSeleccionado]);

  // Agrupar por categoría
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
  const toggleVistaDetalle = () => setMostrarTablaDetalle((v) => !v);
  const handleMedioPagoChange = (e) => setMedioSeleccionado(e.target.value);
  const abrirModalGraficos = () => setMostrarModalGraficos(true);
  const cerrarModalGraficos = () => setMostrarModalGraficos(false);

  const calcularTotalRegistros = () => registrosMes.length;
  const labelEntidad = tipoEntidad === "socio" ? "Socio" : "Razón social";

  // Vista detalle/resumen
  const [mostrarTablaDetalle, setMostrarTablaDetalle] = useState(false);

  // Meses presentes (para encabezados)
  const MESES_ORDEN = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  const norm = (s) => (s || "").toString().trim().toLowerCase();
  const mesesPresentesTodos = useMemo(() => {
    const set = new Set([
      ...datosMeses.map((m) => norm(m?.nombre)),
      ...datosEmpresas.map((m) => norm(m?.nombre)),
    ]);
    return MESES_ORDEN.filter((m) => set.has(norm(m)));
  }, [datosMeses, datosEmpresas]);

  return (
    <div className="dashboard-contable-fullscreen">
      <div className="contable-fullscreen-container">
        {error && (
          <div className="contable-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="contable-close-error">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        <div className="contable-header">
          <h1 className="contable-title">
            <FontAwesomeIcon icon={faDollarSign} /> Panel Contable
          </h1>
          <button className="contable-back-button" onClick={volver}>
            ← Volver
          </button>
        </div>

        {/* ==== Tarjetas resumen ==== */}
        <div className="contable-summary-cards">
          {/* Total recaudado */}
          <div className="contable-summary-card total-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={faDollarSign} />
            </div>
            <div className="contable-card-content">
              <h3>Total recaudado</h3>
              <p>${totalRecaudado.toLocaleString("es-AR")}</p>
              <small className="contable-card-subtext">
                {mesSeleccionado !== "Selecciona un mes"
                  ? `En ${mesSeleccionado}${medioSeleccionado !== "todos" ? ` · ${medioSeleccionado}` : ""}`
                  : "Seleccione un mes"}
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
              <p>{categoriasAgrupadas.length}</p>
              <small className="contable-card-subtext">
                {mesSeleccionado !== "Selecciona un mes"
                  ? `En ${mesSeleccionado}`
                  : "Seleccione un mes"}
              </small>
            </div>
          </div>

          {/* Total registros */}
          <div className="contable-summary-card">
            <div className="contable-card-icon">
              <FontAwesomeIcon icon={faListAlt} />
            </div>
            <div className="contable-card-content">
              <h3>Total registros</h3>
              <p>{calcularTotalRegistros()}</p>
              <small className="contable-card-subtext">
                {mesSeleccionado !== "Selecciona un mes"
                  ? `En ${mesSeleccionado}`
                  : "Seleccione un mes"}
              </small>
            </div>
          </div>
        </div>

        {/* ==== Sección categorías ==== */}
        <div className="contable-categories-section">
          <div className="contable-section-header">
            <h2>
              {mostrarTablaDetalle ? (
                <>
                  <FontAwesomeIcon icon={faTable} /> Detalle de Pagos - {mesSeleccionado || "—"} (
                  {tipoEntidad === "socio" ? "Socios" : "Empresas"})
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTags} /> Resumen por Categoría - {mesSeleccionado || "—"} (
                  {tipoEntidad === "socio" ? "Socios" : "Empresas"})
                </>
              )}
            </h2>

            <div className="contable-selectors-container">
              {/* Mes */}
              <div className="contable-month-selector">
                <FontAwesomeIcon icon={faCalendarAlt} />
                <select
                  value={mesSeleccionado}
                  onChange={handleMesChange}
                  className="contable-month-select"
                >
                  {meses.map((mes, index) => (
                    <option key={index} value={mes}>
                      {mes === "Selecciona un mes"
                        ? window.innerWidth <= 768
                          ? "Mes"
                          : "Selecciona un mes"
                        : mes}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entidad */}
              <div className="contable-entity-selector">
                <FontAwesomeIcon icon={tipoEntidad === "socio" ? faUser : faBuilding} />
                <select
                  value={tipoEntidad}
                  onChange={handleTipoEntidadChange}
                  className="contable-entity-select"
                >
                  <option value="socio">Socios</option>
                  <option value="empresa">Empresas</option>
                </select>
              </div>

              {/* Medio de Pago */}
              <div className="contable-payment-selector full-row-mobile">
                <FontAwesomeIcon icon={faCreditCard} />
                <select
                  value={medioSeleccionado}
                  onChange={handleMedioPagoChange}
                  className="contable-payment-select"
                  title="Filtrar por medio de pago"
                >
                  <option value="todos">
                    {window.innerWidth <= 768 ? "Medio Pago" : "Todos los medios"}
                  </option>
                  {mediosPago.map((mp, idx) => (
                    <option key={idx} value={mp}>
                      {mp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón Detalle/Resumen (siempre activo) */}
              <button
                className="contable-detail-view-button"
                onClick={toggleVistaDetalle}
                type="button"
              >
                <FontAwesomeIcon icon={mostrarTablaDetalle ? faTags : faTable} />
                {mostrarTablaDetalle ? "Ver Resumen" : "Ver Detalle"}
              </button>

              {/* Botón Ver Gráficos (siempre activo) */}
              <button
                className="contable-charts-button"
                type="button"
                onClick={abrirModalGraficos}
                title="Ver gráficos Socios vs Empresas"
              >
                <FontAwesomeIcon icon={faChartPie} />
                Ver Gráficos
              </button>
            </div>
          </div>

          {/* ==== Contenido dinámico (sin “cargando…”) ==== */}
          <div className="contable-categories-scroll-container">
            {mostrarTablaDetalle ? (
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
                              : registro.Razon_Social || registro.Nombre_Empresa}
                          </td>
                          <td data-label="Categoría">{registro.Nombre_Categoria}</td>
                          <td data-label="Monto">
                            ${(registro.Precio || 0).toLocaleString("es-AR")}
                          </td>
                          <td data-label="Medio de Pago">{registro.Medio_Pago || "-"}</td>
                          <td data-label="Fecha de Pago">{registro.fechaPago}</td>
                          <td data-label="Mes Pagado">{registro.Mes_Pagado}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="contable-no-data">
                          {mesSeleccionado === "Selecciona un mes"
                            ? "Seleccione un mes para ver los detalles"
                            : "No hay registros para mostrar en este mes"}
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
                              ${categoria.precio?.toLocaleString("es-AR") || "0"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="contable-category-body">
                        <div className="contable-category-info">
                          <span className="contable-category-label">Registros:</span>
                          <span className="contable-category-value">{categoria.cantidad}</span>
                        </div>
                        <div className="contable-category-info">
                          <span className="contable-category-label">Subtotal:</span>
                          <span className="contable-category-value">
                            ${categoria.total.toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="contable-no-data">
                    {mesSeleccionado === "Selecciona un mes"
                      ? "Seleccione un mes para ver los detalles"
                      : "No hay datos para mostrar para este mes"}
                  </p>
                )}
              </div>
            )}
          </div>
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
