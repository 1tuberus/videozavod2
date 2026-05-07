
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  SparklesIcon,
  WandIcon,
  PlusIcon,
  XMarkIcon,
  CopyIcon,
  RectangleStackIcon,
  ChevronDownIcon,
  WalletIcon,
  AlertCircleIcon,
  DownloadIcon,
  ImageIcon
} from './icons';
import { AspectRatio, CatalogEntry, GeneratePhotoParams, ImageFile } from '../types';
import { useCatalog } from '../hooks/useCatalog';
import { usePricing, estimateFromMatrix } from '../hooks/usePricing';

interface PhotoGeneratorProps {
  onGenerate: (params: GeneratePhotoParams) => void;
  isLoading: boolean;
  generatedImage: string | null;
  error: string | null;
}

const PhotoGenerator: React.FC<PhotoGeneratorProps> = ({ onGenerate, isLoading, generatedImage, error }) => {
  const { catalog, loading: catalogLoading } = useCatalog();
  const photoModels: CatalogEntry[] = catalog?.image || [];

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [quality, setQuality] = useState<'Standard' | 'HD' | '4K'>('4K');
  const [format, setFormat] = useState<'PNG' | 'JPEG'>('PNG');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedEntry = useMemo(
    () => photoModels.find(m => m.id === model) || photoModels[0] || null,
    [photoModels, model]
  );

  useEffect(() => {
    if (!model && photoModels.length > 0) {
      setModel(photoModels[0].id);
    }
  }, [photoModels, model]);

  // Total cost — pricing_matrix is source of truth, fallback to catalog
  const { matrix: pricingMatrix } = usePricing();
  const totalTokens = useMemo(() => {
    if (!selectedEntry) return 0;
    const fromMatrix = estimateFromMatrix(pricingMatrix, {
      modelId: selectedEntry.id,
      unit: 'img',
      count: 1,
    });
    if (fromMatrix != null) return fromMatrix;
    return selectedEntry.pricing?.tokens ?? 0;
  }, [selectedEntry, pricingMatrix]);

  const aspectOptions: string[] = useMemo(() => {
    const opts = selectedEntry?.params?.aspect_ratio?.options;
    return Array.isArray(opts) && opts.length ? (opts as string[]) : ['9:16','16:9','1:1','3:4','4:3'];
  }, [selectedEntry]);

  useEffect(() => {
    if (selectedEntry && aspectOptions.length && !aspectOptions.includes(aspectRatio)) {
      const def = (selectedEntry.params?.aspect_ratio?.default as string) || aspectOptions[0];
      setAspectRatio(def as AspectRatio);
    }
  }, [selectedEntry, aspectOptions, aspectRatio]);

  const fileToBase64 = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ file, base64: (reader.result as string).split(',')[1] });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = await Promise.all(
        Array.from(e.target.files).map((file) => fileToBase64(file as File))
      );
      setImages(prev => [...prev, ...newImages].slice(0, 8)); // Max 8
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onGenerate({
      prompt,
      model,
      aspectRatio,
      quality,
      format,
      referenceImages: images
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Column: Controls */}
      <div className="lg:col-span-4 space-y-6">
        
        <div>
          <div className="flex items-center gap-2 mb-2">
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
               Фото Студия
             </h1>
          </div>
          <p className="text-gray-400 text-xs">Создавай уникальные фото по референсам в AI Nano Banana</p>
        </div>

        {/* Model Selection (dynamic from /api/catalog) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 ml-1">
            Модель {selectedEntry ? `· ${totalTokens} токенов / фото` : ''}
          </label>
          {catalogLoading && !photoModels.length ? (
            <div className="text-xs text-gray-500 px-1">Загрузка каталога…</div>
          ) : photoModels.length === 0 ? (
            <div className="text-xs text-amber-500/80 px-1">Каталог недоступен.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photoModels.map(entry => {
                const active = entry.id === model;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setModel(entry.id)}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all relative overflow-hidden text-left
                      ${active
                        ? 'bg-[#1a1a24] border-indigo-500/50 text-white shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                        : 'bg-[#121216] border-white/5 text-gray-400 hover:bg-[#1a1a1f]'}
                    `}
                  >
                    <div className="text-xs font-semibold leading-tight">{entry.label}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] uppercase tracking-wide text-gray-500">{entry.provider_hint}</span>
                      {entry.badge && (
                        <span className="text-[9px] uppercase tracking-wide px-1 rounded bg-violet-500/10 text-violet-300">{entry.badge}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-xs font-bold text-gray-300">Промпт</label>
            <div className="flex gap-2">
                <button className="flex items-center gap-1 text-[10px] bg-white/5 px-2 py-1 rounded border border-white/5 hover:bg-white/10 text-gray-300">
                    <SparklesIcon className="w-3 h-3 text-purple-400" />
                    Тренды
                </button>
                <button className="p-1 hover:text-white text-gray-500">
                    <CopyIcon className="w-3 h-3" />
                </button>
                <button className="p-1 hover:text-white text-gray-500">
                    <RectangleStackIcon className="w-3 h-3" />
                </button>
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите изображение, которое хотите сгенерировать..."
            className="w-full bg-[#121216] border border-white/10 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none h-32"
          />
        </div>

        {/* Upload */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 ml-1">Загрузите до 8 фото (30 МБ каждое)</label>
          {images.length > 0 ? (
             <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                        <img src={URL.createObjectURL(img.file)} alt="ref" className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 bg-black/60 p-0.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all">
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                {images.length < 8 && (
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border border-dashed border-white/20 flex items-center justify-center hover:bg-white/5 text-gray-500">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                )}
             </div>
          ) : (
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-[#121216] border border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-gray-300 hover:bg-[#1a1a1f] transition-all"
            >
                <div className="p-1 bg-white/10 rounded-md">
                    <PlusIcon className="w-3 h-3" />
                </div>
                Загрузить изображения (0/8)
            </button>
          )}
          <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        </div>

        {/* Settings Grid */}
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 ml-1">Соотношение сторон</label>
                <div className="relative">
                    <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        className="w-full bg-[#121216] border border-white/10 rounded-xl p-3 pr-10 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/50"
                    >
                        {aspectOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 ml-1">Качество изображения</label>
                <div className="relative">
                    <select 
                        value={quality}
                        onChange={(e) => setQuality(e.target.value as any)}
                        className="w-full bg-[#121216] border border-white/10 rounded-xl p-3 pr-10 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/50"
                    >
                        <option value="Standard">Standard</option>
                        <option value="HD">HD</option>
                        <option value="4K">4K (Pro Only)</option>
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 ml-1">Формат вывода</label>
                <div className="relative">
                    <select 
                        value={format}
                        onChange={(e) => setFormat(e.target.value as any)}
                        className="w-full bg-[#121216] border border-white/10 rounded-xl p-3 pr-10 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/50"
                    >
                        <option value="PNG">PNG</option>
                        <option value="JPEG">JPEG</option>
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
            </div>
        </div>

        <button className="text-xs text-gray-500 underline hover:text-gray-300 ml-1">
            Сбросить настройки
        </button>

        <div className="border-t border-white/5 pt-4">
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-gray-500">
                  Стоимость: <span className="text-white font-bold">~{totalTokens} токенов</span>
                  {selectedEntry && <span className="text-gray-600 ml-2">· {selectedEntry.provider_hint}</span>}
                </span>
            </div>
            <button
                onClick={handleSubmit}
                disabled={isLoading || !prompt || !model}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <ImageIcon className="w-5 h-5" />
                )}
                {isLoading ? 'Генерация...' : 'Создать фото'}
            </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <AlertCircleIcon className="w-3 h-3" />
            Правила нейросети
        </div>

      </div>

      {/* Right Column: Preview Area */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-[600px]">
         {/* Balance Card (Top Right) */}
         <div className="flex justify-end mb-6">
            <div className="bg-[#121216] border border-white/10 rounded-xl p-2 pl-4 flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <WalletIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Баланс</div>
                        <div className="text-lg font-bold text-white leading-none">106789</div>
                    </div>
                </div>
                <button className="px-4 py-2 bg-transparent border border-white/20 hover:border-white/40 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all">
                    <PlusIcon className="w-3 h-3" />
                    Пополнить
                </button>
            </div>
         </div>

         {/* Result Display */}
         <div className="flex-grow bg-[#121216] border border-dashed border-white/10 rounded-2xl flex items-center justify-center relative group overflow-hidden">
            {generatedImage ? (
                <>
                    <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain shadow-2xl" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <a href={generatedImage} download="photo_zavod.png" className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform">
                            <DownloadIcon className="w-6 h-6" />
                        </a>
                    </div>
                </>
            ) : isLoading ? (
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-indigo-400 font-medium animate-pulse">Rendering magic...</p>
                </div>
            ) : error ? (
                <div className="text-center text-red-400 p-8">
                    <AlertCircleIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="max-w-md mx-auto">{error}</p>
                </div>
            ) : (
                <div className="text-center text-gray-600">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Здесь появится сгенерированное изображение</p>
                </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default PhotoGenerator;
