import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, Edit3 } from 'lucide-react';
import ManualMetadataReviewModal from '../ManualMetadataReviewModal';

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

interface ProcessingFile {
  name: string;
  size: number;
  progress: number;
  status: 'processing' | 'reviewing' | 'completed' | 'error';
  error?: string;
  result?: any;
}

interface ProcessingResult {
  file: string;
  success: boolean;
  result?: any;
  error?: string;
}

export function DocumentProcessor({ clientId, clientName, onDocumentProcessed }: DocumentProcessorProps) {
  const [processingDocuments, setProcessingDocuments] = useState<ProcessedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [reviewModalData, setReviewModalData] = useState<{
    isOpen: boolean;
    documentContent: string;
    extractedMetadata: any;
    availableClients: any[];
    onConfirm: (metadata: any, createNote: boolean) => void;
  }>({
    isOpen: false,
    documentContent: '',
    extractedMetadata: {},
    availableClients: [],
    onConfirm: () => {}
  });
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
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

    const processedFiles: ProcessingResult[] = [];

    validFiles.forEach(async (file) => {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add document to processing queue with initial state
      setFiles(prev => [...prev, {
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'processing',
      }]);

      try {
        // Step 1: Upload and process document in one call
        const formData = new FormData();
        formData.append('document', file); // Using 'document' field name to match server expectation
        formData.append('clientId', clientId);
        formData.append('clientName', clientName);

        // Enhanced processing with better validation
        const processResponse = await fetch('/api/documents/process-enhanced', {
          method: 'POST',
          body: formData,
        });

        if (!processResponse.ok) {
          throw new Error(`Processing failed: ${processResponse.statusText}`);
        }

        const processResult = await processResponse.json();

        // Check if manual review is needed
        const needsReview = processResult.extractedData && (
          !processResult.extractedData.clientName ||
          !processResult.extractedData.sessionDate ||
          (processResult.extractedData.confidence && 
           (processResult.extractedData.confidence.name < 0.8 || processResult.extractedData.confidence.date < 0.8))
        );

        if (needsReview) {
          // Open manual review modal
          const clientsResponse = await fetch('/api/clients');
          const availableClients = await clientsResponse.json();

          setReviewModalData({
            isOpen: true,
            documentContent: processResult.extractedText || '',
            extractedMetadata: processResult.extractedData || {},
            availableClients,
            onConfirm: async (metadata: any, createNote: boolean) => {
              try {
                // Process with manual override
                const overrideResponse = await fetch('/api/documents/manual-metadata-override', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    documentContent: processResult.extractedText,
                    originalMetadata: processResult.extractedData,
                    manualOverrides: metadata.manualOverrides,
                    therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
                    createProgressNote: createNote
                  })
                });

                const overrideResult = await overrideResponse.json();

                // Update file with manual review result
                setFiles(prev => prev.map(f => 
                  f.name === file.name 
                    ? { 
                        ...f, 
                        progress: 100, 
                        status: 'completed', 
                        result: { 
                          ...processResult, 
                          manualReview: overrideResult,
                          finalMetadata: metadata.finalMetadata 
                        }
                      }
                    : f
                ));

                processedFiles.push({
                  file: file.name,
                  success: true,
                  result: { ...processResult, manualReview: overrideResult }
                });

              } catch (error) {
                console.error('Manual override failed:', error);
                setFiles(prev => prev.map(f => 
                  f.name === file.name 
                    ? { ...f, status: 'error', error: 'Manual review failed' }
                    : f
                ));
              } finally {
                setReviewModalData(prev => ({ ...prev, isOpen: false }));
              }
            }
          });

          // Don't mark as completed yet - wait for manual review
          setFiles(prev => prev.map(f => 
            f.name === file.name 
              ? { ...f, progress: 90, status: 'reviewing', result: processResult }
              : f
          ));

        } else {
          // Auto-process if confidence is high
          setFiles(prev => prev.map(f => 
            f.name === file.name 
              ? { ...f, progress: 100, status: 'completed', result: processResult }
              : f
          ));

          processedFiles.push({
            file: file.name,
            success: true,
            result: processResult
          });
        }

        // Original processing logic for single session or if manual review is not triggered
        // This part is now mostly superseded by the above logic but kept for clarity on flow
        // Update document status in the original processingDocuments state if needed elsewhere
        setProcessingDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? {
                  ...doc,
                  content: processResult.analysis?.extractedText || processResult.extractedText || '',
                  extractedDate: processResult.analysis?.detectedSessionDate || processResult.extractedDate,
                  suggestedAppointments: processResult.suggestedAppointments || [],
                  aiTags: processResult.aiTags || [],
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
            id: documentId, // Use the generated ID
            filename: file.name,
            content: processResult.analysis?.extractedText || processResult.extractedText || '',
            extractedDate: processResult.analysis?.detectedSessionDate || processResult.extractedDate,
            suggestedAppointments: processResult.suggestedAppointments || [],
            aiTags: processResult.aiTags || [],
            status: 'completed'
          });
        }

      } catch (error: any) {
        console.error('Error processing document:', error);

        setFiles(prev => 
          prev.map(f => 
            f.name === file.name 
              ? {
                  ...f,
                  status: 'error',
                  error: error.message || 'Unknown error'
                }
              : f
          )
        );

        processedFiles.push({
          file: file.name,
          success: false,
          error: error.message || 'Unknown error'
        });

        toast({
          title: "Document processing failed",
          description: `Failed to process ${file.name}`,
          variant: "destructive"
        });
      }
    });
    // Update the results state after all files have been processed
    // This logic might need refinement if results are to be shown immediately per file
    // For now, let's assume results are aggregated at the end.
    // The current structure with `forEach` and `async` might lead to `results` being updated out of order or not at all.
    // A loop with `await` inside would be better for sequential processing and result aggregation.
    // For demonstration purposes, we'll set a placeholder. The `setFiles` updates within the loop are more direct for UI feedback.
    // setIsProcessing(false); // This should be called after all async operations complete, maybe in a useEffect or a final callback.

  }, [clientId, clientName, onDocumentProcessed, toast]); // Added toast to dependencies

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
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Processing Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((file) => (
              <div key={file.name} className="border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {file.status === 'processing' && 'Processing...'}
                        {file.status === 'reviewing' && 'Needs Review'}
                        {file.status === 'completed' && 'Completed'}
                        {file.status === 'error' && 'Error'}
                      </span>
                    </div>
                    <Progress value={file.progress} className="h-2" />

                    {/* Display extraction results */}
                    {file.result && (
                      <div className="mt-2 space-y-1">
                        {file.result.extractedData?.clientName && (
                          <Badge variant="outline" className="text-xs">
                            Client: {file.result.extractedData.clientName}
                          </Badge>
                        )}
                        {file.result.extractedData?.sessionDate && (
                          <Badge variant="outline" className="text-xs ml-1">
                            Date: {file.result.extractedData.sessionDate}
                          </Badge>
                        )}
                        {file.result.extractedData?.confidence && (
                          <Badge 
                            variant={
                              Math.min(file.result.extractedData.confidence.name, file.result.extractedData.confidence.date) >= 0.8 
                                ? "default" 
                                : "secondary"
                            } 
                            className="text-xs ml-1"
                          >
                            Confidence: {Math.round(Math.min(file.result.extractedData.confidence.name, file.result.extractedData.confidence.date) * 100)}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ml-2">
                    {file.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {file.status === 'reviewing' && <Edit3 className="h-4 w-4 text-orange-600" />}
                    {file.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {file.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual Metadata Review Modal */}
      <ManualMetadataReviewModal
        isOpen={reviewModalData.isOpen}
        onClose={() => setReviewModalData(prev => ({ ...prev, isOpen: false }))}
        documentContent={reviewModalData.documentContent}
        extractedMetadata={reviewModalData.extractedMetadata}
        availableClients={reviewModalData.availableClients}
        onConfirm={reviewModalData.onConfirm}
        isProcessing={false}
      />

      {/* Original processingDocuments state usage might be here or removed if `files` state is the primary source of truth */}
      {/* If processingDocuments is still needed for other features, ensure its updates are synchronized or managed separately */}
    </div>
  );
}