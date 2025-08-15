import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faArrowLeft, faHistory, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useParams, useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import "./EditarCategoria.css";
import Toast from "../global/Toast";

const EditarCategoria = () => {
  const { nombre_categoria } = useParams();
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [historicoPrecios, setHistoricoPrecios] = useState([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const precioInputRef = useRef(null);
  
  // Estados para Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTipo, setToastTipo] = useState("");
  const [toastMensaje, setToastMensaje] = useState("");
  const [redireccionar, setRedireccionar] = useState(false);

  const mostrarToast = (tipo, mensaje, redirigir = false) => {
    setToastTipo(tipo);
    setToastMensaje(mensaje);
    setToastVisible(true);
    if (redirigir) setRedireccionar(true);

    setTimeout(() => {
      setToastVisible(false);
      if (redirigir) {
        navigate("/GestionarCategorias", { state: { success: true } });
      }
    }, 3000);
  };

  useEffect(() => {
    const obtenerCategoria = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${BASE_URL}/api.php?action=obtener_categoria&nombre_categoria=${encodeURIComponent(nombre_categoria)}`
        );

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        const categoriaData =
          data?.data ||
          (Array.isArray(data) && data.length > 0 ? data[0] : null);

        if (!categoriaData?.Nombre_Categoria) {
          throw new Error("Datos de categoría incompletos");
        }

        setCategoria(categoriaData);
        setNombre(categoriaData.Nombre_Categoria);
        setPrecio(categoriaData.Precio_Categoria);
        setHistoricoPrecios(categoriaData.historico_precios || []);
      } catch (error) {
        console.error("Error al obtener categoría:", error);
        mostrarToast("error", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (nombre_categoria) {
      obtenerCategoria();
    }
  }, [nombre_categoria]);

  // Permite usarse como onSubmit (con event) y como onClick (sin event)
  const guardarCategoria = async (event) => {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    if (!nombre || !precio) {
      mostrarToast("error", "Por favor complete todos los campos");
      return;
    }

    if (nombre.length > 1) {
      mostrarToast("error", "El nombre de la categoría debe ser solo una letra.");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=editar_categoria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idCategorias: categoria.idCategorias,
          nombre_categoria: nombre,
          precio: parseFloat(precio),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        precioInputRef.current?.blur();
        mostrarToast("exito", "Categoría actualizada correctamente", true);
      } else {
        throw new Error(data.error || "Error al actualizar la categoría");
      }
    } catch (error) {
      console.error("Error completo:", error);
      mostrarToast("error", error.message);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleToggleHistorico = () => {
    setShowHistorico(!showHistorico);
  };

  const isFieldFilled = (field) => field?.length > 0;

  const HistoricoModal = () => {
    const modalRef = useRef(null);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
        setShowHistorico(false);
        setIsClosing(false);
      }, 300);
    };

    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };

    if (!showHistorico && !isClosing) return null;

    return (
      <div 
        className={`edit-cat-modal-overlay ${showHistorico && !isClosing ? 'active' : ''}`}
        onClick={handleOutsideClick}
      >
        <div 
          ref={modalRef}
          className={`edit-cat-modal-container ${isClosing ? 'edit-cat-fadeOutDown' : 'edit-cat-fadeInUp'}`}
        >
          <div className="edit-cat-modal-header">
            <h3 className="edit-cat-modal-title">
              Histórico de Precios - Categoría {nombre}
            </h3>
            <button 
              className="edit-cat-modal-close"
              onClick={handleClose}
              aria-label="Cerrar modal"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="edit-cat-historico-container">
            {historicoPrecios.length > 0 ? (
              <div className="edit-cat-table-responsive">
                <table className="edit-cat-historico-table">
                  <thead>
                    <tr>
                      <th className="edit-cat-table-header">Fecha</th>
                      <th className="edit-cat-table-header">Precio Anterior</th>
                      <th className="edit-cat-table-header">Precio Nuevo</th>
                      <th className="edit-cat-table-header">Cambio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoPrecios.map((item, index) => {
                      const cambio = parseFloat(item.precio_nuevo) - parseFloat(item.precio_anterior);
                      const esAumento = cambio > 0;

                      const fechaSolo =
                        new Date(item.fecha_cambio).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });

                      return (
                        <tr key={index} className={index % 2 === 0 ? "edit-cat-even-row" : "edit-cat-odd-row"}>
                          <td className="edit-cat-table-cell">{fechaSolo}</td>
                          <td className="edit-cat-table-cell">
                            ${parseFloat(item.precio_anterior).toFixed(2)}
                          </td>
                          <td className="edit-cat-table-cell">
                            ${parseFloat(item.precio_nuevo).toFixed(2)}
                          </td>
                          <td className="edit-cat-table-cell" style={{ color: esAumento ? '#2E7D32' : '#C62828' }}>
                            {esAumento ? '+' : ''}{cambio.toFixed(2)} ({esAumento ? '↑' : '↓'})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="edit-cat-no-history-text">No hay registros históricos para esta categoría</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="edit-cat-container">
        <div className="edit-cat-box edit-cat-loading-box">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-input" />
          <div className="skeleton skeleton-input" />
          <div className="skeleton skeleton-button" />
        </div>
      </div>
    );
  }

  if (!categoria) {
    return (
      <div className="edit-cat-container">
        <div className="edit-cat-box">
          <p className="edit-cat-no-categoria-text">No se encontró la categoría.</p>
          <button className="edit-cat-back-button" onClick={handleGoBack}>
            <FontAwesomeIcon icon={faArrowLeft} className="edit-cat-icon-spacing" />
            <span className="btn-text">Volver Atrás</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-cat-container">
      {toastVisible && (
        <Toast
          tipo={toastTipo}
          mensaje={toastMensaje}
        />
      )}

      <div className="edit-cat-box">
        {/* Contenido que debe ocupar el espacio y empujar los botones al fondo en mobile */}
        <div className="edit-cat-content">
          <h2 className="edit-cat-title">Editar Categoría</h2>
          
          <form onSubmit={guardarCategoria} className="edit-cat-form">
            <div className="edit-cat-input-row">
              <div className="edit-cat-input-wrapper">
                <input
                  id="nombre_categoria"
                  type="text"
                  value={nombre}
                  disabled
                  onChange={(e) => setNombre(e.target.value)}
                  className="edit-cat-input edit-cat-disabled-input"
                  placeholder=" "
                  required
                />
                <label
                  htmlFor="nombre_categoria"
                  className={isFieldFilled(nombre) ? "edit-cat-floating-label edit-cat-floating-label-active" : "edit-cat-floating-label"}
                >
                  Nombre de la categoría
                </label>
              </div>
            </div>

            <div className="edit-cat-input-row">
              <div className="edit-cat-input-wrapper">
                <input
                  ref={precioInputRef}
                  id="precio_categoria"
                  type="number"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="edit-cat-input"
                  placeholder=" "
                  required
                  min="0"
                  step="50"
                />
                <label
                  htmlFor="precio_categoria"
                  className={isFieldFilled(precio) ? "edit-cat-floating-label edit-cat-floating-label-active" : "edit-cat-floating-label"}
                >
                  Precio de la categoría
                </label>
              </div>
            </div>

            {/* Botones (web/desktop: visibles con texto largo) */}
            <div className="edit-cat-buttons-container">
              <button type="submit" className="edit-cat-save-button">
                <FontAwesomeIcon icon={faSave} className="edit-cat-icon-spacing" />
                <span className="btn-text">Guardar cambios</span>
              </button>
              <button
                type="button"
                onClick={handleGoBack}
                className="edit-cat-back-button"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="edit-cat-icon-spacing" />
                <span className="btn-text">Volver Atrás</span>
              </button>
            </div>

            {/* Botón de historial (queda arriba del todo en mobile y normal en desktop) */}
            <div className="history-btn-wrapper">
              <button 
                className={`edit-cat-view-history-button ${historicoPrecios.length === 0 ? 'edit-cat-disabled' : ''}`}
                onClick={handleToggleHistorico}
                disabled={historicoPrecios.length === 0}
                type="button"
              >
                <FontAwesomeIcon icon={faHistory} className="edit-cat-icon-spacing" />
                <span className="btn-text">
                  {historicoPrecios.length > 0 ? 'Ver Histórico de Precios' : 'Sin histórico disponible'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Botones AL FONDO, DENTRO DEL CONTENEDOR (solo en mobile se ven) */}
        <div className="mobile-bottom-buttons">
          <button
            type="button"
            onClick={handleGoBack}
            className="edit-cat-back-button"
            aria-label="Volver"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="edit-cat-icon-spacing" />
          </button>

          <button 
            type="button"
            onClick={guardarCategoria}
            className="edit-cat-save-button"
            aria-label="Guardar"
          >
            <FontAwesomeIcon icon={faSave} className="edit-cat-icon-spacing" />
          </button>
        </div>
      </div>

      <HistoricoModal />
    </div>
  );
};

export default EditarCategoria;
