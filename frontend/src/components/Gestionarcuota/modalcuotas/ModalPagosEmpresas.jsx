// src/components/.../ModalPagosEmpresas.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaCoins, FaTimes, FaCheck } from "react-icons/fa";
import BASE_URL from "../../../config/config";
import Toast from "../../global/Toast";
import "./ModalPagos.css";

/* =========================
   Dropdown Año estilo "pill"
   con animación de despliegue
   ========================= */
function YearDropdown({ value, options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSelect = (y) => {
    onChange({ target: { value: y } });
    setOpen(false);
  };

  return (
    <div className="modpag_year-dd" ref={ref}>
      <button
        type="button"
        className={`modpag_year-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="modpag_year-ico" aria-hidden="true" />
        {value}
        <span className="modpag_year-caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="modpag_year-menu" role="listbox" tabIndex={-1}>
          {options.map((y) => {
            const selected = Number(y) === Number(value);
            return (
              <button
                key={y}
                type="button"
                role="option"
                aria-selected={selected}
                className={`modpag_year-item ${selected ? "is-selected" : ""}`}
                onClick={() => handleSelect(y)}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ModalPagosEmpresas = ({ razonSocial, cerrarModal, onPagoRealizado }) => {
  const [mesesSeleccionados, setMesesSeleccionados] = useState([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [precioMensual, setPrecioMensual] = useState(0);
  const [error, setError] = useState("");
  const [fechaUnion, setFechaUnion] = useState(null);
  const [empresaData, setEmpresaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // pagos agrupados por año { 2025:[1,2], 2026:[1,3], ... }
  const [pagosPorAnio, setPagosPorAnio] = useState({});

  // ✅ NUEVO: snapshot para el comprobante (evita que se “pierda” la selección)
  const [mesesPagadosRecibo, setMesesPagadosRecibo] = useState([]);
  const [anioRecibo, setAnioRecibo] = useState(null);

  // Año actual / seleccionado
  const hoy = new Date();
  const yearNow = hoy.getFullYear();
  const [selectedYear, setSelectedYear] = useState(yearNow);

  // Año de ingreso (derivado de fechaUnion)
  const unionYear = useMemo(() => {
    if (!fechaUnion) return null;
    try {
      return new Date(fechaUnion + "T00:00:00").getFullYear();
    } catch {
      return null;
    }
  }, [fechaUnion]);

  // Persistencia por empresa: años visibles en selector
  const storageKeyYears = useMemo(
    () => `emp:${(razonSocial || "").trim()}:years`,
    [razonSocial]
  );

  const leerYearsPersistidos = () => {
    try {
      const raw = localStorage.getItem(storageKeyYears);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  };

  const guardarYearsPersistidos = (setYears) => {
    try {
      localStorage.setItem(
        storageKeyYears,
        JSON.stringify(Array.from(setYears))
      );
    } catch {}
  };

  // ESC para cerrar
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc" || e.keyCode === 27) {
        e.preventDefault();
        cerrarModal?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cerrarModal]);

  const mostrarToast = (tipo, mensaje, duracion = 3200) => {
    setToast({ tipo, mensaje, duracion });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("es-AR");
  };

  // Carga de datos de empresa + pagos por año
  useEffect(() => {
    const obtenerDatosEmpresa = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${BASE_URL}/api.php?action=monto_pago_empresas`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ razonSocial, tipoEntidad: "empresa" }),
          }
        );
        const result = await response.json();

        if (result.success) {
          const precio = result.precioMes ?? 0;
          setPrecioMensual(precio);
          setFechaUnion(
            result.fechaUnion || new Date().toISOString().split("T")[0]
          );
          setEmpresaData({
            domicilio: result.domicilio_2 || result.domicilio || "",
            categoria: result.categoria || "",
            cobrador: result.cobrador || "",
          });

          // Compat: si aún viene "mesesPagados" plano (año actual), lo adaptamos
          let pagos = result.pagosPorAnio || {};
          if (!result.pagosPorAnio && Array.isArray(result.mesesPagados)) {
            pagos = { [yearNow]: result.mesesPagados };
          }
          setPagosPorAnio(pagos);

          // Persistir años con pagos + año actual
          const setYears = leerYearsPersistidos();
          Object.keys(pagos).forEach((y) => setYears.add(Number(y)));
          setYears.add(yearNow);
          guardarYearsPersistidos(setYears);

          if (!precio || precio <= 0 || !result.categoria) {
            mostrarToast(
              "error",
              "La empresa no tiene categoría asignada. No se puede registrar el pago."
            );
          }
        } else {
          setError(result.message || "Error al obtener datos de la empresa");
        }
      } catch (e) {
        setError("Ocurrió un error al obtener los datos de la empresa.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (razonSocial) obtenerDatosEmpresa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [razonSocial]);

  // Opciones de año
  const yearOptions = useMemo(() => {
    if (!unionYear) {
      const base = new Set([yearNow, yearNow + 1, yearNow + 2]);
      const persist = leerYearsPersistidos();
      persist.forEach((y) => base.add(Number(y)));
      Object.keys(pagosPorAnio || {}).forEach((y) => base.add(Number(y)));
      return Array.from(base).sort((a, b) => b - a);
    }

    const start = unionYear;
    const end = Math.max(yearNow, unionYear) + 2;

    const base = new Set();
    for (let y = start; y <= end; y++) base.add(y);

    const persist = leerYearsPersistidos();
    persist.forEach((y) => {
      if (y >= start && y <= end) base.add(Number(y));
    });
    Object.keys(pagosPorAnio || {}).forEach((ys) => {
      const y = Number(ys);
      if (y >= start && y <= end) base.add(y);
    });

    return Array.from(base).sort((a, b) => b - a);
  }, [unionYear, yearNow, pagosPorAnio, storageKeyYears]);

  // Mantener selectedYear dentro de rango
  useEffect(() => {
    if (!unionYear) return;
    const start = unionYear;
    const end = Math.max(yearNow, unionYear) + 2;
    if (selectedYear < start || selectedYear > end) {
      const fallback = Math.min(Math.max(yearNow, start), end);
      setSelectedYear(fallback);
      setMesesSeleccionados([]);
      setTodosSeleccionados(false);
    }
  }, [unionYear, yearNow, selectedYear]);

  // Meses disponibles según selectedYear y fechaUnion
  const getMesesDisponibles = () => {
    if (!fechaUnion) return [];
    try {
      const fu = new Date(fechaUnion + "T00:00:00");
      const mesUnion = fu.getMonth() + 1;
      const anioUnion = fu.getFullYear();

      const makeMes = (id) => ({
        id,
        nombre:
          new Date(0, id - 1)
            .toLocaleString("es-AR", { month: "long" })
            .toUpperCase() + ` ${selectedYear}`,
      });

      if (selectedYear === anioUnion) {
        return [...Array(12 - mesUnion + 1)].map((_, i) =>
          makeMes(mesUnion + i)
        );
      }
      return [...Array(12)].map((_, i) => makeMes(i + 1));
    } catch (e) {
      console.error("Error al procesar fecha de unión:", e);
      return [];
    }
  };

  const meses = getMesesDisponibles();

  // ¿Está pagado este mes en el año actual?
  const isMesPagado = useCallback(
    (mesId) => {
      const arr = pagosPorAnio?.[selectedYear] || [];
      return Array.isArray(arr) && arr.includes(mesId);
    },
    [pagosPorAnio, selectedYear]
  );

  // IDs disponibles (no pagados) para el año visible
  const disponiblesIds = useMemo(
    () => meses.filter((m) => !isMesPagado(m.id)).map((m) => m.id),
    [meses, isMesPagado]
  );

  const totalPagar = mesesSeleccionados.length * (precioMensual || 0);

  const handleSeleccionarMes = (mesId, yaPagado) => {
    if (yaPagado) return;
    setMesesSeleccionados((prev) =>
      prev.includes(mesId)
        ? prev.filter((m) => m !== mesId)
        : [...prev, mesId]
    );
  };

  const handleSeleccionarTodos = () => {
    if (disponiblesIds.length === 0) {
      setMesesSeleccionados([]);
      setTodosSeleccionados(false);
      return;
    }
    setMesesSeleccionados(todosSeleccionados ? [] : disponiblesIds);
    setTodosSeleccionados(!todosSeleccionados);
  };

  // Recalcular “todos” al cambiar selección/meses disponibles
  useEffect(() => {
    const todos =
      disponiblesIds.length > 0 &&
      disponiblesIds.every((id) => mesesSeleccionados.includes(id)) &&
      mesesSeleccionados.length === disponiblesIds.length;
    setTodosSeleccionados(todos);
  }, [mesesSeleccionados, disponiblesIds]);

  // Cambiar año => limpiar selección
  const onChangeYear = (e) => {
    const val = Number(e.target.value);
    setSelectedYear(val);
    setMesesSeleccionados([]);
    setTodosSeleccionados(false);
  };

  const handleRealizarPago = async () => {
    if (!precioMensual || precioMensual <= 0 || !empresaData?.categoria) {
      mostrarToast(
        "error",
        "La empresa no tiene categoría asignada. No se puede registrar el pago."
      );
      return;
    }
    if (mesesSeleccionados.length === 0) return;

    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=registrar_pago_empresas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razonSocial,
            meses: mesesSeleccionados,
            tipoEntidad: "empresa",
            anio: selectedYear,
          }),
        }
      );
      const result = await response.json();

      if (result.success) {
        // ✅ snapshot antes de que algo limpie/recalcule estados
        setMesesPagadosRecibo([...mesesSeleccionados]);
        setAnioRecibo(selectedYear);

        setPagoExitoso(true);

        const setYears = leerYearsPersistidos();
        setYears.add(selectedYear);
        guardarYearsPersistidos(setYears);

        setPagosPorAnio((prev) => {
          const copia = { ...(prev || {}) };
          const arr = new Set(copia[selectedYear] || []);
          mesesSeleccionados.forEach((m) => arr.add(m));
          copia[selectedYear] = Array.from(arr).sort((a, b) => a - b);
          return copia;
        });
      } else {
        setError(result.message || "Error al registrar el pago");
      }
    } catch (e) {
      setError("Ocurrió un error al realizar el pago.");
      console.error(e);
    }
  };

  /* =========================================================
     ✅ IMPRIMIR COMPROBANTE
     - HTML + window.print()
     - Indicador: "N × $montoMensual = $total"
     - Usa snapshot para que siempre respete lo pagado
     ========================================================= */
  const handleImprimirComprobante = () => {
    if (!empresaData) return;

    const mesesParaRecibo =
      (mesesPagadosRecibo && mesesPagadosRecibo.length > 0
        ? mesesPagadosRecibo
        : mesesSeleccionados) || [];

    if (mesesParaRecibo.length === 0) return;

    const yearRecibo = anioRecibo ?? selectedYear;

    // reconstruir nombres de meses para el año del recibo
    const nombresMeses = (ids, y) =>
      ids
        .slice()
        .sort((a, b) => a - b)
        .map((id) => {
          const nombre =
            new Date(0, id - 1)
              .toLocaleString("es-AR", { month: "long" })
              .toUpperCase() + ` ${y}`;
          return nombre;
        });

    const mesesPagadosStr = nombresMeses(mesesParaRecibo, yearRecibo).join(", ");

    const cantidadMeses = mesesParaRecibo.length;
    const montoUnitario = precioMensual || 0;
    const totalPagarLocal = cantidadMeses * montoUnitario;

    const montoDetalle =
      cantidadMeses > 1
        ? `${cantidadMeses} × $${montoUnitario} = $${totalPagarLocal}`
        : `$${montoUnitario}`;

    const comprobanteHTML = `
      <html>
      <head>
        <title>Comprobante de Pago</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { width: 210mm; height: 297mm; margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 12px; display: flex; justify-content: center; align-items: center; }
          .contenedor { width: 210mm; height: 70mm; position: absolute; top: 33%; left: 50%; transform: translate(-50%, -50%) rotate(90deg); transform-origin: center center; box-sizing: border-box; }
          .comprobante { width: 100%; height: 100%; display: flex; box-sizing: border-box; }
          .talon-empresa { width: 60%; padding-left: 20mm; padding-top: 13mm; }
          .talon-cobrador { width: 60mm; padding-left: 10mm; padding-top: 16mm; }
          p { margin-top: 5px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="contenedor">
          <div class="comprobante">
            <div class="talon-empresa">
              <p><strong>Empresa:</strong> ${razonSocial}</p>
              <p><strong>Domicilio:</strong> ${empresaData.domicilio || "No registrado"}</p>
              <p><strong>Categoría / Monto:</strong> ${empresaData.categoria} / ${montoDetalle}</p>
              <p><strong>Período:</strong> ${mesesPagadosStr}</p>
              <p><strong>Cobrador:</strong> ${empresaData.cobrador}</p>
              <p>Por consultas comunicarse al 03564-15205778</p>
            </div>
            <div class="talon-cobrador">
              <p><strong>Empresa:</strong> ${razonSocial}</p>
              <p><strong>Categoría / Monto:</strong> ${empresaData.categoria} / ${montoDetalle}</p>
              <p><strong>Período:</strong> ${mesesPagadosStr}</p>
              <p><strong>Cobrador:</strong> ${empresaData.cobrador}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open("", "", "width=600,height=400");
    if (!ventana) return;
    ventana.document.write(comprobanteHTML);
    ventana.document.close();
    ventana.print();
  };

  /* ===== Renders de estado ===== */
  if (loading) {
    return (
      <div className="modpag_overlay">
        <div className="modpag_contenido">
          <div className="modpag_header">
            <div className="modpag_header-left">
              <div className="modpag_icon-circle">
                <FaCoins size={20} />
              </div>
              <div className="modpag_header-texts">
                <h2 className="modpag_title">Registro de Pagos</h2>
              </div>
            </div>
            <button className="modpag_close-btn" disabled>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="modpag_body">
            <div className="modpag_loading-state">
              <div className="modpag_spinner"></div>
              <span>Cargando datos de la empresa...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modpag_overlay">
        <div className="modpag_contenido">
          <div className="modpag_header">
            <div className="modpag_header-left">
              <div className="modpag_icon-circle">
                <FaCoins size={20} />
              </div>
              <div className="modpag_header-texts">
                <h2 className="modpag_title">Registro de Pagos</h2>
              </div>
            </div>
            <button className="modpag_close-btn" onClick={cerrarModal}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="modpag_body">
            <div className="modpag_info-summary">
              <div className="modpag_info-row">
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Empresa</span>
                  <span className="modpag_info-value">{razonSocial}</span>
                </div>
                {fechaUnion && (
                  <div className="modpag_info-item">
                    <span className="modpag_info-label">Fecha de alta</span>
                    <span className="modpag_info-value">{formatDate(fechaUnion)}</span>
                  </div>
                )}
              </div>
            </div>
            <p className="modpag_error-banner">{error}</p>
          </div>
          <div className="modpag_footer modpag_footer-sides">
            <div className="modpag_footer-left" />
            <div className="modpag_footer-right">
              <button
                className="modpag_btn modpag_btn-secondary"
                onClick={cerrarModal}
              >
                <span className="only-desktop">Cerrar</span>
                <FaTimes className="only-mobile-inline" />
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <Toast
            tipo={toast.tipo}
            mensaje={toast.mensaje}
            duracion={toast.duracion}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  if (pagoExitoso) {
    return (
      <div className="modpag_overlay">
        <div className="modpag_contenido">
          <div className="modpag_header">
            <div className="modpag_header-left">
              <div className="modpag_icon-circle">
                <FaCoins size={20} />
              </div>
              <div className="modpag_header-texts">
                <h2 className="modpag_title">Registro de Pagos</h2>
              </div>
            </div>
            <button
              className="modpag_close-btn"
              onClick={() => {
                if (onPagoRealizado) onPagoRealizado();
                cerrarModal();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="modpag_body">
            <div className="modpag_info-summary">
              <div className="modpag_info-row">
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Empresa</span>
                  <span className="modpag_info-value">{razonSocial}</span>
                </div>
                {fechaUnion && (
                  <div className="modpag_info-item">
                    <span className="modpag_info-label">Fecha de alta</span>
                    <span className="modpag_info-value">{formatDate(fechaUnion)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modpag_success">
              <h2 className="modpag_success-title">¡Pago realizado con éxito!</h2>
              <p className="modpag_success-subtitle">
                Podés generar el comprobante ahora mismo.
              </p>
            </div>
          </div>

          <div className="modpag_footer modpag_footer-sides">
            <div className="modpag_footer-left">
              <div className="modpag_total-pill modpag_total-pill-inline">
                <span className="only-desktop">
                  Total: ${mesesPagadosRecibo.length > 0 ? mesesPagadosRecibo.length * (precioMensual || 0) : totalPagar}
                </span>
                <span className="only-mobile-inline">
                  <FaCoins />
                  &nbsp;{mesesPagadosRecibo.length > 0 ? `$${mesesPagadosRecibo.length * (precioMensual || 0)}` : `$${totalPagar}`}
                </span>
              </div>
            </div>
            <div className="modpag_footer-right">
              <button
                className="modpag_btn modpag_btn-secondary"
                onClick={() => {
                  if (onPagoRealizado) onPagoRealizado();
                  cerrarModal();
                }}
              >
                <span className="only-desktop">Cerrar</span>
                <FaTimes className="only-mobile-inline" />
              </button>
              <button
                className="modpag_btn modpag_btn-success"
                onClick={handleImprimirComprobante}
                disabled={(mesesPagadosRecibo?.length || 0) === 0}
              >
                <span className="only-desktop">Comprobante</span>
                <FaCheck className="only-mobile-inline" />
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <Toast
            tipo={toast.tipo}
            mensaje={toast.mensaje}
            duracion={toast.duracion}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="modpag_overlay">
      <div className="modpag_contenido">
        <div className="modpag_header">
          <div className="modpag_header-left">
            <div className="modpag_icon-circle">
              <FaCoins size={20} />
            </div>
            <div className="modpag_header-texts">
              <h2 className="modpag_title">Registro de Pagos</h2>
            </div>
          </div>
          <button className="modpag_close-btn" onClick={cerrarModal}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="modpag_body">
          {error && <p className="modpag_error-banner">{error}</p>}

          <div className="modpag_info-summary">
            <div className="modpag_info-row">
              <div className="modpag_info-item">
                <span className="modpag_info-label">Empresa</span>
                <span className="modpag_info-value modpag_info-value-highlight">
                  {razonSocial}
                </span>
              </div>
              {fechaUnion && (
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Fecha de alta</span>
                  <span className="modpag_info-value modpag_info-value-highlight">
                    {formatDate(fechaUnion)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="modpag_periodos-section">
            <div className="modpag_section-header">
              <h4 className="modpag_section-title">Meses disponibles</h4>

              <div
                className="modpag_section-header-actions"
                style={{ display: "flex", gap: 8 }}
              >
                <YearDropdown
                  value={selectedYear}
                  options={yearOptions}
                  onChange={onChangeYear}
                />

                <button
                  className="modpag_btn modpag_btn-small modpag_btn-terciario"
                  onClick={handleSeleccionarTodos}
                  disabled={disponiblesIds.length === 0}
                >
                  {todosSeleccionados
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                  {mesesSeleccionados.length > 0 && (
                    <span className="only-desktop">
                      {" "}
                      ({mesesSeleccionados.length})
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="modpag_periodos-grid-container">
              <div className="modpag_periodos-grid">
                {meses.map((mes) => {
                  const yaPagado = isMesPagado(mes.id);
                  const checked = mesesSeleccionados.includes(mes.id);
                  return (
                    <div
                      key={`${selectedYear}-${mes.id}`}
                      className={`modpag_periodo-card ${
                        yaPagado ? "modpag_pagado" : ""
                      } ${checked ? "modpag_seleccionado" : ""}`}
                      onClick={() => handleSeleccionarMes(mes.id, yaPagado)}
                    >
                      <div className="modpag_periodo-checkbox">
                        <input
                          type="checkbox"
                          id={`periodo-${selectedYear}-${mes.id}`}
                          checked={checked}
                          onChange={() => handleSeleccionarMes(mes.id, yaPagado)}
                          disabled={yaPagado}
                        />
                        <span className="modpag_checkmark"></span>
                      </div>
                      <label
                        htmlFor={`periodo-${selectedYear}-${mes.id}`}
                        className="modpag_periodo-label"
                      >
                        {mes.nombre}
                        {yaPagado && (
                          <span className="modpag_periodo-status">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <path
                                d="M10 3L4.5 8.5L2 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span className="modpag_periodo-status-text">
                              Pagado
                            </span>
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="modpag_footer modpag_footer-sides">
          <div className="modpag_footer-left">
            <div className="modpag_total-pill modpag_total-pill-inline">
              <span className="only-desktop">Total a pagar: ${totalPagar}</span>
              <span className="only-mobile-inline">
                <FaCoins />
                &nbsp;${totalPagar}
              </span>
            </div>
          </div>
          <div className="modpag_footer-right">
            <button className="modpag_btn modpag_btn-secondary" onClick={cerrarModal}>
              <span className="only-desktop">Cerrar</span>
              <FaTimes className="only-mobile-inline" />
            </button>
            <button
              className="modpag_btn modpag_btn-primary"
              onClick={handleRealizarPago}
              disabled={mesesSeleccionados.length === 0}
              title={`Registrar pago en ${selectedYear}`}
            >
              <span className="only-desktop">Realizar Pago</span>
              <FaCheck className="only-mobile-inline" />
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          duracion={toast.duracion}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ModalPagosEmpresas;
