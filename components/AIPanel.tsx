import React, { useState, useRef, useEffect } from 'react';
import { chatWithTutor } from '../services/geminiService';
import { DataPoint, ChatMessage } from '../types';

interface AIPanelProps {
    points: DataPoint[];
    gamma: number;
}

const AIPanel: React.FC<AIPanelProps> = ({ points, gamma }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: 'Hello! I can help you understand how the RBF kernel transforms this data. Try adjusting the Gamma or Lift, then ask me what is happening!' }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (overrideText?: string) => {
        const textToSend = overrideText || input;
        if (!textToSend.trim()) return;

        const newHistory: ChatMessage[] = [...messages, { role: 'user', text: textToSend }];
        setMessages(newHistory);
        setInput("");
        setLoading(true);

        const responseText = await chatWithTutor(newHistory, textToSend, {
            gamma,
            pointsCount: points.length
        });

        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        setLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestions = [
        "What is the kernel trick?",
        "Why does changing Gamma affect the boundary?",
        "Is this model overfitting?"
    ];

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg flex flex-col h-[600px] shadow-xl">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Kernel Tutor
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg px-4 py-2 text-sm leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-700 rounded-lg px-4 py-2 rounded-bl-none flex space-x-1 items-center">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Suggestions */}
            {messages.length < 3 && (
                <div className="px-4 py-2 flex flex-wrap gap-2">
                    {suggestions.map(s => (
                        <button 
                            key={s}
                            onClick={() => handleSend(s)}
                            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-full transition-colors border border-slate-600"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <div className="p-3 border-t border-slate-700 bg-slate-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about RBF..."
                        className="flex-1 bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIPanel;