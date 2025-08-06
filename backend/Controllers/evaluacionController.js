const controlesGDPR = require('../data/gdpr');
const controlesSOX = require('../data/sox');

const evaluarCumplimiento = (req, res) => {
  const { normativa, respuestas } = req.body;
  let controles = [];

  switch (normativa.toUpperCase()) {
    case 'GDPR':
      controles = controlesGDPR;
      break;
    case 'SOX':
      controles = controlesSOX;
      break;
    default:
      return res.status(400).json({ error: 'Normativa no válida' });
  }

  const total = controles.length;
  let puntos = 0;
  const incumplimientos = [];

  controles.forEach((control) => {
    const valor = respuestas[control.clave];
    if (valor === 'true') {
      puntos += 1;
    } else if (valor === 'partial') {
      puntos += 0.5;
      incumplimientos.push({
        control: control.pregunta,
        recomendacion: control.recomendacion,
        articulo: control.articulo,
      });
    } else {
      // '' o 'false'
      incumplimientos.push({
        control: control.pregunta,
        recomendacion: control.recomendacion,
        articulo: control.articulo,
      });
    }
  });

  const cumplimiento = total > 0
    ? Math.round((puntos / total) * 100)
    : 0;

  // Asignar nivel según porcentaje
  let nivel = 'Inicial';
  if (cumplimiento >= 80) nivel = 'Avanzado';
  else if (cumplimiento >= 60) nivel = 'Intermedio';
  else if (cumplimiento >= 40) nivel = 'Básico';

  return res.json({
    cumplimiento,
    nivel,
    incumplimientos,
  });
};

module.exports = { evaluarCumplimiento };