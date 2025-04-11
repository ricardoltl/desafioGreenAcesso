// src/server.ts
import buildApp from './app'; // Importa a função de app.ts
import db from './models'; // Importa a config do Sequelize

async function startServer() {
  let app;
  try {
    app = await buildApp();

    app.log.info('Attempting database connection...');
    await db.sequelize.authenticate();
    app.log.info('Database connection established successfully.');

    // if (process.env.NODE_ENV !== 'production') {
    //   app.log.info('Syncing database models (alter: true)...');
    //   await db.sequelize.sync({ alter: true }); // CUIDADO em prod
    //   app.log.info('Database synced successfully.');
    // } else {
    //   app.log.info('Production mode. Skipping DB sync.');
    // }

    // A porta deve vir da config ou .env
    // Se usar @fastify/env, estará em app.config.PORT
    // Senão, use process.env.PORT
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = '0.0.0.0';

    const address = await app.listen({ port, host });
    app.log.info(`Server listening on ${address}`);

  } catch (err) {
    // Tratamento de erro na inicialização
    const logger = app ? app.log : console; // Usa logger do app se disponível
    logger.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer();