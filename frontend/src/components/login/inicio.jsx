import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../../config/config';
import './inicio.css';
import logoRH from '../../assets/logo_lalcec.jpeg';

const Inicio = () => {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recordar, setRecordar] = useState(() => localStorage.getItem('recordarCuenta') === '1');
  const navigate = useNavigate();

  // Prefill si estaba recordado
  useEffect(() => {
    if (recordar) {
      const u = localStorage.getItem('usuarioRecordado') || '';
      const p = localStorage.getItem('passRecordada') || '';
      if (u) setNombre(u);
      if (p) setContrasena(p);
    }
  }, [recordar]);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    if (!nombre || !contrasena) {
      setMensaje('Por favor complete todos los campos');
      setCargando(false);
      return;
    }

    try {
      const respuesta = await fetch(`${BASE_URL}/api.php?action=inicio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: nombre, contraseña: contrasena })
      });

      if (!respuesta.ok) {
        const txt = await respuesta.text().catch(() => '');
        throw new Error(txt || `HTTP ${respuesta.status}`);
      }

      const data = await respuesta.json();

      if (data.exito) {
        if (data.usuario) localStorage.setItem('usuario', JSON.stringify(data.usuario));
        if (data.token) localStorage.setItem('token', data.token);

        // Persistencia del recordatorio (usuario + contraseña en texto plano)
        if (recordar) {
          localStorage.setItem('recordarCuenta', '1');
          localStorage.setItem('usuarioRecordado', nombre);
          localStorage.setItem('passRecordada', contrasena);
        } else {
          localStorage.removeItem('recordarCuenta');
          localStorage.removeItem('usuarioRecordado');
          localStorage.removeItem('passRecordada');
        }

        navigate('/panel');
      } else {
        setMensaje(data.mensaje || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setMensaje('Error del servidor. Intente más tarde.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="ini_contenedor-principal">
      <div className="ini_contenedor">
        <div className="ini_encabezado">
          <img src={logoRH} alt="Logo RH" className="ini_logo" />
          <h1 className="ini_titulo">Iniciar Sesión</h1>
          <p className="ini_subtitulo">Ingresa tus credenciales para acceder al sistema</p>
        </div>

        {mensaje && <p className="ini_mensaje">{mensaje}</p>}

        <form onSubmit={manejarEnvio} className="ini_formulario" autoComplete="on">
          <div className="ini_campo">
            <input
              type="text"
              placeholder="Usuario"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="ini_input"
              autoComplete="username"
            />
          </div>

          <div className="ini_campo ini_campo-password">
            <input
              type={showPassword ? 'text' : 'password'}
              className="ini_input"
              placeholder="Contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="ini_toggle-password"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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

          {/* Checkbox Recordar cuenta (usuario + contraseña) */}
          <div className="ini_check-row">
            <input
              id="recordar"
              type="checkbox"
              className="ini_checkbox"
              checked={recordar}
              onChange={(e) => setRecordar(e.target.checked)}
            />
            <label htmlFor="recordar" className="ini_check-label">Recordar cuenta</label>
          </div>

          <div className="ini_footer">
            <button type="submit" className="ini_boton" disabled={cargando}>
              {cargando ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inicio;
