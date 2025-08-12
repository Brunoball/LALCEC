import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import { FaUserCheck } from "react-icons/fa";
import Toast from "../global/Toast";
import "./EmpresasBaja.css";

const EmpresasBaja = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [toast, setToast] = useState({ show: false, tipo: "", mensaje: "" });
  const [busqueda, setBusqueda] = useState("");
  const [accionando, setAccionando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    obtenerEmpresasBaja();
  }, []);

  const obtenerEmpresasBaja = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=estado_empresa&op=listar_baja`
      );
      const data = await response.json();
      if (response.ok && (data.success || data.exito)) {
        setEmpresas(Array.isArray(data.empresas) ? data.empresas : []);
      } else {
        throw new Error(data?.mensaje || "Error al cargar empresas dadas de baja");
      }
    } catch (err) {
      setToast({
        show: true,
        tipo: "error",
        mensaje: err.message || "Error de conexión al cargar empresas",
      });
    } finally {
      setLoading(false);
    }
  };

  const empresasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return empresas;
    return empresas.filter((e) => {
      const nombre = `${e.razon_social || ""}`.toLowerCase();
      return nombre.includes(term);
    });
  }, [empresas, busqueda]);

  const darAltaEmpresa = async (id) => {
    if (accionando) return;
    setAccionando(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=estado_empresa&op=dar_alta`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_empresa: id }),
        }
      );
      const data = await response.json();
      if (response.ok && (data.success || data.exito)) {
        setEmpresas((prev) => prev.filter((e) => e.id_empresa !== id));
        setMostrarConfirmacion(false);
        setEmpresaSeleccionada(null);
        setToast({
          show: true,
          tipo: "exito",
          mensaje: data?.mensaje || "Empresa dada de alta correctamente",
        });
      } else {
        throw new Error(data?.mensaje || "No se pudo dar de alta");
      }
    } catch (error) {
      setToast({
        show: true,
        tipo: "error",
        mensaje: error.message || "Error de red al dar de alta",
      });
    } finally {
      setAccionando(false);
    }
  };

  const closeToast = () => setToast({ ...toast, show: false });

  // Si tu backend guarda fecha como DATE (YYYY-MM-DD)
  const formatearFecha = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return "-";
    const [y, m, d] = String(yyyy_mm_dd).split("-");
    if (!y || !m || !d) return yyyy_mm_dd;
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="emp-baja-container">
      <div className="emp-baja-glass"></div>

      <div className="emp-baja-barra-superior">
        <div className="emp-baja-titulo-container">
          <h2 className="emp-baja-titulo">Empresas Dadas de Baja</h2>
        </div>
        <button className="emp-baja-boton-volver" onClick={() => navigate("/GestionarEmpresas")}>
          ← Volver
        </button>
      </div>

      <div className="emp-baja-buscador-container">
        <input
          type="text"
          className="emp-baja-buscador"
          placeholder="Buscar por razón social..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="emp-baja-buscador-icono">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      {toast.show && (
        <Toast
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          onClose={closeToast}
          duracion={3000}
        />
      )}

      {loading ? (
        <p className="emp-baja-cargando">Cargando empresas dadas de baja...</p>
      ) : (
        <div className="emp-baja-tabla-container">
          <div className="emp-baja-contador">
            Mostrando <strong>{empresasFiltradas.length}</strong> empresas
          </div>

          <div className="emp-baja-tabla-header-container">
            <div className="emp-baja-tabla-header">
              <div className="emp-baja-col-id">ID</div>
              <div className="emp-baja-col-nombre">Razón Social</div>
              <div className="emp-baja-col-fecha">Fecha de baja</div>
              <div className="emp-baja-col-motivo">Motivo</div>
              <div className="emp-baja-col-acciones">Acciones</div>
            </div>
          </div>

          <div className="emp-baja-tabla-body">
            {empresasFiltradas.length === 0 ? (
              <div className="emp-baja-sin-resultados">
                <FaUserCheck className="emp-baja-sin-icono" />
                No hay empresas dadas de baja
              </div>
            ) : (
              empresasFiltradas.map((e) => (
                <div className="emp-baja-fila" key={e.id_empresa}>
                  <div className="emp-baja-col-id">{e.id_empresa}</div>
                  <div className="emp-baja-col-nombre">{e.razon_social || "-"}</div>
                  <div className="emp-baja-col-fecha">{formatearFecha(e.fecha_baja)}</div>
                  <div className="emp-baja-col-motivo">{e.motivo || "-"}</div>
                  <div className="emp-baja-col-acciones">
                    <div className="emp-baja-iconos">
                      <FaUserCheck
                        title="Dar de alta"
                        className={`emp-baja-icono${accionando ? " emp-baja-disabled" : ""}`}
                        onClick={() => {
                          if (!accionando) {
                            setEmpresaSeleccionada(e);
                            setMostrarConfirmacion(true);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {mostrarConfirmacion && empresaSeleccionada && (
        <div className="emp-baja-modal-overlay">
          <div className="emp-baja-modal">
            <h3>
              ¿Deseás dar de alta nuevamente a{" "}
              <strong>{empresaSeleccionada.razon_social || "-"}</strong>?
            </h3>
            <div className="emp-baja-modal-botones">
              <button
                className="emp-baja-btn-confirmar"
                onClick={() => darAltaEmpresa(empresaSeleccionada.id_empresa)}
                disabled={accionando}
              >
                {accionando ? "Procesando..." : "Sí, dar de alta"}
              </button>
              <button
                className="emp-baja-btn-cancelar"
                onClick={() => {
                  if (!accionando) {
                    setMostrarConfirmacion(false);
                    setEmpresaSeleccionada(null);
                  }
                }}
                disabled={accionando}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpresasBaja;
