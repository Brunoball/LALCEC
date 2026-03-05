// ✅ REEMPLAZAR COMPLETO
// ModalInfoSocio.jsx

import React, { useEffect, useMemo, useState } from "react";
import "./ModalInfoSocio.css";
import BASE_URL from "../../../config/config";

const ModalInfoSocio = ({ infoSocio, mesesPagados, onCerrar }) => {
  const [socio_pestañaActiva, setSocioPestañaActiva] = useState("general");

  // ===== Pagos por año =====
  const yearNow = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(yearNow);
  const [pagosPorAnio, setPagosPorAnio] = useState({});
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [errorPagos, setErrorPagos] = useState("");

  const socioId = infoSocio?.idSocios ?? infoSocio?.id ?? null;

  // ESC para cerrar + blur al botón
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) {
        e.preventDefault();
        onCerrar?.();
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
      const fecha = new Date(year, (month || 1) - 1, day || 1);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset() + 180);
      return !isNaN(fecha.getTime()) ? fecha : new Date("2025-01-01T00:00:00-03:00");
    } catch {
      return new Date("2025-01-01T00:00:00-03:00");
    }
  };

  const fechaUnion = parseFechaArgentina(infoSocio?.Fechaunion || infoSocio?.fechaunion);

  const formatFecha = (fecha) =>
    fecha.toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const MESES_ANIO = useMemo(
    () => [
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
    ],
    []
  );

  // Compat viejo: mesesPagados (sin año) → lo meto como año actual si todavía no hay pagosPorAnio
  useEffect(() => {
    const norm = Array.isArray(mesesPagados)
      ? mesesPagados
          .map((m) => String(m).trim().toUpperCase())
          .filter((m) => MESES_ANIO.includes(m))
      : [];

    if (norm.length > 0 && (!pagosPorAnio || Object.keys(pagosPorAnio).length === 0)) {
      setPagosPorAnio({ [String(yearNow)]: norm });
      setSelectedYear(yearNow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesesPagados]);

  // Fetch pagos por año al abrir pestaña pagos
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
          return;
        }

        const p = j?.pagosPorAnio && typeof j.pagosPorAnio === "object" ? j.pagosPorAnio : {};
        setPagosPorAnio(p);

        const years = Object.keys(p)
          .map((k) => parseInt(k, 10))
          .filter((n) => Number.isFinite(n) && n > 0)
          .sort((a, b) => b - a);

        if (years.length > 0) {
          setSelectedYear(years.includes(yearNow) ? yearNow : years[0]);
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
  }, [socio_pestañaActiva, socioId, yearNow]);

  // Años disponibles SOLO desde pagosPorAnio
  const aniosDisponibles = useMemo(() => {
    const valido =
      pagosPorAnio &&
      typeof pagosPorAnio === "object" &&
      !Array.isArray(pagosPorAnio) &&
      Object.keys(pagosPorAnio).length > 0;

    if (!valido) return [yearNow];

    return Object.keys(pagosPorAnio)
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => b - a);
  }, [pagosPorAnio, yearNow]);

  useEffect(() => {
    if (aniosDisponibles.length === 0) return;
    if (!selectedYear || !aniosDisponibles.includes(selectedYear)) {
      setSelectedYear(aniosDisponibles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aniosDisponibles]);

  // Meses pagados (acepta array de IDs 1..12 o nombres)
  const mesesPagadosDelAnio = useMemo(() => {
    const arr = pagosPorAnio?.[String(selectedYear)] ?? pagosPorAnio?.[selectedYear] ?? [];
    if (!Array.isArray(arr)) return [];

    // si vienen números: 1..12
    const hasNumber = arr.some((x) => typeof x === "number" || /^\d+$/.test(String(x)));
    if (hasNumber) {
      return arr
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12)
        .map((n) => MESES_ANIO[n - 1])
        .filter(Boolean);
    }

    // si vienen strings de meses
    return arr.map((m) => String(m).trim().toUpperCase()).filter(Boolean);
  }, [pagosPorAnio, selectedYear, MESES_ANIO]);

  const setPagados = useMemo(() => new Set(mesesPagadosDelAnio), [mesesPagadosDelAnio]);

  const mesUnion = fechaUnion.getMonth();
  const anioUnion = fechaUnion.getFullYear();
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  // Meses a mostrar (misma lógica “pro” del ModalInfoEmpresa)
  const mesesAMostrar = useMemo(() => {
    if (selectedYear === anioUnion) return MESES_ANIO.slice(mesUnion);
    return MESES_ANIO;
  }, [selectedYear, anioUnion, mesUnion, MESES_ANIO]);

  const cantPendientes = Math.max(0, mesesAMostrar.length - mesesPagadosDelAnio.length);

  const calcularEstado = () => {
    const ySel = selectedYear ?? anioActual;

    let mesesHastaAhora = [];

    if (ySel < anioActual) {
      // año pasado: si es el año de alta, desde el mes de alta, si no, todo el año
      mesesHastaAhora = ySel === anioUnion ? MESES_ANIO.slice(mesUnion) : MESES_ANIO;
    } else if (ySel === anioActual) {
      const desde = anioUnion === anioActual ? mesUnion : 0;
      mesesHastaAhora = MESES_ANIO.slice(desde, mesActual + 1);
    } else {
      return "Sin vencimientos";
    }

    const deuda = mesesHastaAhora.filter((mes) => !setPagados.has(mes)).length;
    if (deuda > 0) return `Atrasado ${deuda} mes${deuda > 1 ? "es" : ""}`;

    const adelantado = mesesPagadosDelAnio.length - mesesHastaAhora.length;
    if (adelantado > 0) return `Adelantado (${adelantado} mes${adelantado > 1 ? "es" : ""})`;

    if (mesesPagadosDelAnio.length >= 12) return "Año completo";
    return "Al día";
  };

  const estadoActual = calcularEstado();

  return (
    <div className="socio_overlay">
      <div className="socio_container">
        <div className="socio_header">
          <div className="socio_header-content">
            <h2 className="socio_title">Información del Socio</h2>
            <p className="socio_subtitle">
              DNI: {infoSocio?.DNI || "-"} | {infoSocio?.nombre || ""} {infoSocio?.apellido || ""}
            </p>
          </div>

          <button className="socio_close-btn" onClick={onCerrar} aria-label="Cerrar modal">
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
              className={`socio_tab ${socio_pestañaActiva === "general" ? "socio_active" : ""}`}
              onClick={() => setSocioPestañaActiva("general")}
            >
              General
            </div>
            <div
              className={`socio_tab ${socio_pestañaActiva === "contacto" ? "socio_active" : ""}`}
              onClick={() => setSocioPestañaActiva("contacto")}
            >
              Contacto
            </div>
            <div
              className={`socio_tab ${socio_pestañaActiva === "pagos" ? "socio_active" : ""}`}
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
                    <span className="socio_info-value">{infoSocio?.nombre || "-"}</span>
                  </div>

                  <div className="socio_info-item">
                    <span className="socio_info-label">Apellido:</span>
                    <span className="socio_info-value">{infoSocio?.apellido || "-"}</span>
                  </div>

                  <div className="socio_info-item">
                    <span className="socio_info-label">DNI:</span>
                    <span className="socio_info-value">{infoSocio?.DNI || "-"}</span>
                  </div>

                  <div className="socio_info-item">
                    <span className="socio_info-label">Fecha de Alta:</span>
                    <span className="socio_info-value">{formatFecha(fechaUnion)}</span>
                  </div>
                </div>

                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Datos de Membresía</h3>

                  <div className="socio_info-item">
                    <span className="socio_info-label">Categoría:</span>
                    <span className="socio_info-value">
                      {infoSocio?.categoria || "-"} (${infoSocio?.precio_categoria || "0"})
                    </span>
                  </div>

                  <div className="socio_info-item">
                    <span className="socio_info-label">Medio de Pago:</span>
                    <span className="socio_info-value">{infoSocio?.medio_pago || "-"}</span>
                  </div>

                  <div className="socio_info-item socio_comentario">
                    <span className="socio_info-label">Observaciones:</span>
                    <span className="socio_info-value">{infoSocio?.observacion || "-"}</span>
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
                    <span className="socio_info-value">{infoSocio?.telefono || "-"}</span>
                  </div>

                  <div className="socio_info-item">
                    <span className="socio_info-label">Email:</span>
                    <span className="socio_info-value">{infoSocio?.email || "-"}</span>
                  </div>
                </div>

                <div className="socio_info-card">
                  <h3 className="socio_info-card-title">Direcciones</h3>

                  <div className="socio_info-item">
                    <span className="socio_info-label">Domicilio:</span>
                    <span className="socio_info-value">
                      {infoSocio?.domicilio || "-"} {infoSocio?.numero || ""}
                    </span>
                  </div>

                  <div className="socio_info-item">
                    <span className="socio_info-label">Domicilio Cobro:</span>
                    <span className="socio_info-value">{infoSocio?.domicilio_2 || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {socio_pestañaActiva === "pagos" && (
            <div className="socio_tab-content socio_active">
              <div className="socio_info-grid">
                <div className="socio_info-card socio_info-card-full">
                  {loadingPagos ? (
                    <div className="socio_loading-wrap">
                      <div className="socio_loading-spinner" />
                    </div>
                  ) : errorPagos ? (
                    <div className="socio_error">{errorPagos}</div>
                  ) : (
                    <>
                      {/* ✅ Año (chips pro, compacto) */}
                      <div className="estados_añoo_mes">
 <div className="socio_paybar">
                        <div className="socio_paybar-left">
                          <span className="socio_info-label">Año</span>
                        </div>

                        <div className="socio_paybar-right">
                          <div className="socio_year-chips">
                            {aniosDisponibles.map((y) => (
                              <button
                                key={y}
                                type="button"
                                onClick={() => setSelectedYear(y)}
                                className={`socio_year-chip ${selectedYear === y ? "is-active" : ""}`}
                                title={`Ver pagos ${y}`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ✅ Estado (badge pro, compacto) */}
                      <div className="socio_status-row">
                        <span className="socio_info-label">Estado</span>
                        <span
                          className={[
                            "socio_status-badge",
                            estadoActual.includes("Atrasado")
                              ? "is-danger"
                              : estadoActual.includes("Adelantado")
                              ? "is-warning"
                              : "is-success",
                          ].join(" ")}
                        >
                          {estadoActual}
                        </span>
                      </div>

                      {/* ✅ Leyenda a la derecha con dots */}
                      <div className="socio_leyenda socio_leyenda--right">
                        <div className="socio_leyenda-item">
                          <span className="socio_leyenda-dot is-paid" />
                          <span>Pagado</span>
                        </div>

                        <div className="socio_leyenda-item">
                          <span className="socio_leyenda-dot is-due" />
                          <span>Pendiente</span>
                        </div>
                      </div>
                      </div>
                     

                      {/* ✅ Meses (cards pro + contador) */}
                      <div className="socio_meses-container">
                        <div className="socio_meses-head">
                          <h4 className="socio_meses-title">Meses — {selectedYear}</h4>

                          <div className="socio_meses-meta">
                            <span className="socio_meta-pill is-paid">✓ {mesesPagadosDelAnio.length} pagados</span>
                            <span className="socio_meta-pill is-due">✗ {cantPendientes} pendientes</span>
                          </div>
                        </div>

                        <div className="socio_meses-grid socio_meses-grid--pretty">
                          {mesesAMostrar.map((mes, index) => {
                            const pagado = setPagados.has(mes);
                            return (
                              <div
                                key={`${selectedYear}-${index}`}
                                className={`socio_mes-card ${pagado ? "is-paid" : "is-due"}`}
                                title={pagado ? "Pagado" : "Pendiente"}
                              >
                                <div className="socio_mes-top">
                                  <span className="socio_mes-name">{mes}</span>
                                  <span className="socio_mes-dot" />
                                </div>

                                <div className="socio_mes-bottom" />
                              </div>
                            );
                          })}
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