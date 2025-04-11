import * as fs from "fs";
import csv from "csv-parser";
import { BoletoCreationAttributes } from "../interfaces/boleto.interface";
import boletoRepository from "../repositories/boletoRepository";
import { FastifyBaseLogger } from "fastify";
import db from "../models";

interface CsvProcessResult {
  message: string;
  importedCount: number;
  skippedRows: number;
  notFoundLotes?: string[];
}

async function processAndImportCsv(
  filePath: string,
  logger: FastifyBaseLogger
): Promise<CsvProcessResult> {
  const functionName = "csvImportService.processAndImportCsv";
  logger.info(`[${functionName}] Iniciando processamento: ${filePath}`);

  let loteMap: Map<string, number>;
  try {
    logger.info(
      `[${functionName}] Buscando lotes ativos no banco de dados para mapeamento...`
    );
    const lotesAtivos = await db.Lote.findAll({
      where: { ativo: true },
      attributes: ["id", "nome"],
      raw: true,
    });

    loteMap = new Map<string, number>();
    lotesAtivos.forEach((lote) => {
      loteMap.set(lote.nome, lote.id);
    });
    logger.info(
      `[${functionName}] Mapa com ${loteMap.size} lotes ativos criado.`
    );

    if (loteMap.size === 0) {
      logger.warn(
        `[${functionName}] Nenhum lote ativo encontrado no banco para mapeamento. Nenhum boleto poderá ser importado.`
      );
    }
  } catch (dbError: any) {
    logger.error(
      `[${functionName}] Erro crítico ao buscar lotes no banco: ${dbError.message}`,
      { error: dbError }
    );
    throw new Error(
      `Falha ao carregar dados de lotes para mapeamento: ${dbError.message}`
    );
  }

  const boletosParaSalvar: BoletoCreationAttributes[] = [];
  let skippedRows = 0;
  let readRowCount = 0;
  const notFoundLotesSet = new Set<string>();

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(
        csv({
          separator: ";",
          mapHeaders: ({ header }: { header: string }) =>
            header.trim().toLowerCase(),
        })
      )
      .on("data", (row: any) => {
        readRowCount++;
        logger.debug(
          `[${functionName}] Lendo linha ${readRowCount}: ${JSON.stringify(
            row
          )}`
        );

        const nomeSacado = row.nome?.trim();
        const unidadeStr = row.unidade?.trim();
        const valorStr = row.valor?.trim();
        const linhaDigitavel = row.linha_digitavel?.trim();

        if (!nomeSacado || !unidadeStr || !valorStr || !linhaDigitavel) {
          logger.warn(
            `[${functionName}] Linha ${readRowCount} inválida/incompleta, ignorada: ${JSON.stringify(
              row
            )}`
          );
          skippedRows++;
          return;
        }

        let idLote: number | undefined;
        let nomeLoteFormatado: string = "";
        try {
          nomeLoteFormatado = unidadeStr.padStart(4, "0");

          idLote = loteMap.get(nomeLoteFormatado);

          if (idLote === undefined) {
            logger.warn(
              `[${functionName}] Lote com nome formatado '${nomeLoteFormatado}' (da unidade CSV '${unidadeStr}') não encontrado ou inativo. Linha ${readRowCount} ignorada.`
            );
            notFoundLotesSet.add(unidadeStr);
            skippedRows++;
            return;
          }

          logger.debug(
            `[${functionName}] Linha ${readRowCount}: Mapeado unidade '${unidadeStr}' -> nome_lote '${nomeLoteFormatado}' -> id_lote: ${idLote}`
          );
        } catch (formatError: any) {
          logger.warn(
            `[${functionName}] Erro ao formatar/mapear unidade '${unidadeStr}' na linha ${readRowCount}, ignorada. Erro: ${formatError.message}`
          );
          skippedRows++;
          return;
        }

        const valorFloat = parseFloat(valorStr.replace(",", "."));
        if (isNaN(valorFloat)) {
          logger.warn(
            `[${functionName}] Valor numérico inválido '${valorStr}' na linha ${readRowCount}, ignorada.`
          );
          skippedRows++;
          return;
        }

        const boletoData: BoletoCreationAttributes = {
          nome_sacado: nomeSacado,
          id_lote: idLote,
          valor: valorFloat,
          linha_digitavel: linhaDigitavel,
          ativo: true,
        };
        boletosParaSalvar.push(boletoData);
      })
      .on("end", async () => {
        logger.info(
          `[${functionName}] Leitura CSV finalizada. ${readRowCount} linhas lidas, ${boletosParaSalvar.length} boletos válidos para inserção, ${skippedRows} linhas ignoradas.`
        );
        let importedCount = 0;

        if (boletosParaSalvar.length > 0) {
          try {
            logger.info(
              `[${functionName}] Chamando repositório para inserir ${boletosParaSalvar.length} boletos...`
            );
            importedCount = await boletoRepository.bulkInsert(
              boletosParaSalvar,
              logger
            );
            logger.info(
              `[${functionName}] Repositório retornou ${importedCount} boletos inseridos.`
            );

            resolve({
              message: `${importedCount} boletos importados com sucesso. ${skippedRows} linhas ignoradas.`,
              importedCount,
              skippedRows,
              notFoundLotes: Array.from(notFoundLotesSet),
            });
          } catch (repoError: any) {
            logger.error(
              `[${functionName}] Erro do repositório durante inserção em lote: ${repoError.message}`,
              { error: repoError }
            );

            const serviceError = new Error(
              repoError.message || "Erro ao salvar dados no banco."
            );
            const isForeignKeyError =
              repoError.name === "SequelizeForeignKeyConstraintError" ||
              repoError.name === "ForeignKeyConstraintError";
            (serviceError as any).statusCode = isForeignKeyError ? 409 : 500;
            serviceError.name = repoError.name || "ServiceError";
            (serviceError as any).details =
              (repoError as any).originalError?.message || repoError.message;
            reject(serviceError);
          }
        } else {
          logger.info(
            `[${functionName}] Nenhum boleto válido encontrado no arquivo para importar.`
          );
          resolve({
            message:
              "Nenhum boleto válido encontrado no arquivo para importar.",
            importedCount: 0,
            skippedRows,
            notFoundLotes: Array.from(notFoundLotesSet),
          });
        }
      })
      .on("error", (streamError) => {
        logger.error(
          `[${functionName}] Erro no stream de leitura do CSV: ${streamError.message}`
        );
        const error = new Error("Erro ao ler o arquivo CSV.");
        (error as any).statusCode = 500;
        error.name = "CsvReadError";
        (error as any).details = streamError.message;
        reject(error);
      });
  });
}

export default {
  processAndImportCsv,
};
