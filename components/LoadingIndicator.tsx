
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';

interface LoadingIndicatorProps {
  logs?: any[];
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ logs = [] }) => {
  const latestLog = logs[logs.length - 1];

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-gray-900/50 rounded-2xl border border-white/5 shadow-2xl">
      <div className="relative mb-8">
        <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2">Генерация видео</h2>
      
      <div className="max-w-md w-full text-center space-y-3">
        {latestLog ? (
            <div className="animate-fade-in">
                <p className={`text-sm font-mono ${latestLog.type === 'error' ? 'text-red-400' : 'text-indigo-300'}`}>
                    {latestLog.message}
                </p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Текущий статус пайплайна</p>
            </div>
        ) : (
            <p className="text-gray-400 text-sm animate-pulse">Инициализация AI сессии...</p>
        )}
      </div>

      <div className="mt-8 flex gap-1">
         {[0, 1, 2, 3].map(i => (
             <div key={i} className="w-8 h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-1000" 
                  style={{ width: logs.length > (i * 3) ? '100%' : '0%' }}
                />
             </div>
         ))}
      </div>
    </div>
  );
};

export default LoadingIndicator;
