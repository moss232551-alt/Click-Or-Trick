const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isProduction = process.env.NODE_ENV === 'production';
const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const requireEnv = (key, fallback = '') => {
  const value = process.env[key];
  if (!value && isProduction) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || fallback;
};

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 4000),
  auth: {
    jwtSecret: requireEnv('JWT_SECRET', 'clickortrick-dev-secret'),
    tokenExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
  openAi: {
    apiKey: requireEnv('OPENAI_API_KEY'),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  mysql: {
    host: requireEnv('MYSQL_HOST', '127.0.0.1'),
    port: parseNumber(process.env.MYSQL_PORT, 3306),
    user: requireEnv('MYSQL_USER', 'root'),
    password: requireEnv('MYSQL_PASSWORD', ''),
    database: requireEnv('MYSQL_DATABASE', 'clickortrick'),
    connectionLimit: parseNumber(process.env.MYSQL_CONN_LIMIT, 10),
  },
  defaults: {
    locale: process.env.DEFAULT_LOCALE || 'en',
  },
  oauth: {
    frontendBaseUrl: requireEnv('FRONTEND_BASE_URL', 'https://clickortrick.pgthegod.space'),
    discord: {
      clientId: requireEnv('DISCORD_CLIENT_ID'),
      clientSecret: requireEnv('DISCORD_CLIENT_SECRET'),
      redirectUri: requireEnv('DISCORD_REDIRECT_URI', 'https://clickortrick.pgthegod.space/api/auth/discord/callback'),
    },
    google: {
      clientId: requireEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
      redirectUri: requireEnv('GOOGLE_REDIRECT_URI', 'https://clickortrick.pgthegod.space/api/auth/google/callback'),
    },
  },
};

module.exports = config;
