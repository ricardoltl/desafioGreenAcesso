import { FastifyBaseLogger } from 'fastify';
import PdfPrinter from 'pdfmake';
import path from 'path';
import { TDocumentDefinitions } from 'pdfmake/interfaces';


const fontsDir = path.join(__dirname, '..', '..', 'fonts');


const fonts = {
    Roboto: {
        normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf')
    }
};

const printer = new PdfPrinter(fonts);

async function generateBoletoReport(boletos: any[], logger?: FastifyBaseLogger): Promise<Buffer> {
    const functionName = 'pdfReportService.generateBoletoReport';
    logger?.info(`[${functionName}] Iniciando geração de relatório PDF para ${boletos.length} boletos.`);

    try {
        const tableBody = [
            [
                { text: 'ID', style: 'tableHeader' },
                { text: 'Nome Sacado', style: 'tableHeader' },
                { text: 'ID Lote', style: 'tableHeader' },
                { text: 'Valor (R$)', style: 'tableHeader', alignment: 'right' },
                { text: 'Linha Digitável', style: 'tableHeader' }
            ],
            ...boletos.map(b => [
                b.id?.toString() || 'N/A',
                b.nome_sacado || '',
                b.id_lote?.toString() || 'N/A',
                { text: Number(b.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), alignment: 'right' },
                b.linha_digitavel || ''
            ])
        ];

        const docDefinition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageOrientation: 'landscape',
            content: [
                { text: 'Relatório de Boletos', style: 'header' },
                { text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`, style: 'subheader' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', 'auto', 'auto', '*'],
                        body: tableBody
                    },
                    layout: 'lightHorizontalLines'
                }
            ],
            styles: {
                header: {
                    fontSize: 16,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 15]
                },
                subheader: {
                    fontSize: 10,
                    italics: true,
                    alignment: 'right',
                    margin: [0, 0, 0, 15]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 10,
                    color: 'black',
                    fillColor: '#eeeeee',
                    alignment: 'left'
                }
            },
            defaultStyle: {
                font: 'Roboto',
                fontSize: 9
            }
        };

        logger?.info(`[${functionName}] Criando documento PDF...`);
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        const chunks: Buffer[] = [];
        pdfDoc.on('data', chunk => {
            chunks.push(chunk as Buffer);
        });

        return new Promise<Buffer>((resolve, reject) => {
            pdfDoc.on('end', () => {
                const result = Buffer.concat(chunks);
                logger?.info(`[${functionName}] Buffer PDF gerado com sucesso (${(result.length / 1024).toFixed(1)} KB).`);
                resolve(result);
            });
            pdfDoc.on('error', err => {
                logger?.error(`[${functionName}] Erro durante a geração do stream PDF: ${err.message}`, { error: err });
                reject(err);
            });
            pdfDoc.end();
        });

    } catch (error: any) {
         logger?.error(`[${functionName}] Erro inesperado ao preparar ou gerar PDF: ${error.message}`, { error });
         throw new Error(`Falha ao gerar relatório PDF: ${error.message}`);
    }
}

export default {
    generateBoletoReport
};