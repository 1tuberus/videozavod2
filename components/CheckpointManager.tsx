
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ServerIcon, 
  CheckCircleIcon, 
  DownloadIcon, 
  TrashIcon, 
  ArrowPathIcon,
  PlusIcon,
  ActivityIcon
} from './icons';
import { GalleryItem, VertexConnectionConfig } from '../types';

interface Checkpoint {
  id: string;
  name: string;
  timestamp: number;
  config: VertexConnectionConfig;
  galleryCount: number;
  // Мы не храним всю галерею в localStorage внутри чекпоинта, чтобы не переполнить память,
  // но при "Скачивании" мы формируем полный дамп.
}

interface CheckpointManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: VertexConnectionConfig;
  currentGallery: GalleryItem[];
  onRestoreConfig: (config: VertexConnectionConfig) => void;
}

const STORAGE_KEY = 'video_zavod_checkpoints';

const CheckpointManager: React.FC<CheckpointManagerProps> = ({ 
  isOpen, 
  onClose, 
  currentConfig, 
  currentGallery,
  onRestoreConfig
}) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [newCheckpointName, setNewCheckpointName] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCheckpoints(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load checkpoints", e);
    }
  }, [isOpen]);

  const saveToStorage = (data: Checkpoint[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setCheckpoints(data);
  };

  const handleCreateCheckpoint = () => {
    const name = newCheckpointName.trim() || `Backup ${new Date().toLocaleTimeString()}`;
    const newCheckpoint: Checkpoint = {
      id: Date.now().toString(),
      name: name,
      timestamp: Date.now(),
      config: currentConfig,
      galleryCount: currentGallery.length
    };
    const updated = [newCheckpoint, ...checkpoints];
    saveToStorage(updated);
    setNewCheckpointName('');
  };

  const handleDelete = (id: string) => {
    const updated = checkpoints.filter(c => c.id !== id);
    saveToStorage(updated);
  };

  const handleRestore = (checkpoint: Checkpoint) => {
    if (confirm(`Восстановить настройки из точки "${checkpoint.name}"?`)) {
        onRestoreConfig(checkpoint.config);
        onClose();
        // Можно добавить тост уведомление
    }
  };

  const handleDownloadFullBackup = () => {
    const fullData = {
        app_version: "1.0",
        export_date: new Date().toISOString(),
        config: currentConfig,
        gallery: currentGallery,
        checkpoints_meta: checkpoints
    };
    
    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video_zavod_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[130] backdrop-blur-md p-4">
      <div className="bg-[#121218] border border-green-500/30 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(34,197,94,0.15)] flex flex-col overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-[#121a14] to-[#121218]">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-green-900/30 rounded-lg border border-green-500/30">
                <ActivityIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold tracking-tight">Система Контрольных Точек</h2>
                <p className="text-xs text-green-400/60 font-medium">Версионирование и Бэкапы</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            
            {/* Create New */}
            <div className="bg-[#0a0a0f] p-4 rounded-xl border border-white/10 flex gap-3">
                <input 
                    type="text" 
                    value={newCheckpointName}
                    onChange={(e) => setNewCheckpointName(e.target.value)}
                    placeholder="Название чекпоинта (например: Работает 1080p)"
                    className="flex-grow bg-transparent border-none text-white focus:ring-0 placeholder-gray-600 text-sm"
                />
                <button 
                    onClick={handleCreateCheckpoint}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                    Сохранить
                </button>
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {checkpoints.length === 0 && (
                    <div className="text-center text-gray-600 py-8 text-sm">
                        Нет сохраненных точек восстановления.
                    </div>
                )}
                {checkpoints.map(cp => (
                    <div key={cp.id} className="flex items-center justify-between p-4 bg-[#1a1a20] rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-200">{cp.name}</span>
                                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500">
                                    {new Date(cp.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Config: {cp.config.project} • Gallery: {cp.galleryCount} items
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleRestore(cp)}
                                className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg"
                                title="Восстановить настройки"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleDelete(cp.id)}
                                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                                title="Удалить"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* GitHub / Backup Action */}
            <div className="pt-4 border-t border-white/5">
                <div className="bg-[#121814] border border-green-900/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                        <ServerIcon className="w-8 h-8 text-green-500/50" />
                        <div>
                            <h4 className="text-sm font-bold text-gray-200">Полный Бэкап (GitHub Ready)</h4>
                            <p className="text-xs text-gray-500">Скачайте JSON архив со всеми файлами и настройками для коммита в репозиторий.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleDownloadFullBackup}
                        className="px-5 py-2.5 bg-white text-black hover:bg-gray-200 font-bold rounded-lg flex items-center gap-2 text-sm transition-transform hover:scale-105"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Скачать Архив
                    </button>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default CheckpointManager;
