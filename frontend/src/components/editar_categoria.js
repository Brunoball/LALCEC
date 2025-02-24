import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useParams, useNavigate } from "react-router-dom";

const EditarCategoria = () => {
  const { nombre_categoria } = useParams();
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const obtenerCategoria = async () => {
      try {
        setCargando(true);
        setError(null);

        const response = await fetch(
          `http://localhost:3001/editar_categoria.php?action=editar_categoria&nombre_categoria=${encodeURIComponent(nombre_categoria)}`
        );

        if (!response.ok) {
          throw new Error("La respuesta de la API no es válida");
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setCategoria(data.data);
        setNombre(data.data.Nombre_Categoria);
        setPrecio(data.data.Precio_Categoria);
      } catch (error) {
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
  
    try {
      const response = await fetch("http://localhost:3001/editar_categoria.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre_categoria: nombre_categoria,
          nombre: nombre,
          precio: precio,
        }),
      });
  
      const data = await response.json();
      if (data.success) {
        setMensaje("Categoría actualizada correctamente");
      } else {
        setMensaje("Error al actualizar la categoría");
      }

      setTimeout(() => {
        setMensaje("");
      }, 3000);
    } catch (error) {
      setMensaje("Hubo un error: " + error.message);
      setTimeout(() => {
        setMensaje("");
      }, 5000);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const isFieldFilled = (field) => {
    return field && field.length > 0;
  };

  if (cargando) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.loader}></div>
        <p style={styles.loadingText}>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  if (!categoria) {
    return <p>No se encontró la categoría.</p>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        {mensaje && <div style={styles.successMessage}>{mensaje}</div>}
        <h2 style={styles.title}>Editar Categoría</h2>
        <form onSubmit={guardarCategoria} style={styles.form}>
          <div style={styles.inputRow}>
            <div style={styles.inputWrapper}>
              <input
                id="nombre_categoria"
                type="text"
                name="nombre_categoria"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={styles.input}
                placeholder=" "
                readOnly
              />
              <label
                htmlFor="nombre_categoria"
                style={
                  isFieldFilled(nombre)
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
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
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
                  isFieldFilled(precio)
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
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={handleGoBack}
              style={styles.backButton}
            >
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    background: 'linear-gradient(135deg, #dcdcdc 30%, #ff6e00 70%)',
  },
  box: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '2.5rem',
    borderRadius: '25px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    width: '70%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '600',
    marginBottom: '1.8rem',
    color: '#4b4b4b',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Esto asegura que todos los campos estén centrados horizontalmente
  },
  inputRow: {
    marginBottom: '1.5rem',
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    justifyContent: 'center', // Asegura que los campos de entrada estén centrados
  },
  input: {
    width: '100%', // Ajusta el ancho para asegurarse de que no se salgan
    maxWidth: '400px', // Controla el máximo ancho
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    fontWeight: '400',
    backgroundColor: 'transparent',
    transition: 'border 0.3s ease-in-out, transform 0.2s ease-out',
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
    display: 'flex',
    justifyContent: 'center', // Centra los botones
    gap: '1rem', // Espacio entre los botones
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#ff6e00',
    color: 'white',
    border: 'none',
    padding: '0.8rem 1.5rem',
    borderRadius: '30px',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
    color: '#ff6e00',
    border: '2px solid #ff6e00',
    padding: '0.8rem 1.5rem',
    borderRadius: '30px',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: '10px',
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

  // Estilos existentes
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f9f9f9', // Fondo claro para resaltar el spinner
  },
  loader: {
    border: '8px solid #f3f3f3', // Borde claro
    borderTop: '8px solid #3498db', // Borde animado
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '10px',
    fontSize: '16px',
    color: '#555',
  },
  // Agrega la animación al spinner
  '@keyframes spin': {
    from: {
      transform: 'rotate(0deg)',
    },
    to: {
      transform: 'rotate(360deg)',
    },
  },
};


export default EditarCategoria;
