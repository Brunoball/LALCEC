// src/components/socios/SociosBaja.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import { FaUserCheck } from "react-icons/fa";
import Toast from "../global/Toast";


const SociosBaja = () => {
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socioSeleccionado, setSocioSeleccionado] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [toast, setToast] = useState({ show: false, tipo: "", mensaje: "" });
  const [busqueda, setBusqueda] = useState("");
  const [accionando, setAccionando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    obtenerSociosBaja();
  }, []);

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
      const nombre = `${s.apellido || ""} ${s.nombre || ""}`.toLowerCase();
      return nombre.includes(term);
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
        // quitar de la lista local
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

  const closeToast = () => setToast({ ...toast, show: false });

  const formatearFecha = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return "-";
    const [y, m, d] = yyyy_mm_dd.split("-");
    if (!y || !m || !d) return yyyy_mm_dd;
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="soc-container-baja">
      <div className="soc-glass-effect-baja"></div>

      <div className="soc-barra-superior-baja">
        <div className="soc-titulo-container-baja">
          <h2 className="soc-titulo-baja">Socios Dados de Baja</h2>
        </div>
        <button
          className="soc-boton-volver-baja"
          onClick={() => navigate("/socios")}
        >
          ← Volver
        </button>
      </div>

      <div className="soc-buscador-container-baja">
        <input
          type="text"
          className="soc-buscador-baja"
          placeholder="Buscar por nombre o apellido..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="soc-buscador-iconos-baja">
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
        <p className="soc-cargando-baja">Cargando socios dados de baja...</p>
      ) : (
        <div className="soc-tabla-container-baja">
          <div className="soc-contador-baja">
            Mostrando <strong>{sociosFiltrados.length}</strong> socios
          </div>

          <div className="soc-tabla-header-container-baja">
            <div className="soc-tabla-header-baja">
              <div className="soc-col-id-baja">ID</div>
              <div className="soc-col-nombre-baja">Nombre</div>
              <div className="soc-col-domicilio-baja">Fecha de baja</div>
              <div className="soc-col-comentario-baja">Motivo</div>
              <div className="soc-col-acciones-baja">Acciones</div>
            </div>
          </div>

          <div className="soc-tabla-body-baja">
            {sociosFiltrados.length === 0 ? (
              <div className="soc-sin-resultados-container-baja">
                <div className="soc-sin-resultados-baja">
                  <FaUserCheck className="soc-icono-sin-resultados-baja" />
                  No hay socios dados de baja
                </div>
              </div>
            ) : (
              sociosFiltrados.map((s) => (
                <div className="soc-tabla-fila-baja" key={s.id_socio}>
                  <div className="soc-col-id-baja">{s.id_socio}</div>
                  <div className="soc-col-nombre-baja">
                    {(s.apellido || "") + ", " + (s.nombre || "")}
                  </div>
                  <div className="soc-col-domicilio-baja">
                    {formatearFecha(s.fecha_baja)}
                  </div>
                  <div className="soc-col-comentario-baja">
                    {s.motivo || "-"}
                  </div>
                  <div className="soc-col-acciones-baja">
                    <div className="soc-iconos-acciones-baja">
                      <FaUserCheck
                        title="Dar de alta"
                        className={`soc-icono-baja${
                          accionando ? " soc-icono-disabled" : ""
                        }`}
                        onClick={() => {
                          if (!accionando) {
                            setSocioSeleccionado(s);
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

      {mostrarConfirmacion && socioSeleccionado && (
        <div className="soc-modal-overlay-baja">
          <div className="soc-modal-contenido-baja">
            <h3>
              ¿Deseás dar de alta nuevamente al socio{" "}
              <strong>
                {(socioSeleccionado.apellido || "") +
                  ", " +
                  (socioSeleccionado.nombre || "")}
              </strong>
              ?
            </h3>
            <div className="soc-modal-botones-baja">
              <button
                className="soc-boton-confirmar-baja"
                onClick={() => darAltaSocio(socioSeleccionado.id_socio)}
                disabled={accionando}
              >
                {accionando ? "Procesando..." : "Sí, dar de alta"}
              </button>
              <button
                className="soc-boton-cancelar-baja"
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SociosBaja;
