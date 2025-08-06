const express = require('express');
const router = express.Router();
const { evaluarCumplimiento } = require('../controllers/evaluacionController');

const controlesGDPR = require('../data/gdpr');
const controlesSOX = require('../data/sox');

// POST: evaluación
router.post('/evaluar', evaluarCumplimiento);

// GET: controles
router.get('/controles/:normativa', (req, res) => {
  const normativa = req.params.normativa.toUpperCase();

  switch (normativa) {
    case 'GDPR':
      return res.json(controlesGDPR);
    case 'SOX':
      return res.json(controlesSOX);
    default:
      return res.status(404).json({ error: 'Normativa no encontrada' });
  }
});

module.exports = router; // ⬅️ ¡Esto es indispensable!

