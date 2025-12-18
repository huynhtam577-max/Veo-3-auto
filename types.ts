export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum InputType {
  TEXT = 'Text Only',
  IMAGE = 'Text + Image',
}

export enum ModelType {
  VEO_FAST = 'veo-3.1-fast-generate-preview',
  VEO_HQ = 'veo-3.1-generate-preview',
}

export enum AspectRatio {
  RATIO_16_9 = '16:9',
  RATIO_9_16 = '9:16',
}

export enum Resolution {
  RES_720P = '720p',
  RES_1080P = '1080p',
}

export interface JobConfig {
  prompt: string;
  inputType: InputType;
  model: ModelType;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface Job {
  id: string;
  config: JobConfig;
  status: JobStatus;
  videoUri?: string; // The download link from API
  downloadUrl?: string; // The fetchable URL with key appended
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
