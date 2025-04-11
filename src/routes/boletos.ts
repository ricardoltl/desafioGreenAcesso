
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { FastifyBaseLogger } from 'fastify';
import boletosController from '../controllers/boletosController';

type FastifyDefaultInstance = FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse,
    FastifyBaseLogger
>;

const boletoRoutes: FastifyPluginAsync = async (fastify: FastifyDefaultInstance) => {
  fastify.post('/import/csv', {
    handler: boletosController.importCsvHandler
  });

  fastify.post('/import/pdf', {
    handler: boletosController.importPdfHandler
  });
};

export default fp(boletoRoutes, { name: 'boleto-routes' });