import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, File, Folder, ExternalLink, Eye, FileText, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

interface NotionPage {
  id: string;
  properties: any;
  created_time: string;
  last_edited_time: string;
}

interface NotionDatabase {
  id: string;
  title: any[];
  description: any[];
  created_time: string;
  last_edited_time: string;
}

export default function ContentViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [selectedPage, setSelectedPage] = useState<NotionPage | null>(null);
  const [activeTab, setActiveTab] = useState('drive');

  // Google Drive queries
  const { data: driveFiles, isLoading: driveLoading, error: driveError } = useQuery({
    queryKey: ['drive-files'],
    queryFn: async () => {
      const res = await fetch('/api/drive/files');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: driveSearchResults, isLoading: driveSearchLoading } = useQuery({
    queryKey: ['drive-search', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/drive/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to search files');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: searchQuery.length > 2,
  });

  const { data: fileContent, isLoading: fileContentLoading } = useQuery({
    queryKey: ['drive-file-content', selectedFile?.id],
    queryFn: () => fetch(`/api/drive/files/${selectedFile?.id}`).then(res => res.json()),
    enabled: !!selectedFile,
  });

  // Notion queries
  const { data: notionPages, isLoading: notionPagesLoading } = useQuery({
    queryKey: ['notion-pages'],
    queryFn: async () => {
      const res = await fetch('/api/notion/pages');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: notionDatabases, isLoading: notionDbLoading } = useQuery({
    queryKey: ['notion-databases'],
    queryFn: async () => {
      const res = await fetch('/api/notion/databases');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: notionSearchResults, isLoading: notionSearchLoading } = useQuery({
    queryKey: ['notion-search', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/notion/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: searchQuery.length > 2 && activeTab === 'notion',
  });

  const { data: pageContent, isLoading: pageContentLoading } = useQuery({
    queryKey: ['notion-page-content', selectedPage?.id],
    queryFn: () => fetch(`/api/notion/pages/${selectedPage?.id}/content`).then(res => res.json()),
    enabled: !!selectedPage,
  });

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'Unknown size';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('folder')) return <Folder className="h-4 w-4" />;
    if (mimeType?.includes('document') || mimeType?.includes('text')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getNotionTitle = (page: any) => {
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    return 'Untitled';
  };

  const currentDriveFiles = searchQuery ? (driveSearchResults || []) : (driveFiles || []);
  const currentNotionItems = searchQuery ? (notionSearchResults || []) : [...(notionDatabases || []), ...(notionPages || [])];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Content Viewer</h1>
          <p className="text-therapy-text/60">Access your Google Drive files and Notion content</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search files and content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button variant="outline">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="drive">Google Drive</TabsTrigger>
          <TabsTrigger value="notion">Notion</TabsTrigger>
        </TabsList>

        <TabsContent value="drive" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <File className="h-5 w-5 mr-2" />
                  {searchQuery ? 'Search Results' : 'Recent Files'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driveError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <div className="text-red-500 mb-4">
                      <p>{(driveError as Error).message}</p>
                    </div>
                    <Button 
                      onClick={() => window.location.href = '/api/auth/google'}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Re-authenticate with Google Drive
                    </Button>
                  </div>
                ) : driveLoading || driveSearchLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : !currentDriveFiles || currentDriveFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <File className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
                    <p className="text-therapy-text/60">No files found</p>
                    <p className="text-therapy-text/40 text-sm">Try searching or check your Google Drive access</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentDriveFiles.map((file: DriveFile) => (
                      <div
                        key={file.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFile?.id === file.id
                            ? 'bg-therapy-primary/10 border-therapy-primary'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedFile(file)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(file.mimeType)}
                            <div>
                              <p className="font-medium text-sm">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • {new Date(file.modifiedTime).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>File Preview</span>
                  {selectedFile && (
                    <div className="flex items-center space-x-2">
                      {selectedFile.webViewLink && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={selectedFile.webViewLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedFile ? (
                  <div className="text-center py-8 text-gray-500">
                    Select a file to view its content
                  </div>
                ) : fileContentLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-semibold">{selectedFile.name}</h3>
                      <p className="text-sm text-gray-500">{selectedFile.mimeType}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">
                        {typeof fileContent?.content === 'string' 
                          ? fileContent.content 
                          : JSON.stringify(fileContent?.content, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notion" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pages and Databases List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  {searchQuery ? 'Search Results' : 'Pages & Databases'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notionPagesLoading || notionDbLoading || notionSearchLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : !currentNotionItems || currentNotionItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
                    <p className="text-therapy-text/60">No content found</p>
                    <p className="text-therapy-text/40 text-sm">Check your Notion workspace connection</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Databases */}
                    {!searchQuery && notionDatabases && notionDatabases.map((db: NotionDatabase) => (
                      <div
                        key={db.id}
                        className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Database className="h-4 w-4" />
                            <div>
                              <p className="font-medium text-sm">
                                {db.title?.[0]?.plain_text || 'Untitled Database'}
                              </p>
                              <Badge variant="secondary" className="text-xs">Database</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Pages */}
                    {(searchQuery ? notionSearchResults : notionPages) && (searchQuery ? notionSearchResults : notionPages)?.map((page: NotionPage) => (
                      <div
                        key={page.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPage?.id === page.id
                            ? 'bg-therapy-primary/10 border-therapy-primary'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPage(page)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-4 w-4" />
                            <div>
                              <p className="font-medium text-sm">{getNotionTitle(page)}</p>
                              <p className="text-xs text-gray-500">
                                Updated {new Date(page.last_edited_time).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Page Content */}
            <Card>
              <CardHeader>
                <CardTitle>Page Content</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedPage ? (
                  <div className="text-center py-8 text-gray-500">
                    Select a page to view its content
                  </div>
                ) : pageContentLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-semibold">{getNotionTitle(selectedPage)}</h3>
                      <p className="text-sm text-gray-500">
                        Last edited: {new Date(selectedPage.last_edited_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">
                        {JSON.stringify(pageContent, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}