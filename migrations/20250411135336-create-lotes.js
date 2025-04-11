'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
  
    await queryInterface.createTable('lotes', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
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
    console.log("Migration UP: Tabela 'lotes' criada.");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('lotes');
    console.log("Migration DOWN: Tabela 'lotes' removida.");
  }
};