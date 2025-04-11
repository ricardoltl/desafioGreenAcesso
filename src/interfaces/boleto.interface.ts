export interface BoletoCreationAttributes {
    nome_sacado: string;
    id_lote: number;
    valor: number;
    linha_digitavel: string;
    ativo?: boolean; 
}

export interface BoletoAttributes extends BoletoCreationAttributes {
    id: number;
    ativo: boolean;
    criado_em: Date;
    atualizado_em: Date;
}