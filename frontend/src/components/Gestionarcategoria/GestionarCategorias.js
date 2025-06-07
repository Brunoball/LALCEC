import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit, faTrash, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import BASE_URL from "../../config/config";
import "./GestionarCategorias.css";
import Toast from "../global/Toast";

const GestionarCategorias = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");
  const [toastTipo, setToastTipo] = useState("");

  const obtenerCategorias = () => {
    setIsLoading(true);
    fetch(`${BASE_URL}/api.php?action=obtener_categoria`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategorias(data);
        } else {
          console.error("Los datos recibidos no son un array válido.");
        }
      })
      .catch((error) => console.error("Error al obtener categorías:", error))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    obtenerCategorias();
  }, []);

  // Mostrar toast si venimos desde AgregarCategoria con éxito
  useEffect(() => {
    if (location.state?.success) {
      setToastTipo("exito");
      setToastMensaje("Categoría agregada. Cargando tabla...");
      setToastVisible(true);
      // Limpiar el estado para que no vuelva a mostrarse
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleAgregarCategoria = () => {
    navigate("/agregar_categoria");
  };

  const handleEditarCategoria = (nombreCategoria) => {
    navigate(`/editar_categoria/${encodeURIComponent(nombreCategoria)}`);
  };

  const handleEliminarCategoria = () => {
    if (!categoriaAEliminar) return;

    fetch(`${BASE_URL}/api.php?action=eliminar_categoria`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nombre_categoria: categoriaAEliminar }),
    })
      .then(async (response) => {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          if (!response.ok) {
            throw new Error(data.message || "Error de red o del servidor");
          }
          if (data.success) {
            setCategorias(
              categorias.filter(
                (categoria) => categoria.Nombre_Categoria !== categoriaAEliminar
              )
            );
            setModalOpen(false);
          } else {
            alert(data.message || "No se pudo eliminar la categoría.");
          }
        } catch (e) {
          console.error("Respuesta del servidor:", text);
          throw new Error("La respuesta no es JSON válido: " + text.substring(0, 100));
        }
      })
      .catch((error) => {
        console.error("Error al eliminar:", error);
        alert("Error al comunicarse con el servidor");
      });
  };

  return (
    <div className="gc-container">
      {toastVisible && (
        <Toast
          tipo={toastTipo}
          mensaje={toastMensaje}
          onClose={() => setToastVisible(false)}
        />
      )}

      <div className="gc-box">
        <h2 className="gc-title">Gestionar Categorías</h2>

        <div className="gc-categorias-list">
          {isLoading ? (
            <p className="gc-loading-message">Cargando categorías...</p>
          ) : categorias.length > 0 ? (
            categorias.map((categoria) => (
              <div key={categoria.Nombre_Categoria} className="gc-categoria-item hover-effect">
                <span className="gc-categoria-text">{categoria.Nombre_Categoria}</span>
                <span className="gc-categoria-price">
                  ${parseFloat(categoria.Precio_Categoria).toFixed(2)}
                </span>
                <div className="gc-categoria-actions">
                  <button
                    className="gc-edit-button"
                    onClick={() => handleEditarCategoria(categoria.Nombre_Categoria)}
                    title="Editar categoría"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    className="gc-delete-button"
                    onClick={() => {
                      setCategoriaAEliminar(categoria.Nombre_Categoria);
                      setModalOpen(true);
                    }}
                    title="Eliminar categoría"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="gc-empty-message">No hay categorías disponibles.</p>
          )}
        </div>

        <div className="gc-contenedor-button">
          <button className="gc-button hover-effect" onClick={handleAgregarCategoria}>
            <FontAwesomeIcon icon={faPlus} className="gc-icon-button" />
            Agregar Categoría
          </button>
          <button className="gc-button-back hover-effect" onClick={() => navigate(-1)}>
            <FontAwesomeIcon icon={faArrowLeft} className="gc-icon-button" />
            Volver Atrás
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="gc-modal">
          <div className="gc-modal-content">
            <h3 className="gc-modal-title">¿Eliminar categoría?</h3>
            <p className="gc-modal-text">
              ¿Estás seguro de que quieres eliminar la categoría <strong>{categoriaAEliminar}</strong>?
            </p>
            <div className="gc-modal-buttons">
              <button
                className="gc-modal-button gc-cancel-button hover-effect"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="gc-modal-button gc-accept-button hover-effect"
                onClick={handleEliminarCategoria}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionarCategorias;
