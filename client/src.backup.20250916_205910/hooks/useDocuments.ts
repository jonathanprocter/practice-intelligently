/**
 * Custom hook for document management
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Document {
  id: string;
  clientId?: string;
  therapistId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  description?: string;
  category?: string;
  subcategory?: string;
  contentSummary?: string;
  aiTags?: string[];
  clinicalKeywords?: string[];
  sensitivityLevel?: string;
  extractedText?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentFilters {
  category?: string;
  subcategory?: string;
  sensitivityLevel?: string;
  limit?: number;
  offset?: number;
}

interface UseDocumentsOptions {
  clientId?: string;
  therapistId?: string;
  filters?: DocumentFilters;
  autoRefresh?: boolean;
}

export function useDocuments(options: UseDocumentsOptions = {}) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Fetch documents for a client
  const fetchClientDocuments = useCallback(async () => {
    if (!options.clientId) return [];
    
    const params = new URLSearchParams();
    if (options.filters?.category) params.append('category', options.filters.category);
    if (options.filters?.subcategory) params.append('subcategory', options.filters.subcategory);
    if (options.filters?.sensitivityLevel) params.append('sensitivityLevel', options.filters.sensitivityLevel);
    params.append('limit', String(options.filters?.limit || 50));
    params.append('offset', String(options.filters?.offset || 0));
    
    const response = await fetch(`/api/documents/client/${options.clientId}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }
    
    const data = await response.json();
    return data.documents || [];
  }, [options.clientId, options.filters]);
  
  // Query for documents
  const documentsQuery = useQuery({
    queryKey: ['documents', options.clientId, options.therapistId, options.filters],
    queryFn: fetchClientDocuments,
    enabled: !!options.clientId,
    refetchInterval: options.autoRefresh ? 30000 : false,
  });
  
  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, clientId, therapistId, description, documentType }: {
      file: File;
      clientId?: string;
      therapistId: string;
      description?: string;
      documentType?: string;
    }) => {
      const formData = new FormData();
      formData.append('document', file);
      if (clientId) formData.append('clientId', clientId);
      formData.append('therapistId', therapistId);
      if (description) formData.append('description', description);
      if (documentType) formData.append('documentType', documentType);
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
  
  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    uploadDocument: uploadDocumentMutation.mutate,
    uploadProgress,
    isUploading: uploadDocumentMutation.isPending,
    uploadError: uploadDocumentMutation.error,
    refetch: documentsQuery.refetch,
  };
}