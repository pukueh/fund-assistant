import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { recognizeText, parseHoldingText, type ParsedHolding } from '../utils/ocr';
import { usePortfolioStore } from '../store';
import { discoveryApi } from '../api/discovery';

interface ImportHoldingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ImportHoldingsModal: React.FC<ImportHoldingsModalProps> = ({ isOpen, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [holdings, setHoldings] = useState<ParsedHolding[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addHolding } = usePortfolioStore();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setError(null);
            setHoldings([]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            setFile(droppedFile);
            setPreviewUrl(URL.createObjectURL(droppedFile));
            setError(null);
            setHoldings([]);
        }
    };

    const handleRecognize = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        try {
            const text = await recognizeText(file);
            console.log('Recognized text:', text);
            const parsed = parseHoldingText(text);

            if (parsed.length === 0) {
                setError('未识别到有效的基金持仓信息，请尝试更清晰的截图');
            } else {
                // Auto-fill codes via API search
                // Set initial holdings first so user sees something
                setHoldings(parsed);

                // Then enrich with codes
                const enriched = await Promise.all(parsed.map(async (h) => {
                    if (!h.fundCode) {
                        try {
                            const { funds } = await discoveryApi.searchFunds(h.fundName);
                            if (funds && funds.length > 0) {
                                return { ...h, fundCode: funds[0].code };
                            }
                        } catch (e) {
                            console.error('Failed to search fund code:', h.fundName);
                        }
                    }
                    return h;
                }));
                setHoldings(enriched);
            }
        } catch (err) {
            console.error('OCR Error:', err);
            setError('识别失败，请重试');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSearchCode = async (index: number) => {
        const h = holdings[index];
        if (!h.fundName) return;

        try {
            const { funds } = await discoveryApi.searchFunds(h.fundName);
            if (funds && funds.length > 0) {
                handleUpdateHolding(index, 'fundCode', funds[0].code);
            } else {
                alert('未找到该基金，请手动输入代码');
            }
        } catch (e) {
            alert('搜索失败');
        }
    };

    const handleUpdateHolding = (index: number, field: keyof ParsedHolding, value: any) => {
        const newHoldings = [...holdings];
        newHoldings[index] = { ...newHoldings[index], [field]: value };
        setHoldings(newHoldings);
    };

    const handleImportOne = async (index: number) => {
        const holding = holdings[index];
        if (!holding.fundCode || !holding.amount) {
            alert('请完善基金代码和金额');
            return;
        }

        try {
            // Calculate cost basis if profit is present
            const costBasis = holding.profit !== undefined ? (holding.amount - holding.profit) : holding.amount;
            const costNav = holding.cost || 1.0;
            const shares = holding.share || (costBasis / costNav);

            await addHolding({
                fund_code: holding.fundCode,
                fund_name: holding.fundName,
                shares: shares,
                cost_nav: costNav
            });

            // Remove from list
            const newHoldings = holdings.filter((_, i) => i !== index);
            setHoldings(newHoldings);

            if (newHoldings.length === 0) {
                onClose();
            }
        } catch (err) {
            alert('导入失败');
        }
    };



    const handleImportAll = async () => {
        const validHoldings = holdings.filter(h => h.fundCode && h.amount);
        if (validHoldings.length === 0) {
            setError('没有可导入的有效数据（请确保已填写基金代码）');
            return;
        }

        const { batchAddHoldings } = usePortfolioStore.getState();

        setIsProcessing(true);
        setError(null);
        try {
            const items = validHoldings.map(h => {
                const costBasis = h.profit !== undefined ? (h.amount - h.profit) : h.amount;
                const cn = h.cost || 1.0;
                return {
                    fund_code: h.fundCode!,
                    fund_name: h.fundName,
                    shares: h.share || (costBasis / cn),
                    cost_nav: cn
                };
            });

            const success = await batchAddHoldings(items);
            if (success) {
                onClose();
            } else {
                const storeError = usePortfolioStore.getState().error;
                setError(storeError || '部分导入失败，请检查网络或重试');
            }
        } catch (err) {
            setError('批量导入失败');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#1e1e2d] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ImageIcon className="text-[#00d4aa]" />
                            导入持仓截图
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">支持支付宝、天天基金等App持仓截图</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 flex gap-6">
                    {/* Left: Upload & Preview */}
                    <div className="w-1/3 flex flex-col gap-4">
                        <div
                            className={`
                                flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 transition-colors relative min-h-[300px]
                                ${previewUrl ? 'border-[#00d4aa]/30 bg-[#00d4aa]/5' : 'border-gray-700 hover:border-gray-500 hover:bg-white/5'}
                            `}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <Upload size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="font-medium">点击或拖拽上传截图</p>
                                    <p className="text-xs mt-2">支持 JPG, PNG</p>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>

                        <button
                            onClick={handleRecognize}
                            disabled={!file || isProcessing}
                            className={`
                                btn w-full py-3 font-semibold flex items-center justify-center gap-2
                                ${!file || isProcessing ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'btn-primary'}
                            `}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    AI 识别中...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    开始识别
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Right: Results */}
                    <div className="flex-1 bg-black/20 rounded-xl border border-white/5 p-4 overflow-y-auto">
                        <h3 className="text-lg font-medium text-white mb-4">识别结果</h3>

                        {holdings.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600">
                                <p>暂无数据</p>
                                <p className="text-sm mt-1">请上传图片并点击开始识别</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {holdings.map((item, index) => (
                                    <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/5 hover:border-[#00d4aa]/30 transition-colors">
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">基金名称</label>
                                                <input
                                                    type="text"
                                                    value={item.fundName}
                                                    onChange={(e) => handleUpdateHolding(index, 'fundName', e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-[#00d4aa] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-xs text-gray-500">基金代码</label>
                                                    {!item.fundCode && (
                                                        <button
                                                            onClick={() => handleSearchCode(index)}
                                                            className="text-xs text-[#00d4aa] hover:underline"
                                                        >
                                                            自动匹配
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={item.fundCode || ''}
                                                    onChange={(e) => handleUpdateHolding(index, 'fundCode', e.target.value)}
                                                    placeholder="请输入6位代码"
                                                    className={`w-full bg-black/20 border rounded px-2 py-1 text-sm text-white focus:border-[#00d4aa] outline-none font-mono ${!item.fundCode ? 'border-red-500/30' : 'border-white/10'}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4 mb-4">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">持有金额</label>
                                                <input
                                                    type="number"
                                                    value={item.amount || ''}
                                                    onChange={(e) => handleUpdateHolding(index, 'amount', parseFloat(e.target.value))}
                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-[#00d4aa] outline-none font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">持仓收益</label>
                                                <input
                                                    type="number"
                                                    value={item.profit || 0}
                                                    onChange={(e) => handleUpdateHolding(index, 'profit', parseFloat(e.target.value))}
                                                    className={`w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm focus:border-[#00d4aa] outline-none font-mono ${item.profit && item.profit > 0 ? 'text-emerald-400' : item.profit && item.profit < 0 ? 'text-rose-400' : 'text-white'}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">成本净值</label>
                                                <input
                                                    type="number"
                                                    value={item.cost || ''}
                                                    onChange={(e) => handleUpdateHolding(index, 'cost', parseFloat(e.target.value))}
                                                    placeholder="1.0000"
                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-[#00d4aa] outline-none font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">持有份额</label>
                                                <input
                                                    type="number"
                                                    value={item.share || ((item.amount - (item.profit || 0)) / (item.cost || 1.0)).toFixed(2)}
                                                    readOnly
                                                    className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-sm text-gray-500 outline-none font-mono cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    const newHoldings = holdings.filter((_, i) => i !== index);
                                                    setHoldings(newHoldings);
                                                }}
                                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                            >
                                                忽略
                                            </button>
                                            <button
                                                onClick={() => handleImportOne(index)}
                                                className="px-3 py-1.5 text-xs bg-[#00d4aa]/20 text-[#00d4aa] hover:bg-[#00d4aa]/30 rounded transition-colors font-medium border border-[#00d4aa]/30"
                                            >
                                                确认导入
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={handleImportAll}
                                    className="w-full py-3 bg-[#00d4aa] text-black font-semibold rounded-xl hover:bg-[#00bda3] transition-colors mt-4"
                                >
                                    一键导入全部 ({holdings.filter(h => h.fundCode && h.amount).length} 项)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
