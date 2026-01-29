import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
    app.get('/health', async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
        };
    });

    app.get('/ready', async () => {
        return {
            status: 'ready',
            checks: {
                database: 'not_configured',
                redis: 'not_configured',
            },
        };
    });
}
