
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useRef, useState, useEffect} from 'react';
import {AspectRatio} from '../types';
import {ArrowPathIcon, DownloadIcon, AlertCircleIcon, ActivityIcon} from './icons';
import VideoDiagnostics from './VideoDiagnostics';

interface VideoResultProps {
  videoUrl: string;
  onRetry: () => void;
  onNewVideo: () => void;
  onExtend: () => void;
  canExtend: boolean;
  aspectRatio: AspectRatio;
  apiError?: string | null;
}

const VideoResult: React.FC<VideoResultProps> = ({
  videoUrl,
  onRetry,
  onNewVideo,
  onExtend,
  canExtend,
  aspectRatio,
  apiError
}) => {
  const isPortrait = aspectRatio === AspectRatio.PORTRAIT;
  const isSquare = aspectRatio === AspectRatio.SQUARE;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [videoErrorObj, setVideoErrorObj] = useState<MediaError | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(!!apiError);
  const [isStalled, setIsStalled] = useState(false);

  useEffect(() => {
      setLoadError(false);
      setVideoErrorObj(null);
      setIsBuffering(true);
      setIsPlaying(false);
      setIsStalled(false);
      
      const timeout = setTimeout(() => {
          if (videoRef.current && videoRef.current.currentTime === 0 && !loadError) {
              setIsStalled(true);
              setIsBuffering(false);
          }
      }, 15000); // 15s delay for 1080p load

      return () => clearTimeout(timeout);
  }, [videoUrl]);

  return (
    <div className="w-full relative flex flex-col items-center p-1 animate-fade-in">
      
      <div className="w-full flex justify-between items-center mb-6">
         <button onClick={onNewVideo} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
            ← Назад к редактору
         </button>
         <div className="flex gap-2">
             <button 
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className={`text-xs flex items-center gap-1 px-3 py-1 rounded-full border transition-colors ${showDiagnostics ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-white/5 text-gray-500 border-white/10 hover:text-white'}`}
             >
                <ActivityIcon className="w-3 h-3" />
                {showDiagnostics ? 'Скрыть отчет' : 'Диагностика'}
             </button>
         </div>
      </div>

      {showDiagnostics && (
          <div className="w-full max-w-4xl mb-6">
             <VideoDiagnostics 
                videoUrl={videoUrl} 
                onClose={() => setShowDiagnostics(false)}
                lastError={videoErrorObj}
                apiErrorMessage={apiError}
             />
          </div>
      )}

      <div 
        className={`relative group w-full ${
          isPortrait ? 'max-w-sm aspect-[9/16]' : isSquare ? 'max-w-lg aspect-square' : 'max-w-4xl aspect-video'
        } bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center`}
      >
        {!loadError ? (
            <>
                {(isBuffering || (isStalled && !isPlaying)) && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity pointer-events-none">
                        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                        <span className="text-xs text-indigo-300 font-bold uppercase tracking-widest animate-pulse">Загрузка 1080p потока...</span>
                        <p className="text-[10px] text-gray-500 mt-2">Файл расшифровывается в памяти браузера</p>
                    </div>
                )}
                
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                  onLoadedData={() => { setIsBuffering(false); setIsStalled(false); }}
                  onPlaying={() => { setIsBuffering(false); setIsPlaying(true); setIsStalled(false); }}
                  onError={(e) => {
                      setVideoErrorObj(e.currentTarget.error);
                      setLoadError(true);
                      setIsBuffering(false);
                      setShowDiagnostics(true); 
                  }}
                />
            </>
        ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-[#121216] w-full h-full">
                <AlertCircleIcon className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Ошибка MP4 Декодера</h3>
                <p className="text-sm text-gray-400 max-w-md mb-6">Браузер не смог обработать 1080p поток. Это может быть вызвано нехваткой памяти или истечением OAuth сессии.</p>
                <a href={videoUrl} download="result.mp4" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center gap-2 text-sm transition-all">
                    <DownloadIcon className="w-4 h-4" /> Скачать и открыть локально
                </a>
            </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button onClick={onRetry} className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1f] hover:bg-[#25252b] border border-white/10 text-white font-medium rounded-xl transition-all">
          <ArrowPathIcon className="w-4 h-4" /> Перегенерировать
        </button>
        <a href={videoUrl} download="result.mp4" className="flex items-center gap-2 px-8 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-xl transition-all shadow-xl">
          <DownloadIcon className="w-4 h-4" /> Скачать MP4
        </a>
      </div>
    </div>
  );
};

export default VideoResult;
