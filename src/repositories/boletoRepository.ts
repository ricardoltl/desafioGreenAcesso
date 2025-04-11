import db from '../models';
import { BoletoCreationAttributes } from '../interfaces/boleto.interface';
import { FastifyBaseLogger } from 'fastify';
import { Boleto, BoletoAttributes  } from '../models/boleto';
import { Op, WhereOptions } from 'sequelize';

interface BoletoFilters {
    nome?: string;
    valor_inicial?: number;
    valor_final?: number;
    id_lote?: number;
}

class BoletoRepository {
    async bulkInsert(boletos: BoletoCreationAttributes[], logger?: FastifyBaseLogger): Promise<number> {
        const functionName = 'BoletoRepository.bulkInsert';
        try {
            if (!boletos || boletos.length === 0) {
                logger?.info(`[${functionName}] Nenhum boleto fornecido para inserção.`);
                return 0;
            }

            logger?.info(`[${functionName}] Tentando inserir ${boletos.length} boletos...`);

            const sanitizedBoletos = boletos.map(boleto => ({
                ...boleto,
                ativo: boleto.ativo ?? true, 
            }));
            const createdBoletos = await db.Boleto.bulkCreate(sanitizedBoletos);

            const count = createdBoletos.length;
            logger?.info(`[${functionName}] ${count} boletos inseridos com sucesso.`);
            return count;

        } catch (error: any) {
            logger?.error(`[${functionName}] Erro ao inserir boletos em lote: ${error.message}`, { error });

            const repositoryError = new Error(`Falha no repositório ao inserir boletos em lote: ${error.message}`);
            repositoryError.name = error.name || 'DatabaseError';
            (repositoryError as any).originalError = error; 
            throw repositoryError;
        }
    }
    async findWithFilters(filters: BoletoFilters, logger?: FastifyBaseLogger): Promise<Boleto[]> {
        const functionName = 'BoletoRepository.findWithFilters';
        logger?.info({ filters }, `[${functionName}] Iniciando busca com filtros...`);

        const whereClause: WhereOptions<BoletoAttributes> = {};

        if (filters.nome && filters.nome.trim() !== '') {
            whereClause.nome_sacado = { [Op.iLike]: `%${filters.nome.trim()}%` };
        }

        if (filters.id_lote !== undefined && !isNaN(Number(filters.id_lote))) {
            whereClause.id_lote = Number(filters.id_lote);
        }

        const valorConditions = [];
        if (filters.valor_inicial !== undefined && !isNaN(Number(filters.valor_inicial))) {
            valorConditions.push({ [Op.gte]: Number(filters.valor_inicial) });
        }
        if (filters.valor_final !== undefined && !isNaN(Number(filters.valor_final))) {
            valorConditions.push({ [Op.lte]: Number(filters.valor_final) });
        }

        if (valorConditions.length > 0) {
            whereClause.valor = { [Op.and]: valorConditions };
        }

        whereClause.ativo = true;

        try {
            const boletos = await db.Boleto.findAll({
                where: whereClause,
                order: [ 
                    ['nome_sacado', 'ASC'],
                    ['id', 'ASC']
                ]
            });

            logger?.info(`[${functionName}] Busca concluída. ${boletos.length} boletos encontrados.`);
            return boletos; 

        } catch (error: any) {
            logger?.error(`[${functionName}] Erro ao executar findAll com filtros: ${error.message}`, { error });
            const repositoryError = new Error(`Falha no repositório ao buscar boletos com filtros: ${error.message}`);
            repositoryError.name = error.name || 'DatabaseError';
            (repositoryError as any).originalError = error;
            throw repositoryError;
        }
    }
}


export default new BoletoRepository();