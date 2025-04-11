import { FastifyBaseLogger } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import db from '../models';
import { Op } from 'sequelize';


const PREDEFINED_PDF_PAGE_ORDER: string[] = [
    'MARCIA CARVALHO',
    'JOSE DA SILVA',
    'MARCOS ROBERTO',
];

interface PdfSplitResultDetail {
    status: 'saved' | 'skipped' | 'error';
    page: number;
    name?: string;
    id?: number;
    filename?: string;
    reason?: string;
}

interface PdfSplitResult {
    message: string;
    savedCount: number;
    skippedCount: number;
    errorCount: number;
    details: PdfSplitResultDetail[];
}

async function processAndSplitPdf(
    fileData: MultipartFile,
    outputDir: string,
    logger: FastifyBaseLogger
): Promise<PdfSplitResult> {
    const functionName = 'pdfImportService.processAndSplitPdf';
    logger.info(`[${functionName}] Iniciando processamento do PDF: ${fileData.filename}`);

    const processingDetails: PdfSplitResultDetail[] = [];
    let savedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        logger.info(`[${functionName}] Buscando boletos no DB para a ordem: ${PREDEFINED_PDF_PAGE_ORDER.join(', ')}`);
        const boletos = await db.Boleto.findAll({
            where: {
                nome_sacado: {
                    [Op.in]: PREDEFINED_PDF_PAGE_ORDER 
                }
            },
            attributes: ['id', 'nome_sacado'],
        });

        const nameToIdMap = new Map<string, number>();
        boletos.forEach(b => {
            nameToIdMap.set(b.nome_sacado, b.id);
        });
        logger.info(`[${functionName}] Mapeamento Nome -> ID criado para ${nameToIdMap.size} boletos encontrados.`);

        if (nameToIdMap.size !== PREDEFINED_PDF_PAGE_ORDER.length) {
             logger.warn(`[${functionName}] Nem todos os nomes da ordem pré-definida foram encontrados no banco! Verifique os nomes e o banco de dados.`);
        }

        logger.info(`[${functionName}] Lendo buffer do arquivo PDF...`);
        const pdfBuffer = await fileData.toBuffer();
        logger.info(`[${functionName}] Carregando PDF com pdf-lib...`);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pageCount = pdfDoc.getPageCount();
        logger.info(`[${functionName}] PDF carregado. Número de páginas: ${pageCount}`);

        if (pageCount < PREDEFINED_PDF_PAGE_ORDER.length) {
            logger.warn(`[${functionName}] PDF tem ${pageCount} páginas, mas a ordem esperada tem ${PREDEFINED_PDF_PAGE_ORDER.length} nomes. Algumas páginas podem faltar ou nomes não serão usados.`);
        }
         if (pageCount > PREDEFINED_PDF_PAGE_ORDER.length) {
            logger.warn(`[${functionName}] PDF tem ${pageCount} páginas, mas a ordem esperada tem ${PREDEFINED_PDF_PAGE_ORDER.length} nomes. Páginas extras no PDF serão ignoradas.`);
        }


        const pagesToProcess = Math.min(pageCount, PREDEFINED_PDF_PAGE_ORDER.length);
        logger.info(`[${functionName}] Processando ${pagesToProcess} páginas baseado na ordem definida...`);

        for (let i = 0; i < pagesToProcess; i++) {
            const pageIndex = i;
            const pageNum = pageIndex + 1;
            const expectedName = PREDEFINED_PDF_PAGE_ORDER[pageIndex];
            const mappedId = nameToIdMap.get(expectedName);
            if (mappedId === undefined) {
                logger.warn(`[${functionName}] Registro de boleto não encontrado no DB para "${expectedName}" (página ${pageNum}). Pulando.`);
                processingDetails.push({ status: 'skipped', page: pageNum, name: expectedName, reason: 'Registro não encontrado no DB' });
                skippedCount++;
                continue;
            }

            logger.debug(`[${functionName}] Processando página ${pageNum} (Nome: ${expectedName}, ID Mapeado: ${mappedId})`);
            let outputFilePath = '';
            try {
                const newPdfDoc = await PDFDocument.create();
                const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
                newPdfDoc.addPage(copiedPage);

                const newPdfBytes = await newPdfDoc.save();

                outputFilePath = path.join(outputDir, `${mappedId}.pdf`);

                await fs.writeFile(outputFilePath, newPdfBytes);
                logger.info(`[${functionName}] Página ${pageNum} salva como ${outputFilePath}`);
                processingDetails.push({ status: 'saved', page: pageNum, name: expectedName, id: mappedId, filename: `${mappedId}.pdf` });
                savedCount++;

            } catch (splitSaveError: any) {
                logger.error(`[${functionName}] Erro ao processar/salvar página ${pageNum} (Nome: ${expectedName}, ID: ${mappedId}) para ${outputFilePath}: ${splitSaveError.message}`);
                processingDetails.push({ status: 'error', page: pageNum, name: expectedName, id: mappedId, reason: splitSaveError.message });
                errorCount++;
            }
        }

        logger.info(`[${functionName}] Processamento de páginas concluído.`);

        return {
            message: `Processamento PDF concluído. ${savedCount} páginas salvas, ${skippedCount} puladas, ${errorCount} erros.`,
            savedCount,
            skippedCount,
            errorCount,
            details: processingDetails
        };

    } catch (error: any) {
        logger.error(`[${functionName}] Erro inesperado durante processamento do PDF: ${error.message}`, { error });
         const serviceError = new Error(`Erro ao processar PDF: ${error.message}`);
         serviceError.name = error.name || 'PdfProcessingError';
         (serviceError as any).details = error.stack;
        throw serviceError;
    }
}

export default {
    processAndSplitPdf
};