import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "./logo_lalcec.jpeg";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [usuario, setUsuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState(""); // "exito" o "error"
  const navigate = useNavigate();
  const socket = new WebSocket("ws://localhost:3000/ws");

  // Cargar credenciales guardadas al montar el componente
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
        "http://localhost:3001/api.php?action=login",
        { usuario, contraseña }
      );

      if (response.status === 200 && response.data.message === "Inicio de sesión exitoso") {
        setMensaje("¡Inicio de sesión exitoso!");
        setMensajeTipo("exito");

        // Guardar credenciales si el checkbox está marcado
        if (rememberMe) {
          localStorage.setItem('rememberedUser', usuario);
          localStorage.setItem('rememberedPassword', contraseña);
        } else {
          // Limpiar credenciales guardadas si el checkbox no está marcado
          localStorage.removeItem('rememberedUser');
          localStorage.removeItem('rememberedPassword');
        }

        setTimeout(() => {
          navigate("/PaginaPrincipal");
        }, 2000);
      } else {
        setMensaje(response.data.error || "Usuario o contraseña incorrectos.");
        setMensajeTipo("error");
      }
    } catch (error) {
      setMensaje("Error de conexión con el servidor. Intenta de nuevo.");
      setMensajeTipo("error");
    }
  };

  // Efecto para borrar el mensaje después de 3 segundos
  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => {
        setMensaje("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.avatar}>
          <img src={logoLalcec} alt="Logo Lalcec" style={styles.avatarImage} />
        </div>
        <h2 style={styles.title}>Iniciar Sesión</h2>
        {mensaje && (
          <div style={mensajeTipo === "exito" ? styles.messageSuccess : styles.messageError}>
            {mensaje}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <FontAwesomeIcon icon={faUser} style={styles.icon} />
            <input
              type="text"
              placeholder="Usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <FontAwesomeIcon icon={faLock} style={styles.icon} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              style={styles.input}
              required
            />
            <span onClick={togglePasswordVisibility} style={{ cursor: "pointer" }}>
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} style={styles.icon} />
            </span>
          </div>
          <div style={styles.rememberMeContainer}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="rememberMe" style={styles.rememberMeLabel}>
              Recordar cuenta
            </label>
          </div>
          <button type="submit" style={styles.button}>
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(135deg, #dcdcdc 30%, #ff6e00 70%)",
  },
  box: {
    background: "rgba(255, 255, 255, 0.95)",
    padding: "2.5rem",
    borderRadius: "25px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    textAlign: "center",
    width: "350px",
  },
  avatar: {
    background: "linear-gradient(135deg, #ff8800, #ff6e00)",
    borderRadius: "50%",
    width: "100px",
    height: "100px",
    margin: "-70px auto 10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "120%",
    height: "120%",
    objectFit: "cover",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    color: "#4b4b4b",
  },
  messageSuccess: {
    backgroundColor: "#d4edda",
    color: "#155724",
    padding: "1rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "500",
    margin: "10px auto",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)",
    width: "90%",
    marginBottom: "20px"
  },
  messageError: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "1rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "500",
    margin: "10px auto",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)",
    width: "90%",
    marginBottom: "20px"
  },
  inputGroup: {
    display: "flex",
    alignItems: "center",
    background: "#f0f0f0",
    borderRadius: "12px",
    marginBottom: "1.2rem",
    padding: "0.8rem",
  },
  input: {
    border: "none",
    background: "none",
    outline: "none",
    width: "100%",
    fontSize: "1rem",
    padding: "0.5rem",
    color: "#333",
  },
  icon: {
    marginRight: "10px",
    color: "#ff8800",
    fontSize: "1.2rem",
  },
  rememberMeContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: "1rem",
    justifyContent: "flex-start",
    paddingLeft: "10px",
  },
  checkbox: {
    marginRight: "8px",
    accentColor: "#ff8800",
  },
  rememberMeLabel: {
    color: "#4b4b4b",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  button: {
    background: "linear-gradient(135deg, #ff8800, #ff6e00)",
    color: "white",
    padding: "1rem",
    borderRadius: "15px",
    width: "100%",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    border: "none",
    marginBottom: "-30px",
    marginTop: "20px",
  },
};

export default Login;