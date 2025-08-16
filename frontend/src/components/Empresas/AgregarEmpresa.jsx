import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmpresa((prev) => ({ ...prev, [name]: value }));
  };

  // ======== Validaciones frontend ========
  // CUIT/CUIL: 11 dígitos o XX-XXXXXXXX-X
  const isValidCuit = (val) => {
    const v = (val || "").trim();
    return /^\d{11}$/.test(v.replace(/-/g, "")) || /^\d{2}-\d{8}-\d{1}$/.test(v);
  };

  // Teléfono: solo dígitos, espacios, +, -, paréntesis
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

  // Domicilios y observación (opcionales) pero sin caracteres raros
  const isValidText = (val, max = 60) => {
    if (!val) return true;
    if (val.length > max) return false;
    return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.\s]+$/.test(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Requeridos: razón social y cuit
    if (!empresa.razon_social.trim()) {
      showToast("La Razón Social es obligatoria.", "error");
      return;
    }
    if (!isValidCuit(empresa.cuit)) {
      showToast("El CUIL/CUIT debe ser 11 dígitos o con formato XX-XXXXXXXX-X.", "error");
      return;
    }

    // Opcionales pero estrictos:
    if (!isValidPhone(empresa.telefono)) {
      showToast("El teléfono contiene caracteres inválidos o supera 20 caracteres.", "error");
      return;
    }
    if (!isValidEmail(empresa.email)) {
      showToast("El email no tiene un formato válido o supera 60 caracteres.", "error");
      return;
    }
    if (!isValidText(empresa.domicilio, 40)) {
      showToast("Domicilio inválido (solo letras, números, puntos y espacios; máx. 40).", "error");
      return;
    }
    if (!isValidText(empresa.domicilio_2, 40)) {
      showToast("Domicilio de cobro inválido (solo letras, números, puntos y espacios; máx. 40).", "error");
      return;
    }
    if (!isValidText(empresa.observacion, 60)) {
      showToast("Observación inválida (solo letras, números, puntos y espacios; máx. 60).", "error");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=agregar_empresa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empresa),
      });

      const data = await response.json();

      if (data.success_message) {
        // 🔔 FORZAMOS EL CHECK VERDE: tipo "exito"
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
        setTimeout(() => navigate("/GestionarEmpresas"), 1200);
      } else {
        showToast(data.error_message || "Error al agregar empresa", "error");
      }
    } catch (error) {
      showToast("Error al agregar empresa: " + error.message, "error");
    }
  };

  const handleGoBack = () => navigate("/GestionarEmpresas");

  return (
    <div className="agregarempresa-container">
      <div className="agregarempresa-box">
        {toast.show && (
          <Toast
            tipo={toast.type}       
            mensaje={toast.message}
            onClose={() => setToast((prev) => ({ ...prev, show: false }))}
            duracion={3000}
          />
        )}

        <h2 className="agregarempresa-title">Agregar Empresa</h2>

        <form onSubmit={handleSubmit} className="agregarempresa-form">
          <div className="agregarempresa-input-row">
            <div className="agregarempresa-input-wrapper">
              <input
                id="razon_social"
                type="text"
                name="razon_social"
                value={empresa.razon_social}
                onChange={handleInputChange}
                className="agregarempresa-input"
                placeholder=" "
                required
              />
              <label
                htmlFor="razon_social"
                className={
                  empresa.razon_social
                    ? "agregarempresa-floating-label agregarempresa-floating-label-active"
                    : "agregarempresa-floating-label"
                }
              >
                Razón Social
              </label>
            </div>

            <div className="agregarempresa-input-wrapper">
              <input
                id="cuit"
                type="text"
                name="cuit"
                value={empresa.cuit}
                onChange={handleInputChange}
                className="agregarempresa-input"
                placeholder=" "
                required
              />
              <label
                htmlFor="cuit"
                className={
                  empresa.cuit
                    ? "agregarempresa-floating-label agregarempresa-floating-label-active"
                    : "agregarempresa-floating-label"
                }
              >
                CUIL/CUIT
              </label>
            </div>
          </div>

          <div className="agregarempresa-input-row">
            <select
              id="cond_iva"
              name="cond_iva"
              value={empresa.cond_iva}
              onChange={handleInputChange}
              className="agregarempresa-select"
            >
              <option value="">Seleccione Condición IVA (opcional)</option>
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

            <div className="agregarempresa-input-wrapper">
              <input
                id="domicilio"
                type="text"
                name="domicilio"
                value={empresa.domicilio}
                onChange={handleInputChange}
                className="agregarempresa-input"
                placeholder=" "
              />
              <label
                htmlFor="domicilio"
                className={
                  empresa.domicilio
                    ? "agregarempresa-floating-label agregarempresa-floating-label-active"
                    : "agregarempresa-floating-label"
                }
              >
                Domicilio (opcional)
              </label>
            </div>
          </div>

          <div className="agregarempresa-input-row">
            <div className="agregarempresa-input-wrapper">
              <input
                id="domicilio_2"
                type="text"
                name="domicilio_2"
                value={empresa.domicilio_2}
                onChange={handleInputChange}
                className="agregarempresa-input"
                placeholder=" "
              />
              <label
                htmlFor="domicilio_2"
                className={
                  empresa.domicilio_2
                    ? "agregarempresa-floating-label agregarempresa-floating-label-active"
                    : "agregarempresa-floating-label"
                }
              >
                Domicilio de cobro (opcional)
              </label>
            </div>

            <div className="agregarempresa-input-wrapper">
              <input
                id="observacion"
                type="text"
                name="observacion"
                value={empresa.observacion}
                onChange={handleInputChange}
                className="agregarempresa-input"
                placeholder=" "
              />
              <label
                htmlFor="observacion"
                className={
                  empresa.observacion
                    ? "agregarempresa-floating-label agregarempresa-floating-label-active"
                    : "agregarempresa-floating-label"
                }
              >
                Observación (opcional)
              </label>
            </div>
          </div>

          <div className="agregarempresa-input-row">
            <div className="agregarempresa-input-wrapper">
              <input
                id="email"
                type="email"
                name="email"
                value={empresa.email}
                onChange={handleInputChange}
                className="agregarempresa-input"
                placeholder=" "
              />
              <label
                htmlFor="email"
                className={
                  empresa.email
                    ? "agregarempresa-floating-label agregarempresa-floating-label-active"
                    : "agregarempresa-floating-label"
                }
              >
                Email (opcional)
              </label>
            </div>

            <div className="agregarempresa-input-wrapper">
              <input
                id="telefono"
                type="text"
                name="telefono"
                value={empresa.telefono}
                onChange={handleInputChange}
                className="agregarempresa-input"
                placeholder=" "
              />
              <label
                htmlFor="telefono"
                className={
                  empresa.telefono
                    ? "agregarempresa-floating-label agregarempresa-floating-label-active"
                    : "agregarempresa-floating-label"
                }
              >
                Teléfono (opcional)
              </label>
            </div>
          </div>

          <div className="agregarempresa-input-row">
            <select
              name="idMedios_Pago"
              value={empresa.idMedios_Pago}
              onChange={handleInputChange}
              className="agregarempresa-select"
            >
              <option value="">Seleccione Medio de Pago (opcional)</option>
              {mediosPago.map((medio) => (
                <option key={medio.IdMedios_pago} value={medio.IdMedios_pago}>
                  {medio.Medio_Pago}
                </option>
              ))}
            </select>

            <select
              name="idCategoria"
              value={empresa.idCategoria}
              onChange={handleInputChange}
              className="agregarempresa-select"
            >
              <option value="">Seleccione Categoría (opcional)</option>
              {categorias.map((categoria) => (
                <option key={categoria.idCategorias} value={categoria.idCategorias}>
                  {categoria.Nombre_categoria} - ${categoria.Precio_Categoria}
                </option>
              ))}
            </select>
          </div>

          <div className="agregarempresa-buttons-container">
            <button type="submit" className="agregarempresa-save-button">
              <FontAwesomeIcon icon={faSave} />
              Agregar Empresa
            </button>
            <button type="button" onClick={handleGoBack} className="agregarempresa-back-button">
              <FontAwesomeIcon icon={faArrowLeft} />
              Volver Atrás
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgregarEmpresa;
