
import React, { useState, useRef, useEffect } from 'react';
import { AIRole, ChatMessage } from '../types';
import { SendIcon, BotIcon, UserIcon, SparklesIcon, TrashIcon, MessageSquareIcon } from './icons';
import { generateChatResponse } from '../services/geminiService';

const DEFAULT_ROLES: AIRole[] = [
  {
    id: 'senior-architect',
    name: 'Senior Architect',
    description: 'Эксперт по архитектуре и коду (30 лет опыта)',
    systemInstruction: 'Ты - ультра-максимальный программист уровня Senior Architect с 30-летним опытом. Твои ответы должны быть технически безупречны, лаконичны и профессиональны. Ты знаешь все языки программирования и лучшие практики.',
    avatar: '👨‍💻'
  },
  {
    id: 'prompt-engineer',
    name: 'Prompt Master',
    description: 'Мастер создания видео-промптов',
    systemInstruction: 'Ты - эксперт в области Prompt Engineering для моделей Veo, Sora и Kling. Ты помогаешь пользователям превращать их простые идеи в детализированные, кинематографичные промпты, которые дают лучший результат при генерации видео.',
    avatar: '🎨'
  },
  {
    id: 'sys-admin',
    name: 'SysAdmin Ultra',
    description: 'Эксперт по серверам и Vertex AI',
    systemInstruction: 'Ты - системный администратор с 20-летним стажем. Ты помогаешь с настройкой Google Cloud, Vertex AI, API ключами и инфраструктурой. Твой тон строгий, но полезный.',
    avatar: '⚙️'
  },
  {
    id: 'creative-director',
    name: 'Creative Director',
    description: 'Визионер и режиссер',
    systemInstruction: 'Ты - креативный директор и кинорежиссер. Ты помогаешь продумать сценарии, раскадровку и визуальный стиль для будущих видеороликов.',
    avatar: '🎬'
  }
];

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(DEFAULT_ROLES[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedRole = DEFAULT_ROLES.find(r => r.id === selectedRoleId) || DEFAULT_ROLES[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await generateChatResponse([...messages, userMessage], selectedRole);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[700px] bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar for Roles */}
      <div className="flex h-full">
        <div className="w-64 border-r border-white/5 bg-[#121218] p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2 py-1 mb-2">
            <MessageSquareIcon className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Роли AI</h3>
          </div>
          
          <div className="flex flex-col gap-2">
            {DEFAULT_ROLES.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`p-3 rounded-xl border text-left transition-all group ${
                  selectedRoleId === role.id 
                  ? 'bg-indigo-600/10 border-indigo-500/50 text-white' 
                  : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{role.avatar}</span>
                  <div>
                    <h4 className="text-sm font-bold">{role.name}</h4>
                    <p className="text-[10px] opacity-60 line-clamp-1">{role.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-white/5">
             <button 
                onClick={clearChat}
                className="w-full flex items-center justify-center gap-2 p-3 text-xs text-red-400 hover:bg-red-950/20 rounded-xl transition-colors"
             >
                <TrashIcon className="w-4 h-4" /> Очистить диалог
             </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative bg-gradient-to-b from-[#0a0a0f] to-[#121216]">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-xl border border-indigo-500/30">
                {selectedRole.avatar}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{selectedRole.name}</h2>
                <p className="text-[10px] text-indigo-400 font-mono">active_session: stable_v2</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                 <div className="p-6 rounded-full bg-indigo-500/10 border border-indigo-500/10">
                    <BotIcon className="w-12 h-12 text-indigo-400" />
                 </div>
                 <div>
                    <p className="text-lg font-bold">ZAVOD Чат Активен</p>
                    <p className="text-sm">Выберите роль и начните диалог...</p>
                 </div>
              </div>
            ) : (
              messages.map(msg => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs border shrink-0
                      ${msg.role === 'user' ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-white/5 border-white/10'}`}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-indigo-400" /> : selectedRole.avatar}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                      ${msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/10' 
                        : 'bg-white/5 border border-white/5 text-gray-300 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs">
                    {selectedRole.avatar}
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/40 border-t border-white/5">
            <div className="max-w-3xl mx-auto relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Спросите Senior Architect или Master Prompt..."
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl p-4 pr-12 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none h-14"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:grayscale"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-600 text-center mt-2 group">
              Кодировка: <span className="text-gray-500">UTF-8</span> | Роль: <span className="text-indigo-500 group-hover:text-indigo-400 transition-colors">{selectedRole.name}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
