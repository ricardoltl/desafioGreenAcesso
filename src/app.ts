import Fastify, { FastifyInstance, FastifyBaseLogger } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';

import boletoRoutes from './routes/boletos';

type AppInstance = FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse,
    FastifyBaseLogger
>;

async function buildApp(): Promise<AppInstance> {
    const app = Fastify({
        logger: process.env.NODE_ENV === 'development'
            ? { level: 'info', transport: { target: 'pino-pretty' } }
            : (process.env.NODE_ENV === 'production' ? true : false),
    }); 

    await app.register(fastifyCors, { origin: '*' });
    await app.register(fastifyMultipart, { limits: { fileSize: 50 * 1024 * 1024 } });


    await app.register(boletoRoutes);


    app.setErrorHandler(function (error: any, request, reply) {
        request.log.error({ err: error }, `Erro na rota: ${request.method} ${request.url}`);
        const statusCode = error.statusCode || 500;
        const responsePayload = {
            error: error.validation ? 'Validation Error' : (error.name || 'Error'),
            message: error.message || 'Ocorreu um erro interno.',
            ...(error.validation && { details: error.validation })
        };
        if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
             responsePayload.message = 'Ocorreu um erro interno no servidor.';
             delete responsePayload.details;
        }
        reply.status(statusCode).send(responsePayload);
    });

    app.log.info("App TS configurado com Schemas Manuais para Swagger.");
    return app;
}

export default buildApp;