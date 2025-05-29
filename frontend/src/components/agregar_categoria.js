import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

const AgregarCategoria = () => {
  const [categoria, setCategoria] = useState({
    nombre_categoria: "",
    precio_categoria: "",
  });
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCategoria({ ...categoria, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación para permitir solo una letra en el nombre de la categoría
    if (categoria.nombre_categoria.length > 1) {
      setError("El nombre de la categoría debe ser solo una letra.");
      setTimeout(() => {
        setError(null); // Ocultar el mensaje de error después de 3 segundos
      }, 3000);
      return;
    }

    setCargando(true);
    try {
      const response = await fetch("http://localhost:3001/agregar_categoria.php?action=agregar_categoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoria),
      });

      const data = await response.json();
      if (data.success) {
        setMensaje("Categoría agregada correctamente");
      } else {
        setMensaje("Error al agregar la categoría");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
      setTimeout(() => {
        setMensaje("");
        setError(null);
      }, 3000);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const isFieldFilled = (field) => {
    return field && field.length > 0;
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        {mensaje && <div style={styles.successMessage}>{mensaje}</div>}
        {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}
        <h2 style={styles.title}>Agregar Categoría</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputRow}>
            <div style={styles.inputWrapper}>
              <input
                id="nombre_categoria"
                type="text"
                name="nombre_categoria"
                value={categoria.nombre_categoria}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
                required
              />
              <label
                htmlFor="nombre_categoria"
                style={
                  isFieldFilled(categoria.nombre_categoria)
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                Nombre de la categoría
              </label>
            </div>
          </div>

          <div style={styles.inputRow}>
            <div style={styles.inputWrapper}>
              <input
                id="precio_categoria"
                type="number"
                name="precio_categoria"
                value={categoria.precio_categoria}
                onChange={handleInputChange}
                style={styles.input}
                placeholder=" "
                required
                max="10000"
                min="0"
                step="50"
              />
              <label
                htmlFor="precio_categoria"
                style={
                  isFieldFilled(categoria.precio_categoria)
                    ? { ...styles.floatingLabel, ...styles.floatingLabelActive }
                    : styles.floatingLabel
                }
              >
                Precio de la categoría
              </label>
            </div>
          </div>

          <div style={styles.buttonsContainer}>
            <button type="submit" style={styles.saveButton}>
              <FontAwesomeIcon icon={faSave} style={styles.iconSpacing} />
              Agregar Categoría
            </button>
            <button type="button" onClick={handleGoBack} style={styles.backButton}>
              <FontAwesomeIcon icon={faArrowLeft} style={styles.iconSpacing} />
              Volver Atrás
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};





const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(135deg, #dcdcdc 30%, #ff6e00 70%)",
  },
  box: {
    background: "rgba(255, 255, 255, 0.95)",
    padding: "2.5rem",
    borderRadius: "25px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    textAlign: "center",
    width: "70%",
    maxWidth: "500px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "600",
    marginBottom: "1.8rem",
    color: "#4b4b4b",
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  inputRow: {
    marginBottom: "1.5rem",
    width: "100%",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    maxWidth: "400px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    fontWeight: "400",
    backgroundColor: "transparent",
    transition: "border 0.3s ease-in-out, transform 0.2s ease-out",
  },
  floatingLabel: {
    position: "absolute",
    top: "50%",
    left: "50px",
    transform: "translateY(-50%)",
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#bbb",
    pointerEvents: "none",
    transition: "0.3s ease-in-out",
  },
  floatingLabelActive: {
    top: "0px",
    left: "50px",
    fontSize: "0.75rem",
    color: "#ff6e00",
    backgroundColor: "#fff",
    padding: "3px",
  },
  buttonsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    width: "100%",
  },
  saveButton: {
    backgroundColor: "#ff6e00",
    color: "white",
    border: "none",
    padding: "0.8rem 1.5rem",
    borderRadius: "30px",
    fontWeight: "600",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
  },
  backButton: {
    backgroundColor: "transparent",
    color: "#ff6e00",
    border: "2px solid #ff6e00",
    padding: "0.8rem 1.5rem",
    borderRadius: "30px",
    fontWeight: "600",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
  },
  iconSpacing: {
    marginRight: "10px",
  },
  successMessage: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)', // Verde claro con transparencia
    color: '#4CAF50',
    padding: '1rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    width: '98%', // Reducido para no sobrepasar los bordes del contenedor
    textAlign: 'center',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
    marginTop: '-2rem', // Subir ligeramente el mensaje
    alignSelf: 'center', // Centrar horizontalmente
    transition: 'opacity 0.3s ease', // Transición suave para el mensaje
  },
};

export default AgregarCategoria;
