import { Sequelize } from 'sequelize';
import sequelizeInstance from '../config/database';
import { Lote, initLote } from './lote';
import { Boleto, initBoleto } from './boleto';

const loteModel = initLote(sequelizeInstance);
const boletoModel = initBoleto(sequelizeInstance);

interface Db {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
  Lote: typeof Lote;
  Boleto: typeof Boleto;
  [key: string]: any; 
}

const db: Db = {
  sequelize: sequelizeInstance,
  Sequelize: Sequelize,
  Lote: loteModel,
  Boleto: boletoModel,
};

Object.values(db)
    .filter((model: any) => typeof model?.associate === 'function')
    .forEach((model: any) => model.associate(db));

console.log('Modelos Sequelize inicializados e associados em TS.');

export default db;