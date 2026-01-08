const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

dotenv.config();

const claveSecreta = process.env.CLAVE_SECRETA || 'cifrarDatos';

// =======================
// CIFRAR
// =======================
function cifrarDatos(datos) {
    try {
        const textoAEncriptar =
            typeof datos === 'string' ? datos : JSON.stringify(datos);

        return CryptoJS.AES.encrypt(textoAEncriptar, claveSecreta).toString();
    } catch (error) {
        console.error('Error al cifrar datos:', error.message);
        throw error;
    }
}

// Alias para compatibilidad
const encrypt = cifrarDatos;

// =======================
// DESCIFRAR
// =======================
function descifrarDatos(cifrado) {
    try {
        if (!cifrado) return '';

        // Si NO parece AES, devolver tal cual (nombres normales)
        if (!cifrado.startsWith('U2Fsd')) return cifrado;

        const bytes = CryptoJS.AES.decrypt(cifrado, claveSecreta);
        const textoDescifrado = bytes.toString(CryptoJS.enc.Utf8);

        return textoDescifrado || cifrado;
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        return cifrado;
    }
}

// Alias para compatibilidad
const decrypt = descifrarDatos;

// =======================
// EXPORTS
// =======================
module.exports = {
    cifrarDatos,
    descifrarDatos,
    encrypt,
    decrypt
};
