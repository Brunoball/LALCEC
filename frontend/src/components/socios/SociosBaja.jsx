// src/components/socios/SociosBaja.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import { FaUserCheck, FaTrash } from "react-icons/fa";
import Toast from "../global/Toast";
import "./SociosBaja.css";

const SociosBaja = () => {
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const [socioAEliminar, setSocioAEliminar] = useState(null);
  const [mostrarEliminar, setMostrarEliminar] = useState(false);

  const [mostrarMotivo, setMostrarMotivo] = useState(false);
  const [socioMotivo, setSocioMotivo] = useState(null);

  const [toast, setToast] = useState({ show: false, tipo: "", mensaje: "" });
  const [busqueda, setBusqueda] = useState("");
  const [accionando, setAccionando] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    obtenerSociosBaja();
  }, []);

  // Cerrar modales con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (mostrarConfirmacion) {
          setMostrarConfirmacion(false);
          setSocioSeleccionado(null);
        }
        if (mostrarEliminar) {
          setMostrarEliminar(false);
          setSocioAEliminar(null);
        }
        if (mostrarMotivo) {
          setMostrarMotivo(false);
          setSocioMotivo(null);
        }
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [mostrarConfirmacion, mostrarEliminar, mostrarMotivo]);

  const obtenerSociosBaja = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=estado_socio&op=listar_baja`
      );
      const data = await response.json();
      if (response.ok && (data.exito || data.success)) {
        setSocios(Array.isArray(data.socios) ? data.socios : []);
      } else {
        throw new Error(data?.mensaje || "Error al cargar socios dados de baja");
      }
    } catch (err) {
      setToast({
        show: true,
        tipo: "error",
        mensaje: err.message || "Error de conexión al cargar socios",
      });
    } finally {
      setLoading(false);
    }
  };

  const sociosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return socios;
    return socios.filter((s) => {
      const ape = (s.apellido || "").toLowerCase();
      const nom = (s.nombre || "").toLowerCase();
      return (
        ape.includes(term) ||
        nom.includes(term) ||
        `${ape} ${nom}`.includes(term)
      );
    });
  }, [socios, busqueda]);

  const darAltaSocio = async (id) => {
    if (accionando) return;
    setAccionando(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api.php?action=estado_socio&op=dar_alta`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_socio: id }),
        }
      );
      const data = await response.json();
      if (response.ok && (data.exito || data.success)) {
        setSocios((prev) => prev.filter((s) => s.id_socio !== id));
        setMostrarConfirmacion(false);
        setSocioSeleccionado(null);
        setToast({
          show: true,
          tipo: "exito",
          mensaje: data?.mensaje || "Socio dado de alta correctamente",
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

  const eliminarSocio = async (socio) => {
    if (accionando || !socio) return;
    setAccionando(true);
    try {
      const idSoc = socio.id_socio;
      const nombre = `${socio.apellido || ""}, ${socio.nombre || ""}`.trim();

      const qs = new URLSearchParams({
        idSoc: String(idSoc),
        nombre,
      }).toString();

      const resp = await fetch(
        `${BASE_URL}/api.php?action=eliminar_socio&${qs}`,
        { method: "GET" }
      );
      const data = await resp.json();

      if (resp.ok && (data.success || data.exito)) {
        setSocios((prev) => prev.filter((s) => s.id_socio !== idSoc));
        setMostrarEliminar(false);
        setSocioAEliminar(null);
        setToast({
          show: true,
          tipo: "exito",
          mensaje:
            data?.message || data?.mensaje || "Socio eliminado correctamente",
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

  const abrirModalMotivo = (s) => {
    setSocioMotivo(s);
    setMostrarMotivo(true);
  };

  return (
    <div className="socbaj_container">
      <div className="socbaj_glass"></div>

      <div className="socbaj_barra-superior">
        <div className="socbaj_titulo-container">
          <h2 className="socbaj_titulo">Socios Dados de Baja</h2>
        </div>
        <button
          className="socbaj_boton-volver arriba"
          onClick={() => navigate("/Gestionarsocios")}
        >
          ← Volver
        </button>
      </div>

      <div className="socbaj_buscador-container">
        <input
          type="text"
          className="socbaj_buscador"
          placeholder="Buscar por apellido o nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="socbaj_buscador-icono">
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
        <p className="socbaj_cargando">Cargando socios dados de baja...</p>
      ) : (
        <div className="socbaj_tabla-container">
          <div className="socbaj_contador">
            Mostrando <strong>{sociosFiltrados.length}</strong> socios
          </div>

          <div className="socbaj_tabla-header-container">
            <div className="socbaj_tabla-header">
              <div className="socbaj_col-id">ID</div>
              <div className="socbaj_col-nombre">Apellido</div>
              <div className="socbaj_col-nombre">Nombre</div>
              <div className="socbaj_col-fecha">Fecha de baja</div>
              <div className="socbaj_col-motivo">Motivo</div>
              <div className="socbaj_col-acciones">Acciones</div>
            </div>
          </div>

          <div className="socbaj_tabla-body">
            {sociosFiltrados.length === 0 ? (
              <div className="socbaj_sin-resultados">
                <FaUserCheck className="socbaj_sin-icono" />
                No hay socios dados de baja
              </div>
            ) : (
              sociosFiltrados.map((s) => (
                <div className="socbaj_fila" key={s.id_socio}>
                  <div className="socbaj_col-id">{s.id_socio}</div>
                  <div className="socbaj_col-nombre">{s.apellido || ""}</div>
                  <div className="socbaj_col-nombre">{s.nombre || ""}</div>
                  <div className="socbaj_col-fecha">
                    {formatearFecha(s.fecha_baja)}
                  </div>

                  <div
                    className={`socbaj_col-motivo${
                      (s.motivo || "").trim() ? " socbaj_col-motivo--click" : ""
                    }`}
                    title={(s.motivo || "").trim() ? "Ver motivo completo" : ""}
                    onClick={() => {
                      if ((s.motivo || "").trim()) abrirModalMotivo(s);
                    }}
                  >
                    {s.motivo || "-"}
                  </div>

                  <div className="socbaj_col-acciones">
                    <div className="socbaj_iconos">
                      <FaUserCheck
                        title="Dar de alta"
                        className={`socbaj_icono${
                          accionando ? " socbaj_disabled" : ""
                        }`}
                        onClick={() => {
                          if (!accionando) {
                            setSocioSeleccionado(s);
                            setMostrarConfirmacion(true);
                          }
                        }}
                      />
                      <FaTrash
                        title="Eliminar definitivamente"
                        className={`socbaj_icono socbaj_icono-danger${
                          accionando ? " socbaj_disabled" : ""
                        }`}
                        onClick={() => {
                          if (!accionando) {
                            setSocioAEliminar(s);
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
      {mostrarConfirmacion && socioSeleccionado && (
        <div
          className="socbaj_modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-alta-title"
        >
          <div className="socbaj_modal socbaj_modal--success">
            <div className="socbaj_modal__icon" aria-hidden="true">
              <FaUserCheck />
            </div>

            <h3
              id="modal-alta-title"
              className="socbaj_modal__title socbaj_modal__title--success"
            >
              Reactivar socio
            </h3>

            <p className="socbaj_modal__body">
              ¿Deseás dar de alta nuevamente a{" "}
              <strong>
                {(socioSeleccionado.apellido || "") +
                  ", " +
                  (socioSeleccionado.nombre || "")}
              </strong>
              ?
            </p>

            <div className="socbaj_modal__actions">
              <button
                className="socbaj_btn socbaj_btn--ghost"
                onClick={() => {
                  if (!accionando) {
                    setMostrarConfirmacion(false);
                    setSocioSeleccionado(null);
                  }
                }}
                disabled={accionando}
              >
                Cancelar
              </button>

              <button
                className="socbaj_btn socbaj_btn--solid-success"
                onClick={() => darAltaSocio(socioSeleccionado.id_socio)}
                disabled={accionando}
              >
                {accionando ? "Procesando..." : "Sí, dar de alta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ELIMINAR */}
      {mostrarEliminar && socioAEliminar && (
        <div
          className="socbaj_modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-eliminar-title"
        >
          <div className="socbaj_modal socbaj_modal--danger">
            <div
              className="socbaj_modal__icon socbaj_modal__icon--danger"
              aria-hidden="true"
            >
              <FaTrash />
            </div>

            <h3
              id="modal-eliminar-title"
              className="socbaj_modal__title socbaj_modal__title--danger"
            >
              Eliminar permanentemente
            </h3>

            <p className="socbaj_modal__body">
              ¿Estás seguro que deseas eliminar al socio{" "}
              <strong>
                {(socioAEliminar?.apellido || "") +
                  ", " +
                  (socioAEliminar?.nombre || "")}
              </strong>
              ?
            </p>

            <div className="socbaj_modal__actions">
              <button
                className="socbaj_btn socbaj_btn--ghost"
                onClick={() => {
                  if (!accionando) {
                    setMostrarEliminar(false);
                    setSocioAEliminar(null);
                  }
                }}
                disabled={accionando}
              >
                Cancelar
              </button>

              <button
                className="socbaj_btn socbaj_btn--solid-danger"
                onClick={() => eliminarSocio(socioAEliminar)}
                disabled={accionando}
              >
                {accionando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal MOTIVO COMPLETO */}
      {mostrarMotivo && socioMotivo && (
        <div
          className="socbaj_modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-motivo-title"
        >
          <div className="socbaj_modal">
            <h3 id="modal-motivo-title" className="socbaj_modal__title">
              Motivo de baja
            </h3>
            <p className="socbaj_modal__body socbaj_modal__body--scroll">
              {socioMotivo.motivo}
            </p>
            <div className="socbaj_modal__actions">
              <button
                className="socbaj_btn socbaj_btn--ghost"
                onClick={() => {
                  if (!accionando) {
                    setMostrarMotivo(false);
                    setSocioMotivo(null);
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
      <div className="socbaj_navbar-mobile">
        <button
          className="socbaj_boton-volver "
          onClick={() => navigate("/Gestionarsocios")}
        >
          ← Volver
        </button>
      </div>
    </div>
  );
};

export default SociosBaja;
