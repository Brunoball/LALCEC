import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const EditarEmpresa = () => {
  const { razon_social } = useParams(); // Obtenemos el parámetro de la URL
  const navigate = useNavigate(); // Usamos useNavigate para la navegación
  const [idEmp, setIdEmp] = useState(null); // Cambiado a idEmp para coincidir con la base de datos
  const [razonSocialInput, setRazonSocialInput] = useState('');
  const [idCategorias, setIdCategorias] = useState(''); // Cambiado a idCategorias para coincidir con la base de datos
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [observacion, setObservacion] = useState('');
  const [idCategoria, setIdCategoria] = useState(null);

  const obtenerEmpresa = async () => {
    try {
      setCargando(true);
      const response = await fetch(
        `http://localhost:3001/obtener_empresa.php?razon_social=${encodeURIComponent(razon_social)}`
      );

      if (!response.ok) {
        throw new Error('La respuesta de la API no es válida');
      }

      const data = await response.json();
      const { categorias, ...empresa } = data;

      if (empresa) {
        setIdEmp(empresa.idEmp); // Cambiado a idEmp
        setRazonSocialInput(empresa.razon_social || ''); // Cambiado a razon_social
        setDomicilio(empresa.domicilio || '');
        setTelefono(empresa.telefono || '');
        setEmail(empresa.email || '');
        setIdCategorias(empresa.idCategorias || ''); // Cambiado a idCategorias
        setObservacion(empresa.observacion || '');
      }

      setCategorias(categorias || []);
    } catch (error) {
      setMensaje('Hubo un error al obtener los datos de la empresa: ' + error.message);
      setTipoMensaje('error');
      setTimeout(() => setMensaje(''), 3000);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (razon_social) {
      obtenerEmpresa();
    }
  }, [razon_social]);

  const editarEmpresa = async () => {
    if (!idCategorias) {
      setMensaje("Debes seleccionar una categoría");
      setTipoMensaje("error");
      setTimeout(() => setMensaje(""), 3000);
      return; // Detener la ejecución si no hay categoría seleccionada
    }
  
    try {
      const response = await fetch('http://localhost:3001/editar_empresa.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idEmp: idEmp,
          razon_social: razonSocialInput,
          domicilio: domicilio,
          telefono: telefono,
          email: email,
          observacion: observacion,
          idCategoria: idCategorias, // Asegúrate de que este valor no sea null
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setMensaje('Empresa actualizada correctamente');
        setTipoMensaje('success');
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setMensaje('Error al actualizar la empresa: ' + data.message);
        setTipoMensaje('error');
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch (error) {
      setMensaje('Error en la solicitud: ' + error.message);
      setTipoMensaje('error');
      setTimeout(() => setMensaje(''), 3000);
    }
  };
  

  if (cargando) {
    return (
      <div style={styles.loaderContainer}>
        <div style={styles.loader}></div>
        <p style={styles.loadingText}>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        {mensaje && (
          <div
            style={tipoMensaje === 'success' ? styles.successMessage : styles.errorMessage}
          >
            {mensaje}
          </div>
        )}

        <h2 style={styles.title}>Editar Empresa</h2>
        <form style={styles.form}>
          <div style={styles.inputGroup}>
            <div style={styles.id_campo}>
              <div style={styles.floatingLabelWrapper}>
                <input
                  type="text"
                  value={idEmp || ''}
                  readOnly
                  placeholder=" "
                  style={{ ...styles.input, backgroundColor: "#e9ecef", cursor: "not-allowed" }}
                  id="idEmp"
                />
                <label
                  htmlFor="idEmp"
                  style={{
                    ...styles.floatingLabel,
                    ...(idEmp ? styles.floatingLabelFilled : {}),
                  }}
                >
                  ID Empresa
                </label>
              </div>
            </div>

            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={razonSocialInput}
                onChange={(e) => setRazonSocialInput(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="razonSocial"
              />
              <label
                htmlFor="razonSocial"
                style={{
                  ...styles.floatingLabel,
                  ...(razonSocialInput ? styles.floatingLabelFilled : {}),
                }}
              >
                Razón Social
              </label>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="domicilio"
              />
              <label
                htmlFor="domicilio"
                style={{
                  ...styles.floatingLabel,
                  ...(domicilio ? styles.floatingLabelFilled : {}),
                }}
              >
                Domicilio
              </label>
            </div>

            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="telefono"
              />
              <label
                htmlFor="telefono"
                style={{
                  ...styles.floatingLabel,
                  ...(telefono ? styles.floatingLabelFilled : {}),
                }}
              >
                Teléfono
              </label>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.floatingLabelWrapper}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="email"
              />
              <label
                htmlFor="email"
                style={{
                  ...styles.floatingLabel,
                  ...(email ? styles.floatingLabelFilled : {}),
                }}
              >
                Email
              </label>
            </div>

            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="observacion"
              />
              <label
                htmlFor="observacion"
                style={{
                  ...styles.floatingLabel,
                  ...(observacion ? styles.floatingLabelFilled : {}),
                }}
              >
                Observación
              </label>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <select
              value={idCategorias || ""}
              onChange={(e) => setIdCategorias(e.target.value)}
              style={styles.input}
            >
              {idCategorias === "" ? (
                <option value="" disabled>Seleccione una categoría</option>
              ) : null}
              {categorias.map((cat) => (
                <option key={cat.idCategorias} value={cat.idCategorias}>
                  {cat.Nombre_categoria} - ${cat.Precio_Categoria}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.buttonsContainer}>
            <button type="button" onClick={editarEmpresa} style={styles.button}>
              <FontAwesomeIcon icon={faSave} style={styles.iconButton} />
              Guardar
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={styles.backButton}
            >
              <FontAwesomeIcon icon={faArrowLeft} style={styles.iconButton} />
              Volver
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
    background: 'linear-gradient(135deg, #dcdcdc 30%, #ff6e00 70%)',
    fontFamily: "'Poppins', sans-serif",
  },
  box: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '2.5rem',
    borderRadius: '25px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    width: '80%',
    maxWidth: '1000px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    color: '#4b4b4b',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  inputGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    borderRadius: '10px',
    border: '1px solid #ccc',
    fontSize: '1.1rem',
    boxSizing: 'border-box',
    height: '45px',
    outline: 'none',
  },
  floatingLabelWrapper: {
    position: 'relative',
    width: '100%',
  },
  floatingLabel: {
    position: 'absolute',
    top: '50%',
    left: '13px',
    fontSize: '1rem',
    color: '#888',
    pointerEvents: 'none',
    transform: 'translateY(-50%)',
    transition: '0.2s ease all',
  },
  floatingLabelFilled: {
    top: '0.07rem',
    fontSize: '0.85rem',
    color: '#0288d1',
    backgroundColor: '#fff',
    padding: '0 3px',
    borderRadius: '5px',
  },
  buttonsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: '1.5rem',
  },
  button: {
    background: 'linear-gradient(135deg, #ff8800, #ff6e00)',
    color: 'white',
    padding: '1rem',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '48%',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#0288d1',
    color: 'white',
    padding: '1rem',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '48%',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    marginRight: '0.5rem',
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
  errorMessage: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#F44336',
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
  '@keyframes spin': {
    from: {
      transform: 'rotate(0deg)',
    },
    to: {
      transform: 'rotate(360deg)',
    },
  },
};

export default EditarEmpresa;