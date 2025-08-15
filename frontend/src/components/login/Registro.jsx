// src/components/.../Registro.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import logoLalcec from "../../assets/logo_lalcec.jpeg";
import Toast from "../global/Toast";
import "./Registro.css";

const REDIRECT_DELAY_MS = 1200; // tiempo para que se vea el toast antes de navegar

const Registro = () => {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    tipo: "",
    mensaje: "",
    duracion: 3000,
  });

  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const togglePasswordVisibility = () => setShowPassword((v) => !v);
  const toggleConfirmVisibility = () => setShowConfirm((v) => !v);

  const showToast = (tipo, mensaje, duracion = 3000) =>
    setToast({ show: true, tipo, mensaje, duracion });
  const hideToast = () => setToast((t) => ({ ...t, show: false }));

  const clearFields = () => {
    setUsuario("");
    setContrasena("");
    setConfirmarContrasena("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!usuario.trim()) {
      showToast("advertencia", "Ingresá un nombre de usuario.");
      return;
    }
    if (!contrasena.trim()) {
      showToast("advertencia", "Ingresá una contraseña.");
      return;
    }
    if (contrasena !== confirmarContrasena) {
      showToast("advertencia", "Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const resp = await fetch(`${BASE_URL}/api.php?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contraseña: contrasena }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `HTTP ${resp.status}`);
      }

      const data = await resp.json();

      if (data?.error) {
        if (data.error === "Usuario ya existe") {
          showToast("advertencia", "El usuario ya existe. Intenta con otro.");
        } else {
          showToast("error", data.error || "Error inesperado.");
        }
      } else {
        showToast("exito", "¡Registro exitoso!");
        clearFields();

        // Redirección automática para volver a la página principal
        redirectTimerRef.current = setTimeout(() => {
          navigate("/PaginaPrincipal");
        }, REDIRECT_DELAY_MS);
      }
    } catch (err) {
      console.error("Error de registro:", err);
      showToast("error", "Error al registrar el usuario. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="ini_contenedor-principal">
      {/* Toast global */}
      {toast.show && (
        <Toast
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          duracion={toast.duracion}
          onClose={hideToast}
        />
      )}

      <div className="ini_contenedor">
        <div className="ini_encabezado">
          <img src={logoLalcec} alt="Logo LALCEC" className="ini_logo" />
          <h1 className="ini_titulo">Crear Cuenta</h1>
          <p className="ini_subtitulo">Completa los datos para registrarte</p>
        </div>

        <form onSubmit={handleSubmit} className="ini_formulario">
          {/* Usuario */}
          <div className="ini_campo">
            <input
              type="text"
              placeholder="Usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
              className="ini_input"
              autoComplete="username"
            />
          </div>

          {/* Contraseña */}
          <div className="ini_campo ini_campo-password">
            <input
              type={showPassword ? "text" : "password"}
              className="ini_input"
              placeholder="Contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="ini_toggle-password"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {showPassword ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </>
                )}
              </svg>
            </button>
          </div>

          {/* Confirmar contraseña */}
          <div className="ini_campo ini_campo-password">
            <input
              type={showConfirm ? "text" : "password"}
              className="ini_input"
              placeholder="Confirmar contraseña"
              value={confirmarContrasena}
              onChange={(e) => setConfirmarContrasena(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="ini_toggle-password"
              onClick={toggleConfirmVisibility}
              aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                {showConfirm ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </>
                )}
              </svg>
            </button>
          </div>

          <div className="ini_footer">
            <button type="submit" className="ini_boton" disabled={cargando}>
              {cargando ? "Registrando..." : "Registrarse"}
            </button>
            <button
              type="button"
              className="ini_boton ini_boton-secundario"
              onClick={() => navigate("/PaginaPrincipal")}
            >
              Volver atrás
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Registro;
