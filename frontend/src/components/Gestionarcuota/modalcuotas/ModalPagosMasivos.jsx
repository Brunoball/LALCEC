import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { FaCoins, FaTimes, FaCheck } from "react-icons/fa";
import BASE_URL from "../../../config/config";
import { printComprobantesLote } from "../../../utils/comprobantes";
import "./ModalPagos.css";

const MESES = [
  { id: 1, nombre: "ENERO" },
  { id: 2, nombre: "FEBRERO" },
  { id: 3, nombre: "MARZO" },
  { id: 4, nombre: "ABRIL" },
  { id: 5, nombre: "MAYO" },
  { id: 6, nombre: "JUNIO" },
  { id: 7, nombre: "JULIO" },
  { id: 8, nombre: "AGOSTO" },
  { id: 9, nombre: "SEPTIEMBRE" },
  { id: 10, nombre: "OCTUBRE" },
  { id: 11, nombre: "NOVIEMBRE" },
  { id: 12, nombre: "DICIEMBRE" },
];

/* =========================
   Dropdown Año estilo "pill"
   ========================= */
function YearDropdown({ value, options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

const ModalPagosMasivos = ({
  tipoEntidad = "socio",
  items = [],
  selectedYear,
  cerrarModal,
  onPagoRealizado,
}) => {
  const yearNow = new Date().getFullYear();
  const initialYear = Number(selectedYear) || yearNow;

  const [anioSeleccionado, setAnioSeleccionado] = useState(initialYear);
  const [mesesSeleccionados, setMesesSeleccionados] = useState([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  const [anioResumen, setAnioResumen] = useState(initialYear);
  const [mesesResumen, setMesesResumen] = useState([]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.keyCode === 27) {
        e.preventDefault();
        cerrarModal?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cerrarModal]);

  useEffect(() => {
    setAnioSeleccionado(Number(selectedYear) || yearNow);
  }, [selectedYear, yearNow]);

  const ids = useMemo(() => {
    return items
      .map((item) =>
        tipoEntidad === "socio"
          ? item.idSocios ?? item.id_socio ?? item.idSocio ?? item.id ?? null
          : item.idEmp ?? item.id_empresa ?? item.idEmpresa ?? item.id ?? null
      )
      .filter((id) => id != null);
  }, [items, tipoEntidad]);

  const totalMensual = useMemo(() => {
    return items.reduce(
      (acc, item) => acc + Number(item?.precio_categoria || 0),
      0
    );
  }, [items]);

  const totalEstimado = useMemo(() => {
    return totalMensual * mesesSeleccionados.length;
  }, [totalMensual, mesesSeleccionados.length]);

  const totalResumen = useMemo(() => {
    return totalMensual * mesesResumen.length;
  }, [totalMensual, mesesResumen.length]);

  const yearOptions = useMemo(() => {
    const base = new Set([
      yearNow - 2,
      yearNow - 1,
      yearNow,
      yearNow + 1,
      yearNow + 2,
      initialYear,
    ]);
    return Array.from(base).sort((a, b) => b - a);
  }, [yearNow, initialYear]);

  const tituloEntidad = tipoEntidad === "socio" ? "socios" : "empresas";
  const tituloEntidadSingular = tipoEntidad === "socio" ? "Socio" : "Empresa";

  const endpoint =
    tipoEntidad === "socio"
      ? `${BASE_URL}/api.php?action=registrar_pago`
      : `${BASE_URL}/api.php?action=registrar_pago_empresas`;

  const onChangeYear = (e) => {
    const value = Number(e.target.value);
    setAnioSeleccionado(value);
    setMesesSeleccionados([]);
    setTodosSeleccionados(false);
    setError("");
  };

  const toggleMes = useCallback((mesId) => {
    setMesesSeleccionados((prev) =>
      prev.includes(mesId)
        ? prev.filter((m) => m !== mesId)
        : [...prev, mesId].sort((a, b) => a - b)
    );
  }, []);

  const handleSeleccionarTodos = useCallback(() => {
    if (todosSeleccionados) {
      setMesesSeleccionados([]);
      setTodosSeleccionados(false);
    } else {
      setMesesSeleccionados(MESES.map((m) => m.id));
      setTodosSeleccionados(true);
    }
  }, [todosSeleccionados]);

  useEffect(() => {
    setTodosSeleccionados(mesesSeleccionados.length === MESES.length);
  }, [mesesSeleccionados]);

  const mesesSeleccionadosTexto = useMemo(() => {
    return MESES.filter((mes) => mesesSeleccionados.includes(mes.id)).map(
      (mes) => `${mes.nombre} ${anioSeleccionado}`
    );
  }, [mesesSeleccionados, anioSeleccionado]);

  const handleRealizarPagoMasivo = async () => {
    if (ids.length === 0) {
      setError("No hay registros seleccionados para procesar.");
      return;
    }

    if (mesesSeleccionados.length === 0) {
      setError("Seleccioná al menos un mes.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          meses: mesesSeleccionados,
          anio: Number(anioSeleccionado),
          modo_masivo: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResultado(result);
        setAnioResumen(anioSeleccionado);
        setMesesResumen(mesesSeleccionadosTexto);
      } else {
        setError(result.message || "No se pudieron registrar los pagos.");
      }
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error al registrar los pagos.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImprimirComprobantes = () => {
    if (!Array.isArray(mesesResumen) || mesesResumen.length === 0) return;
    printComprobantesLote(items, tipoEntidad, "pagado", mesesResumen);
  };

  if (resultado) {
    const resumen = resultado?.resumen || {};

    return (
      <div className="modpag_overlay">
        <div className="modpag_contenido modpagmas">
          <div className="modpag_header">
            <div className="modpag_header-left">
              <div className="modpag_icon-circle">
                <FaCoins size={20} />
              </div>
              <div className="modpag_header-texts">
                <h2 className="modpag_title">Pago masivo registrado</h2>
              </div>
            </div>

            <button
              className="modpag_close-btn"
              onClick={() => {
                onPagoRealizado?.();
                cerrarModal?.();
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
            <div className="modpag_success">
              <h2 className="modpag_success-title">¡Proceso completado!</h2>
              <p className="modpag_success-subtitle">
                Se terminó el registro masivo de pagos.
              </p>
            </div>

            <div className="modpag_info-summary">
              <div className="modpag_info-row">
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Tipo</span>
                  <span className="modpag_info-value">{tituloEntidad}</span>
                </div>

                <div className="modpag_info-item">
                  <span className="modpag_info-label">Año</span>
                  <span className="modpag_info-value">{anioResumen}</span>
                </div>
              </div>

              <div className="modpag_info-row">
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Registros seleccionados</span>
                  <span className="modpag_info-value">
                    {resumen.entidades_recibidas ?? ids.length}
                  </span>
                </div>

                <div className="modpag_info-item">
                  <span className="modpag_info-label">Pagos insertados</span>
                  <span className="modpag_info-value">
                    {resumen.pagos_insertados ?? 0}
                  </span>
                </div>
              </div>

              <div className="modpag_info-row">
                <div className="modpag_info-item">
                  <span className="modpag_info-label">Omitidos</span>
                  <span className="modpag_info-value">
                    {resumen.pagos_omitidos ?? 0}
                  </span>
                </div>

                <div className="modpag_info-item">
                  <span className="modpag_info-label">Meses pedidos</span>
                  <span className="modpag_info-value">
                    {mesesResumen.length}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",

                gap: 16,
                marginTop: 16,

              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  background: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                  Meses registrados
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {mesesResumen.map((mes, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {mes.replace(` ${anioResumen}`, "")}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  maxHeight: 220,
                  overflowY: "auto",
                  background: "#fafafa",
                }}
              >
                <strong style={{ display: "block", marginBottom: 8 }}>
                  Detalles omitidos
                </strong>

                {Array.isArray(resumen.detalles_omitidos) &&
                resumen.detalles_omitidos.length > 0 ? (
                  resumen.detalles_omitidos.map((txt, idx) => (
                    <div key={idx} style={{ marginBottom: 6, fontSize: 14 }}>
                      • {txt}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 14, opacity: 0.7 }}>
                    No hubo detalles omitidos.
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fafafa",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Registros incluidos
              </div>

              <div
                style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  display: "grid",
                  gap: 6,
                }}
              >
                {items.slice(0, 30).map((item, idx) => {
                  const label =
                    tipoEntidad === "socio"
                      ? `${item.apellido || ""} ${item.nombre || ""}`.trim()
                      : item.razon_social || "";

                  return (
                    <div key={idx} style={{ fontSize: 14 }}>
                      • {label}
                    </div>
                  );
                })}

                {items.length > 30 && (
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    … y {items.length - 30} más
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modpag_footer modpag_footer-sides">
            <div className="modpag_footer-left">
              <div className="modpag_total-pill modpag_total-pill-inline">
                <span className="only-desktop">Total: ${totalResumen}</span>
                <span className="only-mobile-inline">
                  <FaCoins />
                  &nbsp;${totalResumen}
                </span>
              </div>
            </div>

            <div className="modpag_footer-right">
              <button
                className="modpag_btn modpag_btn-secondary"
                onClick={() => {
                  onPagoRealizado?.();
                  cerrarModal?.();
                }}
              >
                <span className="only-desktop">Cerrar</span>
                <FaTimes className="only-mobile-inline" />
              </button>

              <button
                className="modpag_btn modpag_btn-success"
                onClick={handleImprimirComprobantes}
                disabled={mesesResumen.length === 0 || items.length === 0}
              >
                <span className="only-desktop">Imprimir comprobantes</span>
                <FaCheck className="only-mobile-inline" />
              </button>
            </div>
          </div>
        </div>
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
              <h2 className="modpag_title">Pago masivo de {tituloEntidad}</h2>
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
                <span className="modpag_info-label">
                  {tituloEntidadSingular}es seleccionados
                </span>
                <span className="modpag_info-value modpag_info-value-highlight">
                  {items.length}
                </span>
              </div>

              <div className="modpag_info-item">
                <span className="modpag_info-label">Año a registrar</span>
                <span className="modpag_info-value modpag_info-value-highlight">
                  {anioSeleccionado}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginBottom: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Registros incluidos
            </div>

            <div
              style={{
                maxHeight: 140,
                overflowY: "auto",
                display: "grid",
                gap: 6,
              }}
            >
              {items.slice(0, 30).map((item, idx) => {
                const label =
                  tipoEntidad === "socio"
                    ? `${item.apellido || ""} ${item.nombre || ""}`.trim()
                    : item.razon_social || "";

                return (
                  <div key={idx} style={{ fontSize: 14 }}>
                    • {label}
                  </div>
                );
              })}

              {items.length > 30 && (
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  … y {items.length - 30} más
                </div>
              )}
            </div>
          </div>

          <div className="modpag_periodos-section">
            <div className="modpag_section-header">
              <h4 className="modpag_section-title">Meses a registrar</h4>

              <div
                className="modpag_section-header-actions"
                style={{ display: "flex", gap: 8 }}
              >
                <YearDropdown
                  value={anioSeleccionado}
                  options={yearOptions}
                  onChange={onChangeYear}
                />

                <button
                  className="modpag_btn modpag_btn-small modpag_btn-terciario"
                  onClick={handleSeleccionarTodos}
                >
                  {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
                  {mesesSeleccionados.length > 0 && (
                    <span className="only-desktop">
                      {" "}
                      ({mesesSeleccionados.length})
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div
              style={{
                marginBottom: 12,
                fontSize: 13,
                opacity: 0.85,
              }}
            >
              Si alguno de los meses ya estaba pago en algún registro seleccionado,
              el backend lo omite automáticamente.
            </div>

            <div className="modpag_periodos-grid-container">
              <div className="modpag_periodos-grid">
                {MESES.map((mes) => {
                  const checked = mesesSeleccionados.includes(mes.id);

                  return (
                    <div
                      key={`${anioSeleccionado}-${mes.id}`}
                      className={`modpag_periodo-card ${
                        checked ? "modpag_seleccionado" : ""
                      }`}
                      onClick={() => toggleMes(mes.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleMes(mes.id);
                        }
                      }}
                    >
                      <div className="modpag_periodo-checkbox">
                        <input
                          type="checkbox"
                          id={`periodo-masivo-${anioSeleccionado}-${mes.id}`}
                          checked={checked}
                          readOnly
                          tabIndex={-1}
                          style={{ pointerEvents: "none" }}
                        />
                        <span className="modpag_checkmark"></span>
                      </div>

                      <div className="modpag_periodo-label">
                        {mes.nombre} {anioSeleccionado}
                      </div>
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
              <span className="only-desktop">
                Total estimado: ${totalEstimado}
              </span>
              <span className="only-mobile-inline">
                <FaCoins />
                &nbsp;${totalEstimado}
              </span>
            </div>
          </div>

          <div className="modpag_footer-right">
            <button
              className="modpag_btn modpag_btn-secondary"
              onClick={cerrarModal}
            >
              <span className="only-desktop">Cerrar</span>
              <FaTimes className="only-mobile-inline" />
            </button>

            <button
              className="modpag_btn modpag_btn-primary"
              onClick={handleRealizarPagoMasivo}
              disabled={
                submitting ||
                mesesSeleccionados.length === 0 ||
                ids.length === 0
              }
              title={`Registrar pago masivo en ${anioSeleccionado}`}
            >
              <span className="only-desktop">
                {submitting ? "Procesando..." : "Registrar pago masivo"}
              </span>
              <FaCheck className="only-mobile-inline" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPagosMasivos;