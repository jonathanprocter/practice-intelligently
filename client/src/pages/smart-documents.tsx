import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, BarChart3, Settings, Zap, Shield, Tag } from 'lucide-react';
import SmartDocumentTagger from '@/components/documents/SmartDocumentTagger';
import DocumentAnalyticsDashboard from '@/components/documents/DocumentAnalyticsDashboard';
import { useQuery } from '@tanstack/react-query';

const SmartDocumentsPage: React.FC = () => {
  const [analyzedDocuments, setAnalyzedDocuments] = useState<any[]>([]);
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // Default therapist ID

  // Fetch available categories for overview
  const { data: categoriesData } = useQuery({
    queryKey: ['document-categories'],
    queryFn: async () => {
      const response = await fetch('/api/documents/categories');
      return response.json();
    },
  });

  const categories = categoriesData?.categories || [];

  const handleDocumentAnalyzed = (document: any) => {
    setAnalyzedDocuments(prev => [document, ...prev]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="smart-documents-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            Smart Document Management
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            AI-powered document analysis, categorization, and management system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-100 text-purple-800 border-purple-300">
            <Zap className="w-3 h-3 mr-1" />
            AI-Enhanced
          </Badge>
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <Shield className="w-3 h-3 mr-1" />
            HIPAA Compliant
          </Badge>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Automatic document categorization using advanced language models with clinical expertise
            </p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1">
              <li>• Content analysis & summarization</li>
              <li>• Clinical keyword extraction</li>
              <li>• Therapeutic tag generation</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              Smart Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {categories.length} intelligent document categories with confidence scoring
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {categories.slice(0, 3).map((cat: any) => (
                <Badge key={cat.category} variant="secondary" className="text-xs">
                  {cat.category.replace('-', ' ')}
                </Badge>
              ))}
              {categories.length > 3 && (
                <Badge variant="outline" className="text-xs">+{categories.length - 3}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Security Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Automatic sensitivity assessment and privacy protection
            </p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1">
              <li>• Confidentiality classification</li>
              <li>• Access control recommendations</li>
              <li>• Compliance monitoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Upload & Analyze
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Upload & Analysis Tab */}
        <TabsContent value="upload" className="space-y-6">
          <SmartDocumentTagger
            therapistId={therapistId}
            onDocumentAnalyzed={handleDocumentAnalyzed}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <DocumentAnalyticsDashboard therapistId={therapistId} />
        </TabsContent>

        {/* Categories Management Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Document Categories</CardTitle>
              <CardDescription>
                AI-powered classification system with subcategories and sensitivity levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categories.map((category: any) => (
                  <div key={category.category} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {category.category.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </h3>
                      <Badge className={
                        category.defaultSensitivity === 'high' || category.defaultSensitivity === 'confidential'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-green-100 text-green-800 border-green-300'
                      }>
                        <Shield className="w-3 h-3 mr-1" />
                        {category.defaultSensitivity}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {category.subcategories.map((sub: string) => (
                        <Badge key={sub} variant="outline" className="text-xs">
                          {sub.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category Usage Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>AI Classification Guidelines</CardTitle>
              <CardDescription>
                How our AI system categorizes and tags your documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Content Analysis</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• SOAP note structure detection</li>
                    <li>• Clinical terminology identification</li>
                    <li>• Therapeutic modality recognition</li>
                    <li>• Assessment tool identification</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sensitivity Assessment</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Personal health information detection</li>
                    <li>• Risk factor identification</li>
                    <li>• Legal document classification</li>
                    <li>• Confidentiality requirements</li>
                  </ul>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Quality Assurance</h4>
                <p className="text-sm text-gray-600">
                  All AI classifications include confidence scores and can be manually reviewed and adjusted. 
                  The system learns from corrections to improve future accuracy.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Analysis Results (if any) */}
      {analyzedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Analysis Results</CardTitle>
            <CardDescription>
              Documents processed in this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyzedDocuments.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{doc.fileName}</p>
                    <p className="text-sm text-gray-600">
                      {doc.analysis.category} • {doc.analysis.subcategory}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      doc.analysis.sensitivityLevel === 'high' || doc.analysis.sensitivityLevel === 'confidential'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }>
                      {doc.analysis.sensitivityLevel}
                    </Badge>
                    <Badge variant="outline">
                      {Math.round(doc.analysis.confidenceScore * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartDocumentsPage;