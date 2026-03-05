# IDForge — Professional ID Card Generator

A full-stack SaaS-style ID card generator with drag-and-drop template designer, Excel batch import, and PDF export.

---

## 🚀 Quick Start (React Artifact - Zero Setup)

The `IDCardGenerator.jsx` file is a **self-contained React artifact** that runs instantly in Claude's artifact viewer.

**Features included:**
- ✅ Drag & drop template designer
- ✅ Excel/CSV upload (SheetJS)
- ✅ Column mapping to card fields
- ✅ Batch card generation (1000+ cards)
- ✅ QR code & barcode rendering
- ✅ Photo from Excel (URL or base64)
- ✅ Print/PDF export
- ✅ Template save/load (localStorage)
- ✅ Modern dark SaaS UI

---

## 📁 Full-Stack Project Structure

```
idcard-generator/
├── frontend/                    # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── TemplateCanvas.jsx      # Drag & drop canvas
│   │   │   ├── PropertyPanel.jsx       # Element properties
│   │   │   ├── ElementRenderer.jsx     # Renders each element
│   │   │   ├── ExcelUploader.jsx       # File upload + SheetJS
│   │   │   ├── CardGrid.jsx            # Generated cards grid
│   │   │   └── Sidebar.jsx             # Navigation sidebar
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Editor.jsx
│   │   │   ├── Templates.jsx
│   │   │   ├── Generate.jsx
│   │   │   └── Exports.jsx
│   │   ├── store/
│   │   │   └── useStore.js             # Zustand state management
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # Node.js + Express + SQLite
│   ├── controllers/
│   │   ├── templateController.js
│   │   ├── excelController.js
│   │   └── exportController.js
│   ├── routes/
│   │   ├── templates.js
│   │   ├── excel.js
│   │   └── exports.js
│   ├── services/
│   │   ├── pdfService.js               # jsPDF card generation
│   │   ├── imageService.js             # Sharp image processing
│   │   └── barcodeService.js
│   ├── models/
│   │   └── db.js                       # SQLite setup
│   ├── uploads/                         # Uploaded files
│   ├── exports/                         # Generated PDFs
│   ├── server.js
│   └── package.json
│
└── example_data/
    └── example_employees.xlsx
```

## 🖥️ Running Locally

### Option A: React Artifact (No install needed)
Open `IDCardGenerator.jsx` in the Claude artifact viewer — everything runs in browser.

### Option B: Full-stack local development

```bash
# Terminal 1 — Backend
cd backend
node server.js
# Runs on http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 📊 Example Excel Format

| Name | Department | ID | Email | Phone | Photo |
|------|-----------|-----|-------|-------|-------|
| Alice Johnson | Engineering | EMP-0042 | alice@co.com | +1-555-0100 | (image URL or base64) |
| Bob Williams | Marketing | EMP-0043 | bob@co.com | +1-555-0101 | |

**Photo column** supports:
- Image URLs: `https://example.com/photo.jpg`
- Base64: `data:image/jpeg;base64,/9j/4AAQ...`
- Leave empty to use photo placeholder

---

## 🎨 Template Designer How-To

1. **Add elements** using the left toolbar (T = Text, 🖼 = Photo, ⊞ = QR, etc.)
2. **Drag** elements to position them on the card
3. **Resize** using the purple handle (bottom-right corner)
4. **Select** an element → Properties panel appears on the right
5. **Bind data** by setting the "Data Column" dropdown to your Excel column name
6. **Save** the template using the top-right Save button
7. **Load template** from the Templates page

## ⚡ Batch Generation

1. Upload Excel data (Upload Excel page)
2. Ensure template elements are bound to correct columns
3. Click "Generate N Cards"  
4. Preview cards in the grid
5. Click Print/Save PDF in Exports

---

## 🔧 Performance Notes

- The React artifact handles **1000+ cards** using async batching with `setTimeout(0)` yields to keep UI responsive
- Progress bar updates every 50 records
- Preview grid shows first 50 cards (all are exported)
- For very large batches (5000+), use the backend PDF service which streams output

---

## 📦 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS |
| State | Zustand / React useState |
| Excel parsing | SheetJS (xlsx) |
| QR codes | Custom SVG renderer |
| Barcodes | Custom SVG renderer |
| PDF export | Browser print dialog |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| File storage | Local filesystem (multer) |
| PDF generation | jsPDF |
| Image processing | Sharp |
