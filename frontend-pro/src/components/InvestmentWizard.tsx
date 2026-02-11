import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { investmentApi } from '../api/investment';
import { discoveryApi } from '../api/discovery';
import type { Fund, InvestmentFlowState } from '../types';

interface InvestmentWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'select' | 'settings' | 'confirm';

export function InvestmentWizard({ isOpen, onClose }: InvestmentWizardProps) {
    const [step, setStep] = useState<Step>('select');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Fund[]>([]);
    const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
    const [amount, setAmount] = useState<number>(1000);
    const [frequency, setFrequency] = useState('weekly');
    const [sessionId, setSessionId] = useState<string>('');
    const [flowState, setFlowState] = useState<InvestmentFlowState | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const queryClient = useQueryClient();

    // Mutations
    const startFlowMutation = useMutation({
        mutationFn: investmentApi.flow.start,
        onSuccess: (data) => {
            setSessionId(data.session_id);
            setFlowState(data);
            setStep('settings');
        },
    });

    const calculateFlowMutation = useMutation({
        mutationFn: (vars: { amount: number; frequency: string }) =>
            investmentApi.flow.calculate(sessionId, vars.amount, vars.frequency),
        onSuccess: (data) => {
            setFlowState(data);
            setStep('confirm');
        },
    });

    const confirmFlowMutation = useMutation({
        mutationFn: () => investmentApi.flow.confirm(sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investment-plans'] });
            onClose();
            // Reset state
            setTimeout(() => {
                setStep('select');
                setSelectedFund(null);
                setSearchQuery('');
                setSearchResults([]);
            }, 300);
        },
    });

    // Search Funds
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length >= 4) {
            setIsSearching(true);
            try {
                const res = await discoveryApi.searchFunds(query);
                setSearchResults(res.funds || []);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a24] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">新建定投计划</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 min-h-[400px]">
                    {step === 'select' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-white mb-2">选择定投基金</h3>
                                <p className="text-gray-400 text-sm">输入基金代码或名称搜索</p>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="例如：110011"
                                    className="w-full bg-[#12121a] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#00d4aa]"
                                    autoFocus
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00d4aa] animate-spin" size={18} />
                                )}
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {searchResults.map((fund) => (
                                    <button
                                        key={fund.code}
                                        onClick={() => {
                                            setSelectedFund(fund);
                                            startFlowMutation.mutate(fund.code);
                                        }}
                                        className="w-full text-left p-4 bg-[#12121a] border border-white/5 rounded-xl hover:border-[#00d4aa] transition-colors flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="text-white font-medium group-hover:text-[#00d4aa] transition-colors">{fund.name}</div>
                                            <div className="text-sm text-gray-500">{fund.code}</div>
                                        </div>
                                        <ChevronRight className="text-gray-500 group-hover:text-[#00d4aa]" size={18} />
                                    </button>
                                ))}
                                {searchQuery && searchResults.length === 0 && !isSearching && (
                                    <div className="text-center text-gray-500 py-8">未找到相关基金</div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'settings' && selectedFund && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-[#12121a] rounded-xl border border-white/5">
                                <div className="w-10 h-10 rounded-full bg-[#00d4aa]/10 flex items-center justify-center text-[#00d4aa] font-bold">
                                    {selectedFund.name[0]}
                                </div>
                                <div>
                                    <div className="text-white font-medium">{selectedFund.name}</div>
                                    <div className="text-sm text-gray-500">{selectedFund.code}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">每次定投金额</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-medium">¥</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(Number(e.target.value))}
                                            className="w-full bg-[#12121a] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-[#00d4aa] font-bold text-lg"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">定投频率</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'weekly', label: '每周' },
                                            { id: 'biweekly', label: '每两周' },
                                            { id: 'monthly', label: '每月' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setFrequency(opt.id)}
                                                className={`py-2 rounded-lg text-sm font-medium transition-colors ${frequency === opt.id
                                                        ? 'bg-[#00d4aa] text-black'
                                                        : 'bg-[#12121a] text-gray-400 hover:text-white border border-white/10'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={() => calculateFlowMutation.mutate({ amount, frequency })}
                                    disabled={calculateFlowMutation.isPending}
                                    className="w-full py-3 bg-[#00d4aa] text-black font-bold rounded-xl hover:bg-[#00d4aa]/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    {calculateFlowMutation.isPending ? <Loader2 className="animate-spin" /> : '下一步：确认计划'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'confirm' && flowState && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-[#00d4aa]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#00d4aa]">
                                    <Check size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-white">确认定投计划</h3>
                                <p className="text-gray-400 text-sm">请核对以下信息</p>
                            </div>

                            <div className="bg-[#12121a] rounded-xl border border-white/5 p-4 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">基金名称</span>
                                    <span className="text-white font-medium text-right">{selectedFund?.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">定投金额</span>
                                    <span className="text-white font-medium">¥{amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">执行频率</span>
                                    <span className="text-white font-medium">
                                        {frequency === 'weekly' ? '每周' : frequency === 'biweekly' ? '每两周' : '每月'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm pt-4 border-t border-white/5">
                                    <span className="text-gray-400">如果不进行定投</span>
                                    <span className="text-gray-500 line-through">¥0.00</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-500/5 p-3 rounded-lg">
                                <AlertCircle size={14} className="mt-0.5 text-blue-500" />
                                <p>该计划将从下个周期开始执行。您可以随时在“我的计划”中暂停或修改。</p>
                            </div>

                            <button
                                onClick={() => confirmFlowMutation.mutate()}
                                disabled={confirmFlowMutation.isPending}
                                className="w-full py-3 bg-[#00d4aa] text-black font-bold rounded-xl hover:bg-[#00d4aa]/90 transition-colors flex items-center justify-center gap-2"
                            >
                                {confirmFlowMutation.isPending ? <Loader2 className="animate-spin" /> : '确认创建'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
