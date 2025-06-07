import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "../../assets/logo_lalcec.jpeg";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import BASE_URL from "../../config/config";
import "./inicio.css"; // Tu CSS personalizado
import Toast from "../global/Toast"; // Ajustá la ruta según tu estructura

const Login = () => {
  const [usuario, setUsuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState(""); // "exito" o "error"
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('rememberedUser');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedUser && savedPassword) {
      setUsuario(savedUser);
      setContraseña(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post(
        `${BASE_URL}/api.php?action=login`,
        { usuario, contraseña }
      );

      if (response.status === 200 && response.data.message === "Inicio de sesión exitoso") {
        setMensaje("¡Inicio de sesión exitoso!");
        setMensajeTipo("exito");
        setMostrarAlerta(true);

        if (rememberMe) {
          localStorage.setItem('rememberedUser', usuario);
          localStorage.setItem('rememberedPassword', contraseña);
        } else {
          localStorage.removeItem('rememberedUser');
          localStorage.removeItem('rememberedPassword');
        }

        setTimeout(() => {
          navigate("/PaginaPrincipal");
        }, 2000);
      } else {
        setMensaje(response.data.error || "Usuario o contraseña incorrectos.");
        setMensajeTipo("error");
        setMostrarAlerta(true);
      }
    } catch (error) {
      setMensaje("Error de conexión con el servidor. Intenta de nuevo.");
      setMensajeTipo("error");
      setMostrarAlerta(true);
    }
  };

  return (
    <div className="login-container">
      {mostrarAlerta && (
        <Toast
          tipo={mensajeTipo}
          mensaje={mensaje}
          onClose={() => setMostrarAlerta(false)}
        />
      )}

      <div className="login-box">
        <div className="login-avatar">
          <img src={logoLalcec} alt="Logo Lalcec" className="avatar-img" />
        </div>
        <h2 className="login-title">Iniciar Sesión</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <FontAwesomeIcon icon={faUser} className="icon" />
            <input
              type="text"
              placeholder="Usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <FontAwesomeIcon icon={faLock} className="icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              required
            />
            <span onClick={togglePasswordVisibility} className="toggle-password">
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </span>
          </div>
          <div className="remember-me">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">Recordar cuenta</label>
          </div>
          <button type="submit" className="login-btn">Iniciar sesión</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
