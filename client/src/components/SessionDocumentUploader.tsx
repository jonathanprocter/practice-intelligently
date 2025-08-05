import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SessionDocumentUploaderProps {
  therapistId: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  results?: {
    sessionsCreated: number;
    documentsStored: number;
    clientsMatched: number;
    errors: string[];
  };
  error?: string;
  details?: string;
}

export function SessionDocumentUploader({ therapistId }: SessionDocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
      'application/pdf' // .pdf
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a DOCX, DOC, TXT, or PDF file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (15MB limit)
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 15MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('therapistId', therapistId);

      const response = await fetch('/api/sessions/upload-document', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json() as UploadResult;

      if (response.ok && result.success) {
        setUploadResult(result);
        toast({
          title: "Document processed successfully",
          description: `Created ${result.results?.sessionsCreated || 0} session notes and matched ${result.results?.clientsMatched || 0} clients.`,
        });
      } else {
        setUploadResult(result);
        toast({
          title: "Upload failed",
          description: result.error || result.details || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      setUploadResult({
        success: false,
        message: 'Upload failed',
        error: errorMessage
      });
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Session Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Upload session documents containing multiple client sessions in SOAP format. 
          Supported formats: DOCX, DOC, TXT, PDF (up to 15MB).
        </div>

        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm">
              <label htmlFor="session-document-upload" className="cursor-pointer">
                <Button 
                  variant="outline" 
                  disabled={isUploading}
                  asChild
                  data-testid="button-upload-session-document"
                >
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Select Session Document
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <input
                id="session-document-upload"
                type="file"
                accept=".docx,.doc,.txt,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
                data-testid="input-session-document"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              DOCX, DOC, TXT, or PDF files up to 15MB
            </div>
          </div>
        </div>

        {uploadResult && (
          <div className={`p-4 rounded-lg border ${
            uploadResult.success 
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-2">
              {uploadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <div className="font-medium">
                  {uploadResult.message}
                </div>
                
                {uploadResult.success && uploadResult.results && (
                  <div className="text-sm space-y-1" data-testid="upload-results">
                    <div>✅ Sessions created: {uploadResult.results.sessionsCreated}</div>
                    <div>📁 Documents stored: {uploadResult.results.documentsStored}</div>
                    <div>👥 Clients matched: {uploadResult.results.clientsMatched}</div>
                    {uploadResult.results.errors.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium text-orange-600">Warnings:</div>
                        {uploadResult.results.errors.map((error, index) => (
                          <div key={index} className="text-xs text-orange-600">
                            • {error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!uploadResult.success && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {uploadResult.error || uploadResult.details}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div><strong>Expected format:</strong></div>
          <div>• Client name at the beginning</div>
          <div>• Session dates in format "Session: YYYY-MM-DD"</div>
          <div>• SOAP sections: Subjective, Objective, Assessment, Plan</div>
          <div>• Optional supplemental analyses sections</div>
        </div>
      </CardContent>
    </Card>
  );
}