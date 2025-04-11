import db from '../models';
import { BoletoCreationAttributes } from '../interfaces/boleto.interface';
import { FastifyBaseLogger } from 'fastify';

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
}


export default new BoletoRepository();