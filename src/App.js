import { useState, useRef, useEffect } from "react";

// ============================================================
// CONFIGURACIÓN API NIA
// ============================================================
// URL pública del backend experimental NIA v365 Next.
// REACT_APP_API_BASE_URL puede sobrescribirla según el entorno.
const DEFAULT_API_URL =
  "https://nia-v365-next-api-ekd4fza7e0fzevfd.canadacentral-01.azurewebsites.net";

const API_URL = (
  process.env.REACT_APP_API_BASE_URL || DEFAULT_API_URL
).replace(/\/$/, "");

// ============================================================
// CLIENTE WEB DE PRUEBAS
// ============================================================
// Genera un identificador estable por navegador.
// Esto nos permite rastrear pruebas del frontend sin pedir login.
const getFrontendClientId = () => {
  const storageKey = "nia_frontend_client_id";

  try {
    const existingClientId = window.localStorage.getItem(storageKey);

    if (existingClientId) {
      return existingClientId;
    }

    const newClientId =
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.randomUUID
        ? `web_${window.crypto.randomUUID()}`
        : `web_${Date.now()}`;

    window.localStorage.setItem(storageKey, newClientId);

    return newClientId;
  } catch (error) {
    return `web_${Date.now()}`;
  }
};

// ============================================================
// SESIÓN WEB DE NIA
// ============================================================
// Guardamos session_id también en localStorage para que, si el navegador
// refresca durante una prueba, NIA pueda conservar continuidad.
const getInitialSessionId = () => {
  try {
    return window.localStorage.getItem("nia_frontend_session_id") || null;
  } catch (error) {
    return null;
  }
};

const saveFrontendSessionId = (sessionId) => {
  if (!sessionId) return;

  try {
    window.localStorage.setItem("nia_frontend_session_id", sessionId);
  } catch (error) {
    // No bloqueamos el chat si localStorage falla.
  }
};

const clearFrontendSessionId = () => {
  try {
    window.localStorage.removeItem("nia_frontend_session_id");
  } catch (error) {
    // No bloqueamos el chat si localStorage falla.
  }
};

const HexIcon = ({ size = 40, letter = "N", fontSize = 16 }) => (
  <div
    style={{
      width: size,
      height: size,
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg
      style={{ position: "absolute", inset: 0, width: size, height: size }}
      viewBox="0 0 40 40"
    >
      <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#F5C400" />
    </svg>

    <span
      style={{
        position: "relative",
        zIndex: 1,
        fontSize,
        fontWeight: 500,
        color: "#1a0f00",
      }}
    >
      {letter}
    </span>
  </div>
);

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    <HexIcon size={30} fontSize={11} />

    <div
      style={{
        padding: "13px 17px",
        background: "#171717",
        borderRadius: "4px 16px 16px 16px",
        border: "0.5px solid #222",
        display: "flex",
        gap: 5,
        alignItems: "center",
      }}
    >
      {[0, 200, 400].map((delay, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            background: "#2a2a2a",
            borderRadius: "50%",
            animation: "tp 1.2s infinite",
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </div>
  </div>
);

const ProductCard = ({ product }) => (
  <div
    style={{
      background: "#151515",
      border: "0.5px solid #222",
      borderLeft: "3px solid #F5C400",
      borderRadius: "0 16px 16px 0",
      overflow: "hidden",
      marginLeft: 40,
      maxWidth: "76%",
    }}
  >
    <div style={{ padding: "16px 18px" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "#191500",
          color: "#F5C400",
          border: "0.5px solid #2e2200",
          borderRadius: 6,
          fontSize: 10,
          padding: "3px 9px",
          marginBottom: 10,
          letterSpacing: "0.4px",
        }}
      >
        ★ Recomendado
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "#f0f0f0",
          marginBottom: 4,
          lineHeight: 1.3,
        }}
      >
        {product.nombre}
      </div>

      <div style={{ fontSize: 11, color: "#444", marginBottom: 12 }}>
        {product.marca} · Ref: {product.referencia}
      </div>

      {product.caracteristicas?.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {product.caracteristicas.slice(0, 4).map((c, i) => (
            <div
              key={i}
              style={{
                background: "#111",
                border: "0.5px solid #1e1e1e",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                color: "#555",
              }}
            >
              {c.titulo ? `${c.titulo}: ${c.valor}` : c.valor}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#F5C400" }}>
          {product.precio}
        </div>
      </div>

      {product.disponibilidad && (
        <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
          {product.disponibilidad}
        </div>
      )}

      {product.tiempo_entrega && (
        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
          Entrega: {product.tiempo_entrega}
        </div>
      )}
    </div>
  </div>
);

const Message = ({ msg, onSelectOption, loading }) => {
  const isUser = msg.role === "user";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          flexDirection: isUser ? "row-reverse" : "row",
        }}
      >
        {!isUser && <HexIcon size={30} fontSize={11} />}

        {isUser && (
          <div
            style={{
              width: 30,
              height: 30,
              background: "#1e1e1e",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "#555",
              flexShrink: 0,
            }}
          >
            U
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isUser ? "flex-end" : "flex-start",
            gap: 3,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              fontSize: 13,
              lineHeight: 1.7,
              maxWidth: "74%",
              background: isUser ? "#F5C400" : "#171717",
              color: isUser ? "#1a0f00" : "#ccc",
              borderRadius: isUser
                ? "16px 4px 16px 16px"
                : "4px 16px 16px 16px",
              border: isUser ? "none" : "0.5px solid #222",
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.content}
          </div>

          <div style={{ fontSize: 10, color: "#2e2e2e", padding: "0 2px" }}>
            {msg.time}
          </div>

          {!isUser && msg.opciones?.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 8,
                maxWidth: "74%",
              }}
            >
              {msg.opciones.map((opcion) => {
                // El valor es el dato técnico que recibe el backend.
                // El label es el texto natural que ve el usuario.
                const optionValue = String(
                  opcion.valor ?? opcion.label ?? ""
                );

                const optionLabel = String(
                  opcion.label ?? opcion.valor ?? ""
                );

                return (
                  <button
                    key={opcion.id || `${optionLabel}-${optionValue}`}
                    type="button"
                    onClick={() => onSelectOption?.(optionValue, optionLabel)}
                    disabled={loading}
                    style={{
                      background: "#111",
                      color: "#ddd",
                      border: "0.5px solid #2a2a2a",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {optionLabel}
                  </button>
                );
              })}
            </div>
          )}

          {isUser && msg.attachment && (
            <div
              style={{
                marginTop: 6,
                padding: "8px 10px",
                background: "#111",
                border: "0.5px solid #222",
                borderRadius: 10,
                fontSize: 11,
                color: "#777",
                maxWidth: "74%",
              }}
            >
              <div style={{ fontWeight: 500, color: "#bdbdbd" }}>
                Archivo adjunto
              </div>
              <div style={{ marginTop: 2 }}>
                {msg.attachment.archivo_nombre} · {msg.attachment.archivo_tipo}
              </div>
            </div>
          )}
        </div>
      </div>

      {msg.productos?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {msg.productos.slice(0, 3).map((p, i) => (
            <ProductCard key={i} product={p} />
          ))}
        </div>
      )}

      {msg.requiere_accion === "escalar_asesor" && (
        <div
          style={{
            background: "#131313",
            border: "0.5px solid #1e1e1e",
            borderRadius: 14,
            padding: "14px 16px",
            marginLeft: 40,
            maxWidth: "76%",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#ddd" }}>
              Conectar con asesor
            </div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
              Un asesor podrá continuar la atención.
            </div>
          </div>

          <div
            style={{
              background: "#161616",
              color: "#777",
              border: "0.5px solid #252525",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            Atención asistida
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // La sesión se mantiene en state, ref y localStorage.
  // El ref evita que el segundo mensaje salga con session_id viejo/null.
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const sessionIdRef = useRef(getInitialSessionId());

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const now = () =>
    new Date().toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    sessionIdRef.current = sessionId;

    if (sessionId) {
      saveFrontendSessionId(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!selectedFile) {
      setFilePreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setFilePreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const detectAttachmentType = (file) => {
    if (!file) return "otro";
    if (file.type?.startsWith("image/")) return "imagen";
    if (file.type === "application/pdf") return "pdf";
    return "documento";
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadAttachment = async (file) => {
    const formData = new FormData();

    formData.append("archivo", file);

    const res = await fetch(`${API_URL}/upload-archivo`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Error subiendo archivo: ${res.status} - ${errorText || "sin detalle"}`
      );
    }

    const data = await res.json();

    const normalizedMeta = {
      archivo_nombre: data.archivo_nombre || data.nombre_original || file.name,
      archivo_tipo:
        data.archivo_tipo || data.tipo_entrada || detectAttachmentType(file),
      archivo_ruta: data.archivo_ruta || data.ruta || "",
      archivo_mimetype: data.archivo_mimetype || file.type || "",
    };

    return normalizedMeta;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
    setUploadError("");
    setFileMeta(null);
    setUploadingFile(true);

    try {
      const uploadedMeta = await uploadAttachment(file);
      setFileMeta(uploadedMeta);
    } catch (err) {
      console.error(err);
      setUploadError(
        "No se pudo subir el archivo. Verifica el backend o vuelve a intentarlo."
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const clearAttachment = () => {
    setSelectedFile(null);
    setFileMeta(null);
    setUploadError("");
    setUploadingFile(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setInput("");
    setSessionId(null);
    sessionIdRef.current = null;
    clearFrontendSessionId();
    clearAttachment();
  };

const sendMessage = async (backendText, visibleText = backendText) => {
  // Texto técnico/comercial enviado a NIA.
  const normalizedBackendText = String(backendText ?? "").trim();

  // Texto natural mostrado en la burbuja del usuario.
  const normalizedVisibleText = String(
    visibleText ?? backendText ?? ""
  ).trim();

  if (loading || uploadingFile) return;

  const messageToSend =
    normalizedBackendText || (fileMeta ? "Adjunto archivo" : "");

  const messageToDisplay =
    normalizedVisibleText || messageToSend;

  if (!messageToSend) return;

    const currentSessionId =
      sessionIdRef.current ||
      sessionId ||
      `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    sessionIdRef.current = currentSessionId;
    setSessionId(currentSessionId);
    saveFrontendSessionId(currentSessionId);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",

        // La interfaz muestra el label natural.
        // El payload seguirá enviando messageToSend al backend.
        content: messageToDisplay,

        time: now(),
        attachment: fileMeta || null,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const payload = {
        session_id: currentSessionId,
        phone_id: getFrontendClientId(),
        mensaje: messageToSend,
      };

      if (fileMeta?.archivo_ruta) {
        payload.archivo_nombre = fileMeta.archivo_nombre;
        payload.archivo_tipo = fileMeta.archivo_tipo;
        payload.archivo_ruta = fileMeta.archivo_ruta;
        payload.archivo_mimetype = fileMeta.archivo_mimetype;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("NIA CHAT PAYLOAD:", payload);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const res = await fetch(`${API_URL}/nia/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Error API NIA: ${res.status} - ${errorText || "sin detalle"}`
        );
      }

      const data = await res.json();

      if (process.env.NODE_ENV !== "production") {
        console.log("NIA CHAT RESPONSE:", data);
      }

      if (data.session_id) {
        sessionIdRef.current = data.session_id;
        setSessionId(data.session_id);
        saveFrontendSessionId(data.session_id);
      }
      const assistantResponse =
        data.respuesta ||
        "No pude generar una respuesta en este momento. Intenta nuevamente.";

      const normalizedAssistantResponse = assistantResponse
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const shouldShowProducts =
        normalizedAssistantResponse.includes("encontre el producto exacto") ||
        normalizedAssistantResponse.includes("encontre varias opciones") ||
        normalizedAssistantResponse.includes("te muestro las mejores") ||
        normalizedAssistantResponse.includes("opciones relevantes");


      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantResponse,
          opciones: data.opciones || [],
          productos: shouldShowProducts ? data.productos || [] : [],
          requiere_accion: data.requiere_accion,
          commercial_handoff: data.commercial_handoff || null,
          time: now(),
        },
      ]);

      clearAttachment();
    } catch (e) {
      console.error(e);

      const isTimeout =
        e?.name === "AbortError" ||
        String(e?.message || "").toLowerCase().includes("aborted");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isTimeout
            ? "NIA tardó demasiado en responder. Verifica tu conexión o pulsa Nuevo e intenta de nuevo."
            : "Error conectando con NIA. Verifica que el servidor esté activo o vuelve a intentarlo.",
          time: now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const chips = [
    "Válvulas neumáticas",
    "Rodamientos",
    "Bombas",
    "Sensores",
    "Cables",
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0a;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        @keyframes tp {
          0%,60%,100% {
            opacity: .3;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        input::placeholder { color: #333; }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 480,
          height: "100vh",
          maxHeight: 760,
          background: "#0d0d0d",
          borderRadius: 20,
          overflow: "hidden",
          border: "0.5px solid #222",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* NAV */}
        <div
          style={{
            height: 66,
            background: "#111",
            borderBottom: "0.5px solid #1e1e1e",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 14,
            flexShrink: 0,
          }}
        >
          <HexIcon size={40} fontSize={16} />

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#f0f0f0" }}>
              NIA
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#22c55e",
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  background: "#22c55e",
                  borderRadius: "50%",
                }}
              />
              Disponible ahora
            </div>
          </div>

          <button
            onClick={resetConversation}
            style={{
              background: "transparent",
              border: "0.5px solid #222",
              color: "#555",
              borderRadius: 10,
              padding: "7px 10px",
              fontSize: 11,
              cursor: "pointer",
              marginRight: 8,
            }}
            title="Iniciar nueva conversación"
          >
            Nuevo
          </button>

          <div style={{ fontSize: 11, color: "#383838" }}>VIA Industrial</div>
        </div>

        {/* CHAT */}
        <div
          style={{
            flex: 1,
            padding: "22px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "auto",
            background: "#111",
            position: "relative",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "8px 0 4px",
              }}
            >
              <HexIcon size={62} letter="N" fontSize={22} />

              <div
                style={{ fontSize: 18, fontWeight: 500, color: "#f0f0f0" }}
              >
                Hola, soy NIA
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#555",
                  textAlign: "center",
                  maxWidth: 270,
                  lineHeight: 1.65,
                }}
              >
                Asesora comercial de VIA Industrial. Cuéntame qué producto
                necesitas.
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    style={{
                      border: "0.5px solid #252525",
                      background: "#161616",
                      color: "#777",
                      borderRadius: 12,
                      padding: "8px 14px",
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = "#F5C400";
                      e.target.style.color = "#F5C400";
                      e.target.style.background = "#191500";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "#252525";
                      e.target.style.color = "#777";
                      e.target.style.background = "#161616";
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message
              key={i}
              msg={msg}
              onSelectOption={sendMessage}
              loading={loading}
            />
          ))}

          {loading && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* ATTACHMENT PREVIEW */}
        {(selectedFile || uploadingFile || uploadError) && (
          <div
            style={{
              background: "#0d0d0d",
              borderTop: "0.5px solid #181818",
              padding: "10px 18px 0",
            }}
          >
            <div
              style={{
                background: "#111",
                border: "0.5px solid #222",
                borderRadius: 14,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              {selectedFile?.type?.startsWith("image/") && filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="Vista previa"
                  style={{
                    width: 42,
                    height: 42,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "0.5px solid #222",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: "#171717",
                    border: "0.5px solid #222",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F5C400",
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {selectedFile?.type?.startsWith("image/")
                    ? "IMG"
                    : selectedFile?.type === "application/pdf"
                    ? "PDF"
                    : "DOC"}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#ddd",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {selectedFile?.name || "Archivo adjunto"}
                </div>

                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                  {selectedFile
                    ? `${selectedFile.type || "archivo"} · ${formatFileSize(
                        selectedFile.size
                      )}`
                    : "Preparando archivo..."}
                </div>

                {uploadingFile && (
                  <div style={{ fontSize: 10, color: "#F5C400", marginTop: 3 }}>
                    Subiendo archivo...
                  </div>
                )}

                {uploadError && (
                  <div style={{ fontSize: 10, color: "#f87171", marginTop: 3 }}>
                    {uploadError}
                  </div>
                )}
              </div>

              <button
                onClick={clearAttachment}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#666",
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 4,
                }}
                title="Quitar archivo"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* INPUT BAR */}
        <div
          style={{
            background: "#0d0d0d",
            borderTop: "0.5px solid #181818",
            padding: "14px 18px",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 44,
              height: 44,
              background: "#141414",
              border: "0.5px solid #222",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading || uploadingFile ? "not-allowed" : "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            title="Adjuntar archivo"
            disabled={loading || uploadingFile}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#F5C400">
              <path
                d="M16.5 6.5V17a4.5 4.5 0 1 1-9 0V6.25a3.25 3.25 0 0 1 6.5 0V16a2 2 0 1 1-4 0V7.5"
                stroke="#F5C400"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.bmp,.pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.csv"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Escribe el producto que necesitas..."
            style={{
              flex: 1,
              background: "#141414",
              border: "0.5px solid #222",
              borderRadius: 14,
              padding: "12px 18px",
              fontSize: 13,
              color: "#ccc",
              outline: "none",
              transition: "border-color 0.2s",
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#F5C400")}
            onBlur={(e) => (e.target.style.borderColor = "#222")}
            disabled={loading || uploadingFile}
          />

          <button
            onClick={() => sendMessage(input)}
            style={{
              width: 44,
              height: 44,
              background: loading || uploadingFile ? "#6b5a12" : "#F5C400",
              border: "none",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loading || uploadingFile ? "not-allowed" : "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            disabled={loading || uploadingFile}
            title="Enviar mensaje"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a0f00">
              <path d="M2 21L23 12 2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}