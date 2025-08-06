const controlesSOX = [
  {
    clave: 'control_acceso_financiero',
    pregunta: '¿Restringe el acceso a sistemas que gestionan información financiera?',
    articulo: 'Sección 404',
    peso: 1,
    recomendacion: 'Aplicar control de acceso con roles y autenticación segura para proteger sistemas financieros.'
  },
  {
    clave: 'integridad_registros',
    pregunta: '¿Garantiza la integridad de los registros financieros?',
    articulo: 'Sección 302',
    peso: 1,
    recomendacion: 'Implementar controles de integridad y trazabilidad sobre los registros financieros.'
  },
  {
    clave: 'auditoria_interna',
    pregunta: '¿Dispone de un sistema de auditoría interna activa?',
    articulo: 'Sección 404',
    peso: 1,
    recomendacion: 'Tener mecanismos de auditoría continua para evaluar los controles internos.'
  },
  {
    clave: 'seguridad_copia_respaldo',
    pregunta: '¿Tiene mecanismos de respaldo y recuperación de datos críticos?',
    articulo: 'Sección 404',
    peso: 1,
    recomendacion: 'Aplicar políticas de backup periódico y planes de recuperación ante desastres.'
  },
  {
    clave: 'registro_accesos',
    pregunta: '¿Registra accesos a sistemas críticos?',
    articulo: 'Sección 404',
    peso: 1,
    recomendacion: 'Mantener bitácoras de acceso para auditar el uso de los sistemas.'
  },
  {
    clave: 'prevencion_fraude',
    pregunta: '¿Posee controles para prevenir el fraude interno?',
    articulo: 'Sección 802',
    peso: 1,
    recomendacion: 'Diseñar y aplicar controles de separación de funciones y validación cruzada de procesos.'
  },
  {
    clave: 'formacion_personal',
    pregunta: '¿Capacita regularmente a su personal en prácticas de cumplimiento?',
    articulo: 'Sección 406',
    peso: 1,
    recomendacion: 'Implementar programas de capacitación continua sobre ética y cumplimiento.'
  },
  {
    clave: 'reportes_financieros',
    pregunta: '¿Los reportes financieros son revisados y certificados por la gerencia?',
    articulo: 'Sección 302',
    peso: 1,
    recomendacion: 'Asegurar que los ejecutivos responsables certifiquen la veracidad de los informes.'
  }
];

module.exports = controlesSOX;
