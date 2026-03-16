// ✅ REEMPLAZAR COMPLETO
// ModalInfoEmpresa.jsx

import React, { useState, useEffect, useMemo } from "react";
import "./ModalInfoEmpresa.css";

const ModalInfoEmpresa = ({
  infoEmpresa,
  pagosPorAnio, // { "2025": ["ENERO",...], "2026": [...] }
  cargandoPagos,
  onCerrar,
}) => {
  const [modinfo_pestañaActiva, setModinfoPestañaActiva] = useState("general");
  const [anioSeleccionado, setAnioSeleccionado] = useState(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) {
        e.preventDefault();
        onCerrar?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCerrar]);

  const parseFechaArgentina = (fechaStr) => {
    if (!fechaStr) return new Date("2025-01-01T00:00:00-03:00");

    try {
      if (fechaStr instanceof Date && !isNaN(fechaStr.getTime())) {
        return fechaStr;
      }

      if (typeof fechaStr === "string") {
        const fechaCompleta = fechaStr.includes("T")
          ? fechaStr
          : `${fechaStr}T00:00:00-03:00`;

        const fecha = new Date(fechaCompleta);
        if (!isNaN(fecha.getTime())) return fecha;
      }

      const [year, month, day] = (fechaStr || "").split("-").map(Number);
      const fecha = new Date(year, (month || 1) - 1, day || 1);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset() + 180);

      return !isNaN(fecha.getTime())
        ? fecha
        : new Date("2025-01-01T00:00:00-03:00");
    } catch {
      return new Date("2025-01-01T00:00:00-03:00");
    }
  };

  const fechaUnion = parseFechaArgentina(
    infoEmpresa?.Fechaunion || infoEmpresa?.fechaunion
  );

  const formatFecha = (fecha) =>
    fecha.toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const ahora = new Date();
  const añoActual = ahora.getFullYear();
  const mesActual = ahora.getMonth(); // 0..11

  const añoUnion = fechaUnion.getFullYear();
  const mesUnion = fechaUnion.getMonth(); // 0..11

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

  const pagosNormalizados = useMemo(() => {
    if (!pagosPorAnio || typeof pagosPorAnio !== "object" || Array.isArray(pagosPorAnio)) {
      return {};
    }

    const out = {};

    Object.entries(pagosPorAnio).forEach(([anio, meses]) => {
      const key = String(anio);
      out[key] = Array.isArray(meses)
        ? [...new Set(meses.map((m) => String(m).trim().toUpperCase()).filter(Boolean))]
        : [];
    });

    return out;
  }, [pagosPorAnio]);

  // ✅ Años visibles en tabs/chips:
  // - todos los años que vinieron con pagos
  // - año de alta
  // - año actual
  const aniosDisponibles = useMemo(() => {
    const setAnios = new Set();

    Object.keys(pagosNormalizados).forEach((k) => {
      const n = parseInt(k, 10);
      if (Number.isFinite(n) && n > 0) setAnios.add(n);
    });

    if (Number.isFinite(añoUnion)) setAnios.add(añoUnion);
    if (Number.isFinite(añoActual)) setAnios.add(añoActual);

    return Array.from(setAnios).sort((a, b) => b - a);
  }, [pagosNormalizados, añoUnion, añoActual]);

  useEffect(() => {
    if (!aniosDisponibles.length) return;

    if (!anioSeleccionado || !aniosDisponibles.includes(anioSeleccionado)) {
      setAnioSeleccionado(añoActual);
    }
  }, [aniosDisponibles, anioSeleccionado, añoActual]);

  // ✅ Meses pagados SOLO del año que estás mirando
  const mesesPagadosDelAnio = useMemo(() => {
    const y = anioSeleccionado;
    if (!y) return [];

    return pagosNormalizados[String(y)] || [];
  }, [anioSeleccionado, pagosNormalizados]);

  // ✅ Meses que se muestran en la grilla del año seleccionado
  const mesesAMostrar = useMemo(() => {
    const y = anioSeleccionado ?? añoActual;

    // Si mira el año de alta, arrancar desde el mes de alta
    if (y === añoUnion) {
      return MESES_ANIO.slice(mesUnion);
    }

    // Si es un año anterior al alta, no mostrar nada
    if (y < añoUnion) {
      return [];
    }

    return MESES_ANIO;
  }, [anioSeleccionado, añoActual, añoUnion, mesUnion, MESES_ANIO]);

  // ✅ TODOS los meses exigibles desde fecha de alta hasta HOY
  const mesesExigiblesGlobales = useMemo(() => {
    const arr = [];

    for (let anio = añoUnion; anio <= añoActual; anio++) {
      let desdeMes = 0;
      let hastaMes = 11;

      if (anio === añoUnion) desdeMes = mesUnion;
      if (anio === añoActual) hastaMes = mesActual;

      for (let i = desdeMes; i <= hastaMes; i++) {
        arr.push({
          anio,
          mes: MESES_ANIO[i],
        });
      }
    }

    return arr;
  }, [añoUnion, añoActual, mesUnion, mesActual, MESES_ANIO]);

  // ✅ Total de pagos cargados en todos los años
  const totalPagosGlobales = useMemo(() => {
    return Object.values(pagosNormalizados).reduce((acc, meses) => {
      return acc + (Array.isArray(meses) ? meses.length : 0);
    }, 0);
  }, [pagosNormalizados]);

  // ✅ Cantidad de meses exigibles impagos hasta HOY
  const deudaGlobal = useMemo(() => {
    let deuda = 0;

    mesesExigiblesGlobales.forEach(({ anio, mes }) => {
      const pagosDelAnio = pagosNormalizados[String(anio)] || [];
      if (!pagosDelAnio.includes(mes)) {
        deuda++;
      }
    });

    return deuda;
  }, [mesesExigiblesGlobales, pagosNormalizados]);

  // ✅ Adelantos: pagos cargados por encima de lo exigible hasta HOY
  const adelantadoGlobal = useMemo(() => {
    return Math.max(0, totalPagosGlobales - mesesExigiblesGlobales.length);
  }, [totalPagosGlobales, mesesExigiblesGlobales.length]);

  const estadoActual = useMemo(() => {
    if (deudaGlobal > 0) {
      return `Atrasado ${deudaGlobal} mes${deudaGlobal > 1 ? "es" : ""}`;
    }

    if (adelantadoGlobal > 0) {
      return `Adelantado (${adelantadoGlobal} mes${adelantadoGlobal > 1 ? "es" : ""})`;
    }

    return "Al día";
  }, [deudaGlobal, adelantadoGlobal]);

  // ✅ Pendientes SOLO visuales del año seleccionado
  const cantPendientes = useMemo(() => {
    const setPag = new Set(mesesPagadosDelAnio);
    return mesesAMostrar.filter((mes) => !setPag.has(mes)).length;
  }, [mesesAMostrar, mesesPagadosDelAnio]);

  return (
    <div className="modinfo_overlay">
      <div className="modinfo_container">
        <div className="modinfo_header">
          <div className="modinfo_header-content">
            <h2 className="modinfo_title">Información de la Empresa</h2>
            <p className="modinfo_subtitle">
              CUIT: {infoEmpresa?.cuit} | {infoEmpresa?.razon_social}
            </p>
          </div>

          <button
            className="modinfo_close-btn"
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

        <div className="modinfo_content">
          <div className="modinfo_tabs">
            <div
              className={`modinfo_tab ${
                modinfo_pestañaActiva === "general" ? "modinfo_active" : ""
              }`}
              onClick={() => setModinfoPestañaActiva("general")}
            >
              General
            </div>

            <div
              className={`modinfo_tab ${
                modinfo_pestañaActiva === "contacto" ? "modinfo_active" : ""
              }`}
              onClick={() => setModinfoPestañaActiva("contacto")}
            >
              Contacto
            </div>

            <div
              className={`modinfo_tab ${
                modinfo_pestañaActiva === "fiscal" ? "modinfo_active" : ""
              }`}
              onClick={() => setModinfoPestañaActiva("fiscal")}
            >
              Datos Fiscales
            </div>

            <div
              className={`modinfo_tab ${
                modinfo_pestañaActiva === "pagos" ? "modinfo_active" : ""
              }`}
              onClick={() => setModinfoPestañaActiva("pagos")}
            >
              Estado de Pagos
            </div>
          </div>

          {modinfo_pestañaActiva === "general" && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Información Básica</h3>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Razón Social:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.razon_social || "-"}
                    </span>
                  </div>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Categoría:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.categoria || "-"} (${infoEmpresa?.precio_categoria || "0"})
                    </span>
                  </div>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Fecha de Alta:</span>
                    <span className="modinfo_info-value">{formatFecha(fechaUnion)}</span>
                  </div>
                </div>

                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Medio de Pago</h3>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Método:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.medio_pago || "-"}
                    </span>
                  </div>

                  <div className="modinfo_info-item modinfo_comentario">
                    <span className="modinfo_info-label">Observaciones:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.observacion || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modinfo_pestañaActiva === "contacto" && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Contacto</h3>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Teléfono:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.telefono || "-"}
                    </span>
                  </div>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Email:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.email || "-"}
                    </span>
                  </div>
                </div>

                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Direcciones</h3>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Domicilio Legal:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.domicilio || "-"} {infoEmpresa?.numero || ""}
                    </span>
                  </div>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Domicilio Cobro:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.domicilio_2 || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modinfo_pestañaActiva === "fiscal" && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card modinfo_info-card-full">
                  <h3 className="modinfo_info-card-title">Datos Fiscales</h3>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">CUIT:</span>
                    <span className="modinfo_info-value">{infoEmpresa?.cuit || "-"}</span>
                  </div>

                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Condición IVA:</span>
                    <span className="modinfo_info-value">
                      {infoEmpresa?.descripcion_iva || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modinfo_pestañaActiva === "pagos" && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card modinfo_info-card-full">
                  <h3 className="modinfo_info-card-title">Estado de Pagos</h3>

                  {cargandoPagos ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                      <div className="emp_loading-spinner"></div>
                    </div>
                  ) : (
                    <>
                      <div className="estados_añoo_mes">
                        <div className="modinfo_paybar">
                          <div className="modinfo_paybar-left">
                            <span className="modinfo_info-label">Año</span>
                          </div>

                          <div className="modinfo_paybar-right">
                            <div className="modinfo_year-chips">
                              {aniosDisponibles.map((y) => (
                                <button
                                  key={y}
                                  type="button"
                                  onClick={() => setAnioSeleccionado(y)}
                                  className={`modinfo_year-chip ${
                                    anioSeleccionado === y ? "is-active" : ""
                                  }`}
                                  title={`Ver pagos ${y}`}
                                >
                                  {y}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="modinfo_status-row">
                          <span className="modinfo_info-label">Estado</span>
                          <span
                            className={[
                              "modinfo_status-badge",
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

                        <div className="modinfo_leyenda modinfo_leyenda--right">
                          <div className="modinfo_leyenda-item">
                            <span className="modinfo_leyenda-dot is-paid" />
                            <span>Pagado</span>
                          </div>

                          <div className="modinfo_leyenda-item">
                            <span className="modinfo_leyenda-dot is-due" />
                            <span>Pendiente</span>
                          </div>
                        </div>
                      </div>

                      <div className="modinfo_meses-container">
                        <div className="modinfo_meses-head">
                          <h4 className="modinfo_meses-title">Meses — {anioSeleccionado}</h4>

                          <div className="modinfo_meses-meta">
                            <span className="modinfo_meta-pill is-paid">
                              ✓ {mesesPagadosDelAnio.length} pagados
                            </span>
                            <span className="modinfo_meta-pill is-due">
                              ✗ {cantPendientes} pendientes
                            </span>
                          </div>
                        </div>

                        <div className="modinfo_meses-grid modinfo_meses-grid--pretty">
                          {mesesAMostrar.map((mes, index) => {
                            const pagado = mesesPagadosDelAnio.includes(mes);

                            return (
                              <div
                                key={`${anioSeleccionado}-${mes}-${index}`}
                                className={`modinfo_mes-card ${pagado ? "is-paid" : "is-due"}`}
                                title={pagado ? "Pagado" : "Pendiente"}
                              >
                                <div className="modinfo_mes-top">
                                  <span className="modinfo_mes-name">{mes}</span>
                                  <span className="modinfo_mes-dot" />
                                </div>

                                <div className="modinfo_mes-bottom"></div>
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

export default ModalInfoEmpresa;