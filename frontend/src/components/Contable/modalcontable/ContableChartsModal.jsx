// ContableChartsModal.jsx
import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faChartPie } from "@fortawesome/free-solid-svg-icons";

/* ======== CHARTS ======== */
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";

import "./ContableChartsModal.css";

ChartJS.register(
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

/**
 * Modal de gráficos del Panel Contable
 *
 * Props:
 * - open: boolean -> mostrar/ocultar
 * - onClose: function -> cerrar modal
 * - datosMeses: Array -> [{ nombre, pagos: [...] }] Socios
 * - datosEmpresas: Array -> [{ nombre, pagos: [...] }] Empresas
 * - mesSeleccionado: string -> "Enero" | ...
 * - medioSeleccionado: string -> "todos" | "EFECTIVO" | ...
 */
export default function ContableChartsModal({
  open,
  onClose,
  datosMeses = [],
  datosEmpresas = [],
  mesSeleccionado = "Selecciona un mes",
  medioSeleccionado = "todos",
}) {
  // ⚠️ NO early return antes de declarar hooks

  const MESES_ORDEN = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  const norm = (s) => (s || "").toString().trim().toLowerCase();

  // Mes actual del sistema (nombre canonizado)
  const mesActualNombre = useMemo(() => {
    const idx = new Date().getMonth(); // 0..11
    return MESES_ORDEN[idx];
  }, []);

  // Meses presentes en cualquiera de las dos colecciones, preservando el orden canónico
  const mesesPresentesTodos = useMemo(() => {
    const set = new Set([
      ...datosMeses.map((m) => norm(m?.nombre)),
      ...datosEmpresas.map((m) => norm(m?.nombre)),
    ]);
    return MESES_ORDEN.filter((m) => set.has(norm(m)));
  }, [datosMeses, datosEmpresas]);

  // Mes "por defecto" cuando no hay uno seleccionado: el mes actual si existe;
  // si no, el más cercano anterior en el año con datos; si tampoco hay, el último disponible.
  const mesPorDefecto = useMemo(() => {
    if (!mesesPresentesTodos.length) return undefined;

    const idxActual = MESES_ORDEN.findIndex((m) => norm(m) === norm(mesActualNombre));
    // ¿Está el mes actual presente?
    const estaActual = mesesPresentesTodos.some((m) => norm(m) === norm(mesActualNombre));
    if (estaActual) return mesActualNombre;

    // Buscar el último mes presente <= mes actual
    for (let i = idxActual; i >= 0; i--) {
      const candidato = MESES_ORDEN[i];
      if (mesesPresentesTodos.some((m) => norm(m) === norm(candidato))) {
        return candidato;
      }
    }
    // Si no hay anteriores, usamos el último presente (el más “reciente” en datos)
    return mesesPresentesTodos[mesesPresentesTodos.length - 1];
  }, [mesesPresentesTodos, mesActualNombre]);

  // Meses a mostrar en el line chart:
  // - Si hay selección: hasta el seleccionado.
  // - Si NO hay selección: hasta el mesPorDefecto (mes actual / cercano).
  const mesesLineChart = useMemo(() => {
    // helper para cortar por un mes límite
    const cortarHasta = (mesLimite) => {
      if (!mesLimite) return mesesPresentesTodos;
      const idxLim = MESES_ORDEN.findIndex((m) => norm(m) === norm(mesLimite));
      const limite = new Set(MESES_ORDEN.slice(0, idxLim + 1).map((m) => norm(m)));
      return mesesPresentesTodos.filter((m) => limite.has(norm(m)));
    };

    if (mesSeleccionado === "Selecciona un mes") {
      return cortarHasta(mesPorDefecto);
    }
    const idxSel = MESES_ORDEN.findIndex((m) => norm(m) === norm(mesSeleccionado));
    if (idxSel === -1) return cortarHasta(mesPorDefecto);
    return cortarHasta(mesSeleccionado);
  }, [mesSeleccionado, mesesPresentesTodos, mesPorDefecto]);

  const sumPorMes = (coleccion, nombreMesCanonico) => {
    const item = coleccion.find((m) => norm(m?.nombre) === norm(nombreMesCanonico));
    if (!item?.pagos) return 0;
    const pagos =
      medioSeleccionado === "todos"
        ? item.pagos
        : item.pagos.filter(
            (p) => (p?.Medio_Pago || "").toString().trim() === medioSeleccionado
          );
    return pagos.reduce((acc, p) => acc + (parseFloat(p?.Precio) || 0), 0);
  };

  const serieSocios = useMemo(
    () => mesesLineChart.map((mes) => sumPorMes(datosMeses, mes)),
    [mesesLineChart, datosMeses, medioSeleccionado]
  );

  const serieEmpresas = useMemo(
    () => mesesLineChart.map((mes) => sumPorMes(datosEmpresas, mes)),
    [mesesLineChart, datosEmpresas, medioSeleccionado]
  );

  const maxSocios = useMemo(() => Math.max(0, ...serieSocios), [serieSocios]);
  const maxEmpresas = useMemo(() => Math.max(0, ...serieEmpresas), [serieEmpresas]);

  const lineData = {
    labels: mesesLineChart,
    datasets: [
      {
        label: "Socios",
        data: serieSocios,
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14,165,233,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: serieSocios.map((v) => (v === maxSocios && v > 0 ? 6 : 3)),
        pointHoverRadius: 7,
      },
      {
        label: "Empresas",
        data: serieEmpresas,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: serieEmpresas.map((v) => (v === maxEmpresas && v > 0 ? 6 : 3)),
        pointHoverRadius: 7,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const i = ctx.dataIndex;
            const datasetLabel = ctx.dataset.label || "";
            const val = ctx.parsed.y || 0;
            const arr = datasetLabel === "Socios" ? serieSocios : serieEmpresas;
            const prev = i > 0 ? arr[i - 1] : null;
            let deltaTxt = "";
            if (prev !== null) {
              const diff = val - prev;
              const pct = prev === 0 ? 0 : (diff / prev) * 100;
              const sign = diff > 0 ? "▲" : diff < 0 ? "▼" : "■";
              deltaTxt = ` (${sign} ${diff.toLocaleString("es-AR")} / ${pct.toFixed(1)}%)`;
            }
            return `${datasetLabel}: $${val.toLocaleString("es-AR")}${deltaTxt}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { autoSkip: false } },
      y: {
        ticks: { callback: (v) => "$" + Number(v).toLocaleString("es-AR") },
      },
    },
  };

  const variacionesTexto = useMemo(() => {
    const totales = mesesLineChart.map(
      (_, i) => (serieSocios[i] || 0) + (serieEmpresas[i] || 0)
    );
    const out = [];
    for (let i = 1; i < totales.length; i++) {
      const prev = totales[i - 1];
      const cur = totales[i];
      const diff = cur - prev;
      const pct = prev === 0 ? 0 : (diff / prev) * 100;
      const signo = diff > 0 ? "aumentó" : diff < 0 ? "cayó" : "se mantuvo";
      out.push(
        `De ${mesesLineChart[i - 1]} a ${mesesLineChart[i]} ${signo} $${Math.abs(
          diff
        ).toLocaleString("es-AR")} (${(pct >= 0 ? "+" : "")}${pct.toFixed(1)}%).`
      );
    }
    return out;
  }, [mesesLineChart, serieSocios, serieEmpresas]);

  // Mes efectivo a usar (seleccionado o por defecto)
  const mesEfectivo = useMemo(() => {
    return mesSeleccionado !== "Selecciona un mes" ? mesSeleccionado : mesPorDefecto;
  }, [mesSeleccionado, mesPorDefecto]);

  const pieData = useMemo(() => {
    const mes = mesEfectivo;
    const totalSoc = mes ? sumPorMes(datosMeses, mes) : 0;
    const totalEmp = mes ? sumPorMes(datosEmpresas, mes) : 0;

    return {
      labels: ["Socios", "Empresas"],
      datasets: [
        {
          data: [totalSoc, totalEmp],
          backgroundColor: ["#0ea5e9", "#22c55e"],
          hoverOffset: 6,
        },
      ],
    };
  }, [mesEfectivo, datosMeses, datosEmpresas, medioSeleccionado]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || "";
            const val = ctx.parsed || 0;
            return `${label}: $${val.toLocaleString("es-AR")}`;
          },
        },
      },
    },
  };

  /* ======= TOTAL ANUAL ACUMULADO (YTD) ======= */
  const cutoffIndex = useMemo(() => {
    if (!mesesLineChart.length) return -1;

    if (mesSeleccionado !== "Selecciona un mes") {
      const idxSel = mesesLineChart.findIndex((m) => norm(m) === norm(mesSeleccionado));
      return idxSel === -1 ? mesesLineChart.length - 1 : idxSel;
    }

    // Sin selección: cortar en el mes por defecto (mes actual o el más cercano)
    const idxDef = mesesLineChart.findIndex((m) => norm(m) === norm(mesPorDefecto));
    return idxDef === -1 ? mesesLineChart.length - 1 : idxDef;
  }, [mesesLineChart, mesSeleccionado, mesPorDefecto]);

  const mesesHastaSeleccion = useMemo(() => {
    if (cutoffIndex < 0) return [];
    return mesesLineChart.slice(0, cutoffIndex + 1);
  }, [mesesLineChart, cutoffIndex]);

  const totalAcumuladoSocios = useMemo(
    () => mesesHastaSeleccion.reduce((acc, m) => acc + sumPorMes(datosMeses, m), 0),
    [mesesHastaSeleccion, datosMeses, medioSeleccionado]
  );

  const totalAcumuladoEmpresas = useMemo(
    () => mesesHastaSeleccion.reduce((acc, m) => acc + sumPorMes(datosEmpresas, m), 0),
    [mesesHastaSeleccion, datosEmpresas, medioSeleccionado]
  );

  const totalAcumuladoYTD = totalAcumuladoSocios + totalAcumuladoEmpresas;

  // ✅ Ahora sí: early return DESPUÉS de los hooks
  if (!open) return null;

  return (
    <div className="contable-modal-overlay" role="dialog" aria-modal="true">
      <div className="contable-modal">
        <div className="contable-modal-header">
          <h3>
            <FontAwesomeIcon icon={faChartPie} /> Gráficos de Recaudación
            {medioSeleccionado !== "todos" ? ` · ${medioSeleccionado}` : ""}
          </h3>
          <button className="contable-modal-close" onClick={onClose} aria-label="Cerrar">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="contable-modal-body">
          <div className="contable-chart-card">
            <h4>
              Evolución mensual · Socios vs Empresas
              {mesEfectivo ? ` (hasta ${mesEfectivo})` : ""}
            </h4>
            <div className="contable-chart-wrapper">
              <Line data={lineData} options={lineOptions} />
            </div>

            {variacionesTexto.length > 0 && (
              <div className="contable-chart-footnote" style={{ marginTop: 8 }}>
                {variacionesTexto.map((t, i) => (
                  <div key={i}>• {t}</div>
                ))}
              </div>
            )}
            <small className="contable-chart-footnote">
              El tooltip muestra la variación contra el mes anterior. Los puntos más grandes
              indican el pico de cada serie.
            </small>
          </div>

          <div className="contable-chart-card">
            <h4>
              Distribución en {mesEfectivo || "—"}
            </h4>
            <div className="contable-chart-wrapper contable-chart-wrapper--pie">
              <Pie data={pieData} options={pieOptions} />
            </div>

            {/* ====== Totales YTD bajo el pie ====== */}
            <div className="contable-pie-totals">
              <div className="contable-pie-totals__item socios">
                <span className="label">Total socios (YTD):</span>
                <span className="value">${totalAcumuladoSocios.toLocaleString("es-AR")}</span>
              </div>
              <div className="contable-pie-totals__item empresas">
                <span className="label">Total empresas (YTD):</span>
                <span className="value">${totalAcumuladoEmpresas.toLocaleString("es-AR")}</span>
              </div>
              <div className="contable-pie-totals__item total">
                <span className="label">Total (YTD):</span>
                <span className="value">${totalAcumuladoYTD.toLocaleString("es-AR")}</span>
              </div>
            </div>

            <small className="contable-chart-footnote">
              Los totales consideran enero hasta el mes mostrado (incluido) y respetan el filtro de
              medio de pago.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
