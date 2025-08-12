import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Calendar, Brain, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ProcessedDocument {
  id: string;
  filename: string;
  content: string;
  extractedDate?: string;
  suggestedAppointments: Array<{
    id: string;
    title: string;
    date: string;
    confidence: number;
  }>;
  aiTags: string[];
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

interface DocumentProcessorProps {
  clientId: string;
  clientName: string;
  onDocumentProcessed?: (document: ProcessedDocument) => void;
}

export function DocumentProcessor({ clientId, clientName, onDocumentProcessed }: DocumentProcessorProps) {
  const [processingDocuments, setProcessingDocuments] = useState<ProcessedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Define supported file types matching the backend
    const supportedTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/jpg', 
      'image/gif',
      'image/bmp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]);

    // Filter files by supported MIME types and extensions
    const validFiles = acceptedFiles.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      const supportedExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'xlsx', 'xls', 'csv'];
      
      return supportedTypes.has(file.type) || supportedExtensions.includes(extension || '');
    });
    
    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload supported document types: PDF, Word (DOC/DOCX), Text (TXT/MD), Images (PNG/JPG/GIF/BMP), or Spreadsheets (XLS/XLSX/CSV).",
        variant: "destructive"
      });
      return;
    }

    if (validFiles.length !== acceptedFiles.length) {
      toast({
        title: "Some files skipped",
        description: `${acceptedFiles.length - validFiles.length} unsupported files were skipped. Only processing ${validFiles.length} valid files.`,
        variant: "default"
      });
    }

    setIsProcessing(true);
    
    for (const file of validFiles) {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add document to processing queue
      const processingDoc: ProcessedDocument = {
        id: documentId,
        filename: file.name,
        content: '',
        suggestedAppointments: [],
        aiTags: [],
        status: 'processing'
      };
      
      setProcessingDocuments(prev => [...prev, processingDoc]);
      
      try {
        // Step 1: Upload and process document in one call
        const formData = new FormData();
        formData.append('document', file); // Using 'document' field name to match server expectation
        formData.append('clientId', clientId);
        formData.append('clientName', clientName);
        
        const processResponse = await fetch('/api/documents/upload-and-process', {
          method: 'POST',
          body: formData
        });
        
        if (!processResponse.ok) {
          const errorData = await processResponse.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || `Server error: ${processResponse.status}`);
        }
        
        const processedData = await processResponse.json();
        
        // Step 2: Generate and save progress note from processed content
        if (processedData.analysis?.extractedText) {
          try {
            // Add timeout to prevent hanging with improved error handling
            const controller = new AbortController();
            let timeoutId: NodeJS.Timeout | undefined;
            
            const progressNotePromise = fetch('/api/documents/generate-progress-note', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: processedData.analysis.extractedText,
                clientId: clientId,
                sessionDate: processedData.analysis.detectedSessionDate,
                detectedClientName: processedData.analysis.detectedClientName,
                therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'
              }),
              signal: controller.signal
            });

            // Create timeout that properly handles abort
            const timeoutPromise = new Promise<Response>((_, reject) => {
              timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('Progress note generation timed out after 45 seconds'));
              }, 45000); // Extended timeout to 45 seconds
            });

            const progressNoteResponse = await Promise.race([progressNotePromise, timeoutPromise]);
            if (timeoutId) clearTimeout(timeoutId);

            if (progressNoteResponse.ok) {
              const progressNoteData = await progressNoteResponse.json();
              console.log('Progress note created successfully:', progressNoteData);
            } else {
              console.warn('Failed to create progress note, but document processing succeeded');
            }
          } catch (error: any) {
            console.warn('Progress note generation timed out or failed:', error.message);
            // Continue with document processing even if progress note fails
          }
        }
        
        // Update document status
        setProcessingDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? {
                  ...doc,
                  content: processedData.analysis?.extractedText || processedData.extractedText || '',
                  extractedDate: processedData.analysis?.detectedSessionDate || processedData.extractedDate,
                  suggestedAppointments: processedData.suggestedAppointments || [],
                  aiTags: processedData.aiTags || [],
                  status: 'completed'
                }
              : doc
          )
        );
        
        toast({
          title: "Document processed and saved",
          description: `${file.name} has been analyzed and saved to the client chart.`
        });
        
        if (onDocumentProcessed) {
          onDocumentProcessed({
            ...processingDoc,
            content: processedData.analysis?.extractedText || processedData.extractedText || '',
            extractedDate: processedData.analysis?.detectedSessionDate || processedData.extractedDate,
            suggestedAppointments: processedData.suggestedAppointments || [],
            aiTags: processedData.aiTags || [],
            status: 'completed'
          });
        }
        
      } catch (error) {
        console.error('Error processing document:', error);
        
        setProcessingDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? {
                  ...doc,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unknown error'
                }
              : doc
          )
        );
        
        toast({
          title: "Document processing failed",
          description: `Failed to process ${file.name}`,
          variant: "destructive"
        });
      }
    }
    
    setIsProcessing(false);
  }, [clientId, clientName, onDocumentProcessed, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  const attachToAppointment = async (documentId: string, appointmentId: string) => {
    try {
      const document = processingDocuments.find(doc => doc.id === documentId);
      if (!document) return;
      
      const response = await fetch('/api/session-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId: appointmentId,
          clientId,
          therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c', // Default therapist
          content: document.content,
          aiTags: document.aiTags,
          source: 'document_upload',
          originalFilename: document.filename
        })
      });
      
      if (response.ok) {
        toast({
          title: "Document attached successfully",
          description: `${document.filename} has been attached to the appointment.`
        });
        
        // Remove from processing list
        setProcessingDocuments(prev => prev.filter(doc => doc.id !== documentId));
      } else {
        throw new Error('Failed to attach document');
      }
    } catch (error) {
      toast({
        title: "Failed to attach document",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const removeDocument = (documentId: string) => {
    setProcessingDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Upload & Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600 font-medium">Drop your documents here...</p>
            ) : (
              <div>
                <p className="text-gray-600 font-medium mb-2">
                  Drag & drop documents here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-1">
                  Supports: PDF, Word (DOC/DOCX), Text (TXT/MD), Images (PNG/JPG/GIF/BMP), Spreadsheets (XLS/XLSX/CSV)
                </p>
                <p className="text-sm text-gray-500">
                  AI will extract content, identify dates, and suggest appointment matches
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Queue */}
      {processingDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Processing Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {processingDocuments.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{doc.filename}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {doc.status === 'processing' && (
                        <>
                          <Progress value={50} className="w-32" />
                          <span className="text-sm text-gray-500">Processing...</span>
                        </>
                      )}
                      {doc.status === 'completed' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Completed</span>
                        </>
                      )}
                      {doc.status === 'error' && (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-600">Error: {doc.error}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(doc.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {doc.status === 'completed' && (
                  <div className="space-y-3">
                    {/* AI Tags */}
                    {doc.aiTags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">AI Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {doc.aiTags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted Date */}
                    {doc.extractedDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Extracted Date: <span className="font-normal">{doc.extractedDate}</span>
                        </p>
                      </div>
                    )}

                    {/* Suggested Appointments */}
                    {doc.suggestedAppointments.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Suggested Appointments:
                        </p>
                        <div className="space-y-2">
                          {doc.suggestedAppointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{appointment.title}</span>
                                <span className="text-xs text-gray-500">
                                  ({appointment.confidence}% match)
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => attachToAppointment(doc.id, appointment.id)}
                              >
                                Attach
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Preview */}
                    {doc.content && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Content Preview:</p>
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 max-h-32 overflow-y-auto">
                          {doc.content.substring(0, 200)}...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}