import 'dotenv/config';

export const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    HOST: process.env.HOST || '0.0.0.0',
    PORT: parseInt(process.env.PORT || '4000', 10),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

    // Database
    DATABASE_URL:
        process.env.DATABASE_URL || 'postgresql://stagistic:stagistic@localhost:5432/stagistic',

    // Redis/Valkey
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
} as const;
