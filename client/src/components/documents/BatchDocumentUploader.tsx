import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Upload, FileText, X, Check, AlertCircle, Loader2, 
  File, Image, Music, FileSpreadsheet, Archive,
  Pause, Play, RotateCcw, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FileUploadProgress {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  result?: any;
  startTime?: Date;
  endTime?: Date;
  speed?: number;
  timeRemaining?: number;
}

interface BatchDocumentUploaderProps {
  therapistId: string;
  clientId?: string;
  onComplete?: (results: any) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
}

export function BatchDocumentUploader({
  therapistId,
  clientId,
  onComplete,
  maxFiles = 20,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedFileTypes = [
    '.pdf', '.docx', '.doc', '.txt', '.md',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp',
    '.xlsx', '.xls', '.csv',
    '.mp3', '.wav', '.m4a',
    '.zip'
  ]
}: BatchDocumentUploaderProps) {
  const [files, setFiles] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const sessionId = useRef<string>(`session-${Date.now()}`);
  const { toast } = useToast();

  // WebSocket connection for progress updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/document-progress?sessionId=${sessionId.current}`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'progress' || message.type === 'batch-progress') {
        updateFileProgress(message.data);
      } else if (message.type === 'complete') {
        markFileComplete(message.data);
      } else if (message.type === 'error') {
        markFileFailed(message.data);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const updateFileProgress = (data: any) => {
    setFiles(prev => prev.map(file => {
      if (file.id === data.id || file.file.name === data.fileName) {
        const now = Date.now();
        const elapsed = now - (file.startTime?.getTime() || now);
        const speed = elapsed > 0 ? (data.processedSize / elapsed) * 1000 : 0; // bytes per second
        const remaining = speed > 0 ? (file.file.size - data.processedSize) / speed : 0;
        
        return {
          ...file,
          progress: data.percentage || file.progress,
          status: 'processing',
          speed,
          timeRemaining: remaining
        };
      }
      return file;
    }));
  };

  const markFileComplete = (data: any) => {
    setFiles(prev => prev.map(file => {
      if (file.id === data.id || file.file.name === data.fileName) {
        return {
          ...file,
          progress: 100,
          status: 'completed',
          endTime: new Date(),
          result: data.result
        };
      }
      return file;
    }));
  };

  const markFileFailed = (data: any) => {
    setFiles(prev => prev.map(file => {
      if (file.id === data.id || file.file.name === data.fileName) {
        return {
          ...file,
          status: 'failed',
          error: data.error || 'Processing failed',
          endTime: new Date()
        };
      }
      return file;
    }));
  };

  // Batch upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/documents/batch-upload', {
        method: 'POST',
        headers: {
          'X-Session-Id': sessionId.current
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Upload Complete',
        description: `Successfully processed ${data.processed} documents`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      if (onComplete) {
        onComplete(data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach(rejection => {
      const error = rejection.errors[0];
      toast({
        title: 'File Rejected',
        description: `${rejection.file.name}: ${error.message}`,
        variant: 'destructive',
      });
    });

    // Add accepted files
    const newFiles: FileUploadProgress[] = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}`,
      progress: 0,
      status: 'pending' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      // Map file extensions to MIME types
      const mimeMap: Record<string, string[]> = {
        '.pdf': ['application/pdf'],
        '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        '.doc': ['application/msword'],
        '.txt': ['text/plain'],
        '.md': ['text/markdown'],
        '.png': ['image/png'],
        '.jpg': ['image/jpeg'],
        '.jpeg': ['image/jpeg'],
        '.gif': ['image/gif'],
        '.bmp': ['image/bmp'],
        '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        '.xls': ['application/vnd.ms-excel'],
        '.csv': ['text/csv'],
        '.mp3': ['audio/mpeg'],
        '.wav': ['audio/wav'],
        '.m4a': ['audio/m4a'],
        '.zip': ['application/zip']
      };
      
      if (mimeMap[type]) {
        mimeMap[type].forEach(mime => {
          if (!acc[mime]) acc[mime] = [];
          acc[mime].push(type);
        });
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    maxSize: maxFileSize,
    multiple: true
  });

  // Start upload
  const startUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setIsPaused(false);

    const formData = new FormData();
    formData.append('therapistId', therapistId);
    if (clientId) {
      formData.append('clientId', clientId);
    }
    formData.append('compress', 'true');
    formData.append('deduplicate', 'true');

    // Add files that haven't been processed yet
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'failed');
    pendingFiles.forEach(fileProgress => {
      formData.append('documents', fileProgress.file);
      fileProgress.status = 'uploading';
      fileProgress.startTime = new Date();
    });

    setFiles([...files]);
    
    try {
      await uploadMutation.mutateAsync(formData);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove file
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  // Cancel upload
  const cancelUpload = () => {
    // TODO: Implement actual cancellation via abort controller
    setIsUploading(false);
    setIsPaused(false);
    
    files.forEach(file => {
      if (file.status === 'uploading' || file.status === 'processing') {
        file.status = 'cancelled';
      }
    });
    
    setFiles([...files]);
  };

  // Retry failed files
  const retryFailed = () => {
    const failedFiles = files.filter(f => f.status === 'failed');
    failedFiles.forEach(file => {
      file.status = 'pending';
      file.progress = 0;
      file.error = undefined;
    });
    setFiles([...files]);
    startUpload();
  };

  // Clear completed
  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  // Get file icon
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'md':
        return <FileText className="w-4 h-4" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
        return <Image className="w-4 h-4" />;
      case 'mp3':
      case 'wav':
      case 'm4a':
        return <Music className="w-4 h-4" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'zip':
        return <Archive className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format time
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  // Calculate totals
  const totalFiles = files.length;
  const completedFiles = files.filter(f => f.status === 'completed').length;
  const failedFiles = files.filter(f => f.status === 'failed').length;
  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const overallProgress = totalFiles > 0 
    ? files.reduce((sum, f) => sum + f.progress, 0) / totalFiles 
    : 0;

  return (
    <Card className="w-full" data-testid="batch-document-uploader">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Batch Document Upload</span>
          {totalFiles > 0 && (
            <Badge variant="outline">
              {completedFiles}/{totalFiles} files
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
          data-testid="dropzone"
        >
          <input {...getInputProps()} disabled={isUploading} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {isDragActive ? (
            <p className="text-lg font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-lg font-medium">Drag & drop files here</p>
              <p className="text-sm text-gray-500 mt-2">
                or click to browse files
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Supports: PDF, Word, Images, Audio, Excel, CSV, ZIP
              </p>
              <p className="text-xs text-gray-400">
                Max {maxFiles} files, up to {formatFileSize(maxFileSize)} each
              </p>
            </>
          )}
        </div>

        {/* Overall Progress */}
        {totalFiles > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-500">
                {Math.round(overallProgress)}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            
            {/* Statistics */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total size: {formatFileSize(totalSize)}</span>
              {failedFiles > 0 && (
                <span className="text-red-500">{failedFiles} failed</span>
              )}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        {totalFiles > 0 && (
          <div className="flex gap-2 flex-wrap">
            {!isUploading ? (
              <Button
                onClick={startUpload}
                disabled={files.every(f => f.status === 'completed')}
                size="sm"
                data-testid="button-start-upload"
              >
                <Upload className="w-4 h-4 mr-2" />
                Start Upload
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setIsPaused(!isPaused)}
                  variant="outline"
                  size="sm"
                  data-testid="button-pause-resume"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={cancelUpload}
                  variant="destructive"
                  size="sm"
                  data-testid="button-cancel"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            
            {failedFiles > 0 && (
              <Button
                onClick={retryFailed}
                variant="outline"
                size="sm"
                data-testid="button-retry"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Failed
              </Button>
            )}
            
            {completedFiles > 0 && (
              <Button
                onClick={clearCompleted}
                variant="outline"
                size="sm"
                data-testid="button-clear"
              >
                Clear Completed
              </Button>
            )}
            
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              size="sm"
              data-testid="button-toggle-details"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show Details
                </>
              )}
            </Button>
          </div>
        )}

        {/* File List */}
        {showDetails && files.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map(file => (
              <div
                key={file.id}
                className={cn(
                  "border rounded-lg p-3 space-y-2",
                  file.status === 'completed' && "bg-green-50 border-green-200",
                  file.status === 'failed' && "bg-red-50 border-red-200",
                  file.status === 'processing' && "bg-blue-50 border-blue-200"
                )}
                data-testid={`file-item-${file.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getFileIcon(file.file.name)}
                    <span className="text-sm font-medium truncate">
                      {file.file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({formatFileSize(file.file.size)})
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.status === 'processing' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {file.status === 'completed' && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {file.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading' || file.status === 'processing'}
                      data-testid={`button-remove-${file.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {(file.status === 'uploading' || file.status === 'processing') && (
                  <div className="space-y-1">
                    <Progress value={file.progress} className="h-1" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{Math.round(file.progress)}%</span>
                      {file.speed && file.speed > 0 && (
                        <span>
                          {formatFileSize(file.speed)}/s • {formatTime(file.timeRemaining || 0)} remaining
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Error Message */}
                {file.error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">
                      {file.error}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Status Badge */}
                <Badge 
                  variant={
                    file.status === 'completed' ? 'default' :
                    file.status === 'failed' ? 'destructive' :
                    file.status === 'processing' ? 'secondary' :
                    'outline'
                  }
                  className="text-xs"
                >
                  {file.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}