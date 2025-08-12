import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import BASE_URL from '../../config/config';
import Toast from '../global/Toast';
import './EditarSocio.css';

const EditarSocio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [nombreInput, setNombreInput] = useState('');
  const [apellidoInput, setApellidoInput] = useState('');
  const [fechaUnion, setFechaUnion] = useState('');
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message, type) => {
    setToast({
      show: true,
      message,
      type
    });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const obtenerSocio = async () => {
    try {
      setCargando(true);
      const response = await fetch(
        `${BASE_URL}/api.php?action=obtener_socio&id=${id}`
      );

      if (!response.ok) {
        throw new Error('La respuesta de la API no es válida');
      }

      const data = await response.json();
      const { categorias, mediosPago, ...socio } = data;

      if (socio) {
        setIdSocios(socio.idSocios || id);
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
        setFechaUnion(socio.Fechaunion || '');
      }

      setCategorias(categorias || []);
      setMediosPago(mediosPago || []);
    } catch (error) {
      showToast('Hubo un error al obtener los datos del socio: ' + error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (id) {
      obtenerSocio();
    }
  }, [id]);

  const guardarSocio = async () => {
    if (!nombreInput || !apellidoInput) {
      showToast("Los campos Nombre y Apellido son obligatorios", "error");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=editar_socio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idSocios: id,
          nombre: nombreInput,
          apellido: apellidoInput,
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
          fechaUnion: fechaUnion || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Socio actualizado correctamente', 'success');
        setTimeout(() => {
          navigate(-1);
        }, 2000);
      } else {
        showToast('Error al actualizar el socio: ' + (data.message || 'Error desconocido'), 'error');
      }
    } catch (error) {
      showToast('Error en la solicitud: ' + error.message, 'error');
    }
  };

  if (cargando) {
    return (
      <div className="edit-socio-loader-container">
        <div className="edit-socio-loader"></div>
        <p className="edit-socio-loading-text">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="edit-socio-container">
      <div className="edit-socio-box">
        {toast.show && (
          <Toast
            tipo={toast.type}
            mensaje={toast.message}
            onClose={() => setToast(prev => ({ ...prev, show: false }))}
            duracion={3000}
          />
        )}

        <h2 className="edit-socio-title">Editar Socio</h2>
        <form className="edit-socio-form">
          <div className="edit-socio-input-group">
            <div className="edit-socio-id-campo">
              <div className="edit-socio-floating-label-wrapper">
                <input
                  type="text"
                  value={idSocios || ''}
                  readOnly
                  placeholder=" "
                  className="edit-socio-input edit-socio-disabled-input"
                  id="idSocios"
                />
                <label
                  htmlFor="idSocios"
                  className={`edit-socio-floating-label ${idSocios ? 'edit-socio-floating-label-filled' : ''}`}
                >
                  ID Socio
                </label>
              </div>
            </div>

            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="nombre"
                required
              />
              <label
                htmlFor="nombre"
                className={`edit-socio-floating-label ${nombreInput ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Nombre
              </label>
            </div>
  
            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={apellidoInput}
                onChange={(e) => setApellidoInput(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="apellido"
                required
              />
              <label
                htmlFor="apellido"
                className={`edit-socio-floating-label ${apellidoInput ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Apellido
              </label>
            </div>
          </div>
  
          <div className="edit-socio-input-group">
            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="dni"
              />
              <label
                htmlFor="dni"
                className={`edit-socio-floating-label ${dni ? 'edit-socio-floating-label-filled' : ''}`}
              >
                DNI
              </label>
            </div>
  
            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="localidad"
              />
              <label
                htmlFor="localidad"
                className={`edit-socio-floating-label ${localidad ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Localidad
              </label>
            </div>

            <div className="edit-socio-floating-label-wrapper">
              <input
                type="date"
                value={fechaUnion}
                onChange={(e) => setFechaUnion(e.target.value)}
                className="edit-socio-input"
                id="fechaUnion"
              />
              <label
                htmlFor="fechaUnion"
                className={`edit-socio-floating-label ${fechaUnion ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Fecha de unión
              </label>
            </div>
          </div>

          <div className="edit-socio-input-group">
            <div className="edit-socio-floating-label-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="email"
              />
              <label
                htmlFor="email"
                className={`edit-socio-floating-label ${email ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Email
              </label>
            </div>
  
            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="telefono"
              />
              <label
                htmlFor="telefono"
                className={`edit-socio-floating-label ${telefono ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Teléfono
              </label>
            </div>
          </div>
  
          <div className="edit-socio-input-group">
            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="domicilio"
              />
              <label
                htmlFor="domicilio"
                className={`edit-socio-floating-label ${domicilio ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Domicilio
              </label>
            </div>
  
            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="numero"
              />
              <label
                htmlFor="numero"
                className={`edit-socio-floating-label ${numero ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Número
              </label>
            </div>
          </div>

          <div className="edit-socio-input-group">
            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={domicilio2}
                onChange={(e) => setDomicilio2(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="domicilio2"
              />
              <label
                htmlFor="domicilio2"
                className={`edit-socio-floating-label ${domicilio2 ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Domicilio de cobro
              </label>
            </div>

            <div className="edit-socio-floating-label-wrapper">
              <input
                type="text"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder=" "
                className="edit-socio-input"
                id="observacion"
              />
              <label
                htmlFor="observacion"
                className={`edit-socio-floating-label ${observacion ? 'edit-socio-floating-label-filled' : ''}`}
              >
                Observación
              </label>
            </div>
          </div>
  
          <div className="edit-socio-input-group">
            <select
              value={medioPago || ""}
              onChange={(e) => setMedioPago(e.target.value)}
              className="edit-socio-input"
              required
            >
              <option value="" disabled>Seleccione un medio de pago</option>
              {mediosPago.map((pago) => (
                <option key={pago.IdMedios_pago} value={pago.IdMedios_pago}>
                  {pago.Medio_Pago}
                </option>
              ))}
            </select>

            <select
              value={categoria || ""}
              onChange={(e) => setCategoria(e.target.value)}
              className="edit-socio-input"
              required
            >
              <option value="" disabled>Seleccione una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.idCategorias} value={cat.idCategorias}>
                  {cat.Nombre_categoria} - ${cat.Precio_Categoria}
                </option>
              ))}
            </select>
          </div>

          <div className="edit-socio-buttons-container">
            <button 
              type="button" 
              onClick={guardarSocio} 
              className="edit-socio-button"
            >
              <FontAwesomeIcon icon={faSave} className="edit-socio-icon-button" />
              Guardar
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="edit-socio-back-button"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="edit-socio-icon-button" />
              Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarSocio;