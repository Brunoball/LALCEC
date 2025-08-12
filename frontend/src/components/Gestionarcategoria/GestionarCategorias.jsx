import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit, faTrash, faArrowLeft, faSpinner } from "@fortawesome/free-solid-svg-icons";
import BASE_URL from "../../config/config";
import Toast from "../global/Toast";
import "./GestionarCategorias.css";

const GestionarCategorias = () => {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTipo, setToastTipo] = useState("");
  const [toastMensaje, setToastMensaje] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${BASE_URL}/api.php?action=obtener_categoria`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setCategorias(data);
        } else {
          console.error("Los datos recibidos no son un array válido.");
        }
      } catch (error) {
        console.error("Error al obtener categorías:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategorias();
  }, []);

  const handleAgregarCategoria = () => {
    navigate("/agregar_categoria");
  };

  const handleEditarCategoria = (nombreCategoria) => {
    navigate(`/editar_categoria/${nombreCategoria}`);
  };

  const handleEliminarCategoria = async () => {
    if (!categoriaAEliminar) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`${BASE_URL}/api.php?action=eliminar_categoria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre_categoria: categoriaAEliminar }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCategorias(prev => prev.filter(cat => cat.Nombre_Categoria !== categoriaAEliminar));
        setModalOpen(false);
        setToastTipo("exito");
        setToastMensaje("Categoría eliminada correctamente");
        setToastVisible(true);
      } else {
        setToastTipo("error");
        setToastMensaje(data.message || "Error al eliminar la categoría");
        setToastVisible(true);
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      setToastTipo("error");
      setToastMensaje("Error de conexión al eliminar");
      setToastVisible(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVolverAtras = () => {
    navigate("/PaginaPrincipal");
  };

  return (
    <>
      {toastVisible && (
        <Toast
          tipo={toastTipo}
          mensaje={toastMensaje}
          onClose={() => setToastVisible(false)}
          duracion={3000}
        />
      )}
      
      <div className="cat_container">
        <div className="cat_box">
          <h2 className="cat_title">Gestionar Categorías</h2>

          <button className="cat_button cat_hover-effect" onClick={handleAgregarCategoria}>
            <FontAwesomeIcon icon={faPlus} className="cat_iconButton" />
            Agregar Categoría
          </button>

          <div 
            key={categorias.length}
            className={`cat_categoriasList ${isLoading ? '' : 'cat_loaded'}`}
          >
            {isLoading ? (
              <>
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="cat_categoriaItem cat_skeleton">
                    <span className="cat_categoriaText cat_skeleton-text"></span>
                    <span className="cat_categoriaPrice cat_skeleton-text"></span>
                    <div className="cat_categoriaActions">
                      <div className="cat_skeleton-icon" />
                      <div className="cat_skeleton-icon" />
                    </div>
                  </div>
                ))}
              </>
            ) : categorias.length > 0 ? (
              categorias.map((categoria, index) => (
                <div 
                  key={categoria.Nombre_Categoria} 
                  className="cat_categoriaItem cat_hover-effect"
                  style={{
                    animation: `cat_subtleCascade 0.3s ease forwards`,
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <span className="cat_categoriaText">{categoria.Nombre_Categoria}</span>
                  <span className="cat_categoriaPrice">
                    ${parseFloat(categoria.Precio_Categoria).toFixed(2)}
                  </span>
                  <div className="cat_categoriaActions">
                    <button
                      className="cat_editButton"
                      onClick={() => handleEditarCategoria(categoria.Nombre_Categoria)}
                      title="Editar categoría"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      className="cat_deleteButton"
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
              <p className="cat_emptyMessage">No hay categorías disponibles.</p>
            )}
          </div>

          <button className="cat_buttonBack cat_hover-effect" onClick={handleVolverAtras}>
            <FontAwesomeIcon icon={faArrowLeft} className="cat_iconButton" />
            Volver Atrás
          </button>
        </div>

        {modalOpen && (
          <div className="cat_modal">
            <div className="cat_modalContent">
              <h3 className="cat_modalTitle">Confirmar Eliminación</h3>
              <p className="cat_modalText">
                ¿Estás seguro de que deseas eliminar permanentemente la categoría:<br />
                <strong>"{categoriaAEliminar}"</strong>?
              </p>
              <div className="cat_modalButtons">
                <button 
                  className="cat_modalButton cat_cancelButton cat_hover-effect" 
                  onClick={() => setModalOpen(false)}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button 
                  className="cat_modalButton cat_acceptButton cat_hover-effect" 
                  onClick={handleEliminarCategoria}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin style={{marginRight: '8px'}} />
                      Eliminando...
                    </>
                  ) : 'Confirmar Eliminación'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GestionarCategorias;