
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { ActivityIcon, AlertCircleIcon, ArrowPathIcon, KeyIcon } from './icons';

interface VideoDiagnosticsProps {
  videoUrl: string;
  onClose: () => void;
  lastError?: MediaError | null;
  apiErrorMessage?: string | null;
}

const VideoDiagnostics: React.FC<VideoDiagnosticsProps> = ({ videoUrl, onClose, lastError, apiErrorMessage }) => {
  const [status, setStatus] = useState<'checking' | 'done'>('checking');
  const [report, setReport] = useState<any>({});

  useEffect(() => {
    const run = async () => {
        const r: any = { apiError: apiErrorMessage };
        try {
            const res = await fetch(videoUrl);
            const blob = await res.blob();
            r.size = (blob.size / 1024 / 1024).toFixed(2) + ' MB';
            r.type = blob.type;
            
            const buf = await blob.slice(0, 8).arrayBuffer();
            const view = new Uint8Array(buf);
            r.isMp4 = view[4] === 102 && view[5] === 116; // 'ft'
        } catch (e) { r.fetchError = true; }
        setReport(r);
        setStatus('done');
    };
    run();
  }, [videoUrl, apiErrorMessage]);

  const isPermissionError = apiErrorMessage?.toLowerCase().includes('permission') || apiErrorMessage?.includes('403');

  return (
    <div className="bg-[#0f0f13] border border-white/10 rounded-2xl p-6 shadow-2xl animate-fade-in text-sm font-mono">
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
        <h3 className="text-amber-500 font-bold flex items-center gap-2">
            <ActivityIcon className="w-5 h-5" /> ЭКСПЕРТНЫЙ ДЕБАГГЕР
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>

      {isPermissionError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <KeyIcon className="w-4 h-4" /> ОБНАРУЖЕНА ОШИБКА ДОСТУПА (403)
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-4">
                  Модели Veo требуют **Платный проект** Google Cloud. Бесплатные ключи (Free Tier) не имеют прав на запуск видео-генерации.
              </p>
              <div className="space-y-2">
                  <a href="https://console.cloud.google.com/billing" target="_blank" className="block text-indigo-400 underline text-xs">1. Проверить биллинг в Google Cloud</a>
                  <a href="https://console.cloud.google.com/apis/library/aiplatform.googleapis.com" target="_blank" className="block text-indigo-400 underline text-xs">2. Включить Vertex AI API</a>
              </div>
          </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
              <span className="text-gray-500">Размер файла:</span>
              <div className="text-white">{report.size || '...'}</div>
          </div>
          <div className="space-y-1">
              <span className="text-gray-500">Сигнатура MP4:</span>
              <div className={report.isMp4 ? 'text-green-500' : 'text-red-500'}>{report.isMp4 ? 'ВАЛИДНА' : 'ОШИБКА'}</div>
          </div>
      </div>

      {lastError && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 text-amber-300 text-[10px]">
              Плеер сообщил об ошибке декодирования: {lastError.message || 'CODE ' + lastError.code}
          </div>
      )}

      <button onClick={() => window.location.reload()} className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all">
          ПЕРЕЗАГРУЗИТЬ ИНТЕРФЕЙС
      </button>
    </div>
  );
};

export default VideoDiagnostics;
