import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit, faTrash, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

const GestionarCategorias = () => {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);

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
      .catch((error) => console.error("Error al obtener categorías:", error));
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

        <button style={styles.button} onClick={handleAgregarCategoria}>
          <FontAwesomeIcon icon={faPlus} style={styles.iconButton} />
          Agregar Categoría
        </button>

        <div style={styles.categoriasList}>
          {categorias.length > 0 ? (
            categorias.map((categoria) => (
              <div key={categoria.Nombre_Categoria} style={styles.categoriaItem}>
                <span style={styles.categoriaText}>{categoria.Nombre_Categoria}</span>
                <span style={styles.categoriaPrice}>${categoria.Precio_Categoria}</span>
                <div style={styles.categoriaActions}>
                  <button style={styles.iconButton} onClick={() => handleEditarCategoria(categoria.Nombre_Categoria)}>
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button style={styles.iconButton} onClick={() => {
                    setCategoriaAEliminar(categoria.Nombre_Categoria);
                    setModalOpen(true);
                  }}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No hay categorías disponibles.</p>
          )}
        </div>

        <button style={styles.buttonBack} onClick={() => navigate(-1)}>
          <FontAwesomeIcon icon={faArrowLeft} style={styles.iconButton} />
          Volver Atrás
        </button>
      </div>

      {modalOpen && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>¿Eliminar categoría?</h3>
            <p style={styles.modalText}>¿Estás seguro de que quieres eliminar esta categoría?</p>
            <div style={styles.modalButtons}>
              <button style={{ ...styles.modalButton, ...styles.cancelButton }} onClick={() => setModalOpen(false)}>Cancelar</button>
              <button style={{ ...styles.modalButton, ...styles.acceptButton }} onClick={handleEliminarCategoria}>Aceptar</button>
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
    height: "100vh",
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(135deg, #dcdcdc 30%, #ff6e00 70%)",
  },
  box: {
    background: "rgba(255, 255, 255, 0.95)",
    padding: "0.7rem 2rem",
    borderRadius: "25px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    textAlign: "center",
    width: "350px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "600",
    marginBottom: "1rem",
    color: "#4b4b4b",
  },
  button: {
    background: "#007aff", // Azul que especificaste
    color: "white",
    padding: "1rem",
    border: "none",
    borderRadius: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s ease",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "1rem",
    width: "100%",
    maxWidth: "300px",
    height: "50px",
    fontSize: "1.1rem",
  },
  
  buttonBack: {
    background: "linear-gradient(135deg, #ff8800, #ff6e00)",
    color: "white",
    padding: "1rem",
    border: "none",
    borderRadius: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s ease",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "1rem",
    width: "100%",
    maxWidth: "300px",
    height: "50px",
    fontSize: "1.1rem",
    marginBottom: "1rem",
  },
  iconButton: {
    marginRight: "10px",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  categoriasList: {
    width: "100%",
    marginTop: "1rem",
    maxHeight: "300px", // Altura máxima para la lista de categorías
    overflowY: "auto", // Hacer que se desplace solo verticalmente
  },
  categoriaItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    padding: "0.8rem",
    borderRadius: "10px",
    background: "rgba(240, 240, 240, 0.8)",
    boxShadow: "0 5px 10px rgba(0, 0, 0, 0.1)",
  },
  categoriaText: {
    fontSize: "1rem",
    fontWeight: "500",
    color: "#333",
  },
  categoriaPrice: {
    fontSize: "1rem",
    fontWeight: "500",
    color: "#666",
  },
  categoriaActions: {
    display: "flex",
    alignItems: "center",
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
    padding: "1rem",
    backdropFilter: "blur(5px)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "1.8rem",
    borderRadius: "12px",
    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
    width: "400px",
    textAlign: "center",
  },
  modalTitle: {
    fontSize: "1.5rem",
    color: "#d35400",
    fontWeight: "bold",
  },
  modalText: {
    fontSize: "1rem",
    marginBottom: "1.5rem",
    color: "#444",
  },
  modalButtons: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    padding: "0.7rem 1.5rem",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  acceptButton: {
    background: "#40c463",
    color: "white",
  },
  cancelButton: {
    background: "#d9534f",
    color: "white",
  },
};

export default GestionarCategorias;
