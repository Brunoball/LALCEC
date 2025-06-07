import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import BASE_URL from "../../config/config";

const EditarSocio = () => {
  const { id } = useParams();
  const [dni, setDni] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [domicilio2, setDomicilio2] = useState('');
  const [numero, setNumero] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [categoria, setCategoria] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [observacion, setObservacion] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [idSocios, setIdSocios] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [nombreInput, setNombreInput] = useState('');
  const [apellidoInput, setApellidoInput] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');

  const obtenerSocio = async () => {
    try {
      setCargando(true);

      const response = await fetch(
        `${BASE_URL}/api.php?action=obtener_socio&id=${encodeURIComponent(id)}`
      );

      if (!response.ok) {
        throw new Error('La respuesta de la API no es válida');
      }

      const data = await response.json();

      // Extraer datos del backend
      const { categorias, mediosPago, ...socio } = data;

      if (socio && socio.idSocios) {
        setIdSocios(socio.idSocios);
        setNombreInput(socio.nombre || '');
        setApellidoInput(socio.apellido || '');
        setDni(socio.DNI || '');
        setDomicilio(socio.domicilio || '');
        setDomicilio2(socio.domicilio_2 || '');
        setNumero(socio.numero || '');
        setLocalidad(socio.localidad || '');
        setTelefono(socio.telefono || '');
        setEmail(socio.email || '');
        setCategoria(socio.idCategoria || '');
        setMedioPago(socio.idMedios_Pago || '');
        setObservacion(socio.observacion || '');
      } else {
        setMensaje('No se encontró el socio con ese ID.');
        setTipoMensaje("error");
        setTimeout(() => setMensaje(''), 4000);
      }

      setCategorias(categorias || []);
      setMediosPago(mediosPago || []);

    } catch (error) {
      setMensaje('Hubo un error al obtener los datos del socio: ' + error.message);
      setTipoMensaje("error");
      setTimeout(() => setMensaje(''), 4000);
    } finally {
      setCargando(false);
    }
  };


  useEffect(() => {
    if (id) {
      obtenerSocio(id);
    }
  }, [id]);

  const guardarSocio = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api.php?action=editar_socio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          nombre: nombreInput || '',
          apellido: apellidoInput || '',
          dni: dni || '',
          domicilio: domicilio || '',
          domicilio_2: domicilio2 || '', 
          observacion: observacion || '',
          numero: numero || '',
          localidad: localidad || '',
          telefono: telefono || '',
          email: email || '',
          categoria: categoria || null,
          medioPago: medioPago || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar los datos del socio');
      }

      const data = await response.json();
      setMensaje(data.message);
      setTipoMensaje(data.message === "Socio actualizado correctamente" ? "success" : "error");
      setTimeout(() => setMensaje(''), 5000);
    } catch (error) {
      setMensaje('Hubo un error al guardar los datos del socio: ' + error.message);
      setTipoMensaje("error");
      setTimeout(() => setMensaje(''), 5000);
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
  
  if (error) {
    return <div>Error: {error}</div>;
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

        <h2 style={styles.title}>Editar Socio</h2>
        <form style={styles.form}>

          <div style={styles.inputGroup}>
            <div style={styles.id_campo}>
              <div style={styles.floatingLabelWrapper}>
                <input
                  type="text"
                  value={idSocios || ''}
                  readOnly
                  placeholder=" "
                  style={{ ...styles.input, backgroundColor: "#e9ecef", cursor: "not-allowed" }}
                  id="idSocios"
                />
                <label
                  htmlFor="idSocios"
                  style={{
                    ...styles.floatingLabel,
                    ...(idSocios ? styles.floatingLabelFilled : {}),
                  }}
                >
                  ID Socio
                </label>
              </div>
            </div>

            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="nombre"
              />
              <label
                htmlFor="nombre"
                style={{
                  ...styles.floatingLabel,
                  ...(nombreInput ? styles.floatingLabelFilled : {}),
                }}
              >
                Nombre
              </label>
            </div>
  
            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={apellidoInput}
                onChange={(e) => setApellidoInput(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="apellido"
              />
              <label
                htmlFor="apellido"
                style={{
                  ...styles.floatingLabel,
                  ...(apellidoInput ? styles.floatingLabelFilled : {}),
                }}
              >
                Apellido
              </label>
            </div>
          </div>
  
          <div style={styles.inputGroup}>
            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="dni"
              />
              <label
                htmlFor="dni"
                style={{
                  ...styles.floatingLabel,
                  ...(dni ? styles.floatingLabelFilled : {}),
                }}
              >
                DNI
              </label>
            </div>
  
            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="localidad"
              />
              <label
                htmlFor="localidad"
                style={{
                  ...styles.floatingLabel,
                  ...(localidad ? styles.floatingLabelFilled : {}),
                }}
              >
                Localidad
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
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="numero"
              />
              <label
                htmlFor="numero"
                style={{
                  ...styles.floatingLabel,
                  ...(numero ? styles.floatingLabelFilled : {}),
                }}
              >
                Número
              </label>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={domicilio2}
                onChange={(e) => setDomicilio2(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="domicilio2"
              />
              <label
                htmlFor="domicilio2"
                style={{
                  ...styles.floatingLabel,
                  ...(domicilio2 ? styles.floatingLabelFilled : {}),
                }}
              >
                Domicilio de cobro
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
              value={medioPago || ""}
              onChange={(e) => setMedioPago(e.target.value)}
              style={styles.input}
            >
              {medioPago === "" ? (
                <option value="" disabled>Seleccione un medio de pago</option>
              ) : null}
              {mediosPago.map((pago) => (
                <option key={pago.IdMedios_pago} value={pago.IdMedios_pago}>
                  {pago.Medio_Pago}
                </option>
              ))}
            </select>

            <select
              value={categoria || ""}
              onChange={(e) => setCategoria(e.target.value)}
              style={styles.input}
            >
              {categoria === "" ? (
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
            <button type="button" onClick={guardarSocio} style={styles.button}>
              <FontAwesomeIcon icon={faSave} style={styles.iconButton} />
              Guardar
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
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
    color: '#ff6e00',   
    color: '#0288d1',
    backgroundColor: '#fff',
    padding:'0 3px',  
    borderRadius:"5px",      
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

  /* Estilo para el mensaje de éxito */
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

  // Estilo para el mensaje de error
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

export default EditarSocio;
