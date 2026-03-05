import React, { useState, useEffect, useMemo } from "react";
import "./ModalInfoEmpresa.css";

const ModalInfoEmpresa = ({
  infoEmpresa,
  pagosPorAnio,      // { "2026": ["ENERO",...], "2027": [...] } — viene del fetch
  cargandoPagos,     // booleano: true mientras fetchea
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
      if (fechaStr instanceof Date && !isNaN(fechaStr.getTime())) return fechaStr;
      if (typeof fechaStr === "string") {
        const fechaCompleta = fechaStr.includes("T") ? fechaStr : `${fechaStr}T00:00:00-03:00`;
        const fecha = new Date(fechaCompleta);
        if (!isNaN(fecha.getTime())) return fecha;
      }
      const [year, month, day] = (fechaStr || "").split("-").map(Number);
      const fecha = new Date(year, (month || 1) - 1, day || 1);
      fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset() + 180);
      return !isNaN(fecha.getTime()) ? fecha : new Date("2025-01-01T00:00:00-03:00");
    } catch {
      return new Date("2025-01-01T00:00:00-03:00");
    }
  };

  const fechaUnion = parseFechaArgentina(infoEmpresa?.Fechaunion || infoEmpresa?.fechaunion);

  const formatFecha = (fecha) =>
    fecha.toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "2-digit", month: "2-digit", year: "numeric",
    });

  const mesUnion = fechaUnion.getMonth();
  const añoUnion = fechaUnion.getFullYear();
  const añoActual = new Date().getFullYear();

  const MESES_ANIO = useMemo(() => [
    "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
    "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
  ], []);

  // ─── Años disponibles — SOLO de pagosPorAnio ────────────────────────────────
  const aniosDisponibles = useMemo(() => {
    const valido =
      pagosPorAnio &&
      typeof pagosPorAnio === "object" &&
      !Array.isArray(pagosPorAnio) &&
      Object.keys(pagosPorAnio).length > 0;

    if (!valido) return [añoActual];

    return Object.keys(pagosPorAnio)
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => b - a);
  }, [pagosPorAnio, añoActual]);

  useEffect(() => {
    if (aniosDisponibles.length === 0) return;
    if (!anioSeleccionado || !aniosDisponibles.includes(anioSeleccionado)) {
      setAnioSeleccionado(aniosDisponibles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aniosDisponibles]);

  // ─── Meses pagados del año seleccionado — NUNCA mezcla años ─────────────────
  const mesesPagadosDelAnio = useMemo(() => {
    const y = anioSeleccionado;
    if (!y) return [];
    if (!pagosPorAnio || typeof pagosPorAnio !== "object" || Array.isArray(pagosPorAnio)) return [];
    const arr = pagosPorAnio[y] ?? pagosPorAnio[String(y)] ?? [];
    return Array.isArray(arr)
      ? arr.map((m) => String(m).trim().toUpperCase()).filter(Boolean)
      : [];
  }, [anioSeleccionado, pagosPorAnio]);

  // ─── Meses a mostrar ─────────────────────────────────────────────────────────
  const mesesAMostrar = useMemo(() => {
    const y = anioSeleccionado ?? añoActual;
    if (y === añoUnion) return MESES_ANIO.slice(mesUnion);
    return MESES_ANIO;
  }, [anioSeleccionado, añoActual, añoUnion, mesUnion, MESES_ANIO]);

  // ─── Estado ──────────────────────────────────────────────────────────────────
  const calcularEstado = () => {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const ySel = anioSeleccionado ?? añoActual;
    let mesesHastaAhora = [];

    if (ySel < añoActual) {
      mesesHastaAhora = ySel === añoUnion ? MESES_ANIO.slice(mesUnion) : MESES_ANIO;
    } else if (ySel === añoActual) {
      const desde = añoUnion === añoActual ? mesUnion : 0;
      mesesHastaAhora = MESES_ANIO.slice(desde, mesActual + 1);
    } else {
      return "Sin vencimientos";
    }

    const setPag = new Set(mesesPagadosDelAnio);
    const deuda = mesesHastaAhora.filter((mes) => !setPag.has(mes)).length;
    if (deuda > 0) return `Atrasado ${deuda} mes${deuda > 1 ? "es" : ""}`;

    const totalPagados = mesesPagadosDelAnio.length;
    const adelantado = totalPagados - mesesHastaAhora.length;
    if (adelantado > 0) return `Adelantado (${adelantado} mes${adelantado > 1 ? "es" : ""})`;
    if (totalPagados >= 12) return "Año completo";
    return "Al día";
  };

  const estadoActual = calcularEstado();

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
          <button className="modinfo_close-btn" onClick={onCerrar} aria-label="Cerrar modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modinfo_content">
          <div className="modinfo_tabs">
            <div className={`modinfo_tab ${modinfo_pestañaActiva === "general" ? "modinfo_active" : ""}`}
              onClick={() => setModinfoPestañaActiva("general")}>General</div>
            <div className={`modinfo_tab ${modinfo_pestañaActiva === "contacto" ? "modinfo_active" : ""}`}
              onClick={() => setModinfoPestañaActiva("contacto")}>Contacto</div>
            <div className={`modinfo_tab ${modinfo_pestañaActiva === "fiscal" ? "modinfo_active" : ""}`}
              onClick={() => setModinfoPestañaActiva("fiscal")}>Datos Fiscales</div>
            <div className={`modinfo_tab ${modinfo_pestañaActiva === "pagos" ? "modinfo_active" : ""}`}
              onClick={() => setModinfoPestañaActiva("pagos")}>Estado de Pagos</div>
          </div>

          {modinfo_pestañaActiva === "general" && (
            <div className="modinfo_tab-content modinfo_active">
              <div className="modinfo_info-grid">
                <div className="modinfo_info-card">
                  <h3 className="modinfo_info-card-title">Información Básica</h3>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Razón Social:</span>
                    <span className="modinfo_info-value">{infoEmpresa?.razon_social || "-"}</span>
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
                    <span className="modinfo_info-value">{infoEmpresa?.medio_pago || "-"}</span>
                  </div>
                  <div className="modinfo_info-item modinfo_comentario">
                    <span className="modinfo_info-label">Observaciones:</span>
                    <span className="modinfo_info-value">{infoEmpresa?.observacion || "-"}</span>
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
                    <span className="modinfo_info-value">{infoEmpresa?.telefono || "-"}</span>
                  </div>
                  <div className="modinfo_info-item">
                    <span className="modinfo_info-label">Email:</span>
                    <span className="modinfo_info-value">{infoEmpresa?.email || "-"}</span>
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
                    <span className="modinfo_info-value">{infoEmpresa?.domicilio_2 || "-"}</span>
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
                    <span className="modinfo_info-value">{infoEmpresa?.descripcion_iva || "-"}</span>
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
                      {/* Selector de año */}
                      <div className="modinfo_info-item" style={{ justifyContent: "space-between", gap: 10 }}>
                        <span className="modinfo_info-label">Año:</span>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {aniosDisponibles.map((y) => (
                            <button
                              key={y}
                              type="button"
                              onClick={() => setAnioSeleccionado(y)}
                              className={`modinfo_tab ${anioSeleccionado === y ? "modinfo_active" : ""}`}
                              style={{ cursor: "pointer" }}
                              title={`Ver pagos ${y}`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Estado actual */}
                      <div className="modinfo_info-item">
                        <span className="modinfo_info-label">Estado Actual:</span>
                        <span className={`modinfo_info-value ${
                          estadoActual.includes("Atrasado") ? "modinfo_text-danger"
                          : estadoActual.includes("Adelantado") ? "modinfo_text-warning"
                          : "modinfo_text-success"
                        }`}>
                          {estadoActual}
                        </span>
                      </div>

                      {/* Grilla de meses */}
                      <div className="modinfo_meses-container">
                        <h4 className="modinfo_meses-title">Meses Pagados — {anioSeleccionado}</h4>
                        <div className="modinfo_meses-grid">
                          {mesesAMostrar.map((mes, index) => {
                            const pagado = mesesPagadosDelAnio.includes(mes);
                            return (
                              <div
                                key={index}
                                className={`modinfo_mes-item ${pagado ? "modinfo_pagado" : "modinfo_adeudado"}`}
                              >
                                {mes}
                                <span className="modinfo_mes-icon">{pagado ? "✓" : "✗"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Leyenda */}
                      <div className="modinfo_leyenda">
                        <div className="modinfo_leyenda-item">
                          <span className="modinfo_leyenda-color modinfo_pagado"></span>
                          <span>Pagado</span>
                        </div>
                        <div className="modinfo_leyenda-item">
                          <span className="modinfo_leyenda-color modinfo_adeudado"></span>
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

export default ModalInfoEmpresa;