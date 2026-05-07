
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { 
  XMarkIcon, 
  HistoryIcon, 
  LayoutGridIcon, 
  ListIcon, 
  TrashIcon, 
  DownloadIcon, 
  CopyIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PlayIcon
} from './icons';
import { GalleryItem, GenerationMode, VeoModel, AspectRatio } from '../types';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GalleryItem[];
  onDeleteItem: (id: string) => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, items, onDeleteItem }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterRatio, setFilterRatio] = useState<string>('all');
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  if (!isOpen) return null;

  const filteredItems = items.filter(item => {
    if (filterType !== 'all') {
      if (!('mode' in item.params) || item.params.mode !== filterType) return false;
    }
    if (filterModel !== 'all' && item.params.model !== filterModel) return false;
    if (filterRatio !== 'all' && item.params.aspectRatio !== filterRatio) return false;
    return true;
  }).sort((a, b) => b.timestamp - a.timestamp);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    // Could add toast here
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] backdrop-blur-sm p-4 sm:p-8">
      <div className="bg-[#0f0f13] border border-gray-800 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#16161e]">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-6 h-6 text-violet-400" />
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">История генераций</h2>
                <p className="text-xs text-gray-400">Просмотр и управление вашими видео и фото</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#1a1200] border-b border-yellow-900/30 p-4 flex gap-4 items-start">
            <AlertCircleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
                <h4 className="text-amber-500 font-bold mb-1">Предупреждение о хранении (Local Session)</h4>
                <p className="text-amber-200/60 leading-relaxed text-xs">
                    Медиафайлы хранятся только в текущей сессии браузера. Если вы обновите страницу, видеофайлы (Blobs) будут утеряны, останется только мета-информация. 
                    Пожалуйста, скачивайте важные результаты сразу.
                </p>
            </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-800 bg-[#121216] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
                <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-[#1a1a1f] border border-white/10 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-violet-500/50 appearance-none min-w-[140px]"
                >
                    <option value="all">Все типы</option>
                    <option value={GenerationMode.TEXT_TO_VIDEO}>Текст → Видео</option>
                    <option value={GenerationMode.FRAMES_TO_VIDEO}>Кадры → Видео</option>
                </select>

                <select 
                    value={filterModel} 
                    onChange={(e) => setFilterModel(e.target.value)}
                    className="bg-[#1a1a1f] border border-white/10 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-violet-500/50 appearance-none min-w-[140px]"
                >
                    <option value="all">Все модели</option>
                    <option value={VeoModel.VEO_FAST}>Veo Fast</option>
                    <option value={VeoModel.VEO}>Veo Pro</option>
                    <option value={VeoModel.VEO_LITE}>Veo Lite</option>
                </select>

                <select 
                    value={filterRatio} 
                    onChange={(e) => setFilterRatio(e.target.value)}
                    className="bg-[#1a1a1f] border border-white/10 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-violet-500/50 appearance-none min-w-[140px]"
                >
                    <option value="all">Все соотношения</option>
                    <option value={AspectRatio.LANDSCAPE}>16:9</option>
                    <option value={AspectRatio.PORTRAIT}>9:16</option>
                    <option value={AspectRatio.SQUARE}>1:1</option>
                </select>
            </div>

            <div className="flex gap-2 bg-[#1a1a1f] p-1 rounded-lg border border-white/10">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                    <ListIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                    <LayoutGridIcon className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* List/Grid Content */}
        <div className={`flex-grow overflow-y-auto p-4 sm:p-6 bg-[#0a0a0f] ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}`}>
            {filteredItems.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-64 text-gray-500 ${viewMode === 'grid' ? 'col-span-full' : ''}`}>
                    <HistoryIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p>История пуста</p>
                </div>
            ) : (
                filteredItems.map((item) => (
                    <div key={item.id} className={`bg-[#121216] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors group ${viewMode === 'grid' ? 'flex flex-col gap-4' : 'flex flex-col md:flex-row gap-6'}`}>
                        
                        {/* Thumbnail / Video Area */}
                        <div className={`shrink-0 bg-black rounded-xl overflow-hidden border border-white/5 relative flex items-center justify-center
                            ${viewMode === 'list' 
                                ? (item.params.aspectRatio === AspectRatio.PORTRAIT ? 'w-32 h-56' : item.params.aspectRatio === AspectRatio.SQUARE ? 'w-48 h-48' : 'w-64 h-36')
                                : 'w-full aspect-video'
                            }
                        `}>
                            {item.status === 'succeeded' && item.videoUrl ? (
                                <video 
                                    src={item.videoUrl} 
                                    className="w-full h-full object-cover"
                                    controls={false}
                                    onMouseOver={e => e.currentTarget.play()}
                                    onMouseOut={e => {
                                        e.currentTarget.pause();
                                        e.currentTarget.currentTime = 0;
                                    }}
                                    muted
                                    loop
                                />
                            ) : (
                                <div className="text-center p-4">
                                    <AlertCircleIcon className="w-8 h-8 text-red-500/50 mx-auto mb-2" />
                                    <span className="text-[10px] text-red-400 uppercase font-bold">Failed</span>
                                </div>
                            )}
                            
                            {item.status === 'succeeded' && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <PlayIcon className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
                                </div>
                            )}
                        </div>

                        {/* Info Area */}
                        <div className="flex-grow flex flex-col justify-between py-1">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border
                                        ${item.status === 'succeeded' 
                                            ? 'bg-green-900/20 text-green-400 border-green-500/20' 
                                            : 'bg-red-900/20 text-red-400 border-red-500/20'
                                        }`}>
                                        {item.status === 'succeeded' ? <CheckCircleIcon className="w-3 h-3" /> : <AlertCircleIcon className="w-3 h-3" />}
                                        {item.status}
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-white/5 rounded border border-white/5">
                                        {item.params.model.replace('veo-3.1-', '').replace('-preview', '')}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-white/5 rounded border border-white/5">
                                        {item.params.aspectRatio}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {formatTimeAgo(item.timestamp)}
                                    </span>
                                </div>

                                <div className="relative group/prompt">
                                    <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 md:line-clamp-2 hover:line-clamp-none transition-all">
                                        <span className="text-gray-500 font-mono text-xs mr-2">PROMPT</span>
                                        {item.params.prompt || (('mode' in item.params && item.params.mode === GenerationMode.FRAMES_TO_VIDEO) ? 'Frames to Video (Auto)' : 'No prompt')}
                                    </p>
                                    <button 
                                        onClick={() => copyPrompt(item.params.prompt)}
                                        className="absolute right-0 top-0 p-1.5 bg-[#25252b] text-gray-400 rounded-md opacity-0 group-hover/prompt:opacity-100 hover:text-white transition-all shadow-lg"
                                        title="Copy prompt"
                                    >
                                        <CopyIcon className="w-3 h-3" />
                                    </button>
                                </div>

                                {item.status === 'failed' && item.error && (
                                    <div className="mt-3 p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
                                        <p className="text-red-300 text-xs font-mono break-all">
                                            Error: {item.error}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                <span className="text-xs text-gray-600 font-medium">
                                    Cost: <span className="text-gray-400">{item.cost} tokens</span>
                                </span>

                                <div className="flex items-center gap-3">
                                    {item.status === 'succeeded' && item.videoUrl && (
                                        <a 
                                            href={item.videoUrl} 
                                            download={`veo_gen_${item.id}.mp4`}
                                            className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg border border-white/10 transition-colors"
                                        >
                                            <DownloadIcon className="w-3.5 h-3.5" />
                                            Скачать
                                        </a>
                                    )}
                                    <button 
                                        onClick={() => onDeleteItem(item.id)}
                                        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors hover:bg-red-500/10 rounded-lg"
                                        title="Delete"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

      </div>
    </div>
  );
};

export default GalleryModal;
