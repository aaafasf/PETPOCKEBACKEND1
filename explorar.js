const pool = require('./src/infrastructure/Database/dataBase.sql');

async function explorarServicios() {
    try {
        console.log("--- Explorando Tabla de Servicios Reales ---");
        
        // 1. Ver columnas de la tabla 'servicios'
        console.log("\nESTRUCTURA DE LA TABLA 'servicios':");
        const columnas = await pool.query("DESCRIBE servicios");
        console.table(columnas);

        // 2. Ver los datos que ya están cargados
        console.log("\nDATOS ACTUALES EN 'servicios':");
        const datos = await pool.query("SELECT * FROM servicios");
        console.table(datos);

    } catch (error) {
        console.error("\n❌ ERROR:", error.message);
    } finally {
        process.exit();
    }
}

explorarServicios();