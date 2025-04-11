'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('boletos', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      nome_sacado: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      id_lote: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lotes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT', 
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
      },
      linha_digitavel: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      atualizado_em: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    });
    console.log("Migration UP: Tabela 'boletos' criada.");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('boletos');
    console.log("Migration DOWN: Tabela 'boletos' removida.");
  }
};