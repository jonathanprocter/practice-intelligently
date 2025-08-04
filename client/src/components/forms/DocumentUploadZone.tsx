import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Clock, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'awaiting-confirmation' | 'completed' | 'error';
  progress: number;
  error?: string;
  extractedData?: {
    detectedClientName?: string;
    detectedSessionDate?: string;
    extractedText: string;
    fullContent: string;
    fileName: string;
    requiresConfirmation?: boolean;
  };
}

interface DocumentUploadZoneProps {
  onProgressNoteGenerated?: (progressNote: any) => void;
}

export function DocumentUploadZone({ onProgressNoteGenerated }: DocumentUploadZoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise(async (resolve, reject) => {
        try {
          const formData = new FormData();
          formData.append('document', file);

          const response = await fetch('/api/documents/upload-and-process', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            let errorMessage = 'Unknown error occurred';
            try {
              const errorData = await response.text();
              if (errorData) {
                try {
                  const parsedError = JSON.parse(errorData);
                  // Try to extract the most helpful error message
                  if (parsedError.details) {
                    errorMessage = parsedError.details;
                  } else if (parsedError.error) {
                    errorMessage = parsedError.error;
                  } else {
                    errorMessage = errorData;
                  }
                } catch {
                  errorMessage = errorData;
                }
              } else {
                errorMessage = `Request failed with status ${response.status}`;
              }
            } catch {
              errorMessage = `Request failed with status ${response.status}`;
            }

            // Create a proper error object with the message
            const error = new Error(errorMessage);
            error.name = 'DocumentProcessingError';
            reject(error);
            return;
          }

          let result;
          try {
            result = await response.json();
            resolve(result);
          } catch (jsonError) {
            const error = new Error('Invalid response format from server');
            error.name = 'DocumentProcessingError';
            reject(error);
          }
        } catch (error) {
          // Catch any error and reject with proper handling
          if (error instanceof Error) {
            reject(error);
          } else {
            const processError = new Error('Document processing failed');
            processError.name = 'DocumentProcessingError';
            reject(processError);
          }
        }
      });
    },
    onSuccess: (data, file) => {
      setUploadedFiles(prev => prev.map(f => 
        f.file === file 
          ? { 
              ...f, 
              status: data.requiresConfirmation ? 'awaiting-confirmation' : 'completed', 
              progress: 100, 
              extractedData: data 
            }
          : f
      ));

      toast({
        title: "Document Processed",
        description: data.requiresConfirmation 
          ? "Please confirm the extracted information below."
          : "Document processed successfully!",
      });
    },
    onError: (error, file) => {
      // Extract the error message without logging anything to console
      let errorMessage = 'Document processing failed';

      // Check if it's an Error object with a message
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      // Check if it's an object with error properties
      else if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.error) {
          errorMessage = error.error;
        }
      }
      // Check if it's a string
      else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Update UI state without console logging
      setUploadedFiles(prev => prev.map(f => 
        f.file === file 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));

      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const generateProgressNoteMutation = useMutation({
    mutationFn: async ({ content, clientId, sessionDate, detectedClientName, detectedSessionDate }: {
      content: string;
      clientId?: string;
      sessionDate?: string;
      detectedClientName?: string;
      detectedSessionDate?: string;
    }) => {
      const response = await fetch('/api/documents/generate-progress-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          clientId,
          sessionDate,
          detectedClientName,
          detectedSessionDate,
          therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c', // Add default therapist ID
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate progress note';
        try {
          const errorData = await response.text();
          if (errorData) {
            try {
              const parsedError = JSON.parse(errorData);
              errorMessage = parsedError.error || parsedError.details || errorData;
            } catch {
              errorMessage = errorData;
            }
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        } catch {
          errorMessage = `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }
      return result;
    },
    onSuccess: (data, variables) => {
      // Update the file status to completed
      setUploadedFiles(prev => prev.map(f => 
        f.extractedData?.fullContent === variables.content
          ? { ...f, status: 'completed' }
          : f
      ));

      if (onProgressNoteGenerated) {
        onProgressNoteGenerated(data.progressNote);
      }

      toast({
        title: "Progress Note Generated",
        description: "Clinical progress note created successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ['progressNotes'] });
    },
    onError: (error) => {
      console.error('Progress note generation error:', error);
      toast({
        title: "Generation Failed",
        description: error?.message || 'Failed to generate progress note',
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Automatically start processing each file
    newFiles.forEach(uploadedFile => {
      processFile(uploadedFile);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.csv')) {
      return <FileSpreadsheet className="w-6 h-6" />;
    }
    return <FileText className="w-6 h-6" />;
  };

  const processFile = async (uploadedFile: UploadedFile) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === uploadedFile.id 
        ? { ...f, status: 'processing', progress: 0 }
        : f
    ));

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id && f.status === 'processing'
          ? { ...f, progress: Math.min(f.progress + Math.random() * 30, 90) }
          : f
      ));
    }, 500);

    try {
      await processDocumentMutation.mutateAsync(uploadedFile.file);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const confirmAndGenerateProgressNote = (uploadedFile: UploadedFile, clientName?: string, sessionDate?: string) => {
    if (!uploadedFile.extractedData?.fullContent) {
      toast({
        title: "Error",
        description: "No content available to generate progress note.",
        variant: "destructive",
      });
      return;
    }

    generateProgressNoteMutation.mutate({
      content: uploadedFile.extractedData.fullContent,
      clientId: clientName || uploadedFile.extractedData.detectedClientName,
      sessionDate: sessionDate || uploadedFile.extractedData.detectedSessionDate,
      detectedClientName: uploadedFile.extractedData.detectedClientName,
      detectedSessionDate: uploadedFile.extractedData.detectedSessionDate,
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'awaiting-confirmation':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'processing':
        return 'Processing document...';
      case 'awaiting-confirmation':
        return 'Awaiting confirmation';
      case 'completed':
        return 'Progress note generated';
      case 'error':
        return 'Processing failed';
      default:
        return 'Pending';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI-Powered Clinical Document Processing</h3>
        <p className="text-sm text-gray-600 mb-6">
          Upload clinical documents and our AI will automatically extract client information and generate comprehensive progress notes.
        </p>

        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-therapy-primary bg-therapy-primary/5'
              : 'border-gray-300 hover:border-therapy-primary hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-lg">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg mb-2">Drag & drop clinical documents here, or click to select</p>
              <p className="text-sm text-gray-500">
                AI will automatically extract client information and session details
              </p>
            </div>
          )}
        </div>

        {/* Supported File Types */}
        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-2">Supported formats:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" /> PDF, DOCX, TXT
            </span>
            <span className="flex items-center gap-1">
              <Image className="w-4 h-4" /> Images (PNG, JPG)
            </span>
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4" /> Excel, CSV
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" /> Markdown
            </span>
          </div>
        </div>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-semibold mb-4">Processing Status</h4>
          <div className="space-y-4">
            {uploadedFiles.map((uploadedFile) => (
              <FileProcessingCard
                key={uploadedFile.id}
                uploadedFile={uploadedFile}
                onConfirm={confirmAndGenerateProgressNote}
                onRemove={removeFile}
                getFileIcon={getFileIcon}
                getStatusIcon={getStatusIcon}
                getStatusText={getStatusText}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface FileProcessingCardProps {
  uploadedFile: UploadedFile;
  onConfirm: (file: UploadedFile, clientName?: string, sessionDate?: string) => void;
  onRemove: (fileId: string) => void;
  getFileIcon: (file: File) => React.ReactNode;
  getStatusIcon: (status: UploadedFile['status']) => React.ReactNode;
  getStatusText: (status: UploadedFile['status']) => string;
}

function FileProcessingCard({ 
  uploadedFile, 
  onConfirm, 
  onRemove, 
  getFileIcon, 
  getStatusIcon, 
  getStatusText 
}: FileProcessingCardProps) {
  const [editingClientName, setEditingClientName] = useState('');
  const [editingSessionDate, setEditingSessionDate] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmClick = () => {
    if (uploadedFile.status === 'awaiting-confirmation') {
      setEditingClientName(uploadedFile.extractedData?.detectedClientName || '');

      // Format detected date for HTML date input or use today's date
      let formattedDate = '';
      if (uploadedFile.extractedData?.detectedSessionDate) {
        // Try to parse various date formats and convert to YYYY-MM-DD
        const detectedDate = new Date(uploadedFile.extractedData.detectedSessionDate);
        if (!isNaN(detectedDate.getTime())) {
          formattedDate = detectedDate.toISOString().split('T')[0];
        }
      }

      // Default to today's date if no valid date detected
      if (!formattedDate) {
        formattedDate = new Date().toISOString().split('T')[0];
      }

      setEditingSessionDate(formattedDate);
      setShowConfirmation(true);
    }
  };

  const handleSubmitConfirmation = () => {
    onConfirm(uploadedFile, editingClientName, editingSessionDate);
    setShowConfirmation(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getFileIcon(uploadedFile.file)}
          <div className="flex-1">
            <p className="font-medium text-sm">{uploadedFile.file.name}</p>
            <p className="text-xs text-gray-500">
              {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(uploadedFile.status)}
          <span className="text-sm text-gray-600">
            {getStatusText(uploadedFile.status)}
          </span>
        </div>
      </div>

      {uploadedFile.status === 'processing' && (
        <Progress value={uploadedFile.progress} className="w-full" />
      )}

      {uploadedFile.status === 'error' && uploadedFile.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadedFile.error}</AlertDescription>
        </Alert>
      )}

      {uploadedFile.status === 'awaiting-confirmation' && uploadedFile.extractedData && (
        <div className="space-y-3 bg-orange-50 p-3 rounded-md">
          <p className="text-sm font-medium text-orange-800">AI Extracted Information:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <strong>Client Name:</strong> {uploadedFile.extractedData.detectedClientName || 'Not detected'}
            </div>
            <div>
              <strong>Session Date:</strong> {uploadedFile.extractedData.detectedSessionDate || 'Not detected'}
            </div>
          </div>
          <div className="text-sm">
            <strong>Content Preview:</strong>
            <p className="text-gray-600 mt-1 line-clamp-3">
              {uploadedFile.extractedData.extractedText}
            </p>
          </div>

          {!showConfirmation ? (
            <div className="flex gap-2">
              <Button onClick={handleConfirmClick} size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Confirm & Generate Progress Note
              </Button>
              <Button onClick={() => onRemove(uploadedFile.id)} variant="outline" size="sm">
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium">Confirm or edit the extracted information:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Client Name</label>
                  <Input
                    value={editingClientName}
                    onChange={(e) => setEditingClientName(e.target.value)}
                    placeholder="Enter client name"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Session Date</label>
                  <Input
                    type="date"
                    value={editingSessionDate}
                    onChange={(e) => setEditingSessionDate(e.target.value)}
                    size="sm"
                    max={new Date().toISOString().split('T')[0]} // Don't allow future dates
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Defaults to today if not detected from document
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitConfirmation} size="sm">
                  Generate Progress Note
                </Button>
                <Button onClick={() => setShowConfirmation(false)} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadedFile.status === 'completed' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Progress note successfully generated and saved to your records.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}