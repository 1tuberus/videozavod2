
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from '@google/genai';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AspectRatio,
  GenerateVideoParams,
  GenerationMode,
  ImageFile,
  Resolution,
  VeoModel,
  VideoFile,
  VideoStyle,
} from '../types';
import { enhancePromptWithInternet } from '../services/geminiService';
import {
  ArrowRightIcon,
  ChevronDownIcon,
  FilmIcon,
  FramesModeIcon,
  PlusIcon,
  ReferencesModeIcon,
  SparklesIcon,
  TextModeIcon,
  WandIcon,
  XMarkIcon,
  TvIcon,
  SlidersHorizontalIcon,
  RectangleStackIcon
} from './icons';

interface PromptFormProps {
  onGenerate: (params: GenerateVideoParams) => void;
  initialValues?: GenerateVideoParams | null;
}

const ImageUpload: React.FC<{
  onSelect: (image: ImageFile) => void;
  onRemove?: () => void;
  image?: ImageFile | null;
  label: React.ReactNode;
  className?: string;
  disabled?: boolean;
}> = ({onSelect, onRemove, image, label, className = "w-28 h-20", disabled = false}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const fileToBase64 = <T extends {file: File; base64: string}>(
    file: File,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        if (base64) {
          resolve({file, base64} as T);
        } else {
          reject(new Error('Failed to read file as base64.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };
  const fileToImageFile = (file: File): Promise<ImageFile> =>
    fileToBase64<ImageFile>(file);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageFile = await fileToImageFile(file);
        onSelect(imageFile);
      } catch (error) {
        console.error('Error converting file:', error);
      }
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  if (image) {
    return (
      <div className={`relative group ${className}`}>
        <img
          src={URL.createObjectURL(image.file)}
          alt="preview"
          className="w-full h-full object-cover rounded-lg shadow-inner border border-white/10"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove image">
          <XMarkIcon className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && inputRef.current?.click()}
      disabled={disabled}
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 hover:text-white cursor-pointer'} bg-white/5 border border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 transition-all`}>
      <PlusIcon className="w-5 h-5 mb-1" />
      <span className="text-[10px] text-center px-1">{label}</span>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />
    </button>
  );
};

const PromptForm: React.FC<PromptFormProps> = ({
  onGenerate,
  initialValues,
}) => {
  const [prompt, setPrompt] = useState(initialValues?.prompt ?? 'сделай видео с компасом');
  const [model, setModel] = useState<VeoModel>(
    initialValues?.model ?? VeoModel.VEO_FAST,
  );
  
  const [selectedChip, setSelectedChip] = useState<string>('veo-fast');

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialValues?.aspectRatio ?? AspectRatio.LANDSCAPE,
  );
  const [resolution, setResolution] = useState<Resolution>(
    initialValues?.resolution ?? Resolution.P720,
  );
  const [generationMode, setGenerationMode] = useState<GenerationMode>(
    initialValues?.mode ?? GenerationMode.TEXT_TO_VIDEO,
  );
  
  // Start/End Frames (for Frames mode)
  const [startFrame, setStartFrame] = useState<ImageFile | null>(
    initialValues?.startFrame ?? null,
  );
  const [endFrame, setEndFrame] = useState<ImageFile | null>(
    initialValues?.endFrame ?? null,
  );

  // References (for References mode)
  const [referenceImages, setReferenceImages] = useState<ImageFile[]>(
    initialValues?.referenceImages ?? [],
  );

  const [style, setStyle] = useState<VideoStyle>(VideoStyle.REALISTIC);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValues) {
      setPrompt(initialValues.prompt ?? 'сделай видео с компасом');
      setModel(initialValues.model ?? VeoModel.VEO_FAST);
      setAspectRatio(initialValues.aspectRatio ?? AspectRatio.LANDSCAPE);
      setGenerationMode(initialValues.mode ?? GenerationMode.TEXT_TO_VIDEO);
    }
  }, [initialValues]);

  useEffect(() => {
    // Auto-switch resolution if model changes to Fast
    if (model === VeoModel.VEO_FAST && resolution === Resolution.P1080) {
      setResolution(Resolution.P720);
    }
  }, [model, resolution]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleChipSelect = (chipId: string) => {
    setSelectedChip(chipId);
    if (chipId === 'veo-fast') setModel(VeoModel.VEO_FAST);
    else if (chipId === 'veo-pro') setModel(VeoModel.VEO);
    else if (chipId === 'veo-lite') setModel(VeoModel.VEO_LITE);
    else setModel(VeoModel.VEO);
  };

  const handleModeSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const mode = e.target.value as GenerationMode;
      setGenerationMode(mode);

      if (mode === GenerationMode.FRAMES_TO_VIDEO) {
          if (prompt === 'сделай видео с компасом' || prompt.length < 5) {
              // Set a default, safe prompt for Image-to-Video to ensure high quality
              setPrompt('Smooth cinematic motion bringing the scene to life. 4k, detailed.'); 
          }
      } else if (mode === GenerationMode.TEXT_TO_VIDEO) {
          if (!prompt || prompt.includes('Smooth cinematic')) {
              setPrompt('сделай видео с компасом');
          }
      } else if (mode === GenerationMode.REFERENCES_TO_VIDEO) {
          // Enforce Reference Constraints
          setAspectRatio(AspectRatio.LANDSCAPE); // 16:9 Required
          setResolution(Resolution.P720); // 720p Required
          // Auto-upgrade model visually
          if (model === VeoModel.VEO_FAST) {
              handleChipSelect('veo-pro');
          }
      }
  };

  const updateReferenceImage = (index: number, img: ImageFile | null) => {
    setReferenceImages(prev => {
        const newArr = [...prev];
        if (img) {
            newArr[index] = img;
        } else {
            newArr.splice(index, 1);
        }
        return newArr;
    });
  };

  const handleMagicEnhance = async () => {
    let base = prompt || "A cinematic scene";
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePromptWithInternet(base);
      setPrompt(enhanced);
    } catch (error) {
      console.error("Enhancement failed", error);
      // Fallback
      const enhancements = [
        "cinematic lighting, 8k resolution, highly detailed",
        "cyberpunk atmosphere, neon lights, rainy street",
        "photorealistic, depth of field, ray tracing",
        "studio quality, sharp focus, professional color grading",
        "soft lighting, pastel tones, high aesthetic"
      ];
      const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)];
      setPrompt(`${base}, ${randomEnhancement}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      prompt,
      model,
      aspectRatio,
      resolution,
      mode: generationMode,
      startFrame,
      endFrame,
      referenceImages, // Only used in References mode
      style,
      inputVideoObject: initialValues?.inputVideoObject
    });
  };

  const ModelChip = ({id, label, subLabel, icon}: {id: string, label: string, subLabel?: string, icon?: React.ReactNode}) => (
    <button
      type="button"
      onClick={() => handleChipSelect(id)}
      className={`relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200 w-full text-left
        ${selectedChip === id 
          ? 'bg-[#1a1a24] border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
          : 'bg-[#121216] border-white/5 hover:bg-[#1a1a1f] hover:border-white/10'
        }`}
    >
      <div className="flex items-center justify-between w-full mb-2">
        {icon}
        {selectedChip === id && <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"></div>}
      </div>
      <span className={`text-sm font-semibold ${selectedChip === id ? 'text-white' : 'text-gray-300'}`}>
        {label}
      </span>
      {subLabel && (
        <span className="text-[10px] uppercase tracking-wider font-medium mt-1 px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
          {subLabel}
        </span>
      )}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto space-y-8">
      
      {/* 1. Model Selection */}
      <div className="space-y-3">
        <label className="text-gray-400 text-sm font-medium ml-1">Выберите AI модель (Vertex AI)</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ModelChip 
            id="veo-fast" 
            label="Veo 3.1 Flash" 
            subLabel="Fast (Vertex)" 
            icon={<SparklesIcon className="w-5 h-5 text-indigo-400" />}
          />
          <ModelChip 
            id="veo-pro" 
            label="Veo 3.1 Pro" 
            subLabel="Quality (Vertex)" 
            icon={<SparklesIcon className="w-5 h-5 text-purple-400" />} 
          />
          <ModelChip 
            id="veo-lite" 
            label="Veo 3.1 Lite" 
            subLabel="Lite (Vertex)" 
            icon={<SparklesIcon className="w-5 h-5 text-blue-400" />} 
          />
          <ModelChip 
            id="kling" 
            label="Kling 2.5 Turbo" 
            subLabel="Реалистик" 
            icon={<TvIcon className="w-5 h-5 text-gray-500" />} 
          />
        </div>
      </div>

      {/* 2. Generation Mode Selector */}
      <div className="space-y-3">
        <label className="text-gray-400 text-sm font-medium ml-1">Режим генерации</label>
        <div className="relative">
            <select
                value={generationMode}
                onChange={handleModeSwitch}
                className="w-full bg-[#121216] border border-white/10 text-white text-base rounded-2xl p-4 pr-12 appearance-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 shadow-sm hover:border-white/20 transition-all cursor-pointer"
            >
                <option value={GenerationMode.TEXT_TO_VIDEO}>Текст → Видео</option>
                <option value={GenerationMode.FRAMES_TO_VIDEO}>Первый и последний кадр → Видео (1-2 фото)</option>
                <option value={GenerationMode.REFERENCES_TO_VIDEO}>Референс → Видео (1-3 фото, только 16:9)</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            </div>
        </div>
      </div>

      {/* Media Uploads Area (Conditional) */}
      {(generationMode === GenerationMode.FRAMES_TO_VIDEO || generationMode === GenerationMode.REFERENCES_TO_VIDEO) && (
        <div className="bg-[#121216] border border-white/5 rounded-2xl p-5 animate-fade-in space-y-3">
            <div className="flex items-center gap-2 mb-2">
                {generationMode === GenerationMode.FRAMES_TO_VIDEO ? (
                    <>
                        <FramesModeIcon className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium text-gray-300">Загрузка кадров (Начало / Конец)</span>
                    </>
                ) : (
                    <>
                        <RectangleStackIcon className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium text-gray-300">Референсы стиля/персонажа (до 3-х)</span>
                    </>
                )}
            </div>

            <div className="flex flex-wrap gap-4">
               {generationMode === GenerationMode.FRAMES_TO_VIDEO && (
                   <>
                       <ImageUpload label="Первый кадр" image={startFrame} onSelect={setStartFrame} onRemove={() => setStartFrame(null)} />
                       <ImageUpload label="Последний кадр" image={endFrame} onSelect={setEndFrame} onRemove={() => setEndFrame(null)} />
                       <div className="flex items-center text-xs text-gray-500 max-w-[200px]">
                           * Загрузите только первый кадр для анимации изображения (Image-to-Video).
                       </div>
                   </>
               )}

               {generationMode === GenerationMode.REFERENCES_TO_VIDEO && (
                   <>
                       {[0, 1, 2].map((idx) => (
                           <ImageUpload 
                               key={idx}
                               label={`Референс #${idx + 1}`} 
                               image={referenceImages[idx] || null} 
                               onSelect={(img) => updateReferenceImage(idx, img)} 
                               onRemove={() => updateReferenceImage(idx, null)} 
                           />
                       ))}
                       <div className="flex items-center text-xs text-gray-500 max-w-[200px]">
                           * Модель будет строго следовать стилю этих изображений. Только 16:9.
                       </div>
                   </>
               )}
            </div>
        </div>
      )}

      {/* 3. Prompt Area */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <label className="text-gray-400 text-sm font-medium">Промт</label>
          <div className="flex gap-2 text-xs">
             <button type="button" onClick={handleMagicEnhance} disabled={isEnhancing} className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50">
               <WandIcon className={`w-3 h-3 ${isEnhancing ? 'animate-spin' : ''}`} />
               <span>{isEnhancing ? 'Улучшаем...' : 'Авто-улучшение (Интернет)'}</span>
             </button>
          </div>
        </div>
        <div className="relative group">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={generationMode === GenerationMode.FRAMES_TO_VIDEO 
              ? "Опишите движение (или оставьте пустым для авто-анимации)..." 
              : "Опишите видео, атмосферу, освещение и детали..."}
            className="w-full bg-[#121216] border border-white/10 rounded-2xl p-5 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none min-h-[140px] leading-relaxed"
          />
          <button 
            type="button" 
            onClick={handleMagicEnhance}
            disabled={isEnhancing}
            className="absolute bottom-4 right-4 p-2 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 rounded-lg transition-colors disabled:opacity-50"
            title="Auto-enhance prompt with Internet"
          >
            <WandIcon className={`w-5 h-5 ${isEnhancing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#121216] border border-white/5 rounded-2xl p-5">
        
        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Соотношение сторон</label>
          <div className="relative">
             <select 
               value={aspectRatio}
               onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
               disabled={generationMode === GenerationMode.REFERENCES_TO_VIDEO}
               className={`w-full bg-[#1a1a1f] border border-white/10 text-gray-200 text-sm rounded-lg p-3 pr-10 appearance-none focus:outline-none focus:border-violet-500/50 ${generationMode === GenerationMode.REFERENCES_TO_VIDEO ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               <option value={AspectRatio.LANDSCAPE}>16:9 (YouTube)</option>
               {generationMode !== GenerationMode.REFERENCES_TO_VIDEO && (
                 <>
                   <option value={AspectRatio.PORTRAIT}>9:16 (Shorts/Reels)</option>
                   <option value={AspectRatio.SQUARE}>1:1 (Post)</option>
                 </>
               )}
             </select>
             <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          {generationMode === GenerationMode.REFERENCES_TO_VIDEO && (
              <p className="text-[10px] text-amber-500/80">
                  * References mode supports only 16:9.
              </p>
          )}
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Качество</label>
          <div className="relative">
             <select 
               value={resolution}
               onChange={(e) => setResolution(e.target.value as Resolution)}
               className="w-full bg-[#1a1a1f] border border-white/10 text-gray-200 text-sm rounded-lg p-3 pr-10 appearance-none focus:outline-none focus:border-violet-500/50"
             >
               <option value={Resolution.P720}>720p HD</option>
               <option value={Resolution.P1080} disabled={model === VeoModel.VEO_FAST || generationMode === GenerationMode.REFERENCES_TO_VIDEO}>
                 {model === VeoModel.VEO_FAST ? '1080p (Pro/Lite Only)' : generationMode === GenerationMode.REFERENCES_TO_VIDEO ? '1080p (Not supported in Ref Mode)' : '1080p Full HD'}
               </option>
             </select>
             <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* 5. Trigger Button */}
      <div className="flex flex-col items-end gap-2">
        <button
          type="submit"
          disabled={!prompt.trim()}
          className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-lg rounded-2xl shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_40px_rgba(79,70,229,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group"
        >
          <SparklesIcon className="w-5 h-5 group-hover:animate-pulse" />
          Создать видео 
          <span className="text-white/60 font-normal text-sm ml-1">(60 токенов)</span>
        </button>
        <p className="text-xs text-gray-600 font-medium">Стоимость: <span className="text-gray-400">48 токенов</span> (Vertex)</p>
      </div>

    </form>
  );
};

export default PromptForm;
