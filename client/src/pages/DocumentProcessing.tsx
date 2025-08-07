import { useState } from 'react';
import { ComprehensiveDocumentUploader } from '@/components/ComprehensiveDocumentUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, Users, Calendar, Sparkles, TrendingUp } from 'lucide-react';

export default function DocumentProcessing() {
  const [processingResults, setProcessingResults] = useState<any[]>([]);
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // Default therapist ID

  const handleProcessingComplete = (result: any) => {
    setProcessingResults(prev => [result, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Document Processing
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your comprehensive progress notes into structured clinical data with intelligent 
            client matching and automated session parsing.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Smart Parsing</h3>
              <p className="text-sm text-muted-foreground">
                AI extracts client names, dates, and session content from documents
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Client Matching</h3>
              <p className="text-sm text-muted-foreground">
                Automatically matches extracted clients with your database
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Session Sync</h3>
              <p className="text-sm text-muted-foreground">
                Creates structured progress notes with SOAP format
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold mb-2">AI Enhancement</h3>
              <p className="text-sm text-muted-foreground">
                Enhances notes with insights, tags, and clinical analysis
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" data-testid="tab-upload">Upload Document</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Processing History</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <ComprehensiveDocumentUploader 
              therapistId={therapistId}
              onComplete={handleProcessingComplete}
            />

            {/* Quick Guide */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-lg">Quick Start Guide</CardTitle>
                <CardDescription>Get the most out of your document processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                      1
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Prepare Your Document</div>
                      <div className="text-sm text-muted-foreground">
                        Ensure your .docx file contains client names and session dates. 
                        The AI works best with structured content.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-sm font-medium text-green-600 dark:text-green-400">
                      2
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Upload & Process</div>
                      <div className="text-sm text-muted-foreground">
                        Drag and drop your document or click to select. 
                        The AI will automatically parse and match clients.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm font-medium text-purple-600 dark:text-purple-400">
                      3
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Review & Sync</div>
                      <div className="text-sm text-muted-foreground">
                        Review the processing results and access your new progress notes 
                        in each client's session history.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-700 dark:text-blue-300">Pro Tip</div>
                      <div className="text-blue-600 dark:text-blue-400">
                        Make sure your clients already exist in your database for the best matching results. 
                        Unmatched clients will be reported for you to review.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {processingResults.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Processing History</h2>
                  <Badge variant="secondary">{processingResults.length} processed</Badge>
                </div>

                {processingResults.map((result, index) => (
                  <Card key={index} className="w-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Processing Session #{processingResults.length - index}
                        </CardTitle>
                        <Badge variant="outline">
                          {new Date().toLocaleDateString()}
                        </Badge>
                      </div>
                      <CardDescription>
                        {result.message}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {result.totalClients}
                          </div>
                          <div className="text-xs text-muted-foreground">Clients</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="text-xl font-bold text-green-600 dark:text-green-400">
                            {result.totalSessions}
                          </div>
                          <div className="text-xs text-muted-foreground">Sessions</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                            {result.successfulMatches}
                          </div>
                          <div className="text-xs text-muted-foreground">Matched</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                            {result.createdProgressNotes}
                          </div>
                          <div className="text-xs text-muted-foreground">Notes Created</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Processing History</h3>
                  <p className="text-muted-foreground mb-4">
                    Process your first document to see the history here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}