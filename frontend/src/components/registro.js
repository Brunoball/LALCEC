import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "./logo_lalcec.jpeg";
import axios from "axios";

const Registro = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [confirmarContraseña, setConfirmarContraseña] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const togglePasswordVisibility = () => {
    setShowPassword((prevShowPassword) => !prevShowPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prevShowConfirmPassword) => !prevShowConfirmPassword);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Verifica si las contraseñas coinciden
    if (contraseña !== confirmarContraseña) {
      showMessage("Las contraseñas no coinciden.", "error");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3001/api.php?action=register",
        {
          usuario: usuario,
          contraseña: contraseña,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Verifica si la respuesta contiene un error
      if (response.data.error) {
        if (response.data.error === "Usuario ya existe") {
          showMessage("El usuario ya existe. Intenta con otro.", "warning"); // Mensaje de advertencia si el usuario ya existe
        } else {
          showMessage(response.data.error, "error"); // Muestra el mensaje de error
        }
      } else {
        showMessage("¡Registro exitoso!", "success"); // Muestra el mensaje de éxito
        clearFields(); // Limpia los campos del formulario
      }
    } catch (error) {
      // Maneja errores de conexión o del servidor
      if (error.response && error.response.data.error) {
        showMessage(error.response.data.error, "error"); // Muestra el mensaje de error del servidor
      } else {
        showMessage("Error al registrar el usuario. Intenta de nuevo.", "error"); // Mensaje genérico
      }
      console.error("Error de registro:", error);
    }
  };

  // Muestra un mensaje y lo oculta después de 5 segundos
  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  };

  // Limpia los campos del formulario
  const clearFields = () => {
    setUsuario("");
    setContraseña("");
    setConfirmarContraseña("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.avatar}>
          <img src={logoLalcec} alt="Logo LALCEC" style={styles.avatarImage} />
        </div>
        <h2 style={styles.title}>Crear Cuenta</h2>
        {message && (
          <div
            style={{
              ...styles.message,
              backgroundColor:
                messageType === "success"
                  ? "#d4edda"
                  : messageType === "warning"
                  ? "#fff3cd"
                  : "#f8d7da",
              color:
                messageType === "success"
                  ? "#155724"
                  : messageType === "warning"
                  ? "#856404"
                  : "#721c24",
            }}
          >
            {message}
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
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <FontAwesomeIcon icon={faLock} style={styles.icon} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              required
              style={{ ...styles.input, marginRight: "10px" }}
            />
            <FontAwesomeIcon
              icon={showPassword ? faEyeSlash : faEye}
              style={{ ...styles.icon, cursor: "pointer" }}
              onClick={togglePasswordVisibility}
            />
          </div>
          <div style={styles.inputGroup}>
            <FontAwesomeIcon icon={faLock} style={styles.icon} />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmar Contraseña"
              value={confirmarContraseña}
              onChange={(e) => setConfirmarContraseña(e.target.value)}
              required
              style={{ ...styles.input, marginRight: "10px" }}
            />
            <FontAwesomeIcon
              icon={showConfirmPassword ? faEyeSlash : faEye}
              style={{ ...styles.icon, cursor: "pointer" }}
              onClick={toggleConfirmPasswordVisibility}
            />
          </div>
          <div style={styles.options}>
            <label>
              <a
                href="/"
                style={styles.link}
                onMouseOver={(e) => (e.target.style.color = styles.linkHover.color)}
                onMouseOut={(e) => (e.target.style.color = styles.link.color)}
              >
                ¿Ya tienes cuenta? Iniciar sesión
              </a>
            </label>
          </div>
          <button
            type="submit"
            style={styles.button}
            onMouseOver={(e) => (e.target.style.transform = styles.buttonHover.transform)}
            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
          >
            REGISTRARSE
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
    margin: "-70px auto 20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "50px",
    color: "white",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "120%",
    height: "120%",
    objectFit: "cover",
    objectPosition: "center",
    transform: "scale(1.2)",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    color: "#4b4b4b",
  },
  inputGroup: {
    display: "flex",
    alignItems: "center",
    background: "#f0f0f0",
    borderRadius: "12px",
    marginBottom: "1.2rem",
    padding: "0.8rem",
    boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.1)",
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
  options: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    fontSize: "0.85rem",
    color: "#666",
  },
  link: {
    color: "#ff8800",
    textDecoration: "none",
    cursor: "pointer",
    transition: "color 0.3s ease",
  },
  linkHover: {
    color: "#ff6e00",
  },
  button: {
    background: "linear-gradient(135deg, #ff8800, #ff6e00)",
    color: "white",
    padding: "1rem 2rem",
    borderRadius: "25px",
    border: "none",
    fontSize: "1.1rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    transition: "transform 0.3s ease",
  },
  buttonHover: {
    transform: "scale(1.05)",
  },
  message: {
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "1rem",
    fontSize: "1rem",
  },
};

export default Registro;
