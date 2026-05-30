// src/components/BotPanel/modales/GaleriaModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faFilePdf,
  faImages,
  faUser,
  faRobot,
  faCode,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import "./GaleriaModal.css";

const GaleriaModal = ({ open, onClose, items, onOpenItem, title }) => {
  const boxRef = useRef(null);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    if (!open) return;

    setFilter("todos");

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    const onDown = (e) => {
      const box = boxRef.current;
      if (!box) return;
      if (!box.contains(e.target)) onClose?.();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, onClose]);

  const arr = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const counts = useMemo(() => {
    return {
      todos: arr.length,
      usuario: arr.filter((x) => x.origen === "usuario").length,
      bot: arr.filter((x) => x.origen === "bot").length,
      admin: arr.filter((x) => x.origen === "admin").length,
    };
  }, [arr]);

  const filtered = useMemo(() => {
    if (filter === "todos") return arr;
    return arr.filter((x) => x.origen === filter);
  }, [arr, filter]);

  if (!open) return null;

  return (
    <div className="wp-gal-backdrop" role="dialog" aria-label="Galería del chat">
      <div className="wp-gal-modal" ref={boxRef}>
        <div className="wp-gal-top">
          <div className="wp-gal-title">
            <FontAwesomeIcon icon={faImages} />
            <span>{title || "Galería"}</span>
            <span className="wp-gal-count">{arr.length}</span>
          </div>

          <button
            className="wp-gal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="wp-gal-filters">
          <button
            type="button"
            className={`wp-gal-filter ${filter === "todos" ? "is-active" : ""}`}
            onClick={() => setFilter("todos")}
          >
            <FontAwesomeIcon icon={faFolderOpen} />
            Todos
            <span>{counts.todos}</span>
          </button>

          <button
            type="button"
            className={`wp-gal-filter ${filter === "usuario" ? "is-active" : ""}`}
            onClick={() => setFilter("usuario")}
          >
            <FontAwesomeIcon icon={faUser} />
            Socio
            <span>{counts.usuario}</span>
          </button>

          <button
            type="button"
            className={`wp-gal-filter ${filter === "bot" ? "is-active" : ""}`}
            onClick={() => setFilter("bot")}
          >
            <FontAwesomeIcon icon={faRobot} />
            Bot
            <span>{counts.bot}</span>
          </button>

          <button
            type="button"
            className={`wp-gal-filter ${filter === "admin" ? "is-active" : ""}`}
            onClick={() => setFilter("admin")}
          >
            <FontAwesomeIcon icon={faCode} />
            Panel
            <span>{counts.admin}</span>
          </button>
        </div>

        <div className="wp-gal-body">
          {filtered.length === 0 ? (
            <div className="wp-gal-empty">
              No hay archivos para este filtro.
            </div>
          ) : (
            <div className="wp-gal-grid">
              {filtered.map((it, idx) => {
                const isPdf = it?.kind === "pdf";
                const isImg = it?.kind === "image";

                return (
                  <button
                    key={`${it.url}-${idx}`}
                    type="button"
                    className={`wp-gal-item is-${it.origen || "otro"} ${
                      isPdf ? "is-pdf" : ""
                    }`}
                    onClick={() => onOpenItem?.(it)}
                    title={it.name || "archivo"}
                  >
                    <div className={`wp-gal-origin wp-gal-origin--${it.origen || "otro"}`}>
                      <span>{it.origenIcon || "📎"}</span>
                      {it.origenLabel || "Archivo"}
                    </div>

                    {isImg ? (
                      <img
                        className="wp-gal-thumb"
                        src={it.url}
                        alt={it.name || "imagen"}
                        loading="lazy"
                      />
                    ) : isPdf ? (
                      <div className="wp-gal-pdf">
                        <div className="wp-gal-pdf-ico">
                          <FontAwesomeIcon icon={faFilePdf} />
                        </div>
                        <div className="wp-gal-pdf-name">
                          {it.name || "documento.pdf"}
                        </div>
                      </div>
                    ) : (
                      <div className="wp-gal-pdf">
                        <div className="wp-gal-pdf-ico">📎</div>
                        <div className="wp-gal-pdf-name">
                          {it.name || "archivo"}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GaleriaModal;