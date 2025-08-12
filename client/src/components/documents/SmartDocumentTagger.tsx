import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Tag, Brain, Shield, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DocumentTaggingResult {
  category: string;
  subcategory: string;
  aiTags: Array<{ 
    tag: string; 
    confidence: number; 
    type: 'clinical' | 'administrative' | 'therapeutic' | 'assessment' 
  }>;
  clinicalKeywords: string[];
  contentSummary: string;
  confidenceScore: number;
  sensitivityLevel: 'low' | 'standard' | 'high' | 'confidential';
}

interface AnalyzedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  analysis: DocumentTaggingResult;
}

interface SmartDocumentTaggerProps {
  therapistId: string;
  clientId?: string;
  onDocumentAnalyzed?: (document: AnalyzedDocument) => void;
}

const SmartDocumentTagger: React.FC<SmartDocumentTaggerProps> = ({
  therapistId,
  clientId,
  onDocumentAnalyzed
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedDocuments, setAnalyzedDocuments] = useState<AnalyzedDocument[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const results: AnalyzedDocument[] = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        console.log(`🏷️ Analyzing document ${i + 1}/${acceptedFiles.length}: ${file.name}`);

        // Update progress
        setAnalysisProgress(Math.round(((i) / acceptedFiles.length) * 100));

        const formData = new FormData();
        formData.append('document', file);
        formData.append('therapistId', therapistId);
        if (clientId) {
          formData.append('clientId', clientId);
        }

        try {
          const response = await fetch('/api/documents/analyze-and-tag', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
          }

          const result = await response.json();

          if (result.success) {
            const analyzedDoc: AnalyzedDocument = {
              id: result.document.id,
              fileName: result.document.fileName,
              fileType: result.document.fileType,
              fileSize: result.document.fileSize,
              analysis: result.analysis
            };

            results.push(analyzedDoc);
            console.log(`✅ Document analyzed: ${result.analysis.category}/${result.analysis.subcategory}`);

            // Show success toast
            toast({
              title: "Document Analyzed",
              description: `${file.name} categorized as ${result.analysis.category}`,
            });

            // Call callback if provided
            if (onDocumentAnalyzed) {
              onDocumentAnalyzed(analyzedDoc);
            }

          } else {
            console.error(`❌ Failed to analyze ${file.name}:`, result.error);
            toast({
              title: "Analysis Failed",
              description: `Failed to analyze ${file.name}: ${result.error}`,
              variant: "destructive"
            });
          }

        } catch (error) {
          console.error(`💥 Error analyzing ${file.name}:`, error);
          toast({
            title: "Analysis Error",
            description: `Error analyzing ${file.name}. Please try again.`,
            variant: "destructive"
          });
        }
      }

      setAnalyzedDocuments(prev => [...prev, ...results]);
      setAnalysisProgress(100);

      if (results.length > 0) {
        toast({
          title: "Analysis Complete",
          description: `Successfully analyzed ${results.length} document${results.length !== 1 ? 's' : ''}`,
        });
      }

    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 1000);
    }
  }, [therapistId, clientId, onDocumentAnalyzed, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isAnalyzing,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  const getSensitivityColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'standard': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'confidential': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTagTypeColor = (type: string) => {
    switch (type) {
      case 'clinical': return 'bg-purple-100 text-purple-800';
      case 'therapeutic': return 'bg-cyan-100 text-cyan-800';
      case 'assessment': return 'bg-indigo-100 text-indigo-800';
      case 'administrative': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6" data-testid="smart-document-tagger">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Smart Document Analysis & Tagging
          </CardTitle>
          <CardDescription>
            Upload clinical documents for AI-powered categorization, tagging, and sensitivity analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
              }
              ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            data-testid="document-dropzone"
          >
            <input {...getInputProps()} />
            
            {isAnalyzing ? (
              <div className="space-y-4">
                <Zap className="w-12 h-12 mx-auto text-purple-600 animate-pulse" />
                <div>
                  <p className="text-lg font-medium text-gray-900">Analyzing Documents...</p>
                  <p className="text-sm text-gray-500">AI is processing your files for smart categorization</p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">{analysisProgress}% Complete</p>
                </div>
              </div>
            ) : isDragActive ? (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-purple-600" />
                <div>
                  <p className="text-lg font-medium text-gray-900">Drop files here</p>
                  <p className="text-sm text-gray-500">Release to start AI analysis</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FileText className="w-12 h-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drag & drop clinical documents or <span className="text-purple-600">browse files</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports PDF, Word, Text, Images, Excel, CSV files
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* File Type Support Info */}
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>AI Analysis Features:</strong> Automatic categorization, clinical keyword extraction, 
              sensitivity level assessment, and therapeutic tag generation for comprehensive document management.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analyzedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-600" />
              Analysis Results ({analyzedDocuments.length})
            </CardTitle>
            <CardDescription>
              AI-powered document analysis and categorization results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyzedDocuments.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 space-y-3" data-testid={`analyzed-document-${doc.id}`}>
                  {/* Document Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.fileName}</h4>
                      <p className="text-sm text-gray-500">
                        {doc.fileType} • {Math.round(doc.fileSize / 1024)}KB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSensitivityColor(doc.analysis.sensitivityLevel)}>
                        <Shield className="w-3 h-3 mr-1" />
                        {doc.analysis.sensitivityLevel.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(doc.analysis.confidenceScore * 100)}% confidence
                      </Badge>
                    </div>
                  </div>

                  {/* Category & Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Category</p>
                      <p className="text-lg text-purple-600 font-medium">
                        {doc.analysis.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-sm text-gray-500">{doc.analysis.subcategory}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Summary</p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {doc.analysis.contentSummary}
                      </p>
                    </div>
                  </div>

                  {/* AI Tags */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">AI-Generated Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {doc.analysis.aiTags.slice(0, 8).map((tag, index) => (
                        <Badge 
                          key={index} 
                          className={getTagTypeColor(tag.type)}
                          data-testid={`ai-tag-${tag.tag}`}
                        >
                          {tag.tag} ({Math.round(tag.confidence * 100)}%)
                        </Badge>
                      ))}
                      {doc.analysis.aiTags.length > 8 && (
                        <Badge variant="outline">
                          +{doc.analysis.aiTags.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Clinical Keywords */}
                  {doc.analysis.clinicalKeywords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Clinical Keywords</p>
                      <div className="flex flex-wrap gap-1">
                        {doc.analysis.clinicalKeywords.slice(0, 10).map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {doc.analysis.clinicalKeywords.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{doc.analysis.clinicalKeywords.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartDocumentTagger;