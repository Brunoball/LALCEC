import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faEye, faEyeSlash, faUserPlus, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import logoLalcec from "../../assets/logo_lalcec.jpeg";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Importa useNavigate para la redirección
import BASE_URL from "../../config/config";

const Registro = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [confirmarContraseña, setConfirmarContraseña] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const navigate = useNavigate(); // Usa useNavigate para redireccionar

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
        `${BASE_URL}/api.php?action=register`,
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
          showMessage("El usuario ya existe. Intenta con otro.", "warning");
        } else {
          showMessage(response.data.error, "error");
        }
      } else {
        showMessage("¡Registro exitoso!", "success");
        clearFields();
      }
    } catch (error) {
      if (error.response && error.response.data.error) {
        showMessage(error.response.data.error, "error");
      } else {
        showMessage("Error al registrar el usuario. Intenta de nuevo.", "error");
      }
      console.error("Error de registro:", error);
    }
  };


  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3000);
  };

  const clearFields = () => {
    setUsuario("");
    setContraseña("");
    setConfirmarContraseña("");
  };

  // Función para redirigir a la página principal
  const handleVolverAtras = () => {
    navigate("/PaginaPrincipal");
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
          <div style={styles.buttonContainer}>
            <button
              type="submit"
              style={styles.button}
              onMouseOver={(e) => (e.target.style.transform = styles.buttonHover.transform)}
              onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
            >
              <FontAwesomeIcon icon={faUserPlus} style={{ marginRight: "8px" }} />
              Registrarse
            </button>
            <button
              type="button"
              style={styles.buttonVolver}
              onClick={handleVolverAtras}
              onMouseOver={(e) => (e.target.style.transform = styles.buttonHover.transform)}
              onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
            >
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: "8px" }} />
              Volver atrás
            </button>
          </div>
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
  buttonContainer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "2.5rem",
    marginBottom:"-15px",
  },
  button: {
    background: "linear-gradient(135deg, #007bff, #0056b3)", // Azul
    color: "white",
    padding: "1rem",
    borderRadius: "25px",
    border: "none",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    transition: "transform 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonVolver: {
    background: "linear-gradient(135deg, #ff8800, #ff6e00)", // Naranja
    color: "white",
    padding: "1rem",
    borderRadius: "25px",
    border: "none",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    transition: "transform 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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