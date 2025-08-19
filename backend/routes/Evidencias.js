const express = require("express");
const router = express.Router();
const multer = require("multer");

// Configuración de multer (guardará en carpeta "uploads")
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Ruta para subir evidencia
router.post("/:id", upload.single("file"), (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No se subió ningún archivo" });
    }

    // Aquí puedes guardar en DB: { articuloId: id, path: file.path, nombre: file.originalname }
    res.json({
      message: "Evidencia subida correctamente",
      articuloId: id,
      file: file.filename,
    });
  } catch (err) {
    res.status(500).json({ error: "Error al subir evidencia" });
  }
});

module.exports = router;
