// src/components/Empresas/AgregarEmpresa.jsx
import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSave,
  faArrowLeft,
  faBuilding,
  faHashtag,
  faEnvelope,
  faPhone,
  faHome,
  faMapMarkerAlt,
  faComment,
  faTags,
  faMoneyBillWave,
  faFileInvoiceDollar
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import Toast from "../global/Toast";
import "./AgregarEmpresa.css";

const AgregarEmpresa = () => {
  const navigate = useNavigate();

  const [empresa, setEmpresa] = useState({
    razon_social: "",
    cuit: "",
    cond_iva: "",
    domicilio: "",
    domicilio_2: "",
    telefono: "",
    email: "",
    observacion: "",
    idCategoria: "",
    idMedios_Pago: "",
  });

  const [categorias, setCategorias] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [condicionesIVA, setCondicionesIVA] = useState([]);

  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  // UI state (igual al flujo de Socio)
  const [currentStep, setCurrentStep] = useState(1);
  const [activeField, setActiveField] = useState(null);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [errores, setErrores] = useState({});
  const formRef = useRef(null);

  // ===== Fetch listas =====
  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api.php?action=obtener_datos_empresas`);
        const data = await response.json();
        if (data.categorias && data.mediosPago && data.condicionesIVA) {
          setCategorias(data.categorias);
          setMediosPago(data.mediosPago);
          setCondicionesIVA(data.condicionesIVA);
        } else {
          showToast("No se encontraron datos.", "error");
        }
      } catch (error) {
        showToast("Error al obtener los datos: " + error.message, "error");
      }
    };
    fetchDatos();
  }, []);

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // ===== Handlers UI =====
  const handleFocus = (fieldName) => setActiveField(fieldName);
  const handleBlur = () => setActiveField(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Mantener tu comportamiento actual (sin forzar mayúsculas aquí)
    setEmpresa((prev) => ({ ...prev, [name]: value }));
  };

  // ======== Validaciones frontend (tus mismas reglas) ========
  const isValidCuit = (val) => {
    const v = (val || "").trim();
    return /^\d{11}$/.test(v.replace(/-/g, "")) || /^\d{2}-\d{8}-\d{1}$/.test(v);
  };

  const isValidPhone = (val) => {
    if (!val) return true; // opcional
    if (val.length > 20) return false;
    return /^[0-9+\-\s()]*$/.test(val);
  };

  const isValidEmail = (val) => {
    if (!val) return true; // opcional
    if (val.length > 60) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const isValidText = (val, max = 60) => {
    if (!val) return true;
    if (val.length > max) return false;
    return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.\s]+$/.test(val);
  };

  // ===== Validación de paso + global =====
  const validarPasoActual = () => {
    const errs = {};
    if (currentStep === 1) {
      if (!empresa.razon_social.trim()) errs.razon_social = "La Razón Social es obligatoria";
      if (!isValidCuit(empresa.cuit)) errs.cuit = "CUIL/CUIT inválido";
    }
    if (currentStep === 2) {
      if (!isValidPhone(empresa.telefono)) errs.telefono = "Teléfono inválido";
      if (!isValidEmail(empresa.email)) errs.email = "Email inválido";
      if (!isValidText(empresa.domicilio, 40)) errs.domicilio = "Domicilio inválido";
      if (!isValidText(empresa.domicilio_2, 40)) errs.domicilio_2 = "Domicilio cobro inválido";
    }
    if (currentStep === 3) {
      if (!isValidText(empresa.observacion, 60)) errs.observacion = "Observación inválida";
      // medios pago/categoría son opcionales (mantengo tu lógica)
    }
    setErrores(errs);
    setMostrarErrores(true);
    return Object.keys(errs).length === 0;
  };

  const validarTodo = () => {
    // Usa la misma validación final que tu submit original
    if (!empresa.razon_social.trim()) { showToast("La Razón Social es obligatoria.", "error"); return false; }
    if (!isValidCuit(empresa.cuit)) { showToast("El CUIL/CUIT debe ser 11 dígitos o con formato XX-XXXXXXXX-X.", "error"); return false; }
    if (!isValidPhone(empresa.telefono)) { showToast("El teléfono contiene caracteres inválidos o supera 20 caracteres.", "error"); return false; }
    if (!isValidEmail(empresa.email)) { showToast("El email no tiene un formato válido o supera 60 caracteres.", "error"); return false; }
    if (!isValidText(empresa.domicilio, 40)) { showToast("Domicilio inválido (solo letras, números, puntos y espacios; máx. 40).", "error"); return false; }
    if (!isValidText(empresa.domicilio_2, 40)) { showToast("Domicilio de cobro inválido (solo letras, números, puntos y espacios; máx. 40).", "error"); return false; }
    if (!isValidText(empresa.observacion, 60)) { showToast("Observación inválida (solo letras, números, puntos y espacios; máx. 60).", "error"); return false; }
    return true;
  };

  const handleNextStep = () => {
    if (!validarPasoActual()) return;
    setCurrentStep((s) => Math.min(3, s + 1));
    setMostrarErrores(false);
  };

  const handlePrevStep = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
    setMostrarErrores(false);
  };

  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentStep < 3) handleNextStep();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarTodo()) return;

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=agregar_empresa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empresa),
      });

      const data = await response.json();

      if (data.success_message) {
        showToast(data.success_message, "exito");
        setEmpresa({
          razon_social: "",
          cuit: "",
          cond_iva: "",
          domicilio: "",
          domicilio_2: "",
          telefono: "",
          email: "",
          observacion: "",
          idCategoria: "",
          idMedios_Pago: "",
        });
        setCurrentStep(1);
        setTimeout(() => navigate("/GestionarEmpresas"), 1200);
      } else {
        showToast(data.error_message || "Error al agregar empresa", "error");
      }
    } catch (error) {
      showToast("Error al agregar empresa: " + error.message, "error");
    }
  };

  const handleGoBack = () => navigate("/GestionarEmpresas");

  // ===== UI =====
  const ProgressSteps = () => (
    <div className="progress-steps">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`progress-step ${currentStep === step ? "active" : ""} ${currentStep > step ? "completed" : ""}`}
          onClick={() => currentStep > step && setCurrentStep(step)}
        >
          <div className="step-number">{step}</div>
          <div className="step-label">
            {step === 1 && "Datos de la Empresa"}
            {step === 2 && "Contacto y Domicilio"}
            {step === 3 && "Cobro e IVA"}
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

  const errorMsg = (campo, texto) =>
    mostrarErrores && errores[campo] ? (
      <span className="add-emp-error">{texto}</span>
    ) : null;

  return (
    <div className="add-emp-container">
      <div className="add-emp-box">
        {toast.show && (
          <Toast
            tipo={toast.type}
            mensaje={toast.message}
            onClose={() => setToast((prev) => ({ ...prev, show: false }))}
            duracion={3000}
          />
        )}

        {/* Header igual al de Socio */}
        <div className="add-emp-header">
          <div className="add-emp-icon-title">
            <FontAwesomeIcon icon={faBuilding} className="add-emp-icon" />
            <div>
              <h1>Agregar Empresa</h1>
              <p>Completá los datos para registrar una nueva empresa</p>
            </div>
          </div>

          <button
            type="button"
            className="add-emp-back-btn"
            onClick={handleGoBack}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Volver
          </button>
        </div>

        <ProgressSteps />

        <form
          ref={formRef}
          className="add-emp-form"
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={handleFormKeyDown}
        >
          {/* Paso 1: Datos Empresa */}
          {currentStep === 1 && (
            <div className="add-emp-section">
              <h3 className="add-emp-section-title">Datos de la Empresa</h3>
              <div className="add-emp-section-content">
                <div
                  className={`add-emp-input-wrapper ${empresa.razon_social || activeField === "razon_social" ? "has-value" : ""}`}
                >
                  <label className="add-emp-label">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} className="input-icon" />
                    Razón Social
                  </label>
                  <input
                    name="razon_social"
                    value={empresa.razon_social}
                    onChange={handleInputChange}
                    onFocus={() => handleFocus("razon_social")}
                    onBlur={handleBlur}
                    className="add-emp-input"
                  />
                  <span className="add-emp-input-highlight"></span>
                  {errorMsg("razon_social", "La Razón Social es obligatoria")}
                </div>

                <div className="add-emp-group-row">
                  <div
                    className={`add-emp-input-wrapper ${empresa.cuit || activeField === "cuit" ? "has-value" : ""}`}
                  >
                    <label className="add-emp-label">
                      <FontAwesomeIcon icon={faHashtag} className="input-icon" />
                      CUIL/CUIT
                    </label>
                    <input
                      name="cuit"
                      value={empresa.cuit}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus("cuit")}
                      onBlur={handleBlur}
                      className="add-emp-input"
                    />
                    <span className="add-emp-input-highlight"></span>
                    {errorMsg("cuit", "El CUIL/CUIT es inválido")}
                  </div>

                  <div
                    className={`add-emp-input-wrapper always-active ${empresa.cond_iva || activeField === "cond_iva" ? "has-value" : ""}`}
                  >
                    <label className="add-emp-label">
                      <FontAwesomeIcon icon={faTags} className="input-icon" />
                      Condición IVA (opcional)
                    </label>
                    <select
                      name="cond_iva"
                      value={empresa.cond_iva}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus("cond_iva")}
                      onBlur={handleBlur}
                      className="add-emp-input"
                    >
                      <option value="" hidden>Seleccione Condición IVA</option>
                      {condicionesIVA.length > 0 ? (
                        condicionesIVA.map((condicion) => (
                          <option key={condicion.id_iva} value={condicion.id_iva}>
                            {condicion.descripcion}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No hay condiciones de IVA disponibles</option>
                      )}
                    </select>
                    <span className="add-emp-input-highlight"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Contacto y Domicilio */}
          {currentStep === 2 && (
            <div className="add-emp-section">
              <h3 className="add-emp-section-title">Contacto y Domicilio</h3>
              <div className="add-emp-section-content">
                <div className="add-emp-group-row">
                  <div
                    className={`add-emp-input-wrapper ${empresa.email || activeField === "email" ? "has-value" : ""}`}
                  >
                    <label className="add-emp-label">
                      <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
                      Email (opcional)
                    </label>
                    <input
                      name="email"
                      value={empresa.email}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus("email")}
                      onBlur={handleBlur}
                      className="add-emp-input"
                      inputMode="email"
                    />
                    <span className="add-emp-input-highlight"></span>
                    {errorMsg("email", "Email inválido")}
                  </div>

                  <div
                    className={`add-emp-input-wrapper ${empresa.telefono || activeField === "telefono" ? "has-value" : ""}`}
                  >
                    <label className="add-emp-label">
                      <FontAwesomeIcon icon={faPhone} className="input-icon" />
                      Teléfono (opcional)
                    </label>
                    <input
                      name="telefono"
                      value={empresa.telefono}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus("telefono")}
                      onBlur={handleBlur}
                      className="add-emp-input"
                      inputMode="tel"
                    />
                    <span className="add-emp-input-highlight"></span>
                    {errorMsg("telefono", "Teléfono inválido")}
                  </div>
                </div>

                <div className="add-emp-domicilio-group">
                  <div
                    className={`add-emp-input-wrapper ${empresa.domicilio || activeField === "domicilio" ? "has-value" : ""}`}
                  >
                    <label className="add-emp-label">
                      <FontAwesomeIcon icon={faHome} className="input-icon" />
                      Domicilio (opcional)
                    </label>
                    <input
                      name="domicilio"
                      value={empresa.domicilio}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus("domicilio")}
                      onBlur={handleBlur}
                      className="add-emp-input"
                    />
                    <span className="add-emp-input-highlight"></span>
                    {errorMsg("domicilio", "Domicilio inválido")}
                  </div>

                  <div
                    className={`add-emp-input-wrapper ${empresa.domicilio_2 || activeField === "domicilio_2" ? "has-value" : ""}`}
                  >
                    <label className="add-emp-label">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
                      Domicilio de Cobro (opcional)
                    </label>
                    <input
                      name="domicilio_2"
                      value={empresa.domicilio_2}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus("domicilio_2")}
                      onBlur={handleBlur}
                      className="add-emp-input"
                    />
                    <span className="add-emp-input-highlight"></span>
                    {errorMsg("domicilio_2", "Domicilio de cobro inválido")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Cobro e IVA */}
          {currentStep === 3 && (
            <div className="add-emp-section">
              <h3 className="add-emp-section-title">Medio de Pago, Categoría y Observación</h3>
              <div className="add-emp-section-content">
                <div className="add-emp-group-row">
                  <div
                    className={`add-emp-input-wrapper always-active ${empresa.idMedios_Pago || activeField === "idMedios_Pago" ? "has-value" : ""}`}
                  >
                    <label className="add-emp-label">
                      <FontAwesomeIcon icon={faMoneyBillWave} className="input-icon" />
                      Medio de Pago (opcional)
                    </label>
                    <select
                      name="idMedios_Pago"
                      value={empresa.idMedios_Pago}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus("idMedios_Pago")}
                      onBlur={handleBlur}
                      className="add-emp-input"
                    >
                      <option value="" hidden>Seleccione medio de pago</option>
                      {mediosPago.map((medio) => (
                        <option key={medio.IdMedios_pago} value={medio.IdMedios_pago}>
                          {medio.Medio_Pago}
                        </option>
                      ))}
                    </select>
                    <span className="add-emp-input-highlight"></span>
                  </div>

                  <div
                    className={`add-emp-input-wrapper always-active ${empresa.idCategoria || activeField === "idCategoria" ? "has-value" : ""}`}
                  >
                    <label className="add-emp-label">
                      <FontAwesomeIcon icon={faTags} className="input-icon" />
                      Categoría (opcional)
                    </label>
                    <select
                      name="idCategoria"
                      value={empresa.idCategoria}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus("idCategoria")}
                      onBlur={handleBlur}
                      className="add-emp-input"
                    >
                      <option value="" hidden>Seleccione categoría</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.idCategorias} value={categoria.idCategorias}>
                          {categoria.Nombre_categoria} - ${categoria.Precio_Categoria}
                        </option>
                      ))}
                    </select>
                    <span className="add-emp-input-highlight"></span>
                  </div>
                </div>

                <div
                  className={`add-emp-input-wrapper ${empresa.observacion || activeField === "observacion" ? "has-value" : ""}`}
                >
                  <label className="add-emp-label">
                    <FontAwesomeIcon icon={faComment} className="input-icon" />
                    Observación (opcional)
                  </label>
                  <textarea
                    name="observacion"
                    value={empresa.observacion}
                    onChange={handleInputChange}
                    onFocus={() => handleFocus("observacion")}
                    onBlur={handleBlur}
                    className="add-emp-textarea"
                    rows="4"
                  />
                  <span className="add-emp-input-highlight"></span>
                  {errorMsg("observacion", "Observación inválida")}
                </div>
              </div>
            </div>
          )}

          {/* Botonera */}
          <div className="add-emp-buttons-container">
            {currentStep > 1 && (
              <button
                type="button"
                className="add-emp-button prev-step"
                onClick={handlePrevStep}
                data-mobile-label="Volver"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="add-emp-icon-button" />
                <span className="add-emp-button-text">Anterior</span>
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                className="add-emp-button next-step"
                onClick={handleNextStep}
              >
                <span className="add-emp-button-text">Siguiente</span>
                {/* Reusamos el icono de guardar como “siguiente”? Mejor sin icono a la derecha. */}
              </button>
            ) : (
              <button
                type="button"
                className="add-emp-button"
                onClick={handleSubmit}
                data-mobile-label="Guardar"
              >
                <FontAwesomeIcon icon={faSave} className="add-emp-icon-button" />
                <span className="add-emp-button-text">Agregar Empresa</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgregarEmpresa;
