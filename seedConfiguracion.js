/**
 * Script para insertar configuraciones iniciales en la BD
 * Ejecutar: node seedConfiguracion.js
 */

const orm = require('./src/infrastructure/Database/dataBase.orm');
const Configuracion = orm.configuracion;

const configuracionesIniciales = [
  { clave: 'nombreClinica', valor: 'PetPocket Clínica Veterinaria', idClinica: 1, tipo: 'clinica' },
  { clave: 'telefonoClinica', valor: '+57 (1) 2345678', idClinica: 1, tipo: 'clinica' },
  { clave: 'correoClinica', valor: 'info@petpocket.com', idClinica: 1, tipo: 'clinica' },
  { clave: 'direccionClinica', valor: 'Calle 123 #45-67, Bogotá', idClinica: 1, tipo: 'clinica' },
  { clave: 'horariosClinica', valor: 'Lun-Vie: 8AM-6PM, Sáb: 9AM-3PM', idClinica: 1, tipo: 'clinica' },
  { clave: 'logoClinica', valor: '/assets/img/logo.png', idClinica: 1, tipo: 'clinica' },
  { clave: 'zonaHoraria', valor: 'America/Bogota', idClinica: 1, tipo: 'general' },
  { clave: 'idioma', valor: 'es-CO', idClinica: 1, tipo: 'general' },
  { clave: 'formatoFecha', valor: 'DD/MM/YYYY', idClinica: 1, tipo: 'general' },
  { clave: 'politicas', valor: 'Consulte nuestras políticas de atención y cancelación', idClinica: 1, tipo: 'politicas' },
  { clave: 'horasMinimasCancelacion', valor: '24', idClinica: 1, tipo: 'politicas' },
  { clave: 'limiteMascotas', valor: '5', idClinica: 1, tipo: 'politicas' }
];

async function seed() {
  try {
    console.log('🌱 Iniciando seed de configuraciones...');
    
    for (const config of configuracionesIniciales) {
      const existe = await Configuracion.findOne({
        where: { clave: config.clave, idClinica: config.idClinica }
      });

      if (existe) {
        console.log(`⏭️  ${config.clave} ya existe, saltando...`);
      } else {
        await Configuracion.create(config);
        console.log(`✅ Creado: ${config.clave}`);
      }
    }

    console.log('✨ Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();
