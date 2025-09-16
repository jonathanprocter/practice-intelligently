import { useState, useRef } from 'react';
import { Upload, FileText, Users, Calendar, Brain, CheckCircle, AlertCircle, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ProcessingResult {
  success: boolean;
  message: string;
  totalClients: number;
  totalSessions: number;
  successfulMatches: number;
  createdProgressNotes: number;
  summary: string;
  result: {
    unmatchedClients: string[];
    errors: string[];
    processingDetails: {
      matchedClients: Array<{
        extractedClient: { name: string };
        matchedClientName: string;
        sessionsProcessed: number;
      }>;
    };
  };
}

interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  stage: string;
  result?: ProcessingResult;
  error?: string;
}

interface ComprehensiveDocumentUploaderProps {
  therapistId: string;
  onComplete?: (result: ProcessingResult) => void;
}

export function ComprehensiveDocumentUploader({ 
  therapistId, 
  onComplete 
}: ComprehensiveDocumentUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFilesToQueue(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFilesToQueue(files);
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const validFiles: FileUploadItem[] = [];
    
    files.forEach(file => {
      const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.xlsx', '.xls', '.csv'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension)) {
        toast({
          title: "Invalid File Type",
          description: `${file.name}: Please upload a supported file type: PDF, DOCX, TXT, images, Excel, or CSV.`,
          variant: "destructive"
        });
        return;
      }

      // Check file size (15MB limit)
      if (file.size > 15 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name}: File size must be under 15MB.`,
          variant: "destructive"
        });
        return;
      }

      validFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: 'pending',
        progress: 0,
        stage: 'Ready to process',
      });
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast({
        title: "Files Added",
        description: `${validFiles.length} file(s) added to processing queue.`,
      });
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const processAllFiles = async () => {
    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast({
        title: "No Files to Process",
        description: "Please add files to the queue first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Process files sequentially
    for (const uploadFile of pendingFiles) {
      await processIndividualFile(uploadFile);
    }
    
    setIsProcessing(false);
    
    // Show completion summary
    const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
    const errorFiles = uploadedFiles.filter(f => f.status === 'error');
    
    toast({
      title: "Batch Processing Complete",
      description: `${completedFiles.length} files processed successfully, ${errorFiles.length} files had errors.`,
    });
  };

  const processIndividualFile = async (uploadFile: FileUploadItem) => {
    // Update file status to processing
    setUploadedFiles(prev => prev.map(f => 
      f.id === uploadFile.id 
        ? { ...f, status: 'processing', progress: 0, stage: 'Uploading document...' }
        : f
    ));

    try {
      const formData = new FormData();
      formData.append('document', uploadFile.file);
      formData.append('therapistId', therapistId);

      // Simulate progress for better UX
      const progressStages = [
        { stage: 'Uploading document...', percent: 10 },
        { stage: 'Extracting text content...', percent: 25 },
        { stage: 'Parsing clients and sessions...', percent: 45 },
        { stage: 'Matching clients with database...', percent: 65 },
        { stage: 'Creating progress notes...', percent: 85 },
        { stage: 'Finalizing...', percent: 100 }
      ];

      let currentStageIndex = 0;
      const progressInterval = setInterval(() => {
        if (currentStageIndex < progressStages.length) {
          const currentStage = progressStages[currentStageIndex];
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, progress: currentStage.percent, stage: currentStage.stage }
              : f
          ));
          currentStageIndex++;
        }
      }, 1000);

      const response = await fetch('/api/documents/parse-comprehensive-progress-notes', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json() as ProcessingResult;
      
      // Update file status to completed
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100, 
              stage: 'Complete!',
              result 
            }
          : f
      ));

      if (onComplete) {
        onComplete(result);
      }

    } catch (error: any) {
      // Update file status to error
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'error', 
              stage: 'Failed',
              error: error?.message || 'Processing failed'
            }
          : f
      ));
      
      console.error('Error processing comprehensive document:', error);
    }
  };

  const getFileIcon = (file: File) => {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(extension)) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    if (['.xlsx', '.xls', '.csv'].includes(extension)) {
      return <FileText className="w-4 h-4 text-green-500" />;
    }
    if (['.pdf'].includes(extension)) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto" data-testid="upload-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI-Powered Multiple Document Processing
        </CardTitle>
        <CardDescription>
          Upload multiple documents (PDF, DOCX, TXT, images, Excel, CSV) to automatically extract client information, 
          session data, and sync to your database with intelligent client matching.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Upload Zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all
              ${isDragOver 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="drop-zone"
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">
              Drop multiple documents here or click to select
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supports PDF, DOCX, TXT, images, Excel, CSV with multiple clients and sessions
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-files"
              >
                Select Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.gif,.bmp,.xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                multiple
                data-testid="file-input"
              />
            </div>
          </div>

          {/* File Queue */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Processing Queue ({uploadedFiles.length} files)</h4>
                <div className="flex gap-2">
                  <Button
                    onClick={processAllFiles}
                    disabled={isProcessing || uploadedFiles.filter(f => f.status === 'pending').length === 0}
                    data-testid="button-process-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Process All Files'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setUploadedFiles([])}
                    disabled={isProcessing}
                    data-testid="button-clear-queue"
                  >
                    Clear Queue
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {uploadedFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="border rounded-lg p-4 space-y-3"
                    data-testid={`file-item-${uploadFile.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(uploadFile.file)}
                        <div>
                          <div className="font-medium">{uploadFile.file.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatFileSize(uploadFile.file.size)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(uploadFile.status)}>
                          {uploadFile.status.charAt(0).toUpperCase() + uploadFile.status.slice(1)}
                        </Badge>
                        {uploadFile.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                            data-testid={`button-remove-${uploadFile.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {uploadFile.status === 'processing' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{uploadFile.stage}</span>
                          <span>{uploadFile.progress}%</span>
                        </div>
                        <Progress value={uploadFile.progress} className="w-full" />
                      </div>
                    )}

                    {uploadFile.status === 'completed' && uploadFile.result && (
                      <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div className="font-medium">Processing Complete!</div>
                            <div className="text-sm">
                              • {uploadFile.result.totalClients} clients processed
                              • {uploadFile.result.totalSessions} sessions created
                              • {uploadFile.result.successfulMatches} successful matches
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {uploadFile.status === 'error' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium">Processing Failed</div>
                          <div className="text-sm">{uploadFile.error}</div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-3">
            <h4 className="font-medium">How to use multiple document processing:</h4>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                  1
                </div>
                <div>
                  <div className="font-medium">Add Multiple Documents</div>
                  <div className="text-muted-foreground">
                    Drag and drop multiple files or use the file selector to add documents to the processing queue.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-sm font-medium text-green-600 dark:text-green-400">
                  2
                </div>
                <div>
                  <div className="font-medium">Review and Process</div>
                  <div className="text-muted-foreground">
                    Files are validated automatically. Click "Process All Files" to start batch processing sequentially.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm font-medium text-purple-600 dark:text-purple-400">
                  3
                </div>
                <div>
                  <div className="font-medium">Track Progress</div>
                  <div className="text-muted-foreground">
                    Monitor individual file processing progress and review results for each document.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}