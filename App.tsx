
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video, GoogleGenAI} from '@google/genai';
import React, {useCallback, useEffect, useState} from 'react';
import LoadingIndicator from './components/LoadingIndicator';
import PromptForm from './components/PromptForm';
import PhotoGenerator from './components/PhotoGenerator';
import ChatInterface from './components/ChatInterface';
import MusicGenerator from './components/MusicGenerator';
import VideoResult from './components/VideoResult';
import DiagnosticsModal from './components/DiagnosticsModal';
import DeploymentGuideModal from './components/DeploymentGuideModal';
import GalleryModal from './components/GalleryModal';
import CheckpointManager from './components/CheckpointManager';
import Navigation from './components/Navigation';
import ConnectionsTab from './components/ConnectionsTab';
import {generateVideo, generateImage} from './services/geminiService';
import {priceVideo} from './services/hubClient';
import {PlusIcon, WalletIcon, ActivityIcon, HistoryIcon, AlertCircleIcon, KeyIcon} from './components/icons';
import {
  AppState,
  AspectRatio,
  GenerateVideoParams,
  GeneratePhotoParams,
  GenerationTask,
  Resolution,
  VertexConnectionConfig,
  GalleryItem,
  PhotoModel
} from './types';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const GALLERY_KEY = 'video_zavod_gallery_history';

const App: React.FC = () => {
  const [activeTask, setActiveTask] = useState<GenerationTask>(GenerationTask.VIDEO);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<GenerateVideoParams | null>(null);
  const [initialFormValues, setInitialFormValues] = useState<GenerateVideoParams | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [hasKey, setHasKey] = useState<boolean>(true);
  
  const [connectionConfig, setConnectionConfig] = useState<VertexConnectionConfig>({
      project: 'vertex-ai-runner',
      location: 'us-central1'
  });

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => {
    try {
      const saved = localStorage.getItem(GALLERY_KEY);
      if (!saved) return [];
      const arr = JSON.parse(saved) as GalleryItem[];
      // Помечаем blob: URL'ы как утерянные (они не выживают перезагрузку).
      return arr.map((it) => {
        const u = (it as any).videoUrl || (it as any).imageUrl || "";
        if (u.startsWith?.("blob:")) {
          const cleaned: any = { ...it };
          if (cleaned.videoUrl) { cleaned.videoUrl = ""; cleaned._expired = true; }
          if (cleaned.imageUrl) { cleaned.imageUrl = ""; cleaned._expired = true; }
          return cleaned;
        }
        return it;
      });
    } catch { return []; }
  });

  // Persist gallery to localStorage (без blob: URL, чтобы не раздувать).
  useEffect(() => {
    try {
      const cap = galleryItems.slice(0, 30); // ограничиваем 30 последними
      const safe = cap.map((it: any) => {
        const out: any = { ...it };
        // base64 data URLs тяжёлые; для видео не сохраняем превью, только мета.
        if (out.videoUrl?.startsWith?.("blob:")) out.videoUrl = "";
        if (out.imageUrl?.startsWith?.("blob:")) out.imageUrl = "";
        return out;
      });
      localStorage.setItem(GALLERY_KEY, JSON.stringify(safe));
    } catch (e) { console.warn("gallery persist failed", e); }
  }, [galleryItems]);

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showDeploymentGuide, setShowDeploymentGuide] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<any[]>([]);

  // Автоматическая проверка ключа при загрузке
  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio) {
            const selected = await window.aistudio.hasSelectedApiKey();
            setHasKey(selected);
            if (!selected && appState === AppState.IDLE) {
                // Если ключа нет, но мы ничего не делаем - пока просто ставим флаг
            }
        }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
          // По регламенту сразу считаем, что выбор успешен
          setHasKey(true);
      }
  };

  const addLog = (message: string, data?: any) => {
      setGenerationLogs(prev => [...prev, {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          type: message.toLowerCase().includes('ошибка') ? 'error' : (message.includes('SUCCESS') ? 'success' : 'info'),
          message: `${message} ${data ? JSON.stringify(data) : ''}`
      }]);
  };

  const handleGenerateVideo = useCallback(async (params: GenerateVideoParams) => {
    // 1. Предварительная проверка ключа
    if (window.aistudio) {
        const keyOk = await window.aistudio.hasSelectedApiKey();
        if (!keyOk) {
            setErrorMessage("Для Veo 1080p необходимо подтвердить Платный API Ключ.");
            setHasKey(false);
            await handleSelectKey();
            return;
        }
    }

    setAppState(AppState.LOADING);
    setErrorMessage(null);
    setLastConfig(params);
    setGenerationLogs([]);

    try {
      // Cost preview через HUB (защита Гранта)
      let estUsd = 0;
      try {
        const dur = 8;
        const p = await priceVideo(String(params.model), dur);
        estUsd = p.est_usd;
        addLog(`💰 Стоимость генерации через Грант: $${p.est_usd.toFixed(2)} (${dur}s @ ${params.model}). Баланс Гранта защищен.`);
      } catch {}
      addLog("INIT: Запуск высокоточного пайплайна...");
      const result = await generateVideo(params, connectionConfig, (msg, data) => addLog(msg, data));

      setVideoUrl(result.objectUrl);
      setAppState(AppState.SUCCESS);

      const newItem: GalleryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          status: 'succeeded',
          task: GenerationTask.VIDEO,
          params: params,
          videoUrl: result.objectUrl,
          cost: estUsd
      };
      setGalleryItems(prev => [newItem, ...prev]);

    } catch (error: any) {
      let msg = error.message || "Ошибка генерации";
      
      // КРИТИЧНО: Обработка 401 ошибки через принудительный выбор ключа
      if (msg === "AUTH_RECOVERY_REQUIRED" || msg.includes("401") || msg.includes("UNAUTHENTICATED")) {
          msg = "Сессия Vertex AI истекла (401). Пожалуйста, выберите ключ повторно в открывшемся окне.";
          setHasKey(false);
          await handleSelectKey();
      }

      setErrorMessage(msg);
      setAppState(AppState.ERROR);
      addLog(`CRITICAL_ERROR: ${msg}`, 'error');
      
      setGalleryItems(prev => [{
          id: Date.now().toString(),
          timestamp: Date.now(),
          status: 'failed',
          task: GenerationTask.VIDEO,
          params: params,
          error: msg,
          cost: 0
      }, ...prev]);
    }
  }, [connectionConfig, appState]);

  const handleGeneratePhoto = useCallback(async (params: GeneratePhotoParams) => {
    setIsPhotoLoading(true);
    setPhotoError(null);
    addLog("INIT: Генерация фото...");

    try {
      const result = await generateImage(params, connectionConfig, (msg: string, data: any) => addLog(msg, data));
      setPhotoUrl(result.imageUrl);
      setGalleryItems(prev => [{
          id: Date.now().toString(),
          timestamp: Date.now(),
          status: 'succeeded',
          task: GenerationTask.PHOTO,
          params: params,
          imageUrl: result.imageUrl,
          cost: 0.04
      }, ...prev]);
    } catch (error: any) {
      setPhotoError(error.message);
    } finally {
      setIsPhotoLoading(false);
    }
  }, [connectionConfig]);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/80 backdrop-blur-md h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(79,70,229,0.5)] text-white">V</div>
            <h1 className="text-xl font-bold tracking-tight">VIDEO_ZAVOD</h1>
          </div>
          <div className="flex items-center gap-4">
             {!hasKey && (
                 <button onClick={handleSelectKey} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 animate-pulse shadow-lg shadow-red-500/20">
                    <KeyIcon className="w-4 h-4" /> Выбрать Платный Ключ
                 </button>
             )}
             <button onClick={() => setShowCheckpoints(true)} className="p-2 text-green-400 hover:text-white bg-green-500/10 hover:bg-green-500/20 rounded-lg border border-green-500/20 transition-all">
                <ActivityIcon className="w-4 h-4" />
             </button>
             <div className="h-6 w-[1px] bg-white/10 mx-1"></div>
             <button onClick={() => setShowDiagnostics(true)} className="p-2 text-gray-400 hover:text-white"><ActivityIcon className="w-5 h-5" /></button>
             <button onClick={() => setShowGallery(true)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm flex items-center gap-2">
               <HistoryIcon className="w-4 h-4" /> История
             </button>
             <div className="px-4 py-2 bg-indigo-900/20 border border-indigo-500/20 rounded-lg text-sm flex items-center gap-2">
                <WalletIcon className="w-4 h-4 text-indigo-400" /> 106,789
             </div>
          </div>
      </header>

      <Navigation activeTask={activeTask} onTaskChange={setActiveTask} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTask === GenerationTask.VIDEO && (
          <>
            {appState === AppState.LOADING && <LoadingIndicator logs={generationLogs} />}
            {appState === AppState.SUCCESS && videoUrl && (
              <VideoResult 
                videoUrl={videoUrl} 
                onRetry={() => handleGenerateVideo(lastConfig!)} 
                onNewVideo={() => setAppState(AppState.IDLE)}
                onExtend={() => {}} 
                canExtend={false} 
                aspectRatio={lastConfig?.aspectRatio || AspectRatio.LANDSCAPE}
              />
            )}
            {(appState === AppState.IDLE || appState === AppState.ERROR) && (
              <div className="space-y-6">
                {errorMessage && (
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-red-200 text-sm">
                        <AlertCircleIcon className="w-5 h-5 text-red-500" /> {errorMessage}
                    </div>
                    {(errorMessage.includes("401") || !hasKey) && (
                        <button onClick={handleSelectKey} className="w-fit px-4 py-2 bg-red-500 text-white font-bold rounded-lg text-xs">
                            АВТОРИЗОВАТЬ КЛЮЧ (OAuth/Vertex Fix)
                        </button>
                    )}
                  </div>
                )}
                <PromptForm onGenerate={handleGenerateVideo} initialValues={initialFormValues} />
              </div>
            )}
          </>
        )}

        {activeTask === GenerationTask.PHOTO && (
          <PhotoGenerator 
            onGenerate={handleGeneratePhoto} 
            isLoading={isPhotoLoading} 
            generatedImage={photoUrl} 
            error={photoError} 
          />
        )}

        {activeTask === GenerationTask.TEXT && (
          <ChatInterface />
        )}

        {activeTask === GenerationTask.MUSIC && (
          <MusicGenerator />
        )}

        {activeTask === GenerationTask.CONNECTIONS && (
          <ConnectionsTab />
        )}
      </main>

      <DiagnosticsModal isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)} config={connectionConfig} externalLogs={generationLogs} />
      <DeploymentGuideModal isOpen={showDeploymentGuide} onClose={() => setShowDeploymentGuide(false)} config={connectionConfig} onConfigChange={setConnectionConfig} onRunDiagnostics={() => setShowDiagnostics(true)} />
      <GalleryModal isOpen={showGallery} onClose={() => setShowGallery(false)} items={galleryItems} onDeleteItem={(id) => setGalleryItems(items => items.filter(i => i.id !== id))} />
      <CheckpointManager isOpen={showCheckpoints} onClose={() => setShowCheckpoints(false)} currentConfig={connectionConfig} currentGallery={galleryItems} onRestoreConfig={setConnectionConfig} />
    </div>
  );
};

export default App;
