import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  extractedData?: {
    clientName?: string;
    sessionDate?: string;
    content: string;
    suggestedClient?: string;
  };
}

interface DocumentUploadZoneProps {
  onProgressNoteGenerated?: (progressNote: any) => void;
}

export function DocumentUploadZone({ onProgressNoteGenerated }: DocumentUploadZoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get clients for selection
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  const processDocumentMutation = useMutation({
    mutationFn: async ({ file, clientId, sessionDate }: { file: File; clientId: string; sessionDate: string }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('clientId', clientId);
      formData.append('sessionDate', sessionDate);

      const response = await fetch('/api/documents/process-clinical', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      setUploadedFiles(prev => prev.map(f => 
        f.file === variables.file 
          ? { ...f, status: 'completed', progress: 100, extractedData: data }
          : f
      ));
      
      if (onProgressNoteGenerated) {
        onProgressNoteGenerated(data.progressNote);
      }
      
      toast({
        title: "Document processed successfully",
        description: "Progress note has been generated and saved.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['progress-notes'] });
    },
    onError: (error, variables) => {
      setUploadedFiles(prev => prev.map(f => 
        f.file === variables.file 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
      
      toast({
        title: "Error processing document",
        description: error.message,
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
    if (!selectedClientId || !sessionDate) {
      toast({
        title: "Missing information",
        description: "Please select a client and session date before processing documents.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFiles(prev => prev.map(f => 
      f.id === uploadedFile.id 
        ? { ...f, status: 'processing', progress: 10 }
        : f
    ));

    try {
      await processDocumentMutation.mutateAsync({
        file: uploadedFile.file,
        clientId: selectedClientId,
        sessionDate: sessionDate,
      });
    } catch (error) {
      // Error handling is done in mutation
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Clinical Document Processing</h3>
        
        {/* Client and Date Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Select Client</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose client..." />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client: Client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Session Date</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-therapy-primary"
            />
          </div>
        </div>

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
                Supports PDF, DOCX, images, transcripts, CSV/Excel files
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
          <h4 className="text-lg font-semibold mb-4">Processing Queue</h4>
          <div className="space-y-4">
            {uploadedFiles.map((uploadedFile) => (
              <div key={uploadedFile.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(uploadedFile.file)}
                    <div>
                      <p className="font-medium">{uploadedFile.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {uploadedFile.status === 'pending' && (
                      <Button
                        onClick={() => processFile(uploadedFile)}
                        disabled={!selectedClientId || !sessionDate}
                        size="sm"
                      >
                        Process
                      </Button>
                    )}
                    
                    {uploadedFile.status === 'processing' && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Processing...</span>
                      </div>
                    )}
                    
                    {uploadedFile.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    
                    {uploadedFile.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadedFile.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                
                {uploadedFile.status === 'processing' && uploadedFile.progress > 0 && (
                  <Progress value={uploadedFile.progress} className="mb-2" />
                )}
                
                {uploadedFile.status === 'error' && uploadedFile.error && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadedFile.error}</AlertDescription>
                  </Alert>
                )}
                
                {uploadedFile.status === 'completed' && uploadedFile.extractedData && (
                  <div className="mt-2 p-3 bg-green-50 rounded-md">
                    <p className="text-sm font-medium text-green-800">
                      Progress note generated successfully!
                    </p>
                    {uploadedFile.extractedData.clientName && (
                      <p className="text-sm text-green-700">
                        Detected client: {uploadedFile.extractedData.clientName}
                      </p>
                    )}
                    {uploadedFile.extractedData.sessionDate && (
                      <p className="text-sm text-green-700">
                        Detected date: {uploadedFile.extractedData.sessionDate}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}