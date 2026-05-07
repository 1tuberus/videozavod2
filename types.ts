
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Локальный аналог @google/genai Video — после миграции на HUB магистраль
// прямые SDK-вызовы Google запрещены (Anthropic AUP / EVO_OMNI_HUB routing rules).
export interface Video { uri: string; mimeType?: string; }

// ═══════════════ HUB / Catalog typings ═══════════════
export type ParamType = 'text'|'int'|'float'|'enum'|'bool'|'image_list'|'messages';
export interface ParamSchema {
  type: ParamType;
  required?: boolean;
  default?: any;
  min?: number; max?: number;
  options?: (string|number)[];
  description?: string;
}
export interface CatalogEntry {
  id: string;
  label: string;
  group: 'video'|'image'|'music'|'tts'|'text';
  badge?: 'TOP'|'FAST'|'ECO'|null;
  provider_hint: 'vertex'|'kie';
  capabilities: Record<string, any>;
  params: Record<string, ParamSchema>;
  pricing: { unit: string; tokens?: number; in?: number; out?: number };
}
export interface Catalog {
  video: CatalogEntry[];
  image: CatalogEntry[];
  music: CatalogEntry[];
  tts:   CatalogEntry[];
  text:  CatalogEntry[];
}
export type RoutingMode = 'auto'|'force_vertex'|'force_kie';
export interface Job {
  id: string;  // UUID, server: crypto.randomUUID()
  status: 'queued'|'running'|'succeeded'|'failed';
  job_type: 'video'|'image'|'music'|'text';
  mode: string;
  result_url?: string | null;
  thumbnail_url?: string | null;
  error_text?: string | null;
  tokens_charged?: number;
  created_at?: number;
  params_input?: any;
}

export enum AppState {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export enum GenerationTask {
  VIDEO = 'video',
  PHOTO = 'photo',
  MUSIC = 'music',
  TEXT = 'text',
  CONNECTIONS = 'connections'
}

export interface AIRole {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  avatar: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// VeoModel / PhotoModel enums удалены — теперь модели берутся динамически
// из /api/catalog (см. hooks/useCatalog.ts). Поле `model` хранит catalog id (string).

export enum AspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  SQUARE = '1:1',
  // Photo specific
  R_4_3 = '4:3',
  R_3_4 = '3:4'
}

export enum Resolution {
  P720 = '720p',
  P1080 = '1080p',
  P4K = '4k',
}

export enum GenerationMode {
  TEXT_TO_VIDEO = 'Text to Video',
  FRAMES_TO_VIDEO = 'Frames to Video',
  REFERENCES_TO_VIDEO = 'References to Video',
  EXTEND_VIDEO = 'Extend Video',
}

export enum VideoStyle {
  REALISTIC = 'Realistic',
  ANIME = 'Anime',
  RENDER_3D = '3D Render',
  CINEMATIC = 'Cinematic',
}

export interface ImageFile {
  file: File;
  base64: string;
}

export interface VideoFile {
  file: File;
  base64: string;
}

export interface VertexConnectionConfig {
  project: string;
  location: string;
  apiKey?: string;
}

export interface GenerateVideoParams {
  prompt: string;
  model: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  mode: GenerationMode;
  style?: VideoStyle;
  startFrame?: ImageFile | null;
  endFrame?: ImageFile | null;
  referenceImages?: ImageFile[];
  styleImage?: ImageFile | null;
  inputVideo?: VideoFile | null;
  inputVideoObject?: Video | null;
  isLooping?: boolean;
}

export interface GeneratePhotoParams {
  prompt: string;
  model: string;
  aspectRatio: AspectRatio;
  quality: 'Standard' | 'HD' | '4K';
  format: 'PNG' | 'JPEG';
  referenceImages?: ImageFile[];
}

export interface GalleryItem {
  id: string;
  timestamp: number;
  status: 'succeeded' | 'failed';
  task: GenerationTask;
  params: GenerateVideoParams | GeneratePhotoParams;
  videoUrl?: string | null;
  imageUrl?: string | null; // For photos
  error?: string;
  cost: number;
}
