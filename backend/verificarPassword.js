
const bcrypt = require('bcrypt');

const passwordIngresado = 'test1234';
const hashEnBD = '$2b$10$Q0W5AYE92FJ.l9C8WFkMuugN7Tn1qRLCzrpCoKSu8hAikfdsoCg1i';

bcrypt.compare(passwordIngresado, hashEnBD, (err, result) => {
  if (err) {
    console.error('Error al comparar:', err);
  } else {
    console.log('¿Coincide la contraseña?', result); // true o false
  }
});
