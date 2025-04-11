// src/interfaces/boleto.interface.ts

// Interface para os atributos necessários para criar um Boleto
// (Baseado nos campos obrigatórios e opcionais do modelo Sequelize)
export interface BoletoCreationAttributes {
    nome_sacado: string;
    id_lote: number;
    valor: number;
    linha_digitavel: string;
    ativo?: boolean; // Default é true no modelo
    // id, criado_em, atualizado_em são omitidos pois são gerenciados pelo DB/Sequelize
}

// Interface para os atributos completos do Boleto (opcional)
export interface BoletoAttributes extends BoletoCreationAttributes {
    id: number;
    ativo: boolean; // Não é mais opcional
    criado_em: Date;
    atualizado_em: Date;
}