import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Wallet, Check } from 'lucide-react';
import { useAuthStore } from '../../store/useAuth';

interface Account {
    id: string;
    user_id: string;
    name: string;
    description: string;
    is_default: boolean;
    created_at: string;
}

interface AccountSelectorProps {
    onAccountChange?: (accountId: string) => void;
}

export function AccountSelector({ onAccountChange }: AccountSelectorProps) {
    const { user } = useAuthStore();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

    useEffect(() => {
        if (user) {
            fetchAccounts();
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const fetchAccounts = async () => {
        try {
            const token = (user as any)?.token;
            if (!token) return;

            const response = await fetch(`${API_BASE}/api/accounts`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAccounts(data);

                // Select default account
                const defaultAccount = data.find((a: Account) => a.is_default) || data[0];
                if (defaultAccount) {
                    setSelectedAccount(defaultAccount);
                    onAccountChange?.(defaultAccount.id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch accounts:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = async (account: Account) => {
        setSelectedAccount(account);
        setIsOpen(false);
        onAccountChange?.(account.id);

        const token = (user as any)?.token;
        if (!token) return;

        // Set as default
        if (!account.is_default) {
            await fetch(`${API_BASE}/api/accounts/${account.id}/set-default`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    };

    const handleCreate = async () => {
        if (!newAccountName.trim()) return;

        try {
            const response = await fetch(`${API_BASE}/api/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newAccountName.trim() })
            });

            if (response.ok) {
                const newAccount = await response.json();
                setAccounts(prev => [...prev, newAccount]);
                setNewAccountName('');
                setIsCreating(false);
                handleSelect(newAccount);
            }
        } catch (err) {
            console.error('Failed to create account:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] rounded-lg">
                <Wallet className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">加载中...</span>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] hover:bg-[#1f1f3a] rounded-lg border border-white/5 transition-colors"
            >
                <Wallet className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white">{selectedAccount?.name || '选择账户'}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a2e] rounded-lg border border-white/10 shadow-xl z-50">
                    {/* Account List */}
                    <div className="py-1">
                        {accounts.map((account) => (
                            <button
                                key={account.id}
                                onClick={() => handleSelect(account)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors ${selectedAccount?.id === account.id ? 'text-purple-400' : 'text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    <span>{account.name}</span>
                                </div>
                                {selectedAccount?.id === account.id && (
                                    <Check className="w-4 h-4 text-purple-400" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Create New Account */}
                    <div className="border-t border-white/5 p-2">
                        {isCreating ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newAccountName}
                                    onChange={(e) => setNewAccountName(e.target.value)}
                                    placeholder="账户名称"
                                    className="flex-1 px-2 py-1 text-sm bg-[#0f0f1a] border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreate();
                                        if (e.key === 'Escape') {
                                            setIsCreating(false);
                                            setNewAccountName('');
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleCreate}
                                    className="px-2 py-1 bg-purple-500 hover:bg-purple-600 rounded text-white text-sm transition-colors"
                                >
                                    创建
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>新建账户</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

export default AccountSelector;
