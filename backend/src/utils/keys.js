const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../lib/logger');

const KEY_DIR = path.join(process.cwd(), '.keys');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'public.pem');

/**
 * Ensures that RSA keys exist for JWE.
 * Generates them if they don't exist.
 */
function ensureKeys() {
    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
        return {
            privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
            publicKey: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8')
        };
    }

    if (!fs.existsSync(KEY_DIR)) {
        fs.mkdirSync(KEY_DIR, { recursive: true });
    }

    logger.info('Generating new RSA key pair for JWE...');

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

    logger.info('RSA key pair generated successfully in .keys directory.');

    return { privateKey, publicKey };
}

module.exports = {
    ensureKeys,
    PRIVATE_KEY_PATH,
    PUBLIC_KEY_PATH
};
