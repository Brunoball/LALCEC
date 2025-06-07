import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import BASE_URL from "../../config/config";

const EditarEmpresa = () => {
  const { razon_social } = useParams();
  const navigate = useNavigate();
  const [idEmp, setIdEmp] = useState(null);
  const [razonSocialInput, setRazonSocialInput] = useState('');
  const [idCategorias, setIdCategorias] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [domicilio_2, setDomicilio_2] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [observacion, setObservacion] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [mediosPago, setMediosPago] = useState([]);
  const [cuit, setCuit] = useState('');
  const [condIva, setCondIva] = useState('');
  const [condicionesIva, setCondicionesIva] = useState([]);

  const obtenerEmpresa = async () => {
    try {
      setCargando(true);

      const response = await fetch(
        `${BASE_URL}/api.php?action=obtener_empresa&razon_social=${encodeURIComponent(razon_social)}`
      );

      if (!response.ok) {
        throw new Error('La respuesta de la API no es válida');
      }

      const data = await response.json();
      const { categorias, mediosPago, condicionesIva, ...empresa } = data;

      if (empresa) {
        setIdEmp(empresa.idEmp);
        setRazonSocialInput(empresa.razon_social || '');
        setDomicilio(empresa.domicilio || '');
        setDomicilio_2(empresa.domicilio_2 || '');
        setTelefono(empresa.telefono || '');
        setEmail(empresa.email || '');
        setIdCategorias(empresa.idCategorias || '');
        setObservacion(empresa.observacion || '');
        setMedioPago(empresa.idMedios_Pago || '');
        setCuit(empresa.cuit || '');
        setCondIva(empresa.id_iva || '');
      }

      setCategorias(categorias || []);
      setMediosPago(mediosPago || []);
      setCondicionesIva(condicionesIva || []);
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
    if (!razon_social) {
      setMensaje("El campo Razón Social es obligatorio");
      setTipoMensaje("error");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=editar_empresa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idEmp: idEmp,
          razon_social: razonSocialInput,
          domicilio: domicilio,
          domicilio_2: domicilio_2,
          telefono: telefono,
          email: email,
          observacion: observacion,
          idCategoria: idCategorias,
          medioPago: medioPago,
          cuit: cuit,
          id_iva: condIva,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMensaje('Empresa actualizada correctamente');
        setTipoMensaje('success');
      } else {
        setMensaje('Error al actualizar la empresa: ' + (data.message || 'Error desconocido'));
        setTipoMensaje('error');
      }

      setTimeout(() => setMensaje(''), 3000);
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
                value={domicilio_2}
                onChange={(e) => setDomicilio_2(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="domicilio_2"
              />
              <label
                htmlFor="domicilio_2"
                style={{
                  ...styles.floatingLabel,
                  ...(domicilio_2 ? styles.floatingLabelFilled : {}),
                }}
              >
                Domicilio de cobro
              </label>
            </div>
          </div>

          <div style={styles.inputGroup}>
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
          </div>

          <div style={styles.inputGroup}>
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

            <div style={styles.floatingLabelWrapper}>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder=" "
                style={styles.input}
                id="cuit"
              />
              <label
                htmlFor="cuit"
                style={{
                  ...styles.floatingLabel,
                  ...(cuit ? styles.floatingLabelFilled : {}),
                }}
              >
                CUIT
              </label>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <select
              value={condIva || ""}
              onChange={(e) => setCondIva(e.target.value)}
              style={styles.input}
            >
              <option value="" disabled>Seleccione una condición de IVA</option>
              {condicionesIva.map((cond) => (
                <option key={cond.id_iva} value={cond.id_iva}>
                  {cond.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <select
              value={medioPago || ""}
              onChange={(e) => setMedioPago(e.target.value)}
              style={styles.input}
            >
              <option value="" disabled>Seleccione un medio de pago</option>
              {mediosPago.map((pago) => (
                <option key={pago.IdMedios_pago} value={pago.IdMedios_pago}>
                  {pago.Medio_Pago}
                </option>
              ))}
            </select>

            <select
              value={idCategorias || ""}
              onChange={(e) => setIdCategorias(e.target.value)}
              style={styles.input}
            >
              <option value="" disabled>Seleccione una categoría</option>
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