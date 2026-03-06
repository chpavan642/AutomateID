# 🪪 Cards-Generator

**Cards-Generator** is a professional web application that automatically generates **ID cards, certificates, or membership cards from Excel data**.

The system provides a **visual template editor** where users can design card layouts and dynamically populate them using data from Excel spreadsheets.

Instead of manually creating hundreds of cards, this tool enables **fast batch generation with minimal errors**.

---

# 🚀 Features

## 🎨 Template Designer

Create ID card templates visually using a drag-and-drop interface.

Supported elements:

* Text fields
* Photo placeholders
* Logos
* QR codes
* Barcodes
* Shapes

Customization options:

* Font family
* Font size
* Font color
* Text alignment
* Bold / Italic / Underline
* Layer ordering
* Element resizing
* Element positioning

---

## 📊 Excel Data Import

Upload Excel or CSV files containing user information.

Supported formats:

* `.xlsx`
* `.xls`
* `.csv`

Example Excel file:

| Name          | Department  | ID     | Phone     |
| ------------- | ----------- | ------ | --------- |
| Alice Johnson | Engineering | EMP001 | 987654321 |
| Bob Williams  | Marketing   | EMP002 | 987654322 |

The system automatically detects **columns and rows**.

---

## 🔗 Column Mapping

Template placeholders can be connected to Excel columns.

Example mapping:

```
Name → Name
ID → Employee ID
Department → Department
Photo → Photo column
```

During generation, the system automatically replaces placeholders with Excel values.

---

## ⚡ Batch Card Generation

Generate **hundreds or thousands of cards instantly**.

Features:

* Batch processing
* Progress indicator
* Card preview grid
* Individual card preview
* Manual photo assignment

---

## 📷 Photo Handling

Photos can be loaded in multiple ways:

* Image URL from Excel
* Base64 encoded images
* Manual upload per card

Users can also **replace or assign photos individually** after generation.

---

## 🖨 Export Options

Cards can be exported in multiple formats:

* Print-ready layout
* Save as PDF
* Individual card download
* A4 sheet layout

---

## 💾 Template Management

Templates can be:

* Saved
* Edited
* Deleted
* Reused later

Templates are stored locally using browser storage.

---

# 🖥 Application Modules

### Dashboard

Overview of templates, uploaded data, and generated cards.

### Template Editor

Design card layouts using drag-and-drop components.

### Upload Excel

Import Excel or CSV data.

### Generate Cards

Batch generate cards from Excel records.

### Export

Download or print generated cards.

---

# 🏗 Technology Stack

Frontend

* React
* JavaScript
* HTML5
* CSS3

Libraries

* **SheetJS (xlsx)** – Excel file parsing
* **FileReader API** – File processing
* **Canvas rendering** – Template preview

Concepts used

* Dynamic template rendering
* Drag-and-drop UI
* Batch data processing
* Data-driven card generation

---

# 📦 Project Structure

```
Cards-Generator
│
├── src
│
├── components
│   ├── TemplateCanvas
│   ├── ElementRenderer
│   ├── PropertyPanel
│
├── pages
│   ├── Dashboard
│   ├── TemplateEditor
│   ├── UploadExcel
│   ├── GenerateCards
│   ├── ExportCards
│
├── utils
│   ├── QRGenerator
│   ├── BarcodeGenerator
│
└── IDCardGenerator.jsx
```

---

# ▶️ Installation

Clone the repository:

```
git clone https://github.com/YOUR_USERNAME/cards-generator.git
```

Move into the project directory:

```
cd cards-generator
```

Install dependencies:

```
npm install
```

Start the development server:

```
npm run dev
```

Open the application in the browser:

```
http://localhost:5173
```

---

# 📊 Example Workflow

1. Design a card template in the Template Editor
2. Upload Excel data containing user details
3. Map template fields to Excel columns
4. Generate cards in bulk
5. Export or print generated cards

---

# 🎯 Use Cases

Cards-Generator can be used for:

* College ID cards
* Company employee ID cards
* Event badges
* Membership cards
* Conference passes
* Student ID cards
* Certification cards

---

# 🧠 Future Improvements

Possible future enhancements:

* User authentication system
* Cloud template storage
* REST API backend
* Database integration
* QR code verification
* Image compression
* Multi-user collaboration

---

# 👨‍💻 Author

**Ch Pavan**

GitHub
https://github.com/chpavan642

---

# ⭐ Support

If you find this project useful, consider giving it a star.

```
⭐ Star this repository
```

---

# 📜 License

This project is licensed under the **MIT License**.
