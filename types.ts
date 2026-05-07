
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from '@google/genai';

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

export enum VeoModel {
  // Official Model IDs for Veo 3.1
  VEO_FAST = 'veo-3.1-fast-generate-preview',
  VEO = 'veo-3.1-generate-preview',
  VEO_LITE = 'veo-3.1-lite-generate-preview',
}

export enum PhotoModel {
  NANO_BANANA = 'gemini-2.5-flash-image', // Flash / Nano Banana
  NANO_BANANA_PRO = 'gemini-3-pro-image-preview', // Pro / Nano Banana Pro
}

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
  model: VeoModel;
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
  model: PhotoModel;
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
