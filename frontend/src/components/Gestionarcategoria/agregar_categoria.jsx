import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import "./AgregarCategoria.css";
import Toast from "../global/Toast";

const AgregarCategoria = () => {
  const [categoria, setCategoria] = useState({
    nombre_categoria: "",
    precio_categoria: "",
  });

  const [cargando, setCargando] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTipo, setToastTipo] = useState("");
  const [toastMensaje, setToastMensaje] = useState("");
  const [redireccionar, setRedireccionar] = useState(false);
  const navigate = useNavigate();
  const nombreInputRef = useRef(null);
  const precioInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCategoria({ ...categoria, [name]: value });
  };

  // Permite usarse como onSubmit (con event) y como onClick (sin event)
  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    if (categoria.nombre_categoria.length > 1) {
      setToastTipo("error");
      setToastMensaje("El nombre de la categoría debe ser solo una letra.");
      setToastVisible(true);
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=agregar_categoria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_categoria: categoria.nombre_categoria,
          precio_categoria: parseFloat(categoria.precio_categoria),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        setToastTipo("exito");
        setToastMensaje("Categoría agregada correctamente");
        setToastVisible(true);
        setRedireccionar(true);
        setCategoria({ nombre_categoria: "", precio_categoria: "" });

        // Quitar el foco de los inputs
        nombreInputRef.current?.blur();
        precioInputRef.current?.blur();
      } else {
        setToastTipo("error");
        setToastMensaje(data.error || "Error al agregar la categoría");
        setToastVisible(true);
      }
    } catch (error) {
      setToastTipo("error");
      setToastMensaje(error.message);
      setToastVisible(true);
    } finally {
      setCargando(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const isFieldFilled = (field) => field && field.length > 0;

  const handleToastClose = () => {
    setToastVisible(false);
    if (redireccionar && toastTipo === "exito") {
      navigate("/GestionarCategorias", { state: { success: true } });
    }
  };

  return (
    <div className="agregar-cat-container">
      {toastVisible && (
        <Toast
          tipo={toastTipo}
          mensaje={toastMensaje}
          onClose={handleToastClose}
          duracion={3000}
        />
      )}

      <div className="agregar-cat-box">
        {/* Contenido que crece y empuja los botones al fondo en mobile */}
        <div className="agregar-cat-content">
          <h2 className="agregar-cat-title">Agregar Categoría</h2>

          <form onSubmit={handleSubmit} className="agregar-cat-form">
            <div className="agregar-cat-input-row">
              <div className="agregar-cat-input-wrapper">
                <input
                  ref={nombreInputRef}
                  id="nombre_categoria"
                  type="text"
                  name="nombre_categoria"
                  value={categoria.nombre_categoria}
                  onChange={handleInputChange}
                  className="agregar-cat-input"
                  placeholder=" "
                  required
                  maxLength="1"
                />
                <label
                  htmlFor="nombre_categoria"
                  className={
                    isFieldFilled(categoria.nombre_categoria)
                      ? "agregar-cat-floating-label agregar-cat-floating-label-active"
                      : "agregar-cat-floating-label"
                  }
                >
                  Nombre de la categoría (1 letra)
                </label>
              </div>
            </div>

            <div className="agregar-cat-input-row">
              <div className="agregar-cat-input-wrapper">
                <input
                  ref={precioInputRef}
                  id="precio_categoria"
                  type="number"
                  name="precio_categoria"
                  value={categoria.precio_categoria}
                  onChange={handleInputChange}
                  className="agregar-cat-input"
                  placeholder=" "
                  required
                  min="0"
                  step="0.01"
                />
                <label
                  htmlFor="precio_categoria"
                  className={
                    isFieldFilled(categoria.precio_categoria)
                      ? "agregar-cat-floating-label agregar-cat-floating-label-active"
                      : "agregar-cat-floating-label"
                  }
                >
                  Precio de la categoría
                </label>
              </div>
            </div>

            {/* Botones (web/desktop: visibles con texto largo) */}
            <div className="agregar-cat-buttons-container">
              <button
                type="submit"
                className="agregar-cat-save-button"
                disabled={cargando}
              >
                <FontAwesomeIcon icon={faSave} className="agregar-cat-icon-spacing" />
                <span className="btn-text">{cargando ? "Agregando..." : "Agregar Categoría"}</span>
              </button>

              <button
                type="button"
                onClick={handleGoBack}
                className="agregar-cat-back-button"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="agregar-cat-icon-spacing" />
                <span className="btn-text">Volver Atrás</span>
              </button>
            </div>
          </form>
        </div>

        {/* Botones AL FONDO, DENTRO DEL CONTENEDOR (solo iconos en mobile) */}
        <div className="mobile-bottom-buttons">
          <button
            type="button"
            onClick={handleGoBack}
            className="agregar-cat-back-button"
            aria-label="Volver"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="agregar-cat-icon-spacing" />
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="agregar-cat-save-button"
            aria-label="Guardar"
            disabled={cargando}
          >
            <FontAwesomeIcon icon={faSave} className="agregar-cat-icon-spacing" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgregarCategoria;
