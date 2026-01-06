const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

dotenv.config();

const claveSecreta = process.env.CLAVE_SECRETA || 'cifrarDatos';

// Cambiamos el nombre para que coincida con el uso en el resto del sistema
function encrypt(datos) {
    try {
        const textoAEncriptar = typeof datos === 'string' ? datos : JSON.stringify(datos);
        return CryptoJS.AES.encrypt(textoAEncriptar, claveSecreta).toString();
    } catch (error) {
        console.error('Error al cifrar datos:', error.message);
        throw error;
    }
}

function decrypt(cifrado) {
    try {
        if (!cifrado) return '';
        const bytes = CryptoJS.AES.decrypt(cifrado, claveSecreta);
        const textoDescifrado = bytes.toString(CryptoJS.enc.Utf8);
        
        // Intentamos parsear como JSON, si falla (porque es solo texto), devolvemos el texto
        try {
            return JSON.parse(textoDescifrado);
        } catch (e) {
            return textoDescifrado;
        }
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        return cifrado; // Devolvemos el original si hay error para no romper la app
    }
}

module.exports = {
    encrypt,
    decrypt
}