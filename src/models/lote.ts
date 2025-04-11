import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

interface LoteAttributes {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

interface LoteCreationAttributes extends Optional<LoteAttributes, 'id' | 'criado_em' | 'atualizado_em'> {}

export class Lote extends Model<LoteAttributes, LoteCreationAttributes> implements LoteAttributes {
  public id!: number;
  public nome!: string;
  public ativo!: boolean;
  public readonly criado_em!: Date;
  public readonly atualizado_em!: Date;
}


export function initLote(sequelize: Sequelize): typeof Lote {
    Lote.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        nome: {
            type: new DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
         criado_em: DataTypes.DATE, 
         atualizado_em: DataTypes.DATE,
    }, {
        tableName: 'lotes',
        sequelize, 
        timestamps: true,
        underscored: true,
        createdAt: 'criado_em',
        updatedAt: 'atualizado_em',
    });
    return Lote;
}