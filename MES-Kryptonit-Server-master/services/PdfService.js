const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

// Поиск шрифтов Roboto
const possibleFontPaths = [
    path.join(__dirname, '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto'),
    path.join(__dirname, '..', 'node_modules', 'pdfmake', 'src', 'fonts', 'Roboto'),
    path.join(__dirname, '..', 'fonts'), 
];

function findFontDir() {
    for (const dir of possibleFontPaths) {
        const testFile = path.join(dir, 'Roboto-Regular.ttf');
        if (fs.existsSync(testFile)) return dir;
    }
    logger.error("❌ [PdfService] Шрифты Roboto не найдены! Используются стандартные.");
    return null;
}

const fontDir = findFontDir();
const fonts = fontDir ? {
    Roboto: {
        normal: path.join(fontDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontDir, 'Roboto-MediumItalic.ttf')
    }
} : {
    Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' }
};

const printer = new PdfPrinter(fonts);

class PdfService {
    
    _createPdf(docDefinition) {
        return new Promise((resolve, reject) => {
            try {
                const pdfDoc = printer.createPdfKitDocument(docDefinition);
                const chunks = [];
                pdfDoc.on('data', (chunk) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (err) => {
                    logger.error("PDFMake Stream Error:", err);
                    reject(err);
                });
                pdfDoc.end();
            } catch (err) {
                reject(err);
            }
        });
    }

    // Заглушка для совместимости
    async generateLabels(boxes) { 
        return this._createPdf({
            content: [{ text: 'Функция generateLabels не реализована в этой версии', fontSize: 15 }]
        }); 
    }

    // === ШАБЛОН: ВИДЕОПЕРЕДАТЧИКИ (VIDEO_KIT) ===
    async generateVideoTransmitterLabelBatch(labelsArray, options = {}) {
        if (!fontDir) logger.warn("Внимание: Шрифты Roboto не найдены, PDF может выглядеть иначе.");

        const pageWidthMm = options.widthMm || 140;
        const pageHeightMm = options.heightMm || 90;
        const pageWidthPt = pageWidthMm * 2.835;
        const pageHeightPt = pageHeightMm * 2.835;
        const lineWidth = (pageWidthPt - 20) * 0.60; 
        const pageMargins = [5, 5, 5, 5]; 

        const docDefinition = {
            pageSize: { width: pageWidthPt, height: pageHeightPt },
            pageMargins: pageMargins, 
            content: [],
            defaultStyle: { font: 'Roboto', fontSize: 10 }
        };

        labelsArray.forEach((data, index) => {
            const labelContent = [
                {
                    table: {
                        widths: ['35%', '65%'],
                        body: [
                            [
                                { 
                                    text: data.code || '', 
                                    fontSize: 12, 
                                    bold: true, 
                                    margin: [2, 10, 0, 0],
                                    border: [false, false, false, false]
                                },
                                { 
                                    qr: data.qrCode || 'EMPTY', 
                                    fit: 65,
                                    alignment: 'right', 
                                    margin: [0, 0, 2, 5],
                                    border: [false, false, false, false]
                                }
                            ],
                            [
                                { 
                                    text: data.productName || 'Изделие', 
                                    colSpan: 2, 
                                    fontSize: 12, 
                                    bold: true, 
                                    alignment: 'center', 
                                    margin: [0, 2],
                                    fillColor: '#F0F0F0' 
                                }, 
                                {}
                            ],
                            [
                                {
                                    text: data.id || '',
                                    fontSize: 24, 
                                    bold: true,
                                    alignment: 'center',
                                    margin: [0, 8, 0, 0]
                                },
                                {
                                    stack: [
                                        { text: data.date || '', alignment: 'center', fontSize: 9, margin: [0, 0, 0, 2] },
                                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: lineWidth, y2: 0, lineWidth: 0.5, lineColor: '#000' }] }, 
                                        { text: `${data.quantity || ''} ${data.unit || ''}`, alignment: 'center', fontSize: 16, bold: true, margin: [0, 2, 0, 0] }
                                    ],
                                    margin: [0, 0]
                                }
                            ],
                            [
                                { 
                                    text: data.contract || '', 
                                    colSpan: 2, 
                                    fontSize: 7, 
                                    alignment: 'center', 
                                    margin: [0, 2],
                                    fillColor: '#F0F0F0'
                                }, 
                                {}
                            ],
                            [
                                { 
                                    qr: data.bottomQr || 'ERROR', 
                                    fit: 75, 
                                    alignment: 'center', 
                                    margin: [0, 5, 0, 0],
                                    border: [false, false, false, false]
                                }, 
                                {
                                    text: '', 
                                    border: [false, false, false, false]
                                }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: (i, node) => {
                            if (i === 0 || i === node.table.body.length) return 0;
                            return 1;
                        },
                        vLineWidth: (i, node) => {
                            if (i === 0 || i === node.table.widths.length) return 0;
                            return 1;
                        },
                        hLineColor: '#000',
                        vLineColor: '#000',
                        paddingLeft: (i) => 5,
                        paddingRight: (i) => 5,
                        paddingTop: (i) => 2,
                        paddingBottom: (i) => 2
                    },
                    margin: [0, 0, 0, 0]
                }
            ];

            docDefinition.content.push(labelContent);

            if (index < labelsArray.length - 1) {
                docDefinition.content.push({ text: '', pageBreak: 'after' });
            }
        });

        return this._createPdf(docDefinition);
    }

    // === ШАБЛОН: УНИВЕРСАЛЬНЫЙ (SIMPLE) ===
    async generateSimpleZebraBatch(labelsArray, options = {}) {
        if (!fontDir && !options.suppressWarning) logger.warn("Шрифты Roboto не найдены для Simple шаблона.");

        const pageWidthMm = options.widthMm || 140;
        const pageHeightMm = options.heightMm || 90;
        const pageWidthPt = pageWidthMm * 2.835;
        const pageHeightPt = pageHeightMm * 2.835;

        const docDefinition = {
            pageSize: { width: pageWidthPt, height: pageHeightPt },
            pageMargins: [10, 10, 10, 10], 
            content: [],
            defaultStyle: { font: 'Roboto', fontSize: 12 }
        };

        labelsArray.forEach((data, index) => {
            const content = [
                { text: data.productName, fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },
                {
                    columns: [
                        { qr: data.bottomQr || data.code, fit: 80, alignment: 'center' },
                        { 
                            stack: [
                                { text: 'ID / Партия:', fontSize: 10, color: 'gray' },
                                { text: data.code, fontSize: 14, bold: true, margin: [0, 0, 0, 10] },
                                { text: 'Количество:', fontSize: 10, color: 'gray' },
                                { text: `${data.quantity} ${data.unit}`, fontSize: 18, bold: true },
                                { text: data.date, fontSize: 10, margin: [0, 5, 0, 0] }
                            ],
                            alignment: 'left',
                            margin: [10, 0, 0, 0]
                        }
                    ]
                }
            ];

            docDefinition.content.push(content);

            if (index < labelsArray.length - 1) {
                docDefinition.content.push({ text: '', pageBreak: 'after' });
            }
        });

        return this._createPdf(docDefinition);
    }

    // === ШАБЛОН: КАСТОМНЫЙ ИЗ КОНСТРУКТОРА (CUSTOM) ===
    async generateCustomLabelBatch(labelsArray, customLayout, options = {}) {
        const pageWidthMm = options.widthMm || 100;
        const pageHeightMm = options.heightMm || 60;
        const pageWidthPt = pageWidthMm * 2.835;
        const pageHeightPt = pageHeightMm * 2.835;
        const MM_TO_PT = 2.835;

        const docDefinition = {
            pageSize: { width: pageWidthPt, height: pageHeightPt },
            pageMargins: [0, 0, 0, 0],
            content: [],
            defaultStyle: { font: 'Roboto', fontSize: 10 }
        };

        // Функция подстановки переменных
        const replaceVars = (text, data) => {
            if (!text) return '';
            return text
                .replace(/\{\{code\}\}/g, data.code || '')
                .replace(/\{\{name\}\}/g, data.productName || '')
                .replace(/\{\{productName\}\}/g, data.productName || '')
                .replace(/\{\{id\}\}/g, data.id || '')
                .replace(/\{\{date\}\}/g, data.date || '')
                .replace(/\{\{serial\}\}/g, data.code || '')
                .replace(/\{\{contract\}\}/g, data.contract || '')
                .replace(/\{\{batch\}\}/g, data.batch || '')
                .replace(/\{\{qty\}\}/g, String(data.quantity || ''))
                .replace(/\{\{quantity\}\}/g, String(data.quantity || ''))
                .replace(/\{\{unit\}\}/g, data.unit || '')
                .replace(/\{\{price\}\}/g, data.price || '')
                .replace(/\{\{weight\}\}/g, data.weight || '')
                .replace(/\{\{url\}\}/g, `https://mes.local/item/${data.code}`)
                .replace(/\{\{full_info\}\}/g, data.bottomQr || '')
                .replace(/\{\{quantity_unit\}\}/g, `${data.quantity || ''} ${data.unit || ''}`)
                .replace(/\{\{current\}\}/g, String(data.currentIndex || 1))
                .replace(/\{\{total\}\}/g, String(data.totalCount || 1));
        };

        // Стандартные иконки маркировки по ГОСТ 14192-96 (упрощённые SVG для PDF)
        const STANDARD_ICONS = {
            // Хрупкое - бокал
            fragile: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M15 5 L15 18 Q15 28 25 28 Q35 28 35 18 L35 5" fill="none" stroke="#000" stroke-width="2.5"/><line x1="25" y1="28" x2="25" y2="40" stroke="#000" stroke-width="2.5"/><line x1="15" y1="40" x2="35" y2="40" stroke="#000" stroke-width="2.5"/><line x1="12" y1="45" x2="38" y2="45" stroke="#000" stroke-width="2.5"/></svg>',
            
            // Беречь от влаги - зонт
            keep_dry: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 8 Q10 8 8 22 L25 22 L25 38 Q25 42 30 40" fill="none" stroke="#000" stroke-width="2.5"/><path d="M25 8 Q40 8 42 22 L25 22" fill="none" stroke="#000" stroke-width="2.5"/><circle cx="14" cy="32" r="2" fill="#000"/><circle cx="22" cy="38" r="2" fill="#000"/><circle cx="36" cy="35" r="2" fill="#000"/></svg>',
            
            // Верх - две стрелки
            this_side_up: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 5 L35 18 L29 18 L29 24 L21 24 L21 18 L15 18 Z" fill="none" stroke="#000" stroke-width="2"/><path d="M25 26 L35 39 L29 39 L29 45 L21 45 L21 39 L15 39 Z" fill="none" stroke="#000" stroke-width="2"/></svg>',
            
            // Температурный режим - термометр
            keep_frozen: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="5" width="10" height="30" rx="5" fill="none" stroke="#000" stroke-width="2"/><circle cx="25" cy="40" r="7" fill="none" stroke="#000" stroke-width="2"/><circle cx="25" cy="40" r="4" fill="#000"/><line x1="25" y1="38" x2="25" y2="15" stroke="#000" stroke-width="3"/></svg>',
            
            // Беречь от солнца - солнце + крыша
            keep_away_heat: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="15" r="6" fill="none" stroke="#000" stroke-width="2"/><line x1="25" y1="5" x2="25" y2="8" stroke="#000" stroke-width="2"/><line x1="25" y1="22" x2="25" y2="25" stroke="#000" stroke-width="2"/><line x1="15" y1="15" x2="18" y2="15" stroke="#000" stroke-width="2"/><line x1="32" y1="15" x2="35" y2="15" stroke="#000" stroke-width="2"/><path d="M5 45 L5 32 L25 25 L45 32 L45 45" fill="none" stroke="#000" stroke-width="2"/></svg>',
            
            // Не штабелировать - коробки + линия
            do_not_stack: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="28" width="30" height="18" fill="none" stroke="#000" stroke-width="2"/><rect x="14" y="12" width="22" height="14" fill="none" stroke="#000" stroke-width="2"/><line x1="5" y1="5" x2="45" y2="45" stroke="#000" stroke-width="3"/></svg>',
            
            // Внимание - треугольник
            warning: '<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25 5 L45 42 L5 42 Z" fill="none" stroke="#000" stroke-width="2.5"/><line x1="25" y1="18" x2="25" y2="30" stroke="#000" stroke-width="3"/><circle cx="25" cy="36" r="2" fill="#000"/></svg>'
        };

        // Обрабатываем каждую этикетку
        for (let labelIndex = 0; labelIndex < labelsArray.length; labelIndex++) {
            const data = labelsArray[labelIndex];
            const pageContent = [];

            // Обрабатываем каждый элемент макета
            for (const el of customLayout) {
                const xPt = el.x * MM_TO_PT;
                const yPt = el.y * MM_TO_PT;
                const widthPt = el.width * MM_TO_PT;
                const heightPt = (el.height || 10) * MM_TO_PT;

                // TEXT
                if (el.type === 'TEXT') {
                    const textContent = replaceVars(el.content || '', data);
                    pageContent.push({
                        text: textContent,
                        fontSize: el.fontSize || 10,
                        bold: el.isBold || false,
                        alignment: el.align || 'left',
                        absolutePosition: { x: xPt, y: yPt },
                        width: widthPt
                    });
                }

                // QR
                if (el.type === 'QR') {
                    const qrContent = replaceVars(el.content || '{{code}}', data);
                    const qrSize = Math.min(widthPt, heightPt);
                    pageContent.push({
                        qr: qrContent || 'EMPTY',
                        fit: qrSize,
                        absolutePosition: { x: xPt, y: yPt }
                    });
                }

                // COUNTER
                if (el.type === 'COUNTER') {
                    const counterText = replaceVars(el.counterFormat || '{{current}} / {{total}}', data);
                    pageContent.push({
                        text: counterText,
                        fontSize: el.fontSize || 14,
                        bold: el.isBold || false,
                        alignment: el.align || 'left',
                        absolutePosition: { x: xPt, y: yPt },
                        width: widthPt
                    });
                }

                // LINE
                if (el.type === 'LINE') {
                    const isHorizontal = el.width >= (el.height || 1);
                    const lineWidth = el.strokeWidth ? el.strokeWidth * MM_TO_PT : 1;
                    
                    if (isHorizontal) {
                        pageContent.push({
                            canvas: [{
                                type: 'line',
                                x1: 0, y1: 0,
                                x2: widthPt, y2: 0,
                                lineWidth: lineWidth,
                                lineColor: 'black'
                            }],
                            absolutePosition: { x: xPt, y: yPt }
                        });
                    } else {
                        pageContent.push({
                            canvas: [{
                                type: 'line',
                                x1: 0, y1: 0,
                                x2: 0, y2: heightPt,
                                lineWidth: lineWidth,
                                lineColor: 'black'
                            }],
                            absolutePosition: { x: xPt, y: yPt }
                        });
                    }
                }

                // RECTANGLE
                if (el.type === 'RECTANGLE') {
                    const lineWidth = el.strokeWidth ? el.strokeWidth * MM_TO_PT : 1;
                    pageContent.push({
                        canvas: [{
                            type: 'rect',
                            x: 0, y: 0,
                            w: widthPt,
                            h: heightPt,
                            lineWidth: lineWidth,
                            lineColor: 'black'
                        }],
                        absolutePosition: { x: xPt, y: yPt }
                    });
                }

                // IMAGE
                if (el.type === 'IMAGE' && el.imageUrl) {
                    try {
                        pageContent.push({
                            image: el.imageUrl,
                            width: widthPt,
                            height: heightPt,
                            absolutePosition: { x: xPt, y: yPt }
                        });
                    } catch (imgErr) {
                        logger.warn('Ошибка загрузки изображения:', imgErr.message);
                    }
                }

                // ICON
                if (el.type === 'ICON') {
                    if (el.imageUrl) {
                        // Пользовательская иконка
                        try {
                            pageContent.push({
                                image: el.imageUrl,
                                width: widthPt,
                                height: heightPt,
                                absolutePosition: { x: xPt, y: yPt }
                            });
                        } catch (imgErr) {
                            logger.warn('Ошибка загрузки пользовательской иконки:', imgErr.message);
                        }
                    } else if (el.iconType && STANDARD_ICONS[el.iconType]) {
                        // Стандартная иконка
                        try {
                            pageContent.push({
                                svg: STANDARD_ICONS[el.iconType],
                                width: widthPt,
                                height: heightPt,
                                absolutePosition: { x: xPt, y: yPt }
                            });
                        } catch (svgErr) {
                            // Fallback - текстовая метка
                            pageContent.push({
                                text: el.content || el.iconType || '?',
                                fontSize: 8,
                                absolutePosition: { x: xPt, y: yPt }
                            });
                        }
                    }
                }
            }

            // Добавляем контент страницы
            if (pageContent.length > 0) {
                docDefinition.content.push({
                    stack: pageContent,
                    unbreakable: true
                });
            }

            // Разрыв страницы
            if (labelIndex < labelsArray.length - 1) {
                docDefinition.content.push({ text: '', pageBreak: 'after' });
            }
        }

        return this._createPdf(docDefinition);
    }
}

module.exports = new PdfService();
