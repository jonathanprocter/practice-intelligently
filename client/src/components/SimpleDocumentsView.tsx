/**
 * Simple Documents View Component - displays documents for a client
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText, Download, Eye, Tag, Clock, AlertCircle } from 'lucide-react';

interface SimpleDocumentsViewProps {
  clientId: string;
  therapistId: string;
  clientName?: string;
}

export function SimpleDocumentsView({ clientId, therapistId, clientName }: SimpleDocumentsViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/client/${clientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    },
    enabled: !!clientId,
  });

  const documents = data?.documents || [];

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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">Error loading documents</span>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No documents found</p>
        <p className="text-sm text-gray-500 mt-1">Documents will appear here once uploaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Uploaded Documents ({documents.length})</h3>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-500 mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{doc.originalName || doc.fileName}</h4>
                  
                  {doc.contentSummary && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {doc.contentSummary}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Uploaded: {format(new Date(doc.createdAt || doc.uploadedAt), 'MMM dd, yyyy')}</span>
                    <span>Size: {(doc.fileSize / 1024).toFixed(1)} KB</span>
                    {doc.category && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {doc.category}
                      </span>
                    )}
                  </div>

                  {doc.aiTags && doc.aiTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.aiTags.slice(0, 5).map((tag, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag.tag || tag}
                        </span>
                      ))}
                      {doc.aiTags.length > 5 && (
                        <span className="text-xs text-gray-500">+{doc.aiTags.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {doc.sensitivityLevel === 'high' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                    Confidential
                  </span>
                )}
                <button
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="View document"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}