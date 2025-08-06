const calcularNivel = (porcentaje) => {
  if (porcentaje < 30) return 'Inicial';
  if (porcentaje < 60) return 'Básico';
  if (porcentaje < 80) return 'Intermedio';
  return 'Avanzado';
};

const evaluarNormativa = (controles, respuestas) => {
  let total = 0;
  let correctos = 0;
  const incumplimientos = [];

  for (const control of controles) {
    total += control.peso;
    const valor = respuestas[control.clave];

    if (valor) {
      correctos += control.peso;
    } else {
      incumplimientos.push({
        control: control.pregunta,
        articulo: control.articulo,
        recomendacion: control.recomendacion
      });
    }
  }

  const cumplimiento = Math.round((correctos / total) * 100);
  const nivel = calcularNivel(cumplimiento);

  return { cumplimiento, nivel, incumplimientos };
};

const controlesGDPR = require('../data/gdpr');
const controlesSOX = require('../data/sox');

const evaluarCumplimiento = (req, res) => {
  const { empresa, normativa, respuestas } = req.body;

  let controles;

  switch (normativa.toUpperCase()) {
    case 'GDPR':
      controles = controlesGDPR;
      break;
    case 'SOX':
      controles = controlesSOX;
      break;
    default:
      return res.status(400).json({ error: 'Normativa no soportada' });
  }

  const resultado = evaluarNormativa(controles, respuestas);

  res.json({
    empresa,
    normativa,
    ...resultado
  });
};

module.exports = { evaluarCumplimiento };
