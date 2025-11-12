// src/components/empresas/EditarEmpresa.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faUser, faHome, faMoneyBillWave, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import BASE_URL from "../../config/config";
import './EditarEmpresa.css';
import Toast from "../global/Toast";

const EditarEmpresa = () => {
  const { razon_social } = useParams();
  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState('informacion');

  // Estados
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

  // Fecha de unión (igual que Socios)
  const [fechaUnion, setFechaUnion] = useState('');
  const fechaInputRef = useRef(null);
  const abrirCalendario = () => {
    const el = fechaInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); return; } catch {}
    }
    el.focus();
    try { el.click(); } catch {}
  };

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'exito' });
  const showToast = (message, type = 'exito') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const obtenerEmpresa = async (signal) => {
    try {
      setCargando(true);
      const response = await fetch(
        `${BASE_URL}/api.php?action=obtener_empresa&razon_social=${encodeURIComponent(razon_social)}`,
        { signal }
      );
      if (!response.ok) throw new Error('La respuesta de la API no es válida');
      const data = await response.json();
      const { categorias, mediosPago, condicionesIva, ...empresa } = data;

      if (empresa) {
        setIdEmp(empresa.idEmp ?? null);
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
        setFechaUnion(empresa.fechaunion || empresa.Fechaunion || '');
      }

      setCategorias(categorias || []);
      setMediosPago(mediosPago || []);
      setCondicionesIva(condicionesIva || []);
    } catch (error) {
      if (error.name !== 'AbortError') {
        showToast('Hubo un error al obtener los datos de la empresa: ' + error.message, 'error');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    if (razon_social) obtenerEmpresa(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [razon_social]);

  const editarEmpresa = async () => {
    if (!razonSocialInput.trim()) {
      showToast("El campo Razón Social es obligatorio", "error");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api.php?action=editar_empresa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idEmp,
          razon_social: razonSocialInput,
          domicilio,
          domicilio_2,
          telefono,
          email,
          observacion, // se mantiene pero solo se edita desde la pestaña "Otros"
          idCategoria: idCategorias,
          medioPago,
          cuit,
          id_iva: condIva,
          fechaUnion: fechaUnion || null,
        }),
      });

      const data = await response.json();

      if (response.ok && (data.success || data.exito)) {
        showToast('Empresa actualizada correctamente', 'exito');
        setTimeout(() => navigate('/GestionarEmpresas'), 800);
      } else {
        showToast('Error al actualizar la empresa: ' + (data.message || data.mensaje || 'Error desconocido'), 'error');
      }
    } catch (error) {
      showToast('Error en la solicitud: ' + error.message, 'error');
    }
  };

  // Header
  const Header = (
    <div className="edit-empresa-header">
      {cargando ? (
        <div className="edit-empresa-header-skel">
          <div className="skel skel-title" />
          <div className="skel skel-subtitle" />
        </div>
      ) : (
        <>
          <h2 className="edit-empresa-title">Editar Empresa #{idEmp}</h2>
          <div className="edit-empresa-subtitle">
            {razonSocialInput || '—'} {cuit ? `• CUIT: ${cuit}` : ''}
          </div>
        </>
      )}
    </div>
  );

  // Tabs
  const Tabs = (
    <div className="edit-empresa-tabs" role="tablist" aria-label="Secciones de edición">
      {[
        { id: 'informacion', icon: faUser, label: 'Información' },
        { id: 'domicilio', icon: faHome, label: 'Domicilio' },
        { id: 'pagos', icon: faMoneyBillWave, label: 'Pagos' },
        { id: 'otros', icon: faInfoCircle, label: 'Otros' },
      ].map(t => (
        <button
          key={t.id}
          className={`edit-empresa-tab ${activeTab === t.id ? 'active' : ''} ${cargando ? 'is-disabled' : ''}`}
          onClick={() => !cargando && setActiveTab(t.id)}
          role="tab"
          aria-selected={activeTab === t.id}
          aria-label={t.label}
          title={t.label}
          disabled={cargando}
        >
          <FontAwesomeIcon icon={t.icon} className="edit-empresa-tab-icon" />
          <span className="tab-text">{t.label}</span>
        </button>
      ))}
    </div>
  );

  // Content loader
  const ContentLoading = (
    <div className="edit-empresa-form">
      <div className="edit-empresa-tab-content">
        <div className="edit-empresa-input-group">
          <div className="skel skel-input" />
          <div className="skel skel-input" />
        </div>
        <div className="edit-empresa-input-group">
          <div className="skel skel-input" />
          <div className="skel skel-input" />
        </div>
        <div className="edit-empresa-input-group">
          <div className="skel skel-input" />
          <div className="skel skel-input" />
        </div>
      </div>

      <div className="edit-empresa-buttons-container">
        <div className="skel skel-btn" />
        <div className="skel skel-btn" />
      </div>
    </div>
  );

  return (
    <div className="edit-empresa-container">
      {toast.show && (
        <Toast
          tipo={toast.type}
          mensaje={toast.message}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
          duracion={3000}
        />
      )}

      <div className="edit-empresa-box edit-empresa-animate-in" role="region" aria-label="Editar empresa">
        {Header}
        {Tabs}

        {cargando ? (
          ContentLoading
        ) : (
          <form className="edit-empresa-form" onSubmit={(e) => e.preventDefault()}>
            {activeTab === 'informacion' && (
              <div className="edit-empresa-tab-content">
                <div className="edit-empresa-input-group">
                  <div className="edit-empresa-floating-label-wrapper full-width">
                    <input
                      type="text"
                      value={razonSocialInput}
                      onChange={(e) => setRazonSocialInput(e.target.value)}
                      placeholder=" "
                      className="edit-empresa-input"
                      id="razonSocial"
                      required
                    />
                    <label htmlFor="razonSocial" className={`edit-empresa-floating-label ${razonSocialInput ? 'edit-empresa-floating-label-filled' : ''}`}>
                      Razón Social
                    </label>
                  </div>
                </div>

                <div className="edit-empresa-input-group">
                  <div className="edit-empresa-floating-label-wrapper">
                    <input
                      type="text"
                      value={cuit}
                      onChange={(e) => setCuit(e.target.value)}
                      placeholder=" "
                      className="edit-empresa-input"
                      id="cuit"
                    />
                    <label htmlFor="cuit" className={`edit-empresa-floating-label ${cuit ? 'edit-empresa-floating-label-filled' : ''}`}>
                      CUIT
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
                    <label htmlFor="email" className={`edit-empresa-floating-label ${email ? 'edit-empresa-floating-label-filled' : ''}`}>
                      Email
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
                    <label htmlFor="telefono" className={`edit-empresa-floating-label ${telefono ? 'edit-empresa-floating-label-filled' : ''}`}>
                      Teléfono
                    </label>
                  </div>

                  {/* Fecha de unión */}
                  <div
                    className="edit-empresa-floating-label-wrapper date-clickable"
                    onClick={abrirCalendario}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirCalendario()}
                    aria-label="Fecha de unión (abrir calendario)"
                    title="Fecha de unión"
                  >
                    <input
                      ref={fechaInputRef}
                      type="date"
                      value={fechaUnion || ''}
                      onChange={(e) => setFechaUnion(e.target.value)}
                      className="edit-empresa-input date-no-effect"
                      id="fechaUnionEmp"
                    />
                    <label htmlFor="fechaUnionEmp" className="edit-empresa-floating-label date-label-fixed">
                      Fecha de unión
                    </label>
                  </div>
                </div>
                {/* Campo Observación eliminado de esta pestaña */}
              </div>
            )}

            {activeTab === 'domicilio' && (
              <div className="edit-empresa-tab-content">
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
                    <label htmlFor="domicilio" className={`edit-empresa-floating-label ${domicilio ? 'edit-empresa-floating-label-filled' : ''}`}>
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
                    <label htmlFor="domicilio_2" className={`edit-empresa-floating-label ${domicilio_2 ? 'edit-empresa-floating-label-filled' : ''}`}>
                      Domicilio de cobro
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pagos' && (
              <div className="edit-empresa-tab-content">
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
                </div>

                <div className="edit-empresa-input-group">
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
              </div>
            )}

            {activeTab === 'otros' && (
              <div className="edit-empresa-tab-content">
                <div className="edit-empresa-input-group">
                  <div className="edit-empresa-floating-label-wrapper">
                    <textarea
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      placeholder=" "
                      className="edit-empresa-input edit-empresa-textarea"
                      id="observaciones"
                      rows="4"
                    />
                    <label htmlFor="observaciones" className={`edit-empresa-floating-label ${observacion ? 'edit-empresa-floating-label-filled' : ''}`}>
                      Observaciones
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="edit-empresa-buttons-container">
              <button
                type="button"
                onClick={editarEmpresa}
                className="edit-empresa-button"
                aria-label="Guardar"
                title="Guardar"
              >
                <FontAwesomeIcon icon={faSave} className="edit-empresa-icon-button" />
                <span className="btn-text">Guardar</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/GestionarEmpresas')}
                className="edit-empresa-back-button"
                aria-label="Volver"
                title="Volver"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="edit-empresa-icon-button" />
                <span className="btn-text">Volver</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditarEmpresa;
