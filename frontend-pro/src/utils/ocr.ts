/**
 * Fund Assistant Pro - OCR Utility
 * 
 * Uses Tesseract.js to recognize text from screenshots and parse fund holdings.
 */

import { createWorker } from 'tesseract.js';

export interface ParsedHolding {
    fundName: string;
    fundCode?: string;
    amount: number;
    share?: number;
    profit?: number;
    cost?: number;
    confidence: number;
}

// Recognize text from an image file
export async function recognizeText(
    imageFile: File
): Promise<string> {
    const worker = await createWorker('chi_sim'); // Simplified Chinese

    // Progress callback (optional, currently unused)
    // if (onProgress) ...

    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();

    return text;
}

/**
 * Parse recognized text into structured holding data
 * Supports common formats like Alipay and Tiantian Fund
 */
export function parseHoldingText(text: string): ParsedHolding[] {
    console.log('Raw OCR Text:', text); // Debugging

    // Pre-processing: remove spaces within numbers (e.g., "1, 234. 56") which OCR might produce
    // But be careful not to merge separate numbers.
    // Ideally, just split by newlines first.

    const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const holdings: ParsedHolding[] = [];

    // State
    let lastPotentialName = '';

    // Keywords to identify a fund name
    const nameKeywords = ['基金', '混合', '股票', '指数', '债', 'ETF', 'LOF', '联接', 'QDII', '美元', '人民币', '成长', '精选', '优势'];
    const nameExclusions = ['持有', '收益', '金额', '明细', '筛选', '排序', '确认', '规则', '资产', '总览'];

    // Simple check if a string is almost purely numbers/symbols
    const isDataLine = (str: string) => {
        const clean = str.replace(/[0-9.,+\-%¥\s]/g, '');
        return clean.length === 0 || clean.length < str.length * 0.2; // Allow small noise
    };

    lines.forEach((line) => {
        console.log('Processing line:', line);

        // 1. Check if line is a Fund Name
        const hasKeyword = nameKeywords.some(k => line.includes(k));
        const hasExclusion = nameExclusions.some(e => line.includes(e));

        // It's a name if:
        // (Has Keyword AND No Exclusion) OR (Length > 6 AND No Exclusion AND Not Data)
        if (!hasExclusion && !isDataLine(line)) {
            if (hasKeyword || line.length > 8) {
                // Found a potential name
                let cleanName = line.replace(/[><"']/g, '')
                    .replace(/今日收益.+/, '')
                    .replace(/持有.+/, '') // Extra safety
                    .trim();

                // If the previous name wasn't consumed, we overwrite it (assuming the previous one was a false positive or had no data)
                // But wait, sometimes names are split across lines? For now assume 1 line.
                if (cleanName.length > 4) {
                    lastPotentialName = cleanName;
                    return; // Move to next line to look for data
                }
            }
        }

        // 2. Check if line is Data (associated with last Name)
        if (lastPotentialName && isDataLine(line)) {
            // Extract numbers
            // Look for pattern: Number1 (Amount) ... Number2 (Profit, Signed)

            // Remove commons to standardise
            const normLine = line.replace(/,/g, '');

            // Match all numbers
            // Regex: Optional +/- , digits, optional dot definitions
            const matches = normLine.match(/[+-]?\d+(\.\d+)?/g);

            if (matches && matches.length >= 1) {
                let amount = 0;
                let profit = 0;

                // Strategy: 
                // First positive number is usually Amount.
                // First signed number (with + or - explicit, or just second number) is profit.
                // Actually, Amount is usually large, Profit can be pos/neg.

                // Let's analyze the original text relative positions if possible, but regex limits us.
                // Simple heuristic: 
                // Largest absolute value is likely Amount (Principal).
                // Remaining value is Profit.

                const values = matches.map(v => parseFloat(v));

                // Filter out likely dates or tiny integers if mixed
                const validValues = values.filter(v => !isNaN(v));

                if (validValues.length > 0) {
                    // Sort by magnitude to guess Amount -> usually holding amount > profit
                    // But if profit is huge? Unlikely for funds.
                    // Let's trust order: 1st is Amount, 2nd is Profit (if exists)

                    amount = Math.abs(validValues[0]); // Amount is always pos

                    if (validValues.length > 1) {
                        profit = validValues[1];
                    }

                    // Check if we found a header line mistakenly identified as data (unlikely due to isDataLine)
                    // Push holding
                    if (amount > 0) {
                        // Extract code from name if possible
                        let code = '';
                        const codeMatch = lastPotentialName.match(/(\d{6})/);
                        if (codeMatch) code = codeMatch[1];

                        holdings.push({
                            fundName: lastPotentialName,
                            fundCode: code,
                            amount: amount,
                            profit: profit,
                            confidence: 0.9
                        });

                        // Consume the name so we don't use it again for next data line
                        lastPotentialName = '';
                    }
                }
            }
        }
    });

    return holdings;
}
