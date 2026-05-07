
import React from 'react';
import { MusicIcon, SparklesIcon } from './icons';

const MusicGenerator: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] bg-[#0a0a0f] border border-white/10 rounded-2xl p-12 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(236,72,153,0.2)]">
        <MusicIcon className="w-10 h-10 text-pink-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Генерация Музыки (ZAVOD Sound)</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Этот модуль находится в разработке. Скоро вы сможете создавать саундтреки для ваших видео с помощью нейросетей.
        </p>
      </div>
      
      <div className="flex gap-4">
        <div className="px-6 py-4 bg-white/5 border border-white/5 rounded-xl text-left">
           <span className="block text-[10px] text-pink-400 font-bold uppercase mb-1">Status</span>
           <span className="text-sm font-medium">Бета-тестирование</span>
        </div>
        <div className="px-6 py-4 bg-white/5 border border-white/5 rounded-xl text-left">
           <span className="block text-[10px] text-indigo-400 font-bold uppercase mb-1">Engine</span>
           <span className="text-sm font-medium">MusicLM / Lyria</span>
        </div>
      </div>

      <button disabled className="mt-8 px-8 py-3 bg-white/5 border border-white/10 text-gray-500 rounded-xl cursor-not-allowed flex items-center gap-2">
         <SparklesIcon className="w-4 h-4" /> Запустить синтез (Текст → Аудио)
      </button>
    </div>
  );
};

export default MusicGenerator;
