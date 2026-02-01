import type {FastifyInstance} from 'fastify';

export const healthRoutes = (app: FastifyInstance) => {
    app.get('/health', () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
        };
    });

    app.get('/ready', () => {
        return {
            status: 'ready',
            checks: {
                database: 'not_configured',
                redis: 'not_configured',
            },
        };
    });
};
