import buildApp from './app';
import db from './models';

async function startServer() {
  let app;
  try {
    app = await buildApp();

    app.log.info('Attempting database connection...');
    await db.sequelize.authenticate();
    app.log.info('Database connection established successfully.');

 
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = '0.0.0.0';

    const address = await app.listen({ port, host });
    app.log.info(`Server listening on ${address}`);

  } catch (err) {
    const logger = app ? app.log : console; 
    logger.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer();