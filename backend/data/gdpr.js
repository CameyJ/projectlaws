const controlesGDPR = [
  {
    clave: 'politica_privacidad',
    pregunta: '¿Tiene política de privacidad publicada?',
    articulo: 'Art. 12',
    peso: 1,
    recomendacion: 'Publicar una política clara y accesible en el sitio web.'
  },
  {
    clave: 'consentimiento_explicito',
    pregunta: '¿Solicita consentimiento explícito antes de recopilar datos?',
    articulo: 'Art. 7',
    peso: 1,
    recomendacion: 'Solicitar consentimiento explícito antes de tratar datos personales.'
  },
  {
    clave: 'registro_actividades',
    pregunta: '¿Lleva un registro de actividades de tratamiento de datos?',
    articulo: 'Art. 30',
    peso: 1,
    recomendacion: 'Mantener actualizado un registro del tratamiento de datos.'
  },
  {
    clave: 'derecho_olvido',
    pregunta: '¿Permite ejercer el derecho al olvido?',
    articulo: 'Art. 17',
    peso: 1,
    recomendacion: 'Implementar mecanismos para que los usuarios soliciten la eliminación de sus datos.'
  },
  {
    clave: 'portabilidad_datos',
    pregunta: '¿Permite la portabilidad de los datos personales?',
    articulo: 'Art. 20',
    peso: 1,
    recomendacion: 'Establecer procedimientos para entregar los datos a solicitud del titular.'
  },
  {
    clave: 'seguridad_datos',
    pregunta: '¿Cuenta con medidas de seguridad técnicas y organizativas?',
    articulo: 'Art. 32',
    peso: 1,
    recomendacion: 'Aplicar cifrado, control de acceso y otras medidas para proteger los datos.'
  },
  {
    clave: 'notificacion_brechas',
    pregunta: '¿Notifica las brechas de seguridad en menos de 72 horas?',
    articulo: 'Art. 33',
    peso: 1,
    recomendacion: 'Establecer procedimientos para notificar violaciones de datos personales.'
  },
  {
    clave: 'designacion_dpo',
    pregunta: '¿Ha designado un Delegado de Protección de Datos (DPO)?',
    articulo: 'Art. 37',
    peso: 1,
    recomendacion: 'Designar un DPO si el tratamiento de datos lo requiere.'
  }
];

module.exports = controlesGDPR;
