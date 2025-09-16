import { useState } from 'react';
import { BatchDocumentUploader } from '@/components/documents/BatchDocumentUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Settings, Info } from 'lucide-react';

export default function DocumentBatchTest() {
  const [uploadResults, setUploadResults] = useState<any>(null);
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // Example therapist ID
  
  const handleUploadComplete = (results: any) => {
    setUploadResults(results);
    console.log('Upload completed:', results);
  };

  return (
    <div className="container mx-auto p-6" data-testid="document-batch-test-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Batch Processing Test</h1>
        <p className="text-gray-600">
          Test the enhanced document processing system with batch uploads, large files, and various file types.
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Batch Upload
          </TabsTrigger>
          <TabsTrigger value="features">
            <Settings className="w-4 h-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="info">
            <Info className="w-4 h-4 mr-2" />
            Information
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <BatchDocumentUploader
            therapistId={therapistId}
            onComplete={handleUploadComplete}
          />
          
          {uploadResults && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Results</CardTitle>
                <CardDescription>
                  Processing completed for {uploadResults.processed} documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Processed:</span>
                    <span className="font-medium text-green-600">{uploadResults.processed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-medium text-red-600">{uploadResults.failed}</span>
                  </div>
                  {uploadResults.totalTime && (
                    <div className="flex justify-between">
                      <span>Total Time:</span>
                      <span className="font-medium">{Math.round(uploadResults.totalTime / 1000)}s</span>
                    </div>
                  )}
                </div>
                
                {uploadResults.errors && uploadResults.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Processing Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2">
                        {uploadResults.errors.map((error: any, index: number) => (
                          <li key={index}>
                            {error.fileName}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Features</CardTitle>
              <CardDescription>
                New capabilities in the document processing system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">File Type Support</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ PDF documents (with text extraction)</li>
                    <li>✓ Word documents (.docx, .doc)</li>
                    <li>✓ Images with OCR (.png, .jpg, .jpeg)</li>
                    <li>✓ Audio transcription (.mp3, .wav, .m4a)</li>
                    <li>✓ Excel/CSV for batch imports</li>
                    <li>✓ ZIP archives for bulk upload</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Performance Features</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ Streaming uploads (up to 50MB)</li>
                    <li>✓ Chunked processing for large files</li>
                    <li>✓ Parallel processing (5 concurrent)</li>
                    <li>✓ File compression & deduplication</li>
                    <li>✓ WebSocket progress tracking</li>
                    <li>✓ Automatic retry on failure</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Processing Capabilities</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ AI-powered content extraction</li>
                    <li>✓ Automatic categorization</li>
                    <li>✓ Clinical keyword detection</li>
                    <li>✓ Sensitivity level assessment</li>
                    <li>✓ Multi-session document detection</li>
                    <li>✓ Automatic metadata extraction</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">User Experience</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ Drag & drop interface</li>
                    <li>✓ Real-time progress updates</li>
                    <li>✓ Pause/resume capability</li>
                    <li>✓ Individual file status tracking</li>
                    <li>✓ Batch operation summary</li>
                    <li>✓ Error recovery options</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How to Test</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>1. <strong>Single File:</strong> Click the upload area and select a single document</p>
                  <p>2. <strong>Multiple Files:</strong> Select multiple files (up to 20) at once</p>
                  <p>3. <strong>Drag & Drop:</strong> Drag files directly onto the upload area</p>
                  <p>4. <strong>ZIP Archive:</strong> Upload a ZIP file containing multiple documents</p>
                  <p>5. <strong>Large Files:</strong> Test with files up to 50MB</p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-semibold">Test Scenarios</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Upload multiple session notes at once</li>
                  <li>• Process scanned documents (images) with OCR</li>
                  <li>• Transcribe audio recordings of therapy sessions</li>
                  <li>• Import client data from Excel/CSV files</li>
                  <li>• Extract content from large PDF reports</li>
                  <li>• Process a ZIP archive of mixed document types</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Performance Benchmarks</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 10MB PDF: ~5-10 seconds</li>
                  <li>• 5 documents batch: ~15-20 seconds</li>
                  <li>• Audio transcription (10min): ~30-45 seconds</li>
                  <li>• Image OCR: ~3-5 seconds per page</li>
                  <li>• CSV import (1000 rows): ~5-10 seconds</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>Available batch processing endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div className="p-2 bg-gray-100 rounded">
                  POST /api/documents/batch-upload
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  POST /api/documents/import-zip
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  POST /api/documents/import-clients
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  POST /api/documents/transcribe-audio
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  POST /api/documents/analyze-batch
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  GET /api/documents/processing-status/:jobId
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  GET /api/documents/active-jobs
                </div>
                <div className="p-2 bg-gray-100 rounded">
                  GET /api/documents/statistics
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}