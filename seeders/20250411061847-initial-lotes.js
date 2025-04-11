'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     */
    const lotesParaInserir = [
      { id: 3, nome: '0017', ativo: true, criado_em: new Date(), atualizado_em: new Date() },
      { id: 6, nome: '0018', ativo: true, criado_em: new Date(), atualizado_em: new Date() },
      { id: 7, nome: '0019', ativo: true, criado_em: new Date(), atualizado_em: new Date() },
      { id: 8, nome: '0020', ativo: true, criado_em: new Date(), atualizado_em: new Date() },
      { id: 9, nome: '0021', ativo: true, criado_em: new Date(), atualizado_em: new Date() },
    ];

    
    await queryInterface.bulkDelete('lotes', null, {});
    console.log('*** Seed: Lotes antigos removidos (se existiam). ***');

    await queryInterface.bulkInsert('lotes', lotesParaInserir, {});

    console.log('*** Seed: Lotes com mapeamento (0017->3, etc.) inseridos via Seeder! ***');


  },

  async down (queryInterface, Sequelize) {
    const idsParaRemover = [3, 6, 7, 8, 9]; 
    await queryInterface.bulkDelete('lotes', { id: idsParaRemover }, {});
    console.log(`*** Seed: Lotes com IDs [${idsParaRemover.join(', ')}] removidos. ***`);
  }
};