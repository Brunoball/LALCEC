import React, { useState, useEffect, useMemo } from "react";
import "./ModalInfoSocio.css";
import BASE_URL from "../../../config/config"; // ajustá si tu path es distinto

const ModalInfoSocio = ({ infoSocio, mesesPagados, onCerrar }) => {
  const [socio_pestañaActiva, setSocioPestañaActiva] = useState("general");

  // =========================
  // NUEVO: pagos por año
  // =========================
  const yearNow = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(yearNow);
  const [pagosPorAnio, setPagosPorAnio] = useState({});
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [errorPagos, setErrorPagos] = useState("");

  const socioId = infoSocio?.idSocios ?? infoSocio?.id ?? null;

  // 👉 Cerrar modal con tecla Escape y quitar el borde negro del botón que abrió
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCerrar?.();

        // Quita el focus del botón que abrió el modal
        setTimeout(() => {
          const el = document.activeElement;
          if (el && el instanceof HTMLElement) el.blur();
        }, 0);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCerrar]);

  const parseFechaArgentina = (fechaStr) => {
    if (!fechaStr) return new Date("2025-01-01T00:00:00-03:00");
    try {
      if (fechaStr instanceof Date && !isNaN(fechaStr.getTime())) return fechaStr;
      if (typeof fechaStr === "string") {
        const fechaCompleta = fechaStr.includes("T")
          ? fechaStr
          : `${fechaStr}T00:00:00-03:00`;
        const fecha = new Date(fechaCompleta);
        if (!isNaN(fecha.getTime())) return fecha;
      }
      const [year, month, day] = String(fechaStr).split("-").map(Number);
      const fecha = new Date(year, month - 1, day);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset() + 180);
      return !isNaN(fecha.getTime())
        ? fecha
        : new Date("2025-01-01T00:00:00-03:00");
    } catch {
      return new Date("2025-01-01T00:00:00-03:00");
    }
  };

  const fechaUnion = parseFechaArgentina(infoSocio?.Fechaunion);

  const formatFecha = (fecha) =>
    fecha.toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const MESES_ANIO = [
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

  // =========================
  // Compat: si todavía te pasan mesesPagados (viejo), lo tomo como "año actual"
  // =========================
  useEffect(() => {
    const norm = Array.isArray(mesesPagados)
      ? mesesPagados
          .map((m) => String(m).trim().toUpperCase())
          .filter((m) => MESES_ANIO.includes(m))
      : [];

    // si no hay nada del backend por año todavía, lo adapto como año actual
    if (norm.length > 0 && (!pagosPorAnio || Object.keys(pagosPorAnio).length === 0)) {
      const ids = norm.map((nombre) => MESES_ANIO.indexOf(nombre) + 1).filter((x) => x >= 1 && x <= 12);
      setPagosPorAnio({ [String(yearNow)]: Array.from(new Set(ids)).sort((a, b) => a - b) });
      setAniosDisponibles([yearNow]);
      setSelectedYear(yearNow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesesPagados]);

  // =========================
  // NUEVO: cargar pagos por año cuando abrís la pestaña "pagos"
  // =========================
  useEffect(() => {
    if (socio_pestañaActiva !== "pagos") return;
    if (!socioId) return;

    const fetchPagos = async () => {
      setLoadingPagos(true);
      setErrorPagos("");
      try {
        const r = await fetch(
          `${BASE_URL}/api.php?action=info_pagos_socio&idSocios=${encodeURIComponent(socioId)}`
        );
        const j = await r.json();

        if (!j?.success) {
          setErrorPagos(j?.message || "No se pudieron cargar los pagos");
          setPagosPorAnio({});
          setAniosDisponibles([]);
          return;
        }

        const p = j?.pagosPorAnio && typeof j.pagosPorAnio === "object" ? j.pagosPorAnio : {};
        const years =
          Array.isArray(j?.aniosDisponibles) && j.aniosDisponibles.length > 0
            ? j.aniosDisponibles
            : Object.keys(p).map((x) => Number(x));

        const yearsSorted = Array.from(new Set(years.map(Number)))
          .filter(Boolean)
          .sort((a, b) => b - a);

        setPagosPorAnio(p);
        setAniosDisponibles(yearsSorted);

        // default: si existe el año actual, mostrarlo; sino el más reciente
        if (yearsSorted.length > 0) {
          setSelectedYear(yearsSorted.includes(yearNow) ? yearNow : yearsSorted[0]);
        } else {
          setSelectedYear(yearNow);
        }
      } catch (e) {
        console.error(e);
        setErrorPagos("Error de red al cargar pagos");
      } finally {
        setLoadingPagos(false);
      }
    };

    fetchPagos();
  }, [socio_pestañaActiva, socioId, yearNow, BASE_URL]);

  // =========================
  // Derivados por año seleccionado
  // =========================
  const mesesPagadosIds = useMemo(() => {
    const arr = pagosPorAnio?.[String(selectedYear)] || [];
    return Array.isArray(arr) ? arr : [];
  }, [pagosPorAnio, selectedYear]);

  const mesesPagadosNombres = useMemo(() => {
    return mesesPagadosIds
      .map((id) => MESES_ANIO[id - 1])
      .filter(Boolean);
  }, [mesesPagadosIds]);

  const mesesPagadosSet = useMemo(() => new Set(mesesPagadosNombres), [mesesPagadosNombres]);

  const mesUnion = fechaUnion.getMonth(); // 0-11
  const añoUnion = fechaUnion.getFullYear();
  const hoy = new Date();
  const mesActual = hoy.getMonth(); // 0-11
  const añoActual = hoy.getFullYear();

  // Meses que corresponde "esperar" en el año seleccionado (para estado)
  const mesesEsperadosEnAnio = useMemo(() => {
    // si el año seleccionado es menor al de unión => no corresponde nada
    if (selectedYear < añoUnion) return [];

    // desde mes de unión si es el mismo año de unión, sino desde enero
    const desde = selectedYear === añoUnion ? mesUnion : 0;

    // hasta mes actual si es año actual, sino diciembre
    const hasta = selectedYear === añoActual ? mesActual : 11;

    if (hasta < desde) return []; // por si fecha unión es futura
    return MESES_ANIO.slice(desde, hasta + 1);
  }, [selectedYear, añoUnion, mesUnion, añoActual, mesActual]);

  // Meses a mostrar en la grilla (yo te recomiendo siempre los 12 para que sea claro),
  // pero si querés mantener tu lógica original: si es año unión y aún estamos en ese año, arrancar desde mesUnion.
  const mesesAMostrar = useMemo(() => {
    // Mantengo tu lógica base pero aplicada al AÑO SELECCIONADO:
    if (selectedYear === añoUnion && añoUnion === añoActual) {
      return MESES_ANIO.slice(mesUnion);
    }
    // si estás mirando un año completo (pasado o futuro) -> muestro los 12
    return MESES_ANIO;
  }, [selectedYear, añoUnion, añoActual, mesUnion]);

  const calcularEstado = () => {
    // Estado para el AÑO SELECCIONADO (no mezcla)
    if (!mesesEsperadosEnAnio.length) {
      // si no hay esperados, evitamos mentir
      if (selectedYear < añoUnion) return "Sin períodos (año anterior al alta)";
      return "Sin períodos";
    }

    const pagadosEnEsperados = mesesEsperadosEnAnio.reduce(
      (acc, mes) => acc + (mesesPagadosSet.has(mes) ? 1 : 0),
      0
    );

    const deuda = mesesEsperadosEnAnio.length - pagadosEnEsperados;

    if (deuda > 0) {
      return deuda <= 2
        ? `Atrasado ${deuda} mes${deuda > 1 ? "es" : ""}`
        : `Atrasado (${deuda} meses)`;
    }

    // Adelantos SOLO si el año seleccionado es el año actual o futuro dentro del mismo año:
    // Para años pasados no tiene sentido hablar de "adelantado" porque ya terminó el año.
    if (selectedYear >= añoActual) {
      const mesesFuturos =
        selectedYear === añoActual ? MESES_ANIO.slice(mesActual + 1) : MESES_ANIO;

      const adelantados = mesesFuturos.reduce(
        (acc, mes) => acc + (mesesPagadosSet.has(mes) ? 1 : 0),
        0
      );

      if (adelantados > 0) {
        return `Adelantado (${adelantados} mes${adelantados > 1 ? "es" : ""})`;
      }
    }

    // Año completo: si pagó 12 meses de ese año
    if (mesesPagadosSet.size === 12) return "Año completo";

    return "Al día";
  };

  // Para el color del texto (mantengo tu lógica)
  const estado = calcularEstado();

  const yearOptions = useMemo(() => {
    // Solo años con pagos; si no hay, al menos mostrar el año actual
    if (aniosDisponibles && aniosDisponibles.length > 0) return aniosDisponibles;
    return [yearNow];
  }, [aniosDisponibles, yearNow]);

  return (
    <div className="socio_overlay">
      <div className="socio_container">
        <div className="socio_header">
          <div className="socio_header-content">
            <h2 className="socio_title">Información del Socio</h2>
            <p className="socio_subtitle">
              DNI: {infoSocio.DNI} | {infoSocio.nombre} {infoSocio.apellido}
            </p>
          </div>
          <button
            className="socio_close-btn"
            onClick={onCerrar}
            aria-label="Cerrar modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="socio_content">
          <div className="socio_tabs">
            <div
              className={`socio_tab ${
                socio_pestañaActiva === "general" ? "socio_active" : ""
              }`}
              onClick={() => setSocioPestañaActiva("general")}
            >
              General
            </div>
            <div
              className={`socio_tab ${
                socio_pestañaActiva === "contacto" ? "socio_active" : ""
              }`}
              onClick={() => setSocioPestañaActiva("contacto")}
            >
              Contacto
            </div>
            <div
              className={`socio_tab ${
                socio_pestañaActiva === "pagos" ? "socio_active" : ""
              }`}
              onClick={() => setSocioPestañaActiva("pagos")}
            >
              Estado de Pagos
            </div>
          </div>

          {socio_pestañaActiva === "general" && (
            <div className="socio_tab-content socio_active">
              <div className="socio_info-grid">
                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Información Básica</h3>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Nombre:</span>
                    <span className="socio_info-value">
                      {infoSocio.nombre || "-"}
                    </span>
                  </div>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Apellido:</span>
                    <span className="socio_info-value">
                      {infoSocio.apellido || "-"}
                    </span>
                  </div>
                  <div className="socio_info-item">
                    <span className="socio_info-label">DNI:</span>
                    <span className="socio_info-value">
                      {infoSocio.DNI || "-"}
                    </span>
                  </div>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Fecha de Alta:</span>
                    <span className="socio_info-value">
                      {formatFecha(fechaUnion)}
                    </span>
                  </div>
                </div>

                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Datos de Membresía</h3>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Categoría:</span>
                    <span className="socio_info-value">
                      {infoSocio.categoria || "-"} ($
                      {infoSocio.precio_categoria || "0"})
                    </span>
                  </div>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Medio de Pago:</span>
                    <span className="socio_info-value">
                      {infoSocio.medio_pago || "-"}
                    </span>
                  </div>
                  <div className="socio_info-item socio_comentario">
                    <span className="socio_info-label">Observaciones:</span>
                    <span className="socio_info-value">
                      {infoSocio.observacion || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {socio_pestañaActiva === "contacto" && (
            <div className="socio_tab-content socio_active">
              <div className="socio_info-grid">
                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Contacto</h3>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Teléfono:</span>
                    <span className="socio_info-value">
                      {infoSocio.telefono || "-"}
                    </span>
                  </div>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Email:</span>
                    <span className="socio_info-value">
                      {infoSocio.email || "-"}
                    </span>
                  </div>
                </div>

                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Direcciones</h3>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Domicilio:</span>
                    <span className="socio_info-value">
                      {infoSocio.domicilio || "-"} {infoSocio.numero || ""}
                    </span>
                  </div>
                  <div className="socio_info-item">
                    <span className="socio_info-label">Domicilio Cobro:</span>
                    <span className="socio_info-value">
                      {infoSocio.domicilio_2 || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {socio_pestañaActiva === "pagos" && (
            <div className="socio_tab-content socio_active">
              <div className="socio_info-grid">
                <div className="socio_info-card socio_info-card-full">
                  <div className="socio_info-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <span>Estado de Pagos</span>

                    {/* ✅ NUEVO: selector de año (sin tocar tus clases socio_ existentes) */}
                    <div className="socio_year-wrap">
                      <select
                        className="socio_year-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        aria-label="Seleccionar año"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loadingPagos && (
                    <div className="socio_info-item">
                      <span className="socio_info-value">Cargando pagos...</span>
                    </div>
                  )}

                  {errorPagos && (
                    <div className="socio_info-item">
                      <span className="socio_info-value socio_text-danger">{errorPagos}</span>
                    </div>
                  )}

                  {!loadingPagos && !errorPagos && (
                    <>
                      <div className="socio_info-item">
                        <span className="socio_info-label">Estado Actual:</span>
                        <span
                          className={`socio_info-value ${
                            estado.includes("Atrasado")
                              ? "socio_text-danger"
                              : estado.includes("Adelantado")
                              ? "socio_text-warning"
                              : "socio_text-success"
                          }`}
                        >
                          {estado} ({selectedYear})
                        </span>
                      </div>

                      <div className="socio_meses-container">
                        <h4 className="socio_meses-title">Meses Pagados</h4>

                        <div className="socio_meses-grid">
                          {mesesAMostrar.map((mes, index) => (
                            <div
                              key={`${selectedYear}-${index}`}
                              className={`socio_mes-item ${
                                mesesPagadosSet.has(mes)
                                  ? "socio_pagado"
                                  : "socio_adeudado"
                              }`}
                            >
                              {mes}
                              {mesesPagadosSet.has(mes) ? (
                                <span className="socio_mes-icon">✓</span>
                              ) : (
                                <span className="socio_mes-icon">✗</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="socio_leyenda">
                        <div className="socio_leyenda-item">
                          <span className="socio_leyenda-color socio_pagado"></span>
                          <span>Pagado</span>
                        </div>
                        <div className="socio_leyenda-item">
                          <span className="socio_leyenda-color socio_adeudado"></span>
                          <span>Pendiente</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalInfoSocio;