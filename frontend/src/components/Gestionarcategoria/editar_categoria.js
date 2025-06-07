import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faArrowLeft, faHistory, faTimes } from "@fortawesome/free-solid-svg-icons";
import { useParams, useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import "./EditarCategoria.css";

const EditarCategoria = () => {
  const { nombre_categoria } = useParams();
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [mensaje, setMensaje] = useState("");
  const [historicoPrecios, setHistoricoPrecios] = useState([]);
  const [showHistorico, setShowHistorico] = useState(false);

  useEffect(() => {
    const obtenerCategoria = async () => {
      try {
        setCargando(true);
        setError(null);

        const response = await fetch(
          `${BASE_URL}/api.php?action=obtener_categoria&nombre_categoria=${encodeURIComponent(nombre_categoria)}`
        );

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        let categoriaData = data.data || 
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
        setError(error.message);
      } finally {
        setCargando(false);
      }
    };

    if (nombre_categoria) {
      obtenerCategoria();
    }
  }, [nombre_categoria]);

  const guardarCategoria = async (event) => {
    event.preventDefault();

    if (!nombre || !precio) {
      setMensaje("Por favor complete todos los campos");
      setTimeout(() => setMensaje(""), 3000);
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
        setMensaje("✅ Categoría actualizada correctamente");
        setCategoria(prev => ({
          ...prev,
          Nombre_Categoria: nombre,
          Precio_Categoria: precio
        }));
      } else {
        throw new Error(data.error || "Error al actualizar la categoría");
      }
    } catch (error) {
      console.error("Error completo:", error);
      setMensaje(`❌ ${error.message}`);
    } finally {
      setTimeout(() => setMensaje(""), 5000);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const isFieldFilled = (field) => field?.length > 0;

  const HistoricoModal = () => (
    <div className={`edit-cat-modal-overlay ${showHistorico ? 'active' : ''}`} onClick={() => setShowHistorico(false)}>
      <div className="edit-cat-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="edit-cat-modal-header">
          <h3 className="edit-cat-modal-title">Histórico de Precios</h3>
          <button 
            className="edit-cat-modal-close"
            onClick={() => setShowHistorico(false)}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="edit-cat-historico-container">
          {historicoPrecios.length > 0 ? (
            <table className="edit-cat-historico-table">
              <thead>
                <tr>
                  <th className="edit-cat-table-header">Fecha</th>
                  <th className="edit-cat-table-header">Precio Anterior</th>
                  <th className="edit-cat-table-header">Precio Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {historicoPrecios.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? "edit-cat-even-row" : "edit-cat-odd-row"}>
                    <td className="edit-cat-table-cell">
                      {new Date(item.fecha_cambio).toLocaleDateString('es-AR')}
                    </td>
                    <td className="edit-cat-table-cell">${parseFloat(item.precio_anterior).toFixed(2)}</td>
                    <td className="edit-cat-table-cell">${parseFloat(item.precio_nuevo).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="edit-cat-no-history-text">No hay registros históricos</p>
          )}
        </div>
      </div>
    </div>
  );

  if (cargando) {
    return (
      <div className="edit-cat-loader-container">
        <div className="edit-cat-loader"></div>
        <p className="edit-cat-loading-text">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="edit-cat-container">
        <div className="edit-cat-box">
          <p className="edit-cat-error-text">Error: {error}</p>
          <button className="edit-cat-back-button" onClick={handleGoBack}>
            <FontAwesomeIcon icon={faArrowLeft} className="edit-cat-icon-spacing" />
            Volver Atrás
          </button>
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
            Volver Atrás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-cat-container">
      <div className="edit-cat-box">
        {mensaje && (
          <div className={mensaje.includes("Error") ? "edit-cat-error-message" : "edit-cat-success-message"}>
            {mensaje}
          </div>
        )}
        
        <h2 className="edit-cat-title">Editar Categoría</h2>
        
        <form onSubmit={guardarCategoria} className="edit-cat-form">
          <div className="edit-cat-input-row">
            <div className="edit-cat-input-wrapper">
              <input
                id="nombre_categoria"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="edit-cat-input"
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
                id="precio_categoria"
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="edit-cat-input"
                placeholder=" "
                required
                min="0"
                step="0.01"
              />
              <label
                htmlFor="precio_categoria"
                className={isFieldFilled(precio) ? "edit-cat-floating-label edit-cat-floating-label-active" : "edit-cat-floating-label"}
              >
                Precio de la categoría
              </label>
            </div>
          </div>

          <div className="edit-cat-buttons-container">
            <button type="submit" className="edit-cat-save-button">
              <FontAwesomeIcon icon={faSave} className="edit-cat-icon-spacing" />
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={handleGoBack}
              className="edit-cat-back-button"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="edit-cat-icon-spacing" />
              Volver Atrás
            </button>
          </div>
        </form>

        <button 
          className="edit-cat-view-history-button"
          onClick={() => setShowHistorico(!showHistorico)}
          disabled={historicoPrecios.length === 0}
        >
          <FontAwesomeIcon icon={faHistory} className="edit-cat-icon-spacing" />
          {showHistorico ? 'Ocultar Histórico' : 'Ver Histórico de Precios'}
        </button>

        <HistoricoModal />
      </div>
    </div>
  );
};

export default EditarCategoria;
