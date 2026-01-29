import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';

const app = Fastify({
    logger: {
        level: config.LOG_LEVEL,
    },
});

// Register plugins
await app.register(cors, {
    origin: config.CORS_ORIGIN,
});

// Register routes
await app.register(healthRoutes, { prefix: '/api' });

// Start server
const start = async () => {
    try {
        await app.listen({
            host: config.HOST,
            port: config.PORT,
        });
        app.log.info(`API server running on http://${config.HOST}:${config.PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
