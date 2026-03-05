/**
 * ============================================================
 * ID CARD GENERATOR - Professional SaaS Application
 * Built with React + Tailwind CSS
 * Features: Template Designer, Excel Upload, Batch Generation
 * ============================================================
 */

import { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs";

// ─── CONSTANTS ───────────────────────────────────────────────
const CARD_WIDTH = 600;   // 3.375 inches at 96dpi
const CARD_HEIGHT = 300;  // 2.125 inches at 96dpi

const FONT_FAMILIES = ["Inter", "Georgia", "Courier New", "Arial Black", "Trebuchet MS", "Palatino", "Impact"];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

const DEFAULT_TEMPLATES = [
  {
    id: "corp-blue",
    name: "Corporate Blue",
    bg: "linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)",
    textColor: "#ffffff",
    accentColor: "#f0a500",
  },
  {
    id: "modern-dark",
    name: "Modern Dark",
    bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    textColor: "#e0e0e0",
    accentColor: "#e94560",
  },
  {
    id: "clean-white",
    name: "Clean White",
    bg: "linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)",
    textColor: "#2d3748",
    accentColor: "#4299e1",
  },
];

// ─── UTILITY FUNCTIONS ────────────────────────────────────────

/** Generate unique ID */
const uid = () => Math.random().toString(36).substr(2, 9);

/** Clamp value between min and max */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/** Generate QR code SVG path using simple matrix approach */
const generateQRSVG = (text, size = 80) => {
  // Simple visual QR-like pattern (decorative, not scannable)
  const cells = 11;
  const cellSize = size / cells;
  const rects = [];
  // Finder patterns + pseudo data
  const pattern = [
    [1,1,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,1],
    [1,0,1,1,1,0,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,0,1,1],
    [1,0,1,1,1,0,1,0,1,1,0],
    [1,0,0,0,0,0,1,0,1,0,1],
    [1,1,1,1,1,1,1,0,1,0,0],
    [0,0,0,0,0,0,0,0,1,1,0],
    [1,0,1,1,0,1,1,0,1,0,1],
    [0,1,0,0,1,0,0,0,0,1,0],
    [1,1,1,0,1,0,1,1,1,0,1],
  ];
  // Mix in text hash for variety
  let hash = 0;
  for (let c of text) hash = ((hash << 5) - hash) + c.charCodeAt(0);
  pattern.forEach((row, r) => {
    row.forEach((cell, c) => {
      const bit = cell ^ ((hash >> (r * 3 + c)) & 1);
      if (r > 7 || c > 7 ? bit : cell) {
        rects.push(`<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="currentColor"/>`);
      }
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rects.join('')}</svg>`;
};

/** Generate barcode SVG */
const generateBarcodeSVG = (text, width = 120, height = 40) => {
  const bars = [];
  let x = 2;
  const barWidth = (width - 4) / (text.length * 8 + 20);
  // Encode each char as alternating bars
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      const on = (code >> b) & 1;
      if (on) bars.push(`<rect x="${x}" y="2" width="${barWidth}" height="${height - 8}" fill="currentColor"/>`);
      x += barWidth + (on ? 0.5 : 0.5);
    }
    x += barWidth; // gap between chars
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars.join('')}</svg>`;
};

// ─── ELEMENT RENDERERS ────────────────────────────────────────

/** Render a single element on the canvas */
const ElementRenderer = ({ el, selected, onSelect, onDragStart, data = {} }) => {
  const value = el.dataKey && data[el.dataKey] ? data[el.dataKey] : el.placeholder || el.defaultValue || "";

  const baseStyle = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    cursor: "move",
    userSelect: "none",
    zIndex: selected ? 100 : el.zIndex || 1,
    outline: selected ? "2px solid #6366f1" : "none",
    outlineOffset: "1px",
    boxSizing: "border-box",
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(el.id);
    onDragStart(e, el.id);
  };

  if (el.type === "text") {
    return (
      <div
        style={{
          ...baseStyle,
          color: el.color || "#ffffff",
          fontSize: el.fontSize || 12,
          fontFamily: el.fontFamily || "Inter",
          fontWeight: el.fontWeight || "normal",
          fontStyle: el.fontStyle || "normal",
          textDecoration: el.textDecoration || "none",
          textAlign: el.align || "left",
          lineHeight: 1.3,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
          padding: "2px 4px",
        }}
        onMouseDown={handleMouseDown}
      >
        {value}
      </div>
    );
  }

  if (el.type === "image") {
    const imgSrc = el.dataKey && data[el.dataKey] ? data[el.dataKey] : null;
    return (
      <div
        style={{
          ...baseStyle,
          background: imgSrc ? "transparent" : "rgba(255,255,255,0.1)",
          border: imgSrc ? "none" : "2px dashed rgba(255,255,255,0.4)",
          borderRadius: el.borderRadius || 4,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseDown={handleMouseDown}
      >
        {imgSrc ? (
          <img src={imgSrc} alt="id" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>📷 Photo</span>
        )}
      </div>
    );
  }

  if (el.type === "logo") {
    return (
      <div
        style={{
          ...baseStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: el.logoSrc ? "transparent" : "rgba(255,255,255,0.15)",
          border: el.logoSrc ? "none" : "2px dashed rgba(255,255,255,0.3)",
          borderRadius: el.borderRadius || 4,
          overflow: "hidden",
        }}
        onMouseDown={handleMouseDown}
      >
        {el.logoSrc ? (
          <img src={el.logoSrc} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>🏢 Logo</span>
        )}
      </div>
    );
  }

  if (el.type === "qr") {
    return (
      <div
        style={{ ...baseStyle, background: "#ffffff", padding: 2, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseDown={handleMouseDown}
        dangerouslySetInnerHTML={{ __html: generateQRSVG(value || "QR", el.width - 4) }}
      />
    );
  }

  if (el.type === "barcode") {
    return (
      <div
        style={{ ...baseStyle, background: "#ffffff", padding: "2px 4px", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}
        onMouseDown={handleMouseDown}
      >
        <div dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(value || "12345678", el.width - 8, el.height - 16) }} />
        <span style={{ fontSize: 7, fontFamily: "Courier New", color: "#333", marginTop: 1 }}>{value || "12345678"}</span>
      </div>
    );
  }

  if (el.type === "shape") {
    return (
      <div
        style={{
          ...baseStyle,
          background: el.fill || "rgba(255,255,255,0.2)",
          border: `${el.strokeWidth || 1}px solid ${el.stroke || "rgba(255,255,255,0.4)"}`,
          borderRadius: el.shape === "circle" ? "50%" : el.borderRadius || 0,
        }}
        onMouseDown={handleMouseDown}
      />
    );
  }

  return null;
};

// ─── RESIZE HANDLE ────────────────────────────────────────────
const ResizeHandle = ({ onResizeStart }) => (
  <div
    style={{
      position: "absolute",
      right: -4,
      bottom: -4,
      width: 10,
      height: 10,
      background: "#6366f1",
      border: "1.5px solid white",
      borderRadius: 2,
      cursor: "se-resize",
      zIndex: 200,
    }}
    onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e); }}
  />
);

// ─── PROPERTY PANEL ──────────────────────────────────────────
const PropertyPanel = ({ element, onUpdate, columns, onDelete }) => {
  if (!element) return (
    <div style={{ padding: 16, color: "#64748b", fontSize: 13, textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}>🎨</div>
      Select an element to edit its properties
    </div>
  );

  const update = (key, val) => onUpdate(element.id, { [key]: val });

  return (
    <div style={{ padding: "12px", overflowY: "auto", fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 12, color: "#f1f5f9", fontSize: 13 }}>
        {element.type.toUpperCase()} PROPERTIES
      </div>

      {/* Position & Size */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: "#94a3b8", marginBottom: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Position & Size</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {["x","y","width","height"].map(k => (
            <div key={k}>
              <label style={{ color: "#64748b", fontSize: 10 }}>{k.toUpperCase()}</label>
              <input
                type="number"
                value={Math.round(element[k]) || 0}
                onChange={e => update(k, Number(e.target.value))}
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Text Properties */}
      {element.type === "text" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#94a3b8", marginBottom: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Text</div>
          
          <div style={{ marginBottom: 6 }}>
            <label style={{ color: "#64748b", fontSize: 10 }}>DEFAULT TEXT</label>
            <input
              value={element.defaultValue || ""}
              onChange={e => update("defaultValue", e.target.value)}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={{ color: "#64748b", fontSize: 10 }}>DATA COLUMN</label>
            <select
              value={element.dataKey || ""}
              onChange={e => update("dataKey", e.target.value)}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11 }}
            >
              <option value="">-- Static Text --</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <div>
              <label style={{ color: "#64748b", fontSize: 10 }}>FONT</label>
              <select
                value={element.fontFamily || "Inter"}
                onChange={e => update("fontFamily", e.target.value)}
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11 }}
              >
                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: "#64748b", fontSize: 10 }}>SIZE</label>
              <select
                value={element.fontSize || 12}
                onChange={e => update("fontSize", Number(e.target.value))}
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11 }}
              >
                {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}>
            <label style={{ color: "#64748b", fontSize: 10 }}>COLOR</label>
            <input type="color" value={element.color || "#ffffff"} onChange={e => update("color", e.target.value)}
              style={{ width: 36, height: 24, border: "none", borderRadius: 3, cursor: "pointer", background: "none" }} />
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {[["B","fontWeight","bold","normal"],["I","fontStyle","italic","normal"],["U","textDecoration","underline","none"]].map(([label, prop, on, off]) => (
              <button key={label}
                onClick={() => update(prop, element[prop] === on ? off : on)}
                style={{
                  padding: "3px 8px", borderRadius: 3, border: "1px solid #334155",
                  background: element[prop] === on ? "#6366f1" : "#1e293b",
                  color: "#f1f5f9", cursor: "pointer", fontWeight: label === "B" ? "bold" : "normal",
                  fontStyle: label === "I" ? "italic" : "normal", textDecoration: label === "U" ? "underline" : "none",
                  fontSize: 11
                }}
              >{label}</button>
            ))}
            <div style={{ flex: 1 }} />
            {["left","center","right"].map(a => (
              <button key={a}
                onClick={() => update("align", a)}
                style={{
                  padding: "3px 6px", borderRadius: 3, border: "1px solid #334155",
                  background: element.align === a ? "#6366f1" : "#1e293b",
                  color: "#f1f5f9", cursor: "pointer", fontSize: 10
                }}
              >
                {a === "left" ? "≡" : a === "center" ? "≡" : "≡"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image/Logo data column */}
      {(element.type === "image") && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#94a3b8", marginBottom: 6, fontSize: 11, textTransform: "uppercase" }}>Photo Source</div>
          <label style={{ color: "#64748b", fontSize: 10 }}>DATA COLUMN (URL or base64)</label>
          <select
            value={element.dataKey || ""}
            onChange={e => update("dataKey", e.target.value)}
            style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11 }}
          >
            <option value="">-- No Photo --</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ marginTop: 6 }}>
            <label style={{ color: "#64748b", fontSize: 10 }}>BORDER RADIUS</label>
            <input type="range" min="0" max="50" value={element.borderRadius || 4}
              onChange={e => update("borderRadius", Number(e.target.value))}
              style={{ width: "100%" }} />
          </div>
        </div>
      )}

      {/* QR/Barcode data column */}
      {(element.type === "qr" || element.type === "barcode") && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#94a3b8", marginBottom: 6, fontSize: 11, textTransform: "uppercase" }}>Data Source</div>
          <select
            value={element.dataKey || ""}
            onChange={e => update("dataKey", e.target.value)}
            style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11 }}
          >
            <option value="">-- Static --</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Shape properties */}
      {element.type === "shape" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#94a3b8", marginBottom: 6, fontSize: 11, textTransform: "uppercase" }}>Shape</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <label style={{ color: "#64748b", fontSize: 10 }}>FILL</label>
            <input type="color" value={element.fill || "#ffffff"} onChange={e => update("fill", e.target.value)}
              style={{ width: 36, height: 24, border: "none", borderRadius: 3, cursor: "pointer" }} />
            <label style={{ color: "#64748b", fontSize: 10 }}>STROKE</label>
            <input type="color" value={element.stroke || "#ffffff"} onChange={e => update("stroke", e.target.value)}
              style={{ width: 36, height: 24, border: "none", borderRadius: 3, cursor: "pointer" }} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ color: "#64748b", fontSize: 10 }}>SHAPE TYPE</label>
            <select value={element.shape || "rect"} onChange={e => update("shape", e.target.value)}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11 }}>
              <option value="rect">Rectangle</option>
              <option value="circle">Circle / Oval</option>
            </select>
          </div>
        </div>
      )}

      {/* Z-index */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: "#64748b", fontSize: 10 }}>LAYER ORDER</label>
        <input type="number" value={element.zIndex || 1} min={1} max={50}
          onChange={e => update("zIndex", Number(e.target.value))}
          style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "4px 6px", fontSize: 11 }} />
      </div>

      <button
        onClick={() => onDelete(element.id)}
        style={{ width: "100%", padding: "7px", background: "#7f1d1d", border: "none", borderRadius: 4, color: "#fca5a5", cursor: "pointer", fontSize: 12 }}
      >
        🗑 Delete Element
      </button>
    </div>
  );
};

// ─── TEMPLATE CANVAS ─────────────────────────────────────────
const TemplateCanvas = ({ template, elements, selectedId, onSelect, onUpdateElement, data = {} }) => {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [bgImage, setBgImage] = useState(null);

  useEffect(() => {
    if (template.bgImage) setBgImage(template.bgImage);
    else setBgImage(null);
  }, [template.bgImage]);

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = CARD_WIDTH / rect.width;

    if (dragging) {
      const dx = (e.clientX - dragging.startX) * scale;
      const dy = (e.clientY - dragging.startY) * scale;
      const el = elements.find(el => el.id === dragging.id);
      if (el) {
        onUpdateElement(dragging.id, {
          x: clamp(dragging.origX + dx, 0, CARD_WIDTH - el.width),
          y: clamp(dragging.origY + dy, 0, CARD_HEIGHT - el.height),
        });
      }
    }

    if (resizing) {
      const dx = (e.clientX - resizing.startX) * scale;
      const dy = (e.clientY - resizing.startY) * scale;
      onUpdateElement(resizing.id, {
        width: Math.max(20, resizing.origW + dx),
        height: Math.max(10, resizing.origH + dy),
      });
    }
  }, [dragging, resizing, elements, onUpdateElement]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  const handleDragStart = useCallback((e, id) => {
    const el = elements.find(el => el.id === id);
    if (!el) return;
    setDragging({ id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y });
  }, [elements]);

  const handleResizeStart = useCallback((e, id) => {
    const el = elements.find(el => el.id === id);
    if (!el) return;
    setResizing({ id, startX: e.clientX, startY: e.clientY, origW: el.width, origH: el.height });
  }, [elements]);

  const cardStyle = {
    position: "relative",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    background: template.background || DEFAULT_TEMPLATES[0].bg,
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
    cursor: "default",
    flexShrink: 0,
  };

  if (bgImage) cardStyle.backgroundImage = `url(${bgImage})`;
  // bgZoom: number 100–300 → e.g. "150%" means zoomed in 50%.
  // Falls back to "cover" if no bgZoom is set (preserves old behaviour).
  cardStyle.backgroundSize = bgImage
    ? (template.bgZoom ? `${template.bgZoom}%` : "cover")
    : "cover";
  cardStyle.backgroundPosition = "center";
  cardStyle.backgroundRepeat = "no-repeat";

  return (
    <div
      ref={canvasRef}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => onSelect(null)}
    >
      {elements.map(el => (
        <div key={el.id} style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height }}>
          <ElementRenderer
            el={el}
            selected={selectedId === el.id}
            onSelect={onSelect}
            onDragStart={handleDragStart}
            data={data}
          />
          {selectedId === el.id && (
            <ResizeHandle onResizeStart={(e) => handleResizeStart(e, el.id)} />
          )}
        </div>
      ))}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────
export default function IDCardGenerator() {
  // Navigation
  const [page, setPage] = useState("dashboard");

  // Template state
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem("idgen_templates") || "[]"); } catch { return []; }
  });
  const [activeTemplate, setActiveTemplate] = useState({
    id: uid(),
    name: "My ID Card",
    background: DEFAULT_TEMPLATES[0].bg,
    bgImage: null,
    orientation: "landscape",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
  const [elements, setElements] = useState([
    // Default elements
    {
      id: uid(), type: "shape", x: 0, y: 0, width: CARD_WIDTH, height: 45,
      fill: "rgba(0,0,0,0.3)", stroke: "none", strokeWidth: 0, zIndex: 1
    },
    {
      id: uid(), type: "text", x: 60, y: 10, width: 200, height: 24,
      defaultValue: "COMPANY NAME", fontSize: 16, fontWeight: "bold",
      color: "#ffffff", fontFamily: "Georgia", align: "left", zIndex: 2
    },
    {
      id: uid(), type: "image", x: 8, y: 55, width: 70, height: 80,
      borderRadius: 6, zIndex: 3, dataKey: "Photo"
    },
    {
      id: uid(), type: "text", x: 90, y: 58, width: 180, height: 20,
      defaultValue: "Full Name", fontSize: 14, fontWeight: "bold",
      color: "#ffffff", fontFamily: "Georgia", align: "left", zIndex: 3, dataKey: "Name"
    },
    {
      id: uid(), type: "text", x: 90, y: 80, width: 180, height: 16,
      defaultValue: "Department", fontSize: 11, color: "#e0e0e0",
      fontFamily: "Inter", align: "left", zIndex: 3, dataKey: "Department"
    },
    {
      id: uid(), type: "text", x: 90, y: 98, width: 180, height: 16,
      defaultValue: "ID: 000000", fontSize: 11, color: "#f0a500",
      fontFamily: "Courier New", fontWeight: "bold", align: "left", zIndex: 3, dataKey: "ID"
    },
    {
      id: uid(), type: "qr", x: 258, y: 130, width: 56, height: 56, zIndex: 3, dataKey: "ID"
    },
    {
      id: uid(), type: "text", x: 8, y: 168, width: 240, height: 16,
      defaultValue: "123 Company Street, City, Country", fontSize: 9,
      color: "rgba(255,255,255,0.6)", fontFamily: "Inter", align: "left", zIndex: 3
    },
  ]);
  const [selectedId, setSelectedId] = useState(null);
  const [templateName, setTemplateName] = useState("My ID Card");

  // ── EDITOR CANVAS ZOOM ──
  // Controls how large the ID card canvas appears in the editor.
  // 1.0 = original size (323×204px), 1.5 = 50% bigger, 2.0 = double, etc.
  const [canvasZoom, setCanvasZoom] = useState(1.5);

  // ── BACKGROUND IMAGE ZOOM ──
  // Controls background-size of the uploaded bg image on the card.
  // Stored as a percentage string e.g. "120%" or "cover".
  // We store a numeric value 100–300 and apply it as background-size.
  const [bgZoom, setBgZoom] = useState(100);

  // Excel state
  const [excelData, setExcelData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState("");

  // Generation state
  const [generatedCards, setGeneratedCards] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewCard, setPreviewCard] = useState(null);

  // ─── MANUAL PHOTO ASSIGNMENT STATE ───────────────────────────
  // cardPhotos: { [cardId]: base64DataUrl }
  // Stores manually uploaded photos keyed by card ID.
  // This is separate from Excel-mapped photos so neither overwrites the other.
  const [cardPhotos, setCardPhotos] = useState({});

  // Track which card is currently showing the photo upload dropzone
  const [photoUploadTarget, setPhotoUploadTarget] = useState(null);

  // Track drag-over state for each card's drop zone: { [cardId]: boolean }
  const [dragOverCard, setDragOverCard] = useState({});

  /**
   * Assign a manually uploaded photo to a specific card.
   * Reads the file as base64 and stores it in cardPhotos state.
   * Also updates the card's data so TemplateCanvas renders the new photo immediately.
   * @param {string} cardId - The generated card's unique ID
   * @param {File} file - The image file from input or drag-and-drop
   */
  const assignPhotoToCard = (cardId, file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      // Store in cardPhotos map for fast lookup
      setCardPhotos(prev => ({ ...prev, [cardId]: base64 }));
      // Also close the upload panel for this card
      setPhotoUploadTarget(null);
      // If the card is currently open in preview modal, refresh it
      setPreviewCard(prev => prev && prev.id === cardId ? { ...prev, _photoOverride: base64 } : prev);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Remove a manually assigned photo from a card,
   * reverting it back to the Excel-mapped photo (if any) or placeholder.
   * @param {string} cardId - The generated card's unique ID
   */
  const removePhotoFromCard = (cardId) => {
    setCardPhotos(prev => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
    setPreviewCard(prev => prev && prev.id === cardId ? { ...prev, _photoOverride: null } : prev);
  };

  /**
   * Build the effective data object for a card by merging:
   * 1. Original Excel row data
   * 2. Manually uploaded photo (overrides Excel photo if present)
   * This is passed to TemplateCanvas as the `data` prop.
   * @param {object} card - A generated card object
   * @returns {object} Merged data for rendering
   */
  const getCardRenderData = (card) => {
    const manualPhoto = cardPhotos[card.id];
    if (!manualPhoto) return card.data;
    // Find which element is the image type and what dataKey it uses
    const imageEl = elements.find(el => el.type === "image" && el.dataKey);
    if (!imageEl) return { ...card.data, _manualPhoto: manualPhoto };
    // Inject the manual photo under the same key the template expects
    return { ...card.data, [imageEl.dataKey]: manualPhoto };
  };

  // Derived
  const selectedElement = elements.find(e => e.id === selectedId);

  // ── TEMPLATE OPS ──
  const saveTemplate = () => {
    const tmpl = {
      ...activeTemplate,
      id: activeTemplate.id || uid(),
      name: templateName,
      elements,
      savedAt: new Date().toISOString(),
    };
    const updated = templates.filter(t => t.id !== tmpl.id).concat(tmpl);
    setTemplates(updated);
    try { localStorage.setItem("idgen_templates", JSON.stringify(updated)); } catch {}
    alert("✅ Template saved successfully!");
  };

  const loadTemplate = (tmpl) => {
    setActiveTemplate({ id: tmpl.id, name: tmpl.name, background: tmpl.background, bgImage: tmpl.bgImage, orientation: tmpl.orientation || "landscape", width: tmpl.width || CARD_WIDTH, height: tmpl.height || CARD_HEIGHT });
    setElements(tmpl.elements || []);
    setTemplateName(tmpl.name);
    setSelectedId(null);
    setPage("editor");
  };

  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    try { localStorage.setItem("idgen_templates", JSON.stringify(updated)); } catch {}
  };

  // ── ELEMENT OPS ──
  const addElement = (type) => {
    const defaults = {
      text: { width: 120, height: 20, defaultValue: "New Text", fontSize: 12, color: "#ffffff", fontFamily: "Inter", align: "left", zIndex: 10 },
      image: { width: 70, height: 80, borderRadius: 4, zIndex: 10 },
      logo: { width: 60, height: 40, zIndex: 10 },
      qr: { width: 60, height: 60, zIndex: 10 },
      barcode: { width: 120, height: 40, zIndex: 10 },
      shape: { width: 100, height: 30, fill: "rgba(255,255,255,0.2)", stroke: "rgba(255,255,255,0.4)", strokeWidth: 1, shape: "rect", zIndex: 10 },
    };
    const el = { id: uid(), type, x: 20, y: 20, ...defaults[type] };
    setElements(prev => [...prev, el]);
    setSelectedId(el.id);
  };

  const updateElement = (id, changes) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...changes } : el));
  };

  const deleteElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedId(null);
  };

  // ── EXCEL UPLOAD ──
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setExcelData(rows);
      setColumns(rows.length > 0 ? Object.keys(rows[0]) : []);
    };
    reader.readAsBinaryString(file);
  };

  // ── BATCH GENERATION ──
  const generateCards = async () => {
    if (excelData.length === 0) { alert("Please upload Excel data first!"); return; }
    setGenerating(true);
    setProgress(0);
    setGeneratedCards([]);

    const cards = [];
    const batchSize = 50;
    for (let i = 0; i < excelData.length; i++) {
      cards.push({ id: uid(), data: excelData[i], index: i });
      if (i % batchSize === 0) {
        setProgress(Math.round((i / excelData.length) * 100));
        await new Promise(r => setTimeout(r, 0)); // yield to UI
      }
    }
    setGeneratedCards(cards);
    setProgress(100);
    setGenerating(false);
  };

  // ── EXPORT (HTML print) ──
  // Uses getCardRenderData() so manually uploaded photos are included in export
  const exportPDF = () => {
    const printWin = window.open("", "_blank");
    const cardHTMLs = generatedCards.slice(0, 200).map(card => {
      // ← Use merged data (Excel + manual photo override)
      const renderData = getCardRenderData(card);
      const cardStyle = `
        width:${CARD_WIDTH}px;height:${CARD_HEIGHT}px;
        background:${activeTemplate.background || DEFAULT_TEMPLATES[0].bg};
        border-radius:8px;overflow:hidden;position:relative;
        display:inline-block;margin:10px;
        ${activeTemplate.bgImage ? `background-image:url(${activeTemplate.bgImage});background-size:cover;` : ""}
      `;
      const elHTMLs = elements.map(el => {
        const val = el.dataKey && renderData[el.dataKey] ? renderData[el.dataKey] : el.defaultValue || "";
        let inner = "";
        if (el.type === "text") {
          inner = `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;
            color:${el.color||"#fff"};font-size:${el.fontSize||12}px;font-family:${el.fontFamily||"sans-serif"};
            font-weight:${el.fontWeight||"normal"};text-align:${el.align||"left"};
            display:flex;align-items:center;overflow:hidden;padding:2px 4px;box-sizing:border-box;">${val}</div>`;
        } else if (el.type === "image" && val) {
          inner = `<img src="${val}" style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;object-fit:cover;border-radius:${el.borderRadius||4}px;" />`;
        } else if (el.type === "shape") {
          inner = `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;
            background:${el.fill||"rgba(255,255,255,0.2)"};border:${el.strokeWidth||1}px solid ${el.stroke||"transparent"};
            border-radius:${el.shape==="circle"?"50%":el.borderRadius||0}px;"></div>`;
        }
        return inner;
      }).join("");
      return `<div style="${cardStyle}">${elHTMLs}</div>`;
    }).join("");

    printWin.document.write(`
      <html><head><title>ID Cards</title>
      <style>body{margin:0;padding:20px;background:#f0f0f0;font-family:sans-serif;}
      @media print{body{background:white;}.no-print{display:none;}}
      </style></head><body>
      <div class="no-print" style="margin-bottom:20px;text-align:center;">
        <button onclick="window.print()" style="padding:10px 30px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:16px;">🖨 Print / Save PDF</button>
      </div>
      <div style="text-align:center;">${cardHTMLs}</div>
      </body></html>
    `);
    printWin.document.close();
  };

  const downloadSingle = (card) => {
    const win = window.open("", "_blank");
    // ← Use merged data so manually uploaded photo appears in single download too
    const renderData = getCardRenderData(card);
    const cardStyle = `
      width:${CARD_WIDTH}px;height:${CARD_HEIGHT}px;
      background:${activeTemplate.background || DEFAULT_TEMPLATES[0].bg};
      border-radius:8px;overflow:hidden;position:relative;margin:40px auto;
    `;
    const elHTMLs = elements.map(el => {
      const val = el.dataKey && renderData[el.dataKey] ? renderData[el.dataKey] : el.defaultValue || "";
      if (el.type === "text") {
        return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;color:${el.color||"#fff"};font-size:${el.fontSize||12}px;font-family:${el.fontFamily||"sans-serif"};font-weight:${el.fontWeight||"normal"};text-align:${el.align||"left"};display:flex;align-items:center;padding:2px 4px;box-sizing:border-box;">${val}</div>`;
      }
      if (el.type === "image" && val) return `<img src="${val}" style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;object-fit:cover;border-radius:${el.borderRadius||4}px;"/>`;
      if (el.type === "shape") return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;background:${el.fill||"transparent"};border:${el.strokeWidth||0}px solid ${el.stroke||"transparent"};border-radius:${el.shape==="circle"?"50%":"0"};"></div>`;
      return "";
    }).join("");
    win.document.write(`<html><head><title>ID Card</title></head><body style="background:#1a1a2e;">${`<div style="${cardStyle}">${elHTMLs}</div>`}</body></html>`);
    win.document.close();
  };

  // ── BG IMAGE UPLOAD ──
  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setBgZoom(100); // reset zoom to 100% on new upload
      setActiveTemplate(t => ({ ...t, bgImage: evt.target.result, bgZoom: 100 }));
    };
    reader.readAsDataURL(file);
  };

  // ── LOGO UPLOAD ──
  const handleLogoUpload = (e, elId) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => updateElement(elId, { logoSrc: evt.target.result });
    reader.readAsDataURL(file);
  };

  // ─── EXAMPLE DATA DOWNLOAD ──
  const downloadExampleExcel = () => {
    const exampleData = [
      { Name: "Alice Johnson", Department: "Engineering", ID: "EMP-0042", Email: "alice@company.com", Phone: "+1-555-0100", Photo: "" },
      { Name: "Bob Williams", Department: "Marketing", ID: "EMP-0043", Email: "bob@company.com", Phone: "+1-555-0101", Photo: "" },
      { Name: "Carol Davis", Department: "HR", ID: "EMP-0044", Email: "carol@company.com", Phone: "+1-555-0102", Photo: "" },
      { Name: "David Lee", Department: "Finance", ID: "EMP-0045", Email: "david@company.com", Phone: "+1-555-0103", Photo: "" },
      { Name: "Emma Brown", Department: "Design", ID: "EMP-0046", Email: "emma@company.com", Phone: "+1-555-0104", Photo: "" },
    ];
    const ws = XLSX.utils.json_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "example_employees.xlsx");
  };

  // ─── SIDEBAR ──────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "editor", icon: "✏️", label: "Template Editor" },
    { id: "templates", icon: "📋", label: "Templates" },
    { id: "excel", icon: "📊", label: "Upload Excel" },
    { id: "generate", icon: "⚡", label: "Generate Cards" },
    { id: "exports", icon: "📥", label: "Exports" },
  ];

  const sidebarStyle = {
    width: 200,
    background: "#0f172a",
    borderRight: "1px solid #1e293b",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    height: "100vh",
  };

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
            <span style={{ color: "#6366f1" }}>ID</span>
            <span style={{ color: "#f1f5f9" }}>Forge</span>
          </div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Card Generator Pro</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                background: page === item.id ? "#1e293b" : "transparent",
                color: page === item.id ? "#a5b4fc" : "#64748b",
                fontSize: 13, fontWeight: page === item.id ? 600 : 400,
                marginBottom: 2, transition: "all 0.15s", textAlign: "left",
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom info */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b", fontSize: 11, color: "#475569" }}>
          <div style={{ marginBottom: 4 }}>📊 {excelData.length} records loaded</div>
          <div>🃏 {generatedCards.length} cards generated</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Bar */}
        <div style={{ height: 52, background: "#0f172a", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{
            navItems.find(n => n.id === page)?.label || "Dashboard"
          }</div>
          <div style={{ display: "flex", gap: 8 }}>
            {page === "editor" && (
              <>
                <button onClick={() => document.getElementById("bg-upload").click()}
                  style={{ padding: "5px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 5, color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
                  🖼 Background
                </button>
                <input id="bg-upload" type="file" accept="image/*" onChange={handleBgUpload} style={{ display: "none" }} />
                <button onClick={saveTemplate}
                  style={{ padding: "5px 12px", background: "#6366f1", border: "none", borderRadius: 5, color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  💾 Save Template
                </button>
              </>
            )}
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
            👤
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflow: "hidden" }}>

          {/* ── DASHBOARD ── */}
          {page === "dashboard" && (
            <div style={{ padding: 28, overflowY: "auto", height: "100%" }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 6 }}>Welcome to IDForge 👋</h1>
                <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>Professional ID card generation at scale</p>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "Templates", value: templates.length, icon: "📋", color: "#6366f1" },
                  { label: "Records", value: excelData.length, icon: "📊", color: "#10b981" },
                  { label: "Generated", value: generatedCards.length, icon: "🃏", color: "#f59e0b" },
                  { label: "Columns", value: columns.length, icon: "📌", color: "#ec4899" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#1e293b", borderRadius: 10, padding: "18px 20px", border: "1px solid #334155" }}>
                    <div style={{ fontSize: 22 }}>{s.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Quick Actions</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { label: "Open Template Editor", desc: "Design your ID card layout", icon: "✏️", action: () => setPage("editor"), color: "#6366f1" },
                    { label: "Upload Excel Data", desc: "Import employee/student data", icon: "📊", action: () => setPage("excel"), color: "#10b981" },
                    { label: "Generate ID Cards", desc: "Batch generate all cards", icon: "⚡", action: () => setPage("generate"), color: "#f59e0b" },
                    { label: "Download Example Excel", desc: "Get started with sample data", icon: "📥", action: downloadExampleExcel, color: "#ec4899" },
                    { label: "View Templates", desc: "Manage saved templates", icon: "📋", action: () => setPage("templates"), color: "#8b5cf6" },
                    { label: "Export Cards", desc: "Print or download cards", icon: "🖨️", action: () => setPage("exports"), color: "#06b6d4" },
                  ].map(a => (
                    <button key={a.label} onClick={a.action}
                      style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#334155"}
                    >
                      <div style={{ fontSize: 20, marginBottom: 8 }}>{a.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9", marginBottom: 4 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{a.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Workflow */}
              <div style={{ background: "#1e293b", borderRadius: 10, padding: 20, border: "1px solid #334155" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>How It Works</h2>
                <div style={{ display: "flex", gap: 0 }}>
                  {[
                    { step: "1", label: "Design Template", desc: "Use the drag & drop editor to create your ID card layout" },
                    { step: "2", label: "Upload Data", desc: "Import your Excel/CSV with names, photos, departments" },
                    { step: "3", label: "Map Columns", desc: "Link Excel columns to template placeholders" },
                    { step: "4", label: "Generate & Export", desc: "Batch generate all cards and download as PDF" },
                  ].map((s, i) => (
                    <div key={s.step} style={{ flex: 1, display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{s.step}</div>
                        {i < 3 && <div style={{ width: 1, height: "100%", background: "#334155", marginTop: 4 }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TEMPLATE EDITOR ── */}
          {page === "editor" && (
            <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
              {/* Left Toolbar */}
              <div style={{ width: 52, background: "#0f172a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", padding: "8px 0", gap: 4 }}>
                {[
                  { type: "text", icon: "T", title: "Add Text" },
                  { type: "image", icon: "🖼", title: "Add Photo" },
                  { type: "logo", icon: "🏢", title: "Add Logo" },
                  { type: "qr", icon: "⊞", title: "Add QR Code" },
                  { type: "barcode", icon: "▌▌", title: "Add Barcode" },
                  { type: "shape", icon: "□", title: "Add Shape" },
                ].map(t => (
                  <button key={t.type}
                    title={t.title}
                    onClick={() => addElement(t.type)}
                    style={{
                      width: 40, height: 40, margin: "0 auto", borderRadius: 6,
                      border: "1px solid #334155", background: "#1e293b",
                      color: "#94a3b8", cursor: "pointer", fontSize: t.type === "text" ? 16 : 13,
                      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700
                    }}
                  >{t.icon}</button>
                ))}

                <div style={{ borderTop: "1px solid #1e293b", margin: "4px 0", paddingTop: 4 }}>
                  {/* Background color picker */}
                  <input type="color" title="Background Color"
                    value="#1e3a5f"
                    onChange={e => setActiveTemplate(t => ({ ...t, background: e.target.value }))}
                    style={{ width: 40, height: 40, margin: "0 auto 4px", display: "block", border: "none", borderRadius: 6, cursor: "pointer", padding: 2 }}
                  />
                </div>
              </div>

              {/* Canvas Area */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0f172a", position: "relative", overflow: "hidden" }}>

                {/* ── Zoom toolbar (sits above the canvas) ── */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 16px", borderBottom: "1px solid #1e293b",
                  background: "#0f172a", flexShrink: 0,
                }}>
                  {/* Canvas zoom controls */}
                  <span style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap" }}>🔍 Canvas Zoom</span>
                  <button
                    title="Zoom out"
                    onClick={() => setCanvasZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))}
                    style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                  >−</button>
                  <span style={{ fontSize: 12, color: "#a5b4fc", minWidth: 38, textAlign: "center", fontWeight: 700 }}>
                    {Math.round(canvasZoom * 100)}%
                  </span>
                  <button
                    title="Zoom in"
                    onClick={() => setCanvasZoom(z => Math.min(3.0, +(z + 0.1).toFixed(1)))}
                    style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                  >+</button>
                  {/* Preset zoom buttons */}
                  {[0.75, 1.0, 1.5, 2.0].map(z => (
                    <button key={z}
                      onClick={() => setCanvasZoom(z)}
                      style={{
                        padding: "3px 8px", borderRadius: 4, fontSize: 11,
                        border: `1px solid ${canvasZoom === z ? "#6366f1" : "#334155"}`,
                        background: canvasZoom === z ? "#312e81" : "#1e293b",
                        color: canvasZoom === z ? "#a5b4fc" : "#64748b",
                        cursor: "pointer",
                      }}
                    >{z * 100}%</button>
                  ))}

                  <div style={{ width: 1, height: 20, background: "#334155", margin: "0 4px" }} />

                  {/* Background image zoom slider — only visible when a bg image is uploaded */}
                  {activeTemplate.bgImage && (
                    <>
                      <span style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap" }}>🖼 BG Zoom</span>
                      <button
                        title="BG zoom out"
                        onClick={() => {
                          const next = Math.max(50, bgZoom - 10);
                          setBgZoom(next);
                          setActiveTemplate(t => ({ ...t, bgZoom: next }));
                        }}
                        style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                      >−</button>
                      <input
                        type="range"
                        min={50} max={300} step={5}
                        value={bgZoom}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setBgZoom(val);
                          // Live-update the template so card preview updates instantly
                          setActiveTemplate(t => ({ ...t, bgZoom: val }));
                        }}
                        style={{ width: 90, accentColor: "#6366f1" }}
                        title={`Background zoom: ${bgZoom}%`}
                      />
                      <button
                        title="BG zoom in"
                        onClick={() => {
                          const next = Math.min(300, bgZoom + 10);
                          setBgZoom(next);
                          setActiveTemplate(t => ({ ...t, bgZoom: next }));
                        }}
                        style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                      >+</button>
                      <span style={{ fontSize: 12, color: "#f0a500", fontWeight: 700, minWidth: 36 }}>{bgZoom}%</span>
                      {/* Reset bg zoom */}
                      <button
                        onClick={() => { setBgZoom(100); setActiveTemplate(t => ({ ...t, bgZoom: 100 })); }}
                        style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, border: "1px solid #334155", background: "#1e293b", color: "#64748b", cursor: "pointer" }}
                        title="Reset BG zoom to 100%"
                      >Reset</button>
                      {/* Remove bg image */}
                      <button
                        onClick={() => { setBgZoom(100); setActiveTemplate(t => ({ ...t, bgImage: null, bgZoom: 100 })); }}
                        style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, border: "1px solid #7f1d1d", background: "#3b0000", color: "#fca5a5", cursor: "pointer" }}
                        title="Remove background image"
                      >✕ Remove BG</button>
                    </>
                  )}
                </div>

                {/* ── Scrollable canvas workspace ── */}
                <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                  {/*
                    The outer wrapper is sized to fit the SCALED card so the scroll
                    container knows the real dimensions. We use an explicit width/height
                    on the wrapper equal to the scaled card size so centering works even
                    when the card is larger than the viewport.
                  */}
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    // Let the wrapper grow so the scrollable area always fits the card
                    minWidth: CARD_WIDTH * canvasZoom + 40,
                  }}>
                    {/* Template name + preset selector row */}
                    <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "6px 10px", fontSize: 13, width: 200 }}
                        placeholder="Template name..."
                      />
                      <select
                        value={activeTemplate.background || ""}
                        onChange={e => setActiveTemplate(t => ({ ...t, background: e.target.value }))}
                        style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#f1f5f9", padding: "6px 10px", fontSize: 12 }}
                      >
                        {DEFAULT_TEMPLATES.map(t => (
                          <option key={t.id} value={t.bg}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* The card canvas — scaled by canvasZoom using CSS transform */}
                    <div style={{
                      // transform-origin top-left so the scroll container sizes correctly
                      transform: `scale(${canvasZoom})`,
                      transformOrigin: "top center",
                      // Reserve space equal to scaled size so layout doesn't collapse
                      marginBottom: CARD_HEIGHT * (canvasZoom - 1),
                    }}>
                      <TemplateCanvas
                        template={activeTemplate}
                        elements={elements}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onUpdateElement={updateElement}
                        data={excelData[0] || {}}
                      />
                    </div>

                    {/* Size info label */}
                    <div style={{ marginTop: 8, fontSize: 11, color: "#475569", textAlign: "center" }}>
                      {CARD_WIDTH} × {CARD_HEIGHT}px &nbsp;·&nbsp; 3.375″ × 2.125″ (CR80)
                      &nbsp;·&nbsp; Canvas {Math.round(canvasZoom * 100)}%
                      {activeTemplate.bgImage && <>&nbsp;·&nbsp; BG {bgZoom}%</>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Properties Panel */}
              <div style={{ width: 220, background: "#0f172a", borderLeft: "1px solid #1e293b", overflowY: "auto" }}>
                {/* Element list */}
                <div style={{ borderBottom: "1px solid #1e293b", padding: "8px" }}>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, padding: "0 4px" }}>Layers</div>
                  <div style={{ maxHeight: 140, overflowY: "auto" }}>
                    {[...elements].reverse().map(el => (
                      <div key={el.id}
                        onClick={() => setSelectedId(el.id)}
                        style={{
                          padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11,
                          background: selectedId === el.id ? "#1e293b" : "transparent",
                          color: selectedId === el.id ? "#a5b4fc" : "#64748b",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <span>{el.type === "text" ? "T" : el.type === "image" ? "🖼" : el.type === "qr" ? "⊞" : el.type === "barcode" ? "▌▌" : el.type === "logo" ? "🏢" : "□"}</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {el.type === "text" ? (el.defaultValue || el.dataKey || "Text") : el.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <PropertyPanel
                  element={selectedElement}
                  onUpdate={updateElement}
                  columns={columns}
                  onDelete={deleteElement}
                />

                {/* Logo upload for selected logo element */}
                {selectedElement?.type === "logo" && (
                  <div style={{ padding: "8px 12px", borderTop: "1px solid #1e293b" }}>
                    <label style={{ color: "#64748b", fontSize: 10 }}>UPLOAD LOGO</label>
                    <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, selectedElement.id)}
                      style={{ display: "block", marginTop: 4, fontSize: 11, color: "#94a3b8", width: "100%" }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TEMPLATES ── */}
          {page === "templates" && (
            <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Saved Templates</h2>
                <button onClick={() => { setPage("editor"); setActiveTemplate({ id: uid(), name: "New Template", background: DEFAULT_TEMPLATES[0].bg, bgImage: null }); setElements([]); setTemplateName("New Template"); }}
                  style={{ padding: "7px 16px", background: "#6366f1", border: "none", borderRadius: 6, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  + New Template
                </button>
              </div>

              {templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 16, marginBottom: 8 }}>No saved templates</div>
                  <div style={{ fontSize: 13 }}>Go to the Template Editor and save your first template</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {templates.map(tmpl => (
                    <div key={tmpl.id} style={{ background: "#1e293b", borderRadius: 10, border: "1px solid #334155", overflow: "hidden" }}>
                      {/* Mini preview */}
                      <div style={{ height: 100, background: tmpl.background || "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        {tmpl.bgImage ? <img src={tmpl.bgImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Card Preview"}
                      </div>
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{tmpl.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
                          {tmpl.elements?.length || 0} elements • Saved {new Date(tmpl.savedAt).toLocaleDateString()}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => loadTemplate(tmpl)}
                            style={{ flex: 1, padding: "6px", background: "#6366f1", border: "none", borderRadius: 5, color: "white", cursor: "pointer", fontSize: 12 }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => deleteTemplate(tmpl.id)}
                            style={{ padding: "6px 10px", background: "#7f1d1d", border: "none", borderRadius: 5, color: "#fca5a5", cursor: "pointer", fontSize: 12 }}>
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── EXCEL UPLOAD ── */}
          {page === "excel" && (
            <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Upload Excel Data</h2>

              {/* Upload zone */}
              <div style={{
                border: "2px dashed #334155", borderRadius: 12, padding: 40,
                textAlign: "center", marginBottom: 24, cursor: "pointer",
                transition: "all 0.2s",
              }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#6366f1"; }}
                onDragLeave={e => e.currentTarget.style.borderColor = "#334155"}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#334155"; handleExcelUpload({ target: { files: e.dataTransfer.files } }); }}
                onClick={() => document.getElementById("excel-input").click()}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drop your Excel or CSV file here</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Supports .xlsx, .xls, .csv files</div>
                <button style={{ padding: "8px 20px", background: "#6366f1", border: "none", borderRadius: 6, color: "white", cursor: "pointer", fontSize: 13 }}>
                  Browse Files
                </button>
                <input id="excel-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: "none" }} />
              </div>

              <button onClick={downloadExampleExcel}
                style={{ padding: "8px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", cursor: "pointer", fontSize: 13, marginBottom: 24 }}>
                📥 Download Example Excel
              </button>

              {/* Columns detected */}
              {columns.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>
                    ✅ {fileName} loaded — {excelData.length} rows, {columns.length} columns
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {columns.map(col => (
                      <span key={col} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#94a3b8" }}>
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data preview table */}
              {excelData.length > 0 && (
                <div style={{ background: "#1e293b", borderRadius: 10, border: "1px solid #334155", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", fontWeight: 600, borderBottom: "1px solid #334155", fontSize: 13 }}>
                    Data Preview (first 10 rows)
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#0f172a" }}>
                          <th style={{ padding: "8px 12px", color: "#64748b", textAlign: "left", borderBottom: "1px solid #334155" }}>#</th>
                          {columns.map(col => (
                            <th key={col} style={{ padding: "8px 12px", color: "#64748b", textAlign: "left", borderBottom: "1px solid #334155", whiteSpace: "nowrap" }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {excelData.slice(0, 10).map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                            <td style={{ padding: "8px 12px", color: "#475569" }}>{i + 1}</td>
                            {columns.map(col => (
                              <td key={col} style={{ padding: "8px 12px", color: "#f1f5f9", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {String(row[col] || "").startsWith("data:image") ? "📷 [image]" : String(row[col] || "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Column mapping hint */}
              {columns.length > 0 && (
                <div style={{ background: "#1e293b", borderRadius: 10, border: "1px solid #334155", padding: 16, marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>📌 Column Mapping — Go to Template Editor</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                    In the Template Editor, select any <strong style={{ color: "#94a3b8" }}>Text</strong> or <strong style={{ color: "#94a3b8" }}>Image</strong> element.
                    Then in the Properties panel, set the <em>Data Column</em> to bind it to your Excel data.
                    When cards are generated, each row's data will fill the matching placeholders.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── GENERATE ── */}
          {page === "generate" && (
            <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Generate ID Cards</h2>

              {excelData.length === 0 && (
                <div style={{ background: "#1e293b", borderRadius: 10, padding: 20, marginBottom: 20, border: "1px solid #f59e0b40" }}>
                  ⚠️ No data loaded. <button onClick={() => setPage("excel")} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", textDecoration: "underline" }}>Upload Excel first</button>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
                <button
                  onClick={generateCards}
                  disabled={generating || excelData.length === 0}
                  style={{
                    padding: "10px 24px", background: generating ? "#334155" : "#6366f1",
                    border: "none", borderRadius: 8, color: "white", cursor: generating ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 700
                  }}
                >
                  {generating ? `Generating... ${progress}%` : `⚡ Generate ${excelData.length} Cards`}
                </button>
                {generatedCards.length > 0 && (
                  <span style={{ color: "#10b981", fontSize: 13 }}>✅ {generatedCards.length} cards ready</span>
                )}
              </div>

              {/* Progress bar */}
              {generating && (
                <div style={{ background: "#1e293b", borderRadius: 10, height: 8, marginBottom: 20, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #8b5cf6)", width: `${progress}%`, transition: "width 0.3s" }} />
                </div>
              )}

              {/* ── CARD GRID WITH MANUAL PHOTO UPLOAD ── */}
              {generatedCards.length > 0 && (
                <div>
                  {/* Stats bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "10px 14px", background: "#1e293b", borderRadius: 8, border: "1px solid #334155" }}>
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      Showing {Math.min(generatedCards.length, 50)} of {generatedCards.length} cards
                      {generatedCards.length > 50 && " (first 50 shown)"}
                    </span>
                    <span style={{ color: "#10b981", fontSize: 12 }}>
                      📷 {Object.keys(cardPhotos).length} photos assigned manually
                    </span>
                    {Object.keys(cardPhotos).length > 0 && (
                      <button
                        onClick={() => { if (window.confirm("Clear all manually uploaded photos?")) setCardPhotos({}); }}
                        style={{ marginLeft: "auto", padding: "4px 10px", background: "#7f1d1d", border: "none", borderRadius: 4, color: "#fca5a5", cursor: "pointer", fontSize: 11 }}
                      >
                        🗑 Clear All Photos
                      </button>
                    )}
                  </div>

                  {/* Card grid — each card gets photo upload controls */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                    {generatedCards.slice(0, 50).map(card => {
                      const hasManualPhoto = !!cardPhotos[card.id];
                      // Check if Excel data already has a photo
                      const imageEl = elements.find(el => el.type === "image" && el.dataKey);
                      const hasExcelPhoto = imageEl && !!card.data[imageEl.dataKey];
                      const hasAnyPhoto = hasManualPhoto || hasExcelPhoto;
                      const isUploadOpen = photoUploadTarget === card.id;
                      const isDragOver = !!dragOverCard[card.id];
                      const renderData = getCardRenderData(card);
                      const scaledW = Math.round(CARD_WIDTH * 0.6);
                      const scaledH = Math.round(CARD_HEIGHT * 0.6);

                      return (
                        <div key={card.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>

                          {/* ── Card Preview ── */}
                          <div style={{ position: "relative", width: scaledW, height: scaledH }}>
                            <div style={{ transform: "scale(0.6)", transformOrigin: "top left", width: CARD_WIDTH, height: CARD_HEIGHT, pointerEvents: "none" }}>
                              <TemplateCanvas
                                template={activeTemplate}
                                elements={elements}
                                selectedId={null}
                                onSelect={() => {}}
                                onUpdateElement={() => {}}
                                data={renderData}
                              />
                            </div>

                            {/* Photo status badge */}
                            <div style={{
                              position: "absolute", top: 4, right: 4,
                              background: hasManualPhoto ? "#065f46" : hasExcelPhoto ? "#1e3a5f" : "#451a03",
                              border: `1px solid ${hasManualPhoto ? "#10b981" : hasExcelPhoto ? "#3b82f6" : "#f59e0b"}`,
                              borderRadius: 10, padding: "2px 7px", fontSize: 9, fontWeight: 600,
                              color: hasManualPhoto ? "#6ee7b7" : hasExcelPhoto ? "#93c5fd" : "#fbbf24",
                            }}>
                              {hasManualPhoto ? "📷 Manual" : hasExcelPhoto ? "📊 Excel" : "⚠ No Photo"}
                            </div>
                          </div>

                          {/* ── Photo Upload Panel (expanded) ── */}
                          {isUploadOpen && (
                            <div style={{
                              width: scaledW,
                              background: "#0f172a",
                              border: `2px dashed ${isDragOver ? "#6366f1" : "#334155"}`,
                              borderRadius: 8,
                              padding: 10,
                              transition: "border-color 0.15s",
                            }}
                              onDragOver={e => {
                                e.preventDefault();
                                setDragOverCard(prev => ({ ...prev, [card.id]: true }));
                              }}
                              onDragLeave={() => setDragOverCard(prev => ({ ...prev, [card.id]: false }))}
                              onDrop={e => {
                                e.preventDefault();
                                setDragOverCard(prev => ({ ...prev, [card.id]: false }));
                                const file = e.dataTransfer.files[0];
                                if (file) assignPhotoToCard(card.id, file);
                              }}
                            >
                              {/* Drop zone */}
                              <div style={{ textAlign: "center", marginBottom: 8 }}>
                                <div style={{ fontSize: 18, marginBottom: 4 }}>{isDragOver ? "⬇️" : "📸"}</div>
                                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>
                                  {isDragOver ? "Drop to assign photo" : "Drag & drop or click to upload"}
                                </div>
                                {/* File input trigger */}
                                <label style={{ cursor: "pointer" }}>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={e => {
                                      const file = e.target.files[0];
                                      if (file) assignPhotoToCard(card.id, file);
                                      e.target.value = ""; // reset so same file can be re-selected
                                    }}
                                  />
                                  <span style={{
                                    display: "inline-block",
                                    padding: "5px 12px", background: "#6366f1",
                                    borderRadius: 5, color: "white", fontSize: 11, fontWeight: 600,
                                  }}>
                                    Choose Photo
                                  </span>
                                </label>
                              </div>

                              {/* Thumbnail preview if manual photo exists */}
                              {hasManualPhoto && (
                                <div style={{ textAlign: "center" }}>
                                  <img
                                    src={cardPhotos[card.id]}
                                    alt="preview"
                                    style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "2px solid #10b981" }}
                                  />
                                  <div style={{ fontSize: 9, color: "#10b981", marginTop: 3 }}>✓ Assigned</div>
                                </div>
                              )}

                              {/* Cancel button */}
                              <button
                                onClick={() => setPhotoUploadTarget(null)}
                                style={{ width: "100%", marginTop: 6, padding: "3px", background: "transparent", border: "1px solid #334155", borderRadius: 4, color: "#64748b", cursor: "pointer", fontSize: 10 }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* ── Action Buttons Row ── */}
                          <div style={{ width: scaledW, display: "flex", gap: 3 }}>
                            {/* Preview */}
                            <button
                              onClick={() => setPreviewCard({ ...card, _photoOverride: cardPhotos[card.id] || null })}
                              style={{ flex: 1, padding: "4px 2px", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#94a3b8", cursor: "pointer", fontSize: 9 }}
                            >👁</button>

                            {/* Upload / Replace Photo */}
                            <button
                              onClick={() => setPhotoUploadTarget(isUploadOpen ? null : card.id)}
                              style={{
                                flex: 2, padding: "4px 3px",
                                background: isUploadOpen ? "#312e81" : hasManualPhoto ? "#164e63" : "#1e3a5f",
                                border: `1px solid ${isUploadOpen ? "#6366f1" : hasManualPhoto ? "#0891b2" : "#334155"}`,
                                borderRadius: 4, color: isUploadOpen ? "#a5b4fc" : hasManualPhoto ? "#67e8f9" : "#93c5fd",
                                cursor: "pointer", fontSize: 9, fontWeight: 600,
                              }}
                            >
                              {hasManualPhoto ? "🔄 Replace" : "📷 Photo"}
                            </button>

                            {/* Remove manual photo (only shown if manual photo exists) */}
                            {hasManualPhoto && (
                              <button
                                onClick={() => removePhotoFromCard(card.id)}
                                title="Remove manually uploaded photo"
                                style={{ flex: 1, padding: "4px 2px", background: "#3b0764", border: "1px solid #7c3aed", borderRadius: 4, color: "#c4b5fd", cursor: "pointer", fontSize: 9 }}
                              >✕</button>
                            )}

                            {/* Save single */}
                            <button
                              onClick={() => downloadSingle(card)}
                              style={{ flex: 1, padding: "4px 2px", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#94a3b8", cursor: "pointer", fontSize: 9 }}
                            >↓</button>
                          </div>

                          {/* Row label */}
                          <div style={{ width: scaledW, fontSize: 9, color: "#475569", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            #{card.index + 1} {Object.values(card.data)[0] || ""}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EXPORTS ── */}
          {page === "exports" && (
            <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Export Options</h2>

              {generatedCards.length === 0 && (
                <div style={{ background: "#1e293b", borderRadius: 10, padding: 20, marginBottom: 20, border: "1px solid #f59e0b40" }}>
                  ⚠️ No cards generated. <button onClick={() => setPage("generate")} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", textDecoration: "underline" }}>Generate cards first</button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, maxWidth: 600 }}>
                {[
                  {
                    title: "Print / Save as PDF",
                    desc: `Export all ${generatedCards.length} cards in a print-ready layout`,
                    icon: "🖨️",
                    action: exportPDF,
                    color: "#6366f1",
                    available: generatedCards.length > 0
                  },
                  {
                    title: "A4 Sheet Layout",
                    desc: "8 cards per A4 page, print-ready",
                    icon: "📄",
                    action: exportPDF,
                    color: "#10b981",
                    available: generatedCards.length > 0
                  },
                  {
                    title: "Download Example Excel",
                    desc: "Get a sample Excel file to start with",
                    icon: "📊",
                    action: downloadExampleExcel,
                    color: "#f59e0b",
                    available: true
                  },
                  {
                    title: "Save Template",
                    desc: "Save current template for later use",
                    icon: "💾",
                    action: saveTemplate,
                    color: "#8b5cf6",
                    available: true
                  },
                ].map(opt => (
                  <button
                    key={opt.title}
                    onClick={opt.action}
                    disabled={!opt.available}
                    style={{
                      background: "#1e293b", border: `1px solid ${opt.available ? "#334155" : "#1e293b"}`,
                      borderRadius: 10, padding: 20, cursor: opt.available ? "pointer" : "not-allowed",
                      textAlign: "left", opacity: opt.available ? 1 : 0.4,
                    }}
                    onMouseEnter={e => { if (opt.available) e.currentTarget.style.borderColor = opt.color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = opt.available ? "#334155" : "#1e293b"; }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{opt.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", marginBottom: 6 }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 24, background: "#1e293b", borderRadius: 10, padding: 20, border: "1px solid #334155", maxWidth: 600 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>📋 Export Summary</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 2 }}>
                  <div>Template: <strong style={{ color: "#f1f5f9" }}>{templateName}</strong></div>
                  <div>Total Records: <strong style={{ color: "#f1f5f9" }}>{excelData.length}</strong></div>
                  <div>Cards Generated: <strong style={{ color: "#10b981" }}>{generatedCards.length}</strong></div>
                  <div>Card Size: <strong style={{ color: "#f1f5f9" }}>3.375" × 2.125" (CR80 Standard)</strong></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── CARD PREVIEW MODAL ── */}
      {previewCard && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setPreviewCard(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 12, display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
              {/* Show photo status in modal header */}
              {cardPhotos[previewCard.id] && (
                <span style={{ fontSize: 11, color: "#10b981", marginRight: 8 }}>📷 Manual photo active</span>
              )}
              {/* Upload photo directly from the modal */}
              <label style={{ cursor: "pointer" }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) assignPhotoToCard(previewCard.id, file);
                    e.target.value = "";
                  }}
                />
                <span style={{ padding: "6px 14px", background: "#164e63", border: "1px solid #0891b2", borderRadius: 6, color: "#67e8f9", cursor: "pointer", fontSize: 13 }}>
                  📷 {cardPhotos[previewCard.id] ? "Replace Photo" : "Upload Photo"}
                </span>
              </label>
              {cardPhotos[previewCard.id] && (
                <button
                  onClick={() => removePhotoFromCard(previewCard.id)}
                  style={{ padding: "6px 12px", background: "#3b0764", border: "1px solid #7c3aed", borderRadius: 6, color: "#c4b5fd", cursor: "pointer", fontSize: 13 }}
                >✕ Remove Photo</button>
              )}
              <button
                onClick={() => downloadSingle(previewCard)}
                style={{ padding: "6px 14px", background: "#6366f1", border: "none", borderRadius: 6, color: "white", cursor: "pointer", fontSize: 13 }}
              >↓ Download</button>
              <button
                onClick={() => setPreviewCard(null)}
                style={{ padding: "6px 14px", background: "#334155", border: "none", borderRadius: 6, color: "#f1f5f9", cursor: "pointer", fontSize: 13 }}
              >✕ Close</button>
            </div>
            {/* ← Pass merged data (Excel + manual photo) to the preview canvas */}
            <TemplateCanvas
              template={activeTemplate}
              elements={elements}
              selectedId={null}
              onSelect={() => {}}
              onUpdateElement={() => {}}
              data={getCardRenderData(previewCard)}
            />
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", textAlign: "center" }}>
              Record #{previewCard.index + 1} — {Object.entries(previewCard.data).slice(0, 3).map(([k,v]) => `${k}: ${v}`).join(" | ")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
