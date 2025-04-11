import { FastifyRequest, FastifyReply, FastifyBaseLogger } from "fastify";
import * as fs from "fs";
import { pipeline } from "stream/promises";
import * as path from "path";
import csvImportService from "../services/csvImportService";
import pdfImportService from "../services/pdfImportService";
import { MultipartFile } from "@fastify/multipart";
import boletoRepository from '../repositories/boletoRepository';
import { Boleto } from '../models/boleto';
import pdfReportService from "../services/pdfReportService";

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
const PDF_OUTPUT_DIR = path.join(__dirname, "..", "..", "generated_pdfs");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface GetBoletosQuery {
    nome?: string;
    valor_inicial?: number;
    valor_final?: number;
    id_lote?: number;
    relatorio?: string | number;
}

async function importCsvHandler(request: FastifyRequest, reply: FastifyReply) {
  const logger = request.log;
  let tempFilePath: string | null = null;

  try {
    const fileData: MultipartFile | undefined = await request.file();
    if (!fileData) {
      logger.warn("Nenhum arquivo CSV enviado.");
      return reply
        .code(400)
        .send({ error: "BadRequest", message: "Nenhum arquivo CSV enviado." });
    }

    const isCsvFile = fileData.filename.toLowerCase().endsWith(".csv");
    const isCsvMime =
      fileData.mimetype === "text/csv" ||
      fileData.mimetype === "application/vnd.ms-excel";
    if (!isCsvFile || !isCsvMime) {
      logger.warn(
        `Arquivo inválido: ${fileData.filename}, mimetype: ${fileData.mimetype}`
      );
      return reply
        .code(415)
        .send({
          error: "UnsupportedMediaType",
          message: "Formato de arquivo inválido. Envie um arquivo .csv",
        });
    }

    tempFilePath = path.join(
      UPLOAD_DIR,
      `import_${Date.now()}_${fileData.filename}`
    );
    logger.info(
      `Recebendo arquivo CSV: ${fileData.filename}. Salvando em ${tempFilePath}`
    );

    await pipeline(fileData.file, fs.createWriteStream(tempFilePath));
    logger.info(`Arquivo salvo com sucesso.`);

    logger.info(
      `Chamando csvImportService.processAndImportCsv para: ${tempFilePath}`
    );
    const result = await csvImportService.processAndImportCsv(
      tempFilePath,
      logger as FastifyBaseLogger
    );

    logger.info(
      `Processamento concluído. ${result.importedCount} boletos importados.`
    );
    reply.code(result.importedCount > 0 ? 201 : 200).send(result);
  } catch (error: any) {
    logger.error({ err: error }, "Erro no handler de importação de CSV");
    const statusCode = error.statusCode || 500;
    const responseError: { error: string; message: string; details?: any } = {
      error: error.name || "InternalServerError",
      message: error.message || "Ocorreu um erro inesperado.",
    };
    if (error.details && process.env.NODE_ENV !== "production") {
      responseError.details = error.details;
    }
    reply.code(statusCode).send(responseError);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, (err) => {
        if (err)
          logger.error({ err }, `Erro ao deletar arquivo temp ${tempFilePath}`);
        else logger.info(`Arquivo temp ${tempFilePath} deletado.`);
      });
    }
  }
}

async function importPdfHandler(request: FastifyRequest, reply: FastifyReply) {
  const logger = request.log;
  logger.info("Recebida requisição para /import/pdf");

  try {
    const fileData: MultipartFile | undefined = await request.file();
    if (!fileData) {
      logger.warn("Nenhum arquivo PDF enviado.");
      return reply
        .code(400)
        .send({ error: "BadRequest", message: "Nenhum arquivo PDF enviado." });
    }

    const isPdfFile = fileData.filename.toLowerCase().endsWith(".pdf");
    const isPdfMime = fileData.mimetype === "application/pdf";
    if (!isPdfFile || !isPdfMime) {
      logger.warn(
        `Arquivo inválido recebido: ${fileData.filename}, mimetype: ${fileData.mimetype}. Esperado PDF.`
      );
      return reply
        .code(415)
        .send({
          error: "UnsupportedMediaType",
          message: "Formato de arquivo inválido. Envie um arquivo .pdf",
        });
    }

    logger.info(
      `Arquivo PDF recebido: ${fileData.filename}, tamanho: ${fileData.file.bytesRead} bytes`
    );

    logger.info(
      `Chamando pdfImportService para processar ${fileData.filename}`
    );
    const result = await pdfImportService.processAndSplitPdf(
      fileData,
      PDF_OUTPUT_DIR,
      logger as FastifyBaseLogger
    );
    logger.info(`Processamento PDF concluído.`);

    reply.code(201).send(result);
  } catch (error: any) {
    logger.error({ err: error }, "Erro no handler de importação de PDF");
    const statusCode = error.statusCode || 500;
    const responseError: { error: string; message: string; details?: any } = {
      error: error.name || "InternalServerError",
      message:
        error.message || "Ocorreu um erro inesperado ao processar o PDF.",
    };
    if (error.details && process.env.NODE_ENV !== "production") {
      responseError.details = error.details;
    }
    reply.code(statusCode).send(responseError);
  }
}

async function getBoletosHandler(request: FastifyRequest<{ Querystring: GetBoletosQuery }>, reply: FastifyReply) {
    const logger = request.log;
    const filters = request.query;
    logger.info({ filters }, 'Requisição GET /boletos recebida');

    try {
        const boletos: Boleto[] = await boletoRepository.findWithFilters(filters, logger);

        if (filters.relatorio && String(filters.relatorio) === '1') {
            logger.info(`[Handler] Parâmetro relatorio=1 detectado. Gerando PDF...`);

            if (boletos.length === 0) {
                logger.info(`[Handler] Nenhum boleto encontrado para gerar relatório.`);
                 return reply.send({ base64: null, message: 'Nenhum boleto encontrado para gerar o relatório.' });
            }

            const pdfBuffer = await pdfReportService.generateBoletoReport(
                 boletos.map(b => b.toJSON()),
                 logger
             );

            const base64Pdf = pdfBuffer.toString('base64');
            logger.info(`[Handler] PDF gerado e convertido para Base64 (${base64Pdf.length} caracteres). Enviando resposta.`);

            reply.send({ base64: base64Pdf });

        } else {
            logger.info(`[Handler] Retornando ${boletos.length} boletos como JSON.`);
            const formattedBoletos = boletos.map(b => ({
                ...b.toJSON(),
                valor: b.valor.toString()
            }));
            reply.send(formattedBoletos);
        }

    } catch (error: any) {
        logger.error({ err: error }, 'Erro ao processar GET /boletos no handler');
        reply.code(500).send({
            error: error.name || 'InternalServerError',
            message: error.message || 'Ocorreu um erro ao processar a requisição de boletos.'
        });
    }
}

export default {
  importCsvHandler,
  importPdfHandler,
  getBoletosHandler,
};
