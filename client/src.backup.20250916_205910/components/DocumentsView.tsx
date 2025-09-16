/**
 * Documents View Component
 * Displays and manages documents for a client
 */

import React, { useState, useRef } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
// import { format } from 'date-fns';

// Fallback format function since date-fns might not be available
const format = (date: Date | string, formatStr: string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (formatStr === 'MMM dd, yyyy') {
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
  return d.toLocaleDateString();
};
import { 
  FileText, Upload, Download, Trash2, Eye, Tag, 
  AlertCircle, CheckCircle, Clock, Search, Filter 
} from 'lucide-react';

interface DocumentsViewProps {
  clientId: string;
  therapistId: string;
  clientName?: string;
}

export function DocumentsView({ clientId, therapistId, clientName }: DocumentsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    documents, 
    isLoading, 
    error, 
    uploadDocument, 
    isUploading,
    uploadError,
    refetch 
  } = useDocuments({
    clientId,
    therapistId,
    filters: {
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    }
  });
  
  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => 
    searchQuery === '' || 
    doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.contentSummary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Group documents by category
  const documentsByCategory = filteredDocuments.reduce((acc, doc) => {
    const category = doc.category || 'uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    uploadDocument({
      file,
      clientId,
      therapistId,
      description: `Document for ${clientName || 'client'}`,
      documentType: 'general'
    }, {
      onSuccess: () => {
        setShowUpload(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'session_note':
      case 'progress_note':
        return <FileText className="w-4 h-4" />;
      case 'assessment':
        return <CheckCircle className="w-4 h-4" />;
      case 'treatment_plan':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };
  
  const getSensitivityBadge = (level: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      confidential: 'bg-purple-100 text-purple-800',
      standard: 'bg-gray-100 text-gray-800',
      low: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[level] || colors.standard}`}>
        {level}
      </span>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2">Loading documents...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">Error loading documents: {error.message}</span>
        </div>
        <button 
          onClick={() => refetch()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Documents</h2>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </button>
        </div>
        
        {/* Upload Section */}
        {showUpload && (
          <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-6 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              className="hidden"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-blue-500 mb-2" />
              <span className="text-sm text-gray-600">
                Click to select a file or drag and drop
              </span>
              <span className="text-xs text-gray-500 mt-1">
                PDF, DOC, DOCX, TXT, Images (Max 50MB)
              </span>
            </label>
            
            {isUploading && (
              <div className="mt-4">
                <div className="bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                       style={{ width: '50%' }} />
                </div>
                <span className="text-sm text-gray-600 mt-1">Uploading...</span>
              </div>
            )}
            
            {uploadError && (
              <div className="mt-4 text-red-600 text-sm">
                Upload failed: {uploadError.message}
              </div>
            )}
          </div>
        )}
        
        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="session_note">Session Notes</option>
            <option value="progress_note">Progress Notes</option>
            <option value="assessment">Assessments</option>
            <option value="treatment_plan">Treatment Plans</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>
      
      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No documents found</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery ? 'Try adjusting your search' : 'Upload documents to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(documentsByCategory).map(([category, categoryDocs]) => (
            <div key={category} className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center">
                {getCategoryIcon(category)}
                <h3 className="ml-2 font-semibold capitalize">
                  {category.replace(/_/g, ' ')} ({categoryDocs.length})
                </h3>
              </div>
              
              <div className="divide-y">
                {categoryDocs.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <FileText className="w-4 h-4 text-gray-400 mr-2" />
                          <h4 className="font-medium text-gray-900">
                            {doc.originalName}
                          </h4>
                          {doc.sensitivityLevel && (
                            <span className="ml-2">
                              {getSensitivityBadge(doc.sensitivityLevel)}
                            </span>
                          )}
                        </div>
                        
                        {doc.contentSummary && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {doc.contentSummary}
                          </p>
                        )}
                        
                        {doc.aiTags && doc.aiTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.aiTags.slice(0, 5).map((tag, idx) => (
                              <span 
                                key={idx}
                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                            {doc.aiTags.length > 5 && (
                              <span className="text-xs text-gray-500">
                                +{doc.aiTags.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(doc.createdAt), 'MMM d, yyyy h:mm a')}
                          {doc.fileSize && (
                            <span className="ml-3">
                              {(doc.fileSize / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Download document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Summary Statistics */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
            <div className="text-sm text-gray-600">Total Documents</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {documents.filter(d => d.category === 'session_note' || d.category === 'progress_note').length}
            </div>
            <div className="text-sm text-gray-600">Session Notes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.category === 'assessment').length}
            </div>
            <div className="text-sm text-gray-600">Assessments</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {documents.filter(d => d.sensitivityLevel === 'high' || d.sensitivityLevel === 'confidential').length}
            </div>
            <div className="text-sm text-gray-600">Confidential</div>
          </div>
        </div>
      </div>
    </div>
  );
}