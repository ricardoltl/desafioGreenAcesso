import { DataTypes, Model, Sequelize, Optional, Association } from 'sequelize';
import { Lote } from './lote';

export interface BoletoAttributes {
  id: number;
  nome_sacado: string;
  id_lote: number; 
  valor: number;
  linha_digitavel: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

interface BoletoCreationAttributes extends Optional<BoletoAttributes, 'id' | 'criado_em' | 'atualizado_em'> {}

export class Boleto extends Model<BoletoAttributes, BoletoCreationAttributes> implements BoletoAttributes {
  public id!: number;
  public nome_sacado!: string;
  public id_lote!: number;
  public valor!: number;
  public linha_digitavel!: string;
  public ativo!: boolean;
  public readonly criado_em!: Date;
  public readonly atualizado_em!: Date;

  public readonly lote?: Lote;
  public static associations: {
      lote: Association<Boleto, Lote>;
  };

  public static associate(models: { Lote: typeof Lote }) {
      Boleto.belongsTo(models.Lote, {
          foreignKey: 'id_lote',
          as: 'lote'
      });
  }
}

export function initBoleto(sequelize: Sequelize): typeof Boleto {
    Boleto.init({
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        nome_sacado: { type: new DataTypes.STRING(255), allowNull: false },
        id_lote: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'lotes', key: 'id' } },
        valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        linha_digitavel: { type: new DataTypes.STRING(255), allowNull: false },
        ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        criado_em: DataTypes.DATE,
        atualizado_em: DataTypes.DATE,
    }, {
        tableName: 'boletos',
        sequelize,
        timestamps: true,
        underscored: true,
        createdAt: 'criado_em',
        updatedAt: 'atualizado_em',
    });
    return Boleto;
}