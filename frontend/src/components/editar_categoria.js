import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faArrowLeft, faHistory } from "@fortawesome/free-solid-svg-icons";
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
  const [historicoPrecios, setHistoricoPrecios] = useState([]);
  const [showHistorico, setShowHistorico] = useState(false);

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
        
        // Guardar el histórico si viene en la respuesta
        if (data.data.historico_precios) {
          setHistoricoPrecios(data.data.historico_precios);
        }
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
        // Actualizar los datos incluyendo el histórico
        const updatedResponse = await fetch(
          `http://localhost:3001/editar_categoria.php?action=editar_categoria&nombre_categoria=${encodeURIComponent(nombre_categoria)}`
        );
        const updatedData = await updatedResponse.json();
        if (updatedData.data.historico_precios) {
          setHistoricoPrecios(updatedData.data.historico_precios);
        }
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

        <button 
          style={styles.viewHistoryButton}
          onClick={() => setShowHistorico(true)}
          disabled={historicoPrecios.length === 0}
        >
          <FontAwesomeIcon icon={faHistory} style={styles.iconSpacing} />
          Ver Histórico de Precios
        </button>
      </div>

      {showHistorico && (
        <div style={styles.historicoModal}>
          <div style={styles.historicoContent}>
            <h3 style={styles.historicoTitle}>Histórico de Precios</h3>
            <button 
              style={styles.closeHistorico}
              onClick={() => setShowHistorico(false)}
            >
              &times;
            </button>
            
            {historicoPrecios.length > 0 ? (
              <table style={styles.historicoTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Fecha</th>
                    <th style={styles.tableHeader}>Precio Anterior</th>
                    <th style={styles.tableHeader}>Precio Nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoPrecios.map((item, index) => (
                    <tr key={index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                      <td style={styles.tableCell}>
                        {new Date(item.fecha_cambio).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={styles.tableCell}>${item.precio_anterior}</td>
                      <td style={styles.tableCell}>${item.precio_nuevo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={styles.noHistoryText}>No hay registros históricos para esta categoría</p>
            )}
          </div>
        </div>
      )}
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
    alignItems: 'center',
  },
  inputRow: {
    marginBottom: '1.5rem',
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    maxWidth: '400px',
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
    justifyContent: 'center',
    gap: '1rem',
    width: '100%',
    marginTop: '1rem',
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
  viewHistoryButton: {
    backgroundColor: 'transparent',
    color: '#4b4b4b',
    border: '1px solid #4b4b4b',
    padding: '0.6rem 1.2rem',
    borderRadius: '30px',
    fontWeight: '500',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    marginTop: '1.5rem',
  },
  iconSpacing: {
    marginRight: '10px',
  },
  successMessage: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
    padding: '1rem',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    width: '98%',
    textAlign: 'center',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
    marginTop: '-2rem',
    alignSelf: 'center',
    transition: 'opacity 0.3s ease',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f9f9f9',
  },
  loader: {
    border: '8px solid #f3f3f3',
    borderTop: '8px solid #3498db',
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
  historicoModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  historicoContent: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '15px',
    width: '80%',
    maxWidth: '700px',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
  },
  historicoTitle: {
    color: '#4b4b4b',
    marginBottom: '20px',
    textAlign: 'center',
  },
  closeHistorico: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
  },
  historicoTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#4b4b4b',
    borderBottom: '2px solid #ddd',
  },
  tableCell: {
    padding: '10px 12px',
    borderBottom: '1px solid #eee',
  },
  evenRow: {
    backgroundColor: '#f9f9f9',
  },
  oddRow: {
    backgroundColor: 'white',
  },
  noHistoryText: {
    textAlign: 'center',
    color: '#666',
    padding: '20px',
  },
};

export default EditarCategoria;