
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  Video,
} from '@google/genai';
import {GenerateVideoParams, GeneratePhotoParams, GenerationMode, VertexConnectionConfig, VeoModel, PhotoModel, Resolution, AspectRatio, ChatMessage, AIRole} from '../types';

// Проверка видео на "битые" кадры и пустой контейнер (защита от черного экрана)
const verifyVideoBlob = async (blob: Blob): Promise<{ok: boolean; error?: string}> => {
    if (blob.size < 1024 * 500) return {ok: false, error: "Файл слишком мал для 1080p видео (возможна ошибка рендеринга)"};
    
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            const d = video.duration;
            window.URL.revokeObjectURL(video.src);
            if (isNaN(d) || d <= 0) resolve({ok: false, error: "Длительность видео равна 0"});
            else resolve({ok: true});
        };
        video.onerror = () => {
            window.URL.revokeObjectURL(video.src);
            resolve({ok: false, error: "Ошибка декодирования MP4 (401/403 во время стриминга)"});
        };
        video.src = window.URL.createObjectURL(blob);
    });
};

export const generateVideo = async (
  params: GenerateVideoParams,
  connectionConfig: VertexConnectionConfig,
  onLog?: (message: string, data?: any) => void
): Promise<{objectUrl: string; blob: Blob; uri: string; video: Video; isSimulation?: boolean}> => {
  const log = (msg: string, data?: any) => {
      console.log(`[VEO_PRO_LOG] ${msg}`, data || '');
      if (onLog) onLog(msg, data);
  };

  // 1. ПРИНУДИТЕЛЬНАЯ МОДЕЛЬ ДЛЯ 1080p (Fast-модель часто дает 401 на 1080p)
  let modelToUse = params.model;
  if (params.resolution === Resolution.P1080 && params.model === VeoModel.VEO_FAST) {
      log("QUALITY_UPGRADE: 1080p требует veo-3.1-generate-preview (Pro) или Lite");
      modelToUse = VeoModel.VEO;
  }

  const payload: any = {
    model: modelToUse,
    prompt: params.prompt || "High-end cinematic video, 8k resolution, photorealistic",
    config: {
      numberOfVideos: 1,
      resolution: params.resolution,
      aspectRatio: params.aspectRatio
    }
  };

  if (params.mode === GenerationMode.FRAMES_TO_VIDEO && params.startFrame) {
      payload.image = { imageBytes: params.startFrame.base64, mimeType: params.startFrame.file.type };
      if (params.endFrame) {
          payload.config.lastFrame = { imageBytes: params.endFrame.base64, mimeType: params.endFrame.file.type };
      }
  }

  try {
    log(`STEP 1: Инициализация Veo Pro LRO...`);
    
    // ВСЕГДА создаем новый инстанс прямо перед вызовом из актуального process.env.API_KEY
    const getFreshAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let ai = getFreshAi();
    let operation = await ai.models.generateVideos(payload);
    log(`STEP 2: Операция в облаке создана. ID: ${operation.name}`);

    const startTime = Date.now();
    const maxWaitTime = 25 * 60 * 1000;

    // Начальная пауза для развертывания задачи в GCS
    await new Promise(r => setTimeout(r, 15000));

    while (!operation.done) {
      if (Date.now() - startTime > maxWaitTime) throw new Error("TIMEOUT: Генерация 1080p заняла более 25 минут.");
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      log(`STEP 3: Рендеринг кадров... [${elapsed}s]`);

      try {
          // ОБНОВЛЯЕМ AI ИНСТАНС ПЕРЕД КАЖДЫМ ОПРОСОМ (решение ошибки 401 на 3-й сек)
          ai = getFreshAi();
          operation = await ai.operations.getVideosOperation({ operation });
      } catch (pollError: any) {
          log(`WARN: Ошибка связи (${pollError.message}). Повтор через 20с...`);
          if (pollError.message?.includes("401") || pollError.message?.includes("UNAUTHENTICATED")) {
              throw new Error("AUTH_RECOVERY_REQUIRED");
          }
          await new Promise(r => setTimeout(r, 20000));
          continue;
      }
      
      await new Promise(r => setTimeout(r, 15000));
    }

    if (operation.error) {
        log(`API_ERROR [${operation.error.code}]: ${operation.error.message}`);
        if (operation.error.code === 401) throw new Error("AUTH_RECOVERY_REQUIRED");
        throw new Error(operation.error.message || "Ошибка Google AI");
    }

    const videoResult = (operation.response?.generatedVideos || (operation as any).result?.generated_videos)?.[0];
    const videoUri = videoResult?.video?.uri || videoResult?.uri;

    if (!videoUri) throw new Error("API не вернуло ссылку на видео-объект.");

    log(`STEP 4: Рендеринг завершен. Подготовка файла к загрузке...`);
    
    // Критическая пауза для "сшивания" MP4 контейнера в Google Cloud Storage
    const stabilizationDelay = 20000;
    log(`DEBUG: Стабилизация GCS (${stabilizationDelay/1000}s)...`);
    await new Promise(r => setTimeout(r, stabilizationDelay));

    // Скачивание через прокси с текущим ключом
    const downloadUrl = `${videoUri}${videoUri.includes('?') ? '&' : '?'}key=${process.env.API_KEY}`;
    
    let attempt = 0;
    while (attempt < 5) {
        try {
            log(`STEP 5: Загрузка 1080p потока... (Попытка ${attempt + 1})`);
            const fetchResp = await fetch(downloadUrl);
            if (!fetchResp.ok) throw new Error(`HTTP ${fetchResp.status}`);
            
            const blob = await fetchResp.blob();
            log(`DOWNLOAD: Загружено ${(blob.size/1024/1024).toFixed(2)} MB.`);
            
            const verify = await verifyVideoBlob(blob);
            if (verify.ok) {
                log("SUCCESS: Видео полностью загружено и верифицировано.");
                return {
                    objectUrl: URL.createObjectURL(blob),
                    blob,
                    uri: videoUri,
                    video: videoResult.video || videoResult
                };
            } else {
                log(`RETRY: Файл поврежден или не дозаписан (${verify.error})...`);
            }
        } catch (e: any) {
            log(`DOWNLOAD_WARN: ${e.message}`);
        }
        attempt++;
        await new Promise(r => setTimeout(r, 10000 * attempt));
    }

    throw new Error("Не удалось скачать валидный MP4 файл. Попробуйте обновить страницу или выбрать другой API ключ.");

  } catch (error: any) {
    log(`CRITICAL: ${error.message}`, 'error');
    throw error;
  }
};

export const enhancePromptWithInternet = async (prompt: string, onLog?: (msg: string) => void): Promise<string> => {
    if (onLog) onLog("Ищем информацию в интернете для улучшения промпта...");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: `Improve the following video generation prompt by searching the internet for the most accurate and up-to-date visual details, context, and references. Make it highly detailed, cinematic, and optimized for a video generation model. Return ONLY the improved prompt text, nothing else.\n\nOriginal prompt: ${prompt}`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        if (onLog) onLog("Промпт успешно улучшен с помощью интернета!");
        return response.text || prompt;
    } catch (e: any) {
        if (onLog) onLog(`Ошибка при улучшении промпта: ${e.message}`);
        return prompt;
    }
};

export const generateImage = async (params: GeneratePhotoParams, config: VertexConnectionConfig, onLog: any) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: params.model,
        contents: { parts: [{ text: params.prompt }] },
        config: { 
            imageConfig: { 
                aspectRatio: params.aspectRatio,
                ...(params.model === PhotoModel.NANO_BANANA_PRO ? {
                    imageSize: params.quality === '4K' ? '4K' : params.quality === 'HD' ? '2K' : '1K'
                } : {})
            } 
        }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("Image data missing");
    const blob = new Blob([Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0))], {type: part.inlineData.mimeType});
    return { imageUrl: URL.createObjectURL(blob), blob };
};

export const testVertexConnection = async (config: VertexConnectionConfig, log: any) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'test connection' });
        log('Auth Status: OK (Vertex Access Verified)', 'success');
    } catch (e: any) {
        log(`Auth Status: FAILED (${e.message})`, 'error');
    }
};

export const generateChatResponse = async (
    messages: ChatMessage[],
    role: AIRole,
    onLog?: (msg: string) => void
): Promise<string> => {
    if (onLog) onLog(`Генерация ответа от лица: ${role.name}...`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: role.systemInstruction
        });

        const chat = model.startChat({
            history: messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            })).slice(0, -1) // All except current
        });

        const lastMessage = messages[messages.length - 1].text;
        const result = await chat.sendMessage(lastMessage);
        const response = result.response;
        return response.text();
    } catch (error: any) {
        if (onLog) onLog(`Ошибка чата: ${error.message}`);
        throw error;
    }
};
