import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import { FaUserCheck, FaTrash, FaInfoCircle } from "react-icons/fa";
import Toast from "../global/Toast";
import "./EmpresasBaja.css";

const EmpresasBaja = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const [empresaAEliminar, setEmpresaAEliminar] = useState(null);
  const [mostrarEliminar, setMostrarEliminar] = useState(false);

  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [empresaMotivo, setEmpresaMotivo] = useState(null);

  const [toast, setToast] = useState({ show: false, tipo: "", mensaje: "" });
  const [busqueda, setBusqueda] = useState("");
  const [accionando, setAccionando] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    obtenerEmpresasBaja();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (mostrarConfirmacion) {
          setMostrarConfirmacion(false);
          setEmpresaSeleccionada(null);
        }
        if (mostrarEliminar) {
          setMostrarEliminar(false);
          setEmpresaAEliminar(null);
        }
        if (mostrarMotivo) {
          setMostrarMotivo(false);
          setEmpresaMotivo(null);
        }
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [mostrarConfirmacion, mostrarEliminar, mostrarMotivo]);

  const obtenerEmpresasBaja = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=estado_empresa&op=listar_baja`
      );
      const data = await response.json();
      if (response.ok && (data.exito || data.success)) {
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
      if (response.ok && (data.exito || data.success)) {
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

  const eliminarEmpresa = async (empresa) => {
    if (accionando || !empresa) return;
    setAccionando(true);
    try {
      const idEmp = empresa.id_empresa;
      const razon_social = empresa.razon_social || "";

      const qs = new URLSearchParams({
        idEmp: String(idEmp),
        razon_social,
      }).toString();

      const resp = await fetch(
        `${BASE_URL}/api.php?action=eliminar_empresa&${qs}`,
        { method: "GET" }
      );
      const data = await resp.json();

      if (resp.ok && (data.success || data.exito)) {
        setEmpresas((prev) => prev.filter((e) => e.id_empresa !== idEmp));
        setMostrarEliminar(false);
        setEmpresaAEliminar(null);
        setToast({
          show: true,
          tipo: "exito",
          mensaje:
            data?.message || data?.mensaje || "Empresa eliminada correctamente",
        });
      } else {
        throw new Error(data?.message || data?.mensaje || "No se pudo eliminar");
      }
    } catch (err) {
      setToast({
        show: true,
        tipo: "error",
        mensaje: err.message || "Error de red al eliminar",
      });
    } finally {
      setAccionando(false);
    }
  };

  const closeToast = () => setToast({ ...toast, show: false });

  const formatearFecha = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return "-";
    const [y, m, d] = String(yyyy_mm_dd).split("-");
    if (!y || !m || !d) return yyyy_mm_dd;
    return `${d}/${m}/${y}`;
  };

  const abrirModalMotivo = (e) => {
    setEmpresaMotivo(e);
    setMostrarMotivo(true);
  };

  return (
    <div className="emp-baja-container">
      <div className="emp-baja-glass"></div>

      <div className="emp-baja-barra-superior">
        <div className="emp-baja-titulo-container">
          <h2 className="emp-baja-titulo">Empresas Dadas de Baja</h2>
        </div>
        <button
          className="emp-baja-boton-volver arriva"
          onClick={() => navigate("/GestionarEmpresas")}
        >
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
                  <div className="emp-baja-col-nombre">{e.razon_social || ""}</div>
                  <div className="emp-baja-col-fecha">
                    {formatearFecha(e.fecha_baja)}
                  </div>

                  <div
                    className={`emp-baja-col-motivo${
                      (e.motivo || "").trim() ? " emp-baja-col-motivo--click" : ""
                    }`}
                    title={(e.motivo || "").trim() ? "Ver motivo completo" : ""}
                    onClick={() => {
                      if ((e.motivo || "").trim()) abrirModalMotivo(e);
                    }}
                  >
                    {e.motivo || "-"}
                  </div>

                  <div className="emp-baja-col-acciones">
                    <div className="emp-baja-iconos">
                      <FaUserCheck
                        title="Dar de alta"
                        className={`emp-baja-icono${
                          accionando ? " emp-baja-disabled" : ""
                        }`}
                        onClick={() => {
                          if (!accionando) {
                            setEmpresaSeleccionada(e);
                            setMostrarConfirmacion(true);
                          }
                        }}
                      />
                      <FaTrash
                        title="Eliminar definitivamente"
                        className={`emp-baja-icono emp-baja-icono-danger${
                          accionando ? " emp-baja-disabled" : ""
                        }`}
                        onClick={() => {
                          if (!accionando) {
                            setEmpresaAEliminar(e);
                            setMostrarEliminar(true);
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

      {/* Modal DAR ALTA */}
      {mostrarConfirmacion && empresaSeleccionada && (
        <div
          className="emp-baja-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-alta-title"
        >
          <div className="emp-baja-modal emp-baja-modal--success">
            <div className="emp-baja-modal__icon" aria-hidden="true">
              <FaUserCheck />
            </div>

            <h3
              id="modal-alta-title"
              className="emp-baja-modal__title emp-baja-modal__title--success"
            >
              Reactivar empresa
            </h3>

            <p className="emp-baja-modal__body">
              ¿Deseás dar de alta nuevamente a{" "}
              <strong>{empresaSeleccionada.razon_social || ""}</strong>?
            </p>

            <div className="emp-baja-modal__actions">
              <button
                className="emp-baja-btn emp-baja-btn--ghost"
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

              <button
                className="emp-baja-btn emp-baja-btn--solid-success"
                onClick={() => darAltaEmpresa(empresaSeleccionada.id_empresa)}
                disabled={accionando}
              >
                {accionando ? "Procesando..." : "Sí, dar de alta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ELIMINAR */}
      {mostrarEliminar && empresaAEliminar && (
        <div
          className="emp-baja-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-eliminar-title"
        >
          <div className="emp-baja-modal emp-baja-modal--danger">
            <div
              className="emp-baja-modal__icon emp-baja-modal__icon--danger"
              aria-hidden="true"
            >
              <FaTrash />
            </div>

            <h3
              id="modal-eliminar-title"
              className="emp-baja-modal__title emp-baja-modal__title--danger"
            >
              Eliminar permanentemente
            </h3>

            <p className="emp-baja-modal__body">
              ¿Estás seguro que deseas eliminar la empresa{" "}
              <strong>{empresaAEliminar?.razon_social || ""}</strong>?
            </p>

            <div className="emp-baja-modal__actions">
              <button
                className="emp-baja-btn emp-baja-btn--ghost"
                onClick={() => {
                  if (!accionando) {
                    setMostrarEliminar(false);
                    setEmpresaAEliminar(null);
                  }
                }}
                disabled={accionando}
              >
                Cancelar
              </button>

              <button
                className="emp-baja-btn emp-baja-btn--solid-danger"
                onClick={() => eliminarEmpresa(empresaAEliminar)}
                disabled={accionando}
              >
                {accionando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal MOTIVO COMPLETO (estilo informativo unificado) */}
      {mostrarMotivo && empresaMotivo && (
        <div
          className="emp-baja-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-motivo-title"
        >
          <div className="emp-baja-modal emp-baja-modal--info">
            <div
              className="emp-baja-modal__icon emp-baja-modal__icon--info"
              aria-hidden="true"
            >
              <FaInfoCircle />
            </div>

            <h3
              id="modal-motivo-title"
              className="emp-baja-modal__title emp-baja-modal__title--info"
            >
              Motivo de baja
            </h3>

            <p className="emp-baja-modal__body emp-baja-modal__body--scroll">
              {empresaMotivo.motivo}
            </p>

            <div className="emp-baja-modal__actions">
              <button
                className="emp-baja-btn emp-baja-btn--ghost"
                onClick={() => {
                  if (!accionando) {
                    setMostrarMotivo(false);
                    setEmpresaMotivo(null);
                  }
                }}
                disabled={accionando}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra inferior móvil con botón Volver */}
      <div className="emp-baja-navbar-mobile">
        <button
          className="emp-baja-boton-volver"
          onClick={() => navigate("/GestionarEmpresas")}
        >
          ← Volver
        </button>
      </div>
    </div>
  );
};

export default EmpresasBaja;
