import { Sequelize, Options } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config(); 

const dbName = process.env.DB_NAME as string;
const dbUser = process.env.DB_USER as string;
const dbHost = process.env.DB_HOST;
const dbPassword = process.env.DB_PASSWORD;
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

const sequelizeOptions: Options = {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000, 
    },
    define: {
         timestamps: true,
         underscored: true,
         createdAt: 'criado_em',
         updatedAt: 'atualizado_em'
     }
};

const sequelize = new Sequelize(dbName, dbUser, dbPassword, sequelizeOptions);

export default sequelize;