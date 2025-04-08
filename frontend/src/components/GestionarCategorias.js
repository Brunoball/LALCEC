import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit, faTrash, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

const GestionarCategorias = () => {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3001/api.php?action=obtener_categoria")
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
  }, []);

  const handleAgregarCategoria = () => {
    navigate("/agregar_categoria");
  };

  const handleEditarCategoria = (nombreCategoria) => {
    navigate(`/editar_categoria/${nombreCategoria}`);
  };

  const handleEliminarCategoria = () => {
    if (!categoriaAEliminar) return;
    
    fetch("http://localhost:3001/eliminar_categoria.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nombre_categoria: categoriaAEliminar }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setCategorias(categorias.filter((categoria) => categoria.Nombre_Categoria !== categoriaAEliminar));
          setModalOpen(false);
        } else {
          alert(data.message);
        }
      })
      .catch((error) => console.error("Error al eliminar:", error));
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h2 style={styles.title}>Gestionar Categorías</h2>

        <button 
          style={styles.button} 
          onClick={handleAgregarCategoria}
          className="hover-effect"
        >
          <FontAwesomeIcon icon={faPlus} style={styles.iconButton} />
          Agregar Categoría
        </button>

        <div style={styles.categoriasList}>
          {isLoading ? (
            <p>Cargando categorías...</p>
          ) : categorias.length > 0 ? (
            categorias.map((categoria) => (
              <div key={categoria.Nombre_Categoria} style={styles.categoriaItem} className="hover-effect">
                <span style={styles.categoriaText}>{categoria.Nombre_Categoria}</span>
                <span style={styles.categoriaPrice}>${parseFloat(categoria.Precio_Categoria).toFixed(2)}</span>
                <div style={styles.categoriaActions}>
                  <button 
                    style={styles.editButton} 
                    onClick={() => handleEditarCategoria(categoria.Nombre_Categoria)}
                    title="Editar categoría"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button 
                    style={styles.deleteButton} 
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
            <p style={styles.emptyMessage}>No hay categorías disponibles.</p>
          )}
        </div>

        <button 
          style={styles.buttonBack} 
          onClick={() => navigate(-1)}
          className="hover-effect"
        >
          <FontAwesomeIcon icon={faArrowLeft} style={styles.iconButton} />
          Volver Atrás
        </button>
      </div>

      {modalOpen && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>¿Eliminar categoría?</h3>
            <p style={styles.modalText}>
              ¿Estás seguro de que quieres eliminar la categoría <strong>{categoriaAEliminar}</strong>?
            </p>
            <div style={styles.modalButtons}>
              <button 
                style={{ ...styles.modalButton, ...styles.cancelButton }} 
                onClick={() => setModalOpen(false)}
                className="hover-effect"
              >
                Cancelar
              </button>
              <button 
                style={{ ...styles.modalButton, ...styles.acceptButton }} 
                onClick={handleEliminarCategoria}
                className="hover-effect"
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

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    padding: "0 40px",
    fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    background: "linear-gradient(135deg, #cccccc 30%, #ff6e00 70%)",
  },
  
  box: {
    background: "rgba(255, 255, 255, 0.98)",
    padding: "25px 30px",
    borderRadius: "20px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
    textAlign: "center",
    width: "100%",
    maxWidth: "450px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },


  title: {
    fontSize: "1.7rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    color: "#333",
  },
  button: {
    background: "#4a6bff",
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "1.5rem",
    width: "100%",
    fontSize: "1rem",
  },
  buttonBack: {
    background: "#ff6e00",
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "1rem",
    width: "100%",
    fontSize: "1rem",
  },
  iconButton: {
    marginRight: "10px",
    fontSize: "1rem",
  },
  categoriasList: {
    width: "100%",
    marginTop: "1rem",
    maxHeight: "350px",
    overflowY: "auto",
    paddingRight: "5px",
  },
  categoriaItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    padding: "12px 15px",
    borderRadius: "10px",
    background: "rgba(240, 240, 240, 0.9)",
    boxShadow: "0 3px 6px rgba(0, 0, 0, 0.1)",
    transition: "all 0.2s ease",
  },
  categoriaText: {
    fontSize: "1rem",
    fontWeight: "500",
    color: "#333",
  },
  categoriaPrice: {
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "#666",
    background: "#f0f0f0",
    padding: "3px 8px",
    borderRadius: "5px",
  },
  categoriaActions: {
    display: "flex",
    gap: "8px",
  },
  editButton: {
    background: "rgba(74, 107, 255, 0.1)",
    color: "#4a6bff",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "34px",
    height: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    background: "rgba(229, 62, 62, 0.1)",
    color: "#e53e3e",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "34px",
    height: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMessage: {
    color: "#666",
    fontSize: "1rem",
    padding: "20px 0",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
  },
  modalTitle: {
    fontSize: "1.3rem",
    color: "#333",
    fontWeight: "600",
    marginBottom: "15px",
  },
  modalText: {
    fontSize: "1rem",
    marginBottom: "25px",
    color: "#555",
    lineHeight: "1.5",
  },
  modalButtons: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    padding: "10px 15px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "0.95rem",
  },
  acceptButton: {
    background: "#e53e3e",
    color: "white",
    boxShadow: "0 3px 6px rgba(229, 62, 62, 0.2)",
  },
  cancelButton: {
    background: "#f0f0f0",
    color: "#333",
  },
};

// Estilos CSS para efectos hover
const styleElement = document.createElement('style');
styleElement.innerHTML = `
  .hover-effect {
    transition: all 0.2s ease;
  }
  .hover-effect:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
  
  /* Estilo para la barra de scroll */
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;
document.head.appendChild(styleElement);

export default GestionarCategorias;