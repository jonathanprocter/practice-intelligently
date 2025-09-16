// File Upload Error Handling with Resume Capabilities
import { toast } from '@/hooks/use-toast';
import { AppError, ErrorType, ErrorSeverity, networkMonitor } from './errorHandler';

interface UploadChunk {
  start: number;
  end: number;
  data: Blob;
  uploaded: boolean;
}

interface UploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  chunks: UploadChunk[];
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  error?: string;
  startTime: number;
  lastActivity: number;
}

export class ResumableFileUploader {
  private static instance: ResumableFileUploader;
  private uploadQueue: Map<string, UploadProgress> = new Map();
  private activeUploads: Map<string, AbortController> = new Map();
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private readonly MAX_RETRIES = 3;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  private constructor() {
    this.loadSavedProgress();
    this.setupNetworkListener();
  }

  static getInstance(): ResumableFileUploader {
    if (!ResumableFileUploader.instance) {
      ResumableFileUploader.instance = new ResumableFileUploader();
    }
    return ResumableFileUploader.instance;
  }

  async uploadFile(
    file: File,
    endpoint: string,
    options?: {
      onProgress?: (progress: number) => void;
      onComplete?: (response: any) => void;
      onError?: (error: Error) => void;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      const error = new AppError(
        validation.error!,
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        { userMessage: validation.error }
      );
      if (options?.onError) options.onError(error);
      throw error;
    }

    // Check if this file is already being uploaded
    const existingUpload = this.findExistingUpload(file);
    if (existingUpload) {
      console.log('Resuming existing upload for', file.name);
      return this.resumeUpload(existingUpload.fileId, options);
    }

    // Create new upload
    const fileId = this.generateFileId(file);
    const chunks = this.createChunks(file);
    
    const progress: UploadProgress = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      uploadedBytes: 0,
      chunks,
      status: 'pending',
      startTime: Date.now(),
      lastActivity: Date.now()
    };

    this.uploadQueue.set(fileId, progress);
    this.saveProgress();

    // Start upload
    return this.performUpload(fileId, file, endpoint, options);
  }

  private async performUpload(
    fileId: string,
    file: File,
    endpoint: string,
    options?: any
  ): Promise<string> {
    const progress = this.uploadQueue.get(fileId);
    if (!progress) throw new Error('Upload progress not found');

    progress.status = 'uploading';
    const controller = new AbortController();
    this.activeUploads.set(fileId, controller);

    try {
      // Upload chunks
      for (let i = 0; i < progress.chunks.length; i++) {
        const chunk = progress.chunks[i];
        
        if (chunk.uploaded) {
          continue; // Skip already uploaded chunks
        }

        // Check network status
        if (!networkMonitor.getStatus()) {
          progress.status = 'paused';
          this.saveProgress();
          throw new AppError(
            'Upload paused due to network disconnection',
            ErrorType.NETWORK,
            ErrorSeverity.LOW,
            { userMessage: 'Upload paused. Will resume when connection is restored.' }
          );
        }

        // Upload chunk with retry
        let retries = 0;
        while (retries < this.MAX_RETRIES) {
          try {
            await this.uploadChunk(
              endpoint,
              fileId,
              chunk,
              i,
              progress.chunks.length,
              controller.signal
            );

            chunk.uploaded = true;
            progress.uploadedBytes += chunk.end - chunk.start;
            progress.lastActivity = Date.now();
            
            // Update progress
            const percentComplete = (progress.uploadedBytes / progress.fileSize) * 100;
            if (options?.onProgress) {
              options.onProgress(percentComplete);
            }

            this.saveProgress();
            break; // Success, move to next chunk

          } catch (error: any) {
            retries++;
            
            if (retries >= this.MAX_RETRIES) {
              throw error;
            }

            // Wait before retry with exponential backoff
            await this.delay(Math.pow(2, retries) * 1000);
          }
        }
      }

      // Complete upload
      const response = await this.completeUpload(endpoint, fileId, file.name);
      
      progress.status = 'completed';
      this.saveProgress();
      
      if (options?.onComplete) {
        options.onComplete(response);
      }

      // Clean up
      this.uploadQueue.delete(fileId);
      this.activeUploads.delete(fileId);
      this.saveProgress();

      toast({
        title: 'Upload Complete',
        description: `${file.name} uploaded successfully`,
        variant: 'default',
      });

      return response.fileId || fileId;

    } catch (error: any) {
      progress.status = 'failed';
      progress.error = error.message;
      this.saveProgress();

      if (options?.onError) {
        options.onError(error);
      }

      // Don't delete from queue so it can be resumed
      this.activeUploads.delete(fileId);

      throw error;
    }
  }

  private async uploadChunk(
    endpoint: string,
    fileId: string,
    chunk: UploadChunk,
    chunkIndex: number,
    totalChunks: number,
    signal: AbortSignal
  ): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', chunk.data);
    formData.append('fileId', fileId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('start', chunk.start.toString());
    formData.append('end', chunk.end.toString());

    const response = await fetch(`${endpoint}/chunk`, {
      method: 'POST',
      body: formData,
      signal,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.statusText}`);
    }
  }

  private async completeUpload(
    endpoint: string,
    fileId: string,
    fileName: string
  ): Promise<any> {
    const response = await fetch(`${endpoint}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, fileName }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to complete upload: ${response.statusText}`);
    }

    return response.json();
  }

  async resumeUpload(
    fileId: string,
    options?: any
  ): Promise<string> {
    const progress = this.uploadQueue.get(fileId);
    if (!progress) {
      throw new Error('Upload not found');
    }

    if (progress.status === 'completed') {
      return fileId;
    }

    // Find the file in the saved progress
    const file = await this.reconstructFile(progress);
    if (!file) {
      throw new Error('Cannot reconstruct file for resume');
    }

    return this.performUpload(fileId, file, '/api/upload', options);
  }

  pauseUpload(fileId: string) {
    const controller = this.activeUploads.get(fileId);
    if (controller) {
      controller.abort();
    }

    const progress = this.uploadQueue.get(fileId);
    if (progress) {
      progress.status = 'paused';
      this.saveProgress();
    }
  }

  cancelUpload(fileId: string) {
    this.pauseUpload(fileId);
    this.uploadQueue.delete(fileId);
    this.activeUploads.delete(fileId);
    this.saveProgress();
  }

  getUploadProgress(fileId: string): UploadProgress | undefined {
    return this.uploadQueue.get(fileId);
  }

  getAllUploads(): UploadProgress[] {
    return Array.from(this.uploadQueue.values());
  }

  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit`
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      const allowedExtensions = this.ALLOWED_TYPES
        .map(type => type.split('/')[1])
        .join(', ');
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedExtensions}`
      };
    }

    // Check file name for security
    const invalidChars = /[<>:"|?*\\]/g;
    if (invalidChars.test(file.name)) {
      return {
        valid: false,
        error: 'File name contains invalid characters'
      };
    }

    return { valid: true };
  }

  private createChunks(file: File): UploadChunk[] {
    const chunks: UploadChunk[] = [];
    let start = 0;

    while (start < file.size) {
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
      chunks.push({
        start,
        end,
        data: file.slice(start, end),
        uploaded: false
      });
      start = end;
    }

    return chunks;
  }

  private generateFileId(file: File): string {
    return `${file.name}_${file.size}_${Date.now()}`;
  }

  private findExistingUpload(file: File): UploadProgress | undefined {
    for (const progress of this.uploadQueue.values()) {
      if (progress.fileName === file.name && 
          progress.fileSize === file.size &&
          progress.status !== 'completed') {
        return progress;
      }
    }
    return undefined;
  }

  private async reconstructFile(progress: UploadProgress): Promise<File | null> {
    // In a real implementation, this would reconstruct the file from saved chunks
    // For now, return null to indicate the file needs to be re-selected
    return null;
  }

  private setupNetworkListener() {
    networkMonitor.subscribe((online) => {
      if (online) {
        // Resume paused uploads when network is back
        this.resumePausedUploads();
      }
    });
  }

  private async resumePausedUploads() {
    const pausedUploads = Array.from(this.uploadQueue.values())
      .filter(p => p.status === 'paused');

    if (pausedUploads.length > 0) {
      toast({
        title: 'Resuming uploads',
        description: `Resuming ${pausedUploads.length} paused uploads`,
        variant: 'default',
      });

      for (const upload of pausedUploads) {
        try {
          await this.resumeUpload(upload.fileId);
        } catch (error) {
          console.error(`Failed to resume upload ${upload.fileId}:`, error);
        }
      }
    }
  }

  private saveProgress() {
    if (typeof localStorage !== 'undefined') {
      const data = Array.from(this.uploadQueue.entries()).map(([id, progress]) => ({
        id,
        ...progress,
        chunks: progress.chunks.map(c => ({
          start: c.start,
          end: c.end,
          uploaded: c.uploaded
        }))
      }));
      
      localStorage.setItem('upload_progress', JSON.stringify(data));
    }
  }

  private loadSavedProgress() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('upload_progress');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          // Note: We can't restore the actual file data from localStorage
          // This is mainly for tracking what was being uploaded
        } catch (error) {
          console.error('Failed to load saved upload progress:', error);
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCompleted() {
    const completed = Array.from(this.uploadQueue.entries())
      .filter(([_, progress]) => progress.status === 'completed')
      .map(([id]) => id);

    completed.forEach(id => this.uploadQueue.delete(id));
    this.saveProgress();
  }

  getStatistics(): {
    active: number;
    paused: number;
    failed: number;
    completed: number;
    totalBytes: number;
    uploadedBytes: number;
  } {
    let stats = {
      active: 0,
      paused: 0,
      failed: 0,
      completed: 0,
      totalBytes: 0,
      uploadedBytes: 0
    };

    for (const progress of this.uploadQueue.values()) {
      stats.totalBytes += progress.fileSize;
      stats.uploadedBytes += progress.uploadedBytes;

      switch (progress.status) {
        case 'uploading':
          stats.active++;
          break;
        case 'paused':
          stats.paused++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'completed':
          stats.completed++;
          break;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const fileUploader = ResumableFileUploader.getInstance();

// React hook for file uploads
export function useFileUpload() {
  const [uploadProgress, setUploadProgress] = React.useState<Map<string, number>>(new Map());
  const [uploadErrors, setUploadErrors] = React.useState<Map<string, string>>(new Map());

  const uploadFile = async (file: File, endpoint: string) => {
    const fileId = `${file.name}_${Date.now()}`;
    
    try {
      const result = await fileUploader.uploadFile(file, endpoint, {
        onProgress: (progress) => {
          setUploadProgress(prev => new Map(prev).set(fileId, progress));
        },
        onComplete: () => {
          setUploadProgress(prev => {
            const newMap = new Map(prev);
            newMap.delete(fileId);
            return newMap;
          });
        },
        onError: (error) => {
          setUploadErrors(prev => new Map(prev).set(fileId, error.message));
        }
      });

      return result;
    } catch (error: any) {
      setUploadErrors(prev => new Map(prev).set(fileId, error.message));
      throw error;
    }
  };

  return {
    uploadFile,
    uploadProgress,
    uploadErrors,
    pauseUpload: (fileId: string) => fileUploader.pauseUpload(fileId),
    resumeUpload: (fileId: string) => fileUploader.resumeUpload(fileId),
    cancelUpload: (fileId: string) => fileUploader.cancelUpload(fileId),
  };
}

export default fileUploader;