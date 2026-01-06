// ==========================
// ENTRY POINT DEL SERVIDOR
// ==========================

const app = require('./app');

// ⚠️ IMPORTANTE: solo importar ORM para inicializar BD
require('../src/infrastructure/Database/dataBase.orm');

const port = app.get('port') || 3000;

app.listen(port, () => {
    console.log(`🚀 El servidor está escuchando en el puerto ${port}`);
});
