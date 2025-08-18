// src/components/socios/AgregarSocio.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faArrowLeft,
  faArrowRight,
  faArrowLeft as faStepBack,
  faUserPlus,
  faUser,
  faIdCard,
  faEnvelope,
  faPhone,
  faHome,
  faHashtag,
  faMapMarkerAlt,
  faComment,
  faTags,
  faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';
import BASE_URL from '../../config/config';
import Toast from "../global/Toast";
import './Agregarsocio.css';

const AgregarSocio = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categorias, setCategorias] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ===== TOAST =====
  const [toast, setToast] = useState({
    visible: false,
    tipo: 'info',
    mensaje: '',
    duracion: 3500
  });
  const showToast = (tipo, mensaje, duracion = 3500) =>
    setToast({ visible: true, tipo, mensaje, duracion });
  const closeToast = () => setToast(t => ({ ...t, visible: false }));

  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [errores, setErrores] = useState({});
  const [activeField, setActiveField] = useState(null);

  // Campo crudo "Nombre y Apellido"
  const [nombreCompleto, setNombreCompleto] = useState('');

  const [socio, setSocio] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    localidad: '',
    domicilio: '',
    domicilio_2: '',
    numero: '',
    email: '',
    telefono: '',
    observacion: '',
    idCategoria: '',
    idMedios_Pago: '',
  });

  const formRef = useRef(null);
  const tipoEntidad = 'socio';

  // ===== Helpers UI =====
  const handleFocus = (fieldName) => setActiveField(fieldName);
  const handleBlur = () => setActiveField(null);

  // ===== Fetch listas =====
  useEffect(() => {
    const fetchDatos = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/api.php?action=obtener_datos`);
        const data = await response.json();
        if (data.categorias && data.mediosPago) {
          setCategorias(data.categorias);
          setMediosPago(data.mediosPago);
        } else {
          showToast('error', 'No se encontraron datos.', 4000);
        }
      } catch (error) {
        showToast('error', `Error al obtener los datos: ${error.message}`, 4500);
      } finally {
        setLoading(false);
      }
    };
    fetchDatos();
  }, []);

  // ===== Handlers =====
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const v = (name === 'email') ? value : value.toUpperCase();
    setSocio((prev) => ({ ...prev, [name]: v }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, '');
    setSocio((prev) => ({ ...prev, [name]: numericValue }));
  };

  // Campo ÚNICO: Nombre y Apellido
  const handleFullNameChange = (e) => {
    const raw = e.target.value.toUpperCase();
    setNombreCompleto(raw);
    const firstSpace = raw.indexOf(' ');
    let nombre = '', apellido = '';
    if (firstSpace >= 0) {
      nombre = raw.slice(0, firstSpace);
      apellido = raw.slice(firstSpace + 1);
    } else {
      nombre = raw;
      apellido = '';
    }
    setSocio((prev) => ({ ...prev, nombre, apellido }));
  };

  const validar = () => {
    const errs = {};
    if (!socio.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!socio.apellido.trim()) errs.apellido = 'El apellido es obligatorio';
    setErrores(errs);
    setMostrarErrores(true);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (!validar()) {
      showToast('advertencia', 'Completá nombre y apellido para continuar', 3000);
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, 3));
    setMostrarErrores(false);
  };

  const handlePrevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
    setMostrarErrores(false);
  };

  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStep < 3) handleNextStep();
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validar()) {
      showToast('advertencia', 'Revisá los campos obligatorios', 3200);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api.php?action=agregar_socio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...socio, tipoEntidad }),
      });
      const data = await response.json();

      if (data.success_message) {
        showToast('exito', data.success_message, 2000);

        // Reset form
        setSocio({
          nombre: '', apellido: '', dni: '', localidad: '',
          domicilio: '', domicilio_2: '', numero: '',
          email: '', telefono: '', observacion: '',
          idCategoria: '', idMedios_Pago: '',
        });
        setNombreCompleto('');
        setCurrentStep(1);

        // Redirigir después de un pequeño delay para que se vea el Toast
        setTimeout(() => navigate('/gestionarsocios'), 2200);
      } else {
        showToast('error', data.error_message || 'Error inesperado', 4200);
      }
    } catch (error) {
      showToast('error', `Error al agregar socio: ${error.message}`, 4500);
    } finally {
      setLoading(false);
    }
  };

  // ===== UI =====
  const ProgressSteps = () => (
    <div className="progress-steps">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`progress-step ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
          onClick={() => currentStep > step && setCurrentStep(step)}
        >
          <div className="step-number">{step}</div>
          <div className="step-label">
            {step === 1 && 'Información'}
            {step === 2 && 'Contacto y Domicilio'}
            {step === 3 && 'Cobro y Observación'}
          </div>
        </div>
      ))}
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="add-socio-container">
      <div className="add-socio-box">
        {/* Header */}
        <div className="add-header">
          <div className="add-icon-title">
            <FontAwesomeIcon icon={faUserPlus} className="add-icon" />
            <div>
              <h1>Agregar Socio</h1>
              <p>Completa los datos para registrar un nuevo socio</p>
            </div>
          </div>
          <button
            type="button"
            className="add-back-btn"
            onClick={() => window.history.back()}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Volver
          </button>
        </div>

        <ProgressSteps />

        <form
          ref={formRef}
          className="add-socio-form"
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={handleFormKeyDown}
        >
          {/* Paso 1 */}
          {currentStep === 1 && (
            <div className="add-socio-section">
              <h3 className="add-socio-section-title">Información Básica</h3>
              <div className="add-socio-section-content">
                <div
                  className={`add-socio-input-wrapper 
                    ${nombreCompleto || activeField === 'nombreCompleto' ? 'has-value' : ''} 
                    ${mostrarErrores && (errores.nombre || errores.apellido) ? 'has-error' : ''}`}
                >
                  <label className="add-socio-label">
                    <FontAwesomeIcon icon={faUser} className="input-icon" />
                    Nombre y Apellido
                  </label>
                  <input
                    name="nombreCompleto"
                    value={nombreCompleto}
                    onChange={handleFullNameChange}
                    onFocus={() => handleFocus('nombreCompleto')}
                    onBlur={handleBlur}
                    className="add-socio-input"
                  />
                  <span className="add-socio-input-highlight"></span>
                  {mostrarErrores && (errores.nombre || errores.apellido) && (
                    <span className="add-socio-error">Nombre y apellido son obligatorios</span>
                  )}
                </div>

                <div className="add-socio-group-row">
                  <div className={`add-socio-input-wrapper ${socio.dni || activeField === 'dni' ? 'has-value' : ''}`}>
                    <label className="add-socio-label">
                      <FontAwesomeIcon icon={faIdCard} className="input-icon" />
                      DNI
                    </label>
                    <input
                      name="dni"
                      value={socio.dni}
                      onChange={handleNumberChange}
                      onFocus={() => handleFocus('dni')}
                      onBlur={handleBlur}
                      className="add-socio-input"
                      inputMode="numeric"
                    />
                    <span className="add-socio-input-highlight"></span>
                  </div>

                  <div className={`add-socio-input-wrapper ${socio.localidad || activeField === 'localidad' ? 'has-value' : ''}`}>
                    <label className="add-socio-label">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
                      Localidad
                    </label>
                    <input
                      name="localidad"
                      value={socio.localidad}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('localidad')}
                      onBlur={handleBlur}
                      className="add-socio-input"
                    />
                    <span className="add-socio-input-highlight"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 2 */}
          {currentStep === 2 && (
            <div className="add-socio-section">
              <h3 className="add-socio-section-title">Contacto y Domicilio</h3>
              <div className="add-socio-section-content">
                <div className="add-socio-group-row">
                  <div className={`add-socio-input-wrapper ${socio.email || activeField === 'email' ? 'has-value' : ''}`}>
                    <label className="add-socio-label">
                      <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
                      Email
                    </label>
                    <input
                      name="email"
                      value={socio.email}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('email')}
                      onBlur={handleBlur}
                      className="add-socio-input"
                      inputMode="email"
                    />
                    <span className="add-socio-input-highlight"></span>
                  </div>

                  <div className={`add-socio-input-wrapper ${socio.telefono || activeField === 'telefono' ? 'has-value' : ''}`}>
                    <label className="add-socio-label">
                      <FontAwesomeIcon icon={faPhone} className="input-icon" />
                      Teléfono
                    </label>
                    <input
                      name="telefono"
                      value={socio.telefono}
                      onChange={handleNumberChange}
                      onFocus={() => handleFocus('telefono')}
                      onBlur={handleBlur}
                      className="add-socio-input"
                      inputMode="tel"
                    />
                    <span className="add-socio-input-highlight"></span>
                  </div>
                </div>

                <div className="add-socio-domicilio-group">
                  <div className={`add-socio-input-wrapper ${socio.domicilio || activeField === 'domicilio' ? 'has-value' : ''}`}>
                    <label className="add-socio-label">
                      <FontAwesomeIcon icon={faHome} className="input-icon" />
                      Domicilio
                    </label>
                    <input
                      name="domicilio"
                      value={socio.domicilio}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('domicilio')}
                      onBlur={handleBlur}
                      className="add-socio-input"
                    />
                    <span className="add-socio-input-highlight"></span>
                  </div>

                  <div className={`add-socio-input-wrapper ${socio.numero || activeField === 'numero' ? 'has-value' : ''}`}>
                    <label className="add-socio-label">
                      <FontAwesomeIcon icon={faHashtag} className="input-icon" />
                      Número
                    </label>
                    <input
                      name="numero"
                      value={socio.numero}
                      onChange={handleNumberChange}
                      onFocus={() => handleFocus('numero')}
                      onBlur={handleBlur}
                      className="add-socio-input"
                      inputMode="numeric"
                    />
                    <span className="add-socio-input-highlight"></span>
                  </div>
                </div>

                <div className={`add-socio-input-wrapper ${socio.domicilio_2 || activeField === 'domicilio_2' ? 'has-value' : ''}`}>
                  <label className="add-socio-label">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
                    Domicilio de Cobro
                  </label>
                  <input
                    name="domicilio_2"
                    value={socio.domicilio_2}
                    onChange={handleInputChange}
                    onFocus={() => handleFocus('domicilio_2')}
                    onBlur={handleBlur}
                    className="add-socio-input"
                  />
                  <span className="add-socio-input-highlight"></span>
                </div>
              </div>
            </div>
          )}

          {/* Paso 3 */}
          {currentStep === 3 && (
            <div className="add-socio-section">
              <h3 className="add-socio-section-title">Cobro y Observación</h3>
              <div className="add-socio-section-content">
                <div className="add-socio-group-row">
                  <div className={`add-socio-input-wrapper always-active ${socio.idMedios_Pago || activeField === 'idMedios_Pago' ? 'has-value' : ''}`}>
                    <label className="add-socio-label">
                      <FontAwesomeIcon icon={faMoneyBillWave} className="input-icon" />
                      Medio de Pago
                    </label>
                    <select
                      name="idMedios_Pago"
                      value={socio.idMedios_Pago}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('idMedios_Pago')}
                      onBlur={handleBlur}
                      className="add-socio-input"
                      disabled={loading}
                    >
                      <option value="" disabled hidden>Seleccione medio de pago</option>
                      {mediosPago.map((medio) => (
                        <option key={medio.IdMedios_pago} value={medio.IdMedios_pago}>
                          {medio.Medio_Pago}
                        </option>
                      ))}
                    </select>
                    <span className="add-socio-input-highlight"></span>
                  </div>

                  <div className={`add-socio-input-wrapper always-active ${socio.idCategoria || activeField === 'idCategoria' ? 'has-value' : ''}`}>
                    <label className="add-socio-label">
                      <FontAwesomeIcon icon={faTags} className="input-icon" />
                      Categoría
                    </label>
                    <select
                      name="idCategoria"
                      value={socio.idCategoria}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('idCategoria')}
                      onBlur={handleBlur}
                      className="add-socio-input"
                      disabled={loading}
                    >
                      <option value="" disabled hidden>Seleccione categoría</option>
                      {categorias.map((c) => (
                        <option key={c.idCategorias} value={c.idCategorias}>
                          {c.Nombre_categoria} - ${c.Precio_Categoria}
                        </option>
                      ))}
                    </select>
                    <span className="add-socio-input-highlight"></span>
                  </div>
                </div>

                <div className={`add-socio-input-wrapper ${socio.observacion || activeField === 'observacion' ? 'has-value' : ''}`}>
                  <label className="add-socio-label">
                    <FontAwesomeIcon icon={faComment} className="input-icon" />
                    Observación
                  </label>
                  <textarea
                    name="observacion"
                    value={socio.observacion}
                    onChange={handleInputChange}
                    onFocus={() => handleFocus('observacion')}
                    onBlur={handleBlur}
                    className="add-socio-textarea"
                    rows="4"
                  />
                  <span className="add-socio-input-highlight"></span>
                </div>
              </div>
            </div>
          )}

          {/* Botonera */}
          <div className="add-socio-buttons-container">
            {currentStep > 1 && (
              <button
                type="button"
                className="add-socio-button back-btn"
                onClick={handlePrevStep}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faStepBack} />
                Atrás
              </button>
            )}
            {currentStep < 3 ? (
              <button
                type="button"
                className="add-socio-button next-btn"
                onClick={handleNextStep}
                disabled={loading}
              >
                Siguiente
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            ) : (
              <button
                type="button"
                className="add-socio-button save-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faSave} />
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </form>
      </div>

      {toast.visible && (
        <Toast
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          duracion={toast.duracion}
          onClose={closeToast}
        />
      )}
    </div>
  );
};

export default AgregarSocio;
