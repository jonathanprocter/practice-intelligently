import { useState, useRef } from 'react';
import { Upload, FileText, Users, Calendar, Brain, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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

interface ComprehensiveDocumentUploaderProps {
  therapistId: string;
  onComplete?: (result: ProcessingResult) => void;
}

export function ComprehensiveDocumentUploader({ 
  therapistId, 
  onComplete 
}: ComprehensiveDocumentUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [showResults, setShowResults] = useState(false);
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
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .docx file containing comprehensive progress notes.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingStage('Uploading document...');
    setResult(null);
    setShowResults(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
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
          setProcessingStage(currentStage.stage);
          setProgress(currentStage.percent);
          currentStageIndex++;
        }
      }, 1500);

      const response = await fetch('/api/documents/parse-comprehensive-progress-notes', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json() as ProcessingResult;

      clearInterval(progressInterval);
      setProgress(100);
      setProcessingStage('Complete!');

      if (result.success) {
        setResult(result);
        setShowResults(true);
        onComplete?.(result);
        
        toast({
          title: "Processing Complete!",
          description: `Successfully processed ${result.totalSessions} sessions for ${result.successfulMatches} clients.`,
        });
      } else {
        throw new Error(result.result?.errors?.[0] || 'Processing failed');
      }

    } catch (error) {
      console.error('Error processing comprehensive document:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUploader = () => {
    setResult(null);
    setShowResults(false);
    setProgress(0);
    setProcessingStage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showResults && result) {
    return (
      <Card className="w-full max-w-4xl mx-auto" data-testid="results-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <CardTitle>Processing Complete</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetUploader}
              data-testid="button-reset"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Your comprehensive progress notes have been successfully processed and synced to your client database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-clients">
                {result.totalClients}
              </div>
              <div className="text-sm text-muted-foreground">Clients Found</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-sessions">
                {result.totalSessions}
              </div>
              <div className="text-sm text-muted-foreground">Sessions Extracted</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="stat-matches">
                {result.successfulMatches}
              </div>
              <div className="text-sm text-muted-foreground">Clients Matched</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="stat-notes">
                {result.createdProgressNotes}
              </div>
              <div className="text-sm text-muted-foreground">Progress Notes Created</div>
            </div>
          </div>

          {/* Matched Clients */}
          {result.result.processingDetails.matchedClients.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Successfully Matched Clients
              </h4>
              <div className="space-y-2">
                {result.result.processingDetails.matchedClients.map((match, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg"
                    data-testid={`matched-client-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{match.extractedClient.name}</span>
                      <span className="text-sm text-muted-foreground">→</span>
                      <span className="text-sm">{match.matchedClientName}</span>
                    </div>
                    <Badge variant="secondary">
                      {match.sessionsProcessed} sessions
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unmatched Clients */}
          {result.result.unmatchedClients.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">Unmatched Clients:</div>
                  <div className="space-y-1">
                    {result.result.unmatchedClients.map((name, index) => (
                      <div key={index} className="text-sm" data-testid={`unmatched-client-${index}`}>
                        • {name}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    These clients weren't found in your database. You may need to create their records first.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Errors */}
          {result.result.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">Processing Errors:</div>
                  {result.result.errors.map((error, index) => (
                    <div key={index} className="text-sm" data-testid={`error-${index}`}>
                      • {error}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={resetUploader} variant="outline" data-testid="button-upload-another">
              Upload Another Document
            </Button>
            <Button 
              onClick={() => window.location.href = '/progress-notes'}
              data-testid="button-view-notes"
            >
              View Progress Notes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="upload-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI-Powered Document Processing
        </CardTitle>
        <CardDescription>
          Upload comprehensive progress notes documents (.docx) to automatically extract client information, 
          session data, and sync to your database with intelligent client matching.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4" data-testid="processing-container">
            <div className="text-center">
              <div className="animate-spin mx-auto mb-4">
                <Brain className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">Processing Document</h3>
              <p className="text-sm text-muted-foreground mb-4" data-testid="processing-stage">
                {processingStage}
              </p>
            </div>
            <Progress value={progress} className="w-full" data-testid="progress-bar" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <FileText className="h-5 w-5 mx-auto text-blue-500" />
                <div className="text-xs text-muted-foreground">Extract Content</div>
              </div>
              <div className="space-y-1">
                <Users className="h-5 w-5 mx-auto text-green-500" />
                <div className="text-xs text-muted-foreground">Match Clients</div>
              </div>
              <div className="space-y-1">
                <Calendar className="h-5 w-5 mx-auto text-purple-500" />
                <div className="text-xs text-muted-foreground">Sync Sessions</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
                Drop your comprehensive progress notes here
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supports .docx files with multiple clients and sessions
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-file"
                >
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="file-input"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">What this tool does:</h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Intelligent Parsing</div>
                    <div className="text-muted-foreground">
                      Extracts client names, session dates, and clinical content using AI
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Users className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Smart Client Matching</div>
                    <div className="text-muted-foreground">
                      Automatically matches extracted clients with your existing database
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Session Sync</div>
                    <div className="text-muted-foreground">
                      Creates detailed progress notes with SOAP structure and AI insights
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}