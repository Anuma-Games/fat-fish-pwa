try {
  process.loadEnvFile();
} catch {}

const target = process.env.API_URL;
const apiKey = process.env.API_KEY;

if (!target || !apiKey) {
  throw new Error('Faltan API_URL o API_KEY en el archivo .env de la raíz del proyecto');
}

module.exports = {
  '/api': {
    target,
    secure: true,
    changeOrigin: true,
    logLevel: 'info',
    headers: { 'X-Api-Key': apiKey },
  },
};
