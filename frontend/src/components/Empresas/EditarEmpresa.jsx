import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import BASE_URL from "../../config/config";
import './EditarEmpresa.css';
import Toast from "../global/Toast";

const EditarEmpresa = () => {
  const { razon_social } = useParams();
  const navigate = useNavigate();
  const [idEmp, setIdEmp] = useState(null);
  const [razonSocialInput, setRazonSocialInput] = useState('');
  const [idCategorias, setIdCategorias] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [domicilio, setDomicilio] = useState('');
  const [domicilio_2, setDomicilio_2] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [observacion, setObservacion] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [mediosPago, setMediosPago] = useState([]);
  const [cuit, setCuit] = useState('');
  const [condIva, setCondIva] = useState('');
  const [condicionesIva, setCondicionesIva] = useState([]);
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success' // 'success' o 'error'
  });

  const showToast = (message, type) => {
    setToast({
      show: true,
      message,
      type
    });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const obtenerEmpresa = async () => {
    try {
      setCargando(true);

      const response = await fetch(
        `${BASE_URL}/api.php?action=obtener_empresa&razon_social=${encodeURIComponent(razon_social)}`
      );

      if (!response.ok) {
        throw new Error('La respuesta de la API no es válida');
      }

      const data = await response.json();
      const { categorias, mediosPago, condicionesIva, ...empresa } = data;

      if (empresa) {
        setIdEmp(empresa.idEmp);
        setRazonSocialInput(empresa.razon_social || '');
        setDomicilio(empresa.domicilio || '');
        setDomicilio_2(empresa.domicilio_2 || '');
        setTelefono(empresa.telefono || '');
        setEmail(empresa.email || '');
        setIdCategorias(empresa.idCategorias || '');
        setObservacion(empresa.observacion || '');
        setMedioPago(empresa.idMedios_Pago || '');
        setCuit(empresa.cuit || '');
        setCondIva(empresa.id_iva || '');
      }

      setCategorias(categorias || []);
      setMediosPago(mediosPago || []);
      setCondicionesIva(condicionesIva || []);
    } catch (error) {
      showToast('Hubo un error al obtener los datos de la empresa: ' + error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (razon_social) {
      obtenerEmpresa();
    }
  }, [razon_social]);

  const editarEmpresa = async () => {
    if (!razonSocialInput) {
      showToast("El campo Razón Social es obligatorio", "error");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=editar_empresa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idEmp: idEmp,
          razon_social: razonSocialInput,
          domicilio: domicilio,
          domicilio_2: domicilio_2,
          telefono: telefono,
          email: email,
          observacion: observacion,
          idCategoria: idCategorias,
          medioPago: medioPago,
          cuit: cuit,
          id_iva: condIva,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Empresa actualizada correctamente', 'success');
        // Redirigir después de 2 segundos
        setTimeout(() => {
          navigate('/GestionarEmpresas');
        }, 2000);
      } else {
        showToast('Error al actualizar la empresa: ' + (data.message || 'Error desconocido'), 'error');
      }
    } catch (error) {
      showToast('Error en la solicitud: ' + error.message, 'error');
    }
  };

  if (cargando) {
    return (
      <div className="edit-empresa-loader-container">
        <div className="edit-empresa-loader"></div>
        <p className="edit-empresa-loading-text">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="edit-empresa-container">
      <div className="edit-empresa-box">
        {toast.show && (
          <Toast
            tipo={toast.type}
            mensaje={toast.message}
            onClose={() => setToast(prev => ({ ...prev, show: false }))}
            duracion={3000}
          />
        )}

        <h2 className="edit-empresa-title">Editar Empresa</h2>
        <form className="edit-empresa-form">
          <div className="edit-empresa-input-group">
            <div className="edit-empresa-id-campo">
              <div className="edit-empresa-floating-label-wrapper">
                <input
                  type="text"
                  value={idEmp || ''}
                  readOnly
                  placeholder=" "
                  className="edit-empresa-input edit-empresa-disabled-input"
                  id="idEmp"
                />
                <label
                  htmlFor="idEmp"
                  className={`edit-empresa-floating-label ${idEmp ? 'edit-empresa-floating-label-filled' : ''}`}
                >
                  ID Empresa
                </label>
              </div>
            </div>

            <div className="edit-empresa-floating-label-wrapper">
              <input
                type="text"
                value={razonSocialInput}
                onChange={(e) => setRazonSocialInput(e.target.value)}
                placeholder=" "
                className="edit-empresa-input"
                id="razonSocial"
                required
              />
              <label
                htmlFor="razonSocial"
                className={`edit-empresa-floating-label ${razonSocialInput ? 'edit-empresa-floating-label-filled' : ''}`}
              >
                Razón Social
              </label>
            </div>
          </div>

          <div className="edit-empresa-input-group">
            <div className="edit-empresa-floating-label-wrapper">
              <input
                type="text"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                placeholder=" "
                className="edit-empresa-input"
                id="domicilio"
              />
              <label
                htmlFor="domicilio"
                className={`edit-empresa-floating-label ${domicilio ? 'edit-empresa-floating-label-filled' : ''}`}
              >
                Domicilio
              </label>
            </div>

            <div className="edit-empresa-floating-label-wrapper">
              <input
                type="text"
                value={domicilio_2}
                onChange={(e) => setDomicilio_2(e.target.value)}
                placeholder=" "
                className="edit-empresa-input"
                id="domicilio_2"
              />
              <label
                htmlFor="domicilio_2"
                className={`edit-empresa-floating-label ${domicilio_2 ? 'edit-empresa-floating-label-filled' : ''}`}
              >
                Domicilio de cobro
              </label>
            </div>
          </div>

          <div className="edit-empresa-input-group">
            <div className="edit-empresa-floating-label-wrapper">
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder=" "
                className="edit-empresa-input"
                id="telefono"
              />
              <label
                htmlFor="telefono"
                className={`edit-empresa-floating-label ${telefono ? 'edit-empresa-floating-label-filled' : ''}`}
              >
                Teléfono
              </label>
            </div>

            <div className="edit-empresa-floating-label-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className="edit-empresa-input"
                id="email"
              />
              <label
                htmlFor="email"
                className={`edit-empresa-floating-label ${email ? 'edit-empresa-floating-label-filled' : ''}`}
              >
                Email
              </label>
            </div>
          </div>

          <div className="edit-empresa-input-group">
            <div className="edit-empresa-floating-label-wrapper">
              <input
                type="text"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder=" "
                className="edit-empresa-input"
                id="observacion"
              />
              <label
                htmlFor="observacion"
                className={`edit-empresa-floating-label ${observacion ? 'edit-empresa-floating-label-filled' : ''}`}
              >
                Observación
              </label>
            </div>

            <div className="edit-empresa-floating-label-wrapper">
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder=" "
                className="edit-empresa-input"
                id="cuit"
              />
              <label
                htmlFor="cuit"
                className={`edit-empresa-floating-label ${cuit ? 'edit-empresa-floating-label-filled' : ''}`}
              >
                CUIT
              </label>
            </div>
          </div>

          <div className="edit-empresa-input-group">
            <select
              value={condIva || ""}
              onChange={(e) => setCondIva(e.target.value)}
              className="edit-empresa-input"
              required
            >
              <option value="" disabled>Seleccione una condición de IVA</option>
              {condicionesIva.map((cond) => (
                <option key={cond.id_iva} value={cond.id_iva}>
                  {cond.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div className="edit-empresa-input-group">
            <select
              value={medioPago || ""}
              onChange={(e) => setMedioPago(e.target.value)}
              className="edit-empresa-input"
              required
            >
              <option value="" disabled>Seleccione un medio de pago</option>
              {mediosPago.map((pago) => (
                <option key={pago.IdMedios_pago} value={pago.IdMedios_pago}>
                  {pago.Medio_Pago}
                </option>
              ))}
            </select>

            <select
              value={idCategorias || ""}
              onChange={(e) => setIdCategorias(e.target.value)}
              className="edit-empresa-input"
              required
            >
              <option value="" disabled>Seleccione una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.idCategorias} value={cat.idCategorias}>
                  {cat.Nombre_categoria} - ${cat.Precio_Categoria}
                </option>
              ))}
            </select>
          </div>

          <div className="edit-empresa-buttons-container">
            <button 
              type="button" 
              onClick={editarEmpresa} 
              className="edit-empresa-button"
            >
              <FontAwesomeIcon icon={faSave} className="edit-empresa-icon-button" />
              Guardar
            </button>
            <button
              type="button"
              onClick={() => navigate('/GestionarEmpresas')}
              className="edit-empresa-back-button"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="edit-empresa-icon-button" />
              Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarEmpresa;