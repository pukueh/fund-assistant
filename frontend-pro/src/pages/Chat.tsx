
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AIChat } from '../components/chat/AIChat';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

export const Chat: React.FC = () => {
    const [searchParams] = useSearchParams();
    const agent = searchParams.get('agent') || 'strategist';

    return (
        <motion.div
            className="h-[calc(100vh-120px)] p-6 lg:p-10 flex flex-col overflow-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="mb-6">
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">AI 智能分析师</h1>
                <p className="text-gray-400 font-medium">
                    您的全天候私人投资顾问，支持深度对话与多维度市场分析。
                </p>
            </div>

            <div className="flex-1 min-h-0">
                <AIChat defaultAgent={agent} />
            </div>
        </motion.div>
    );
};

export default Chat;
