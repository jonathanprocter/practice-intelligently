import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentUploadZone } from '@/components/forms/DocumentUploadZone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Calendar, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ProgressNote {
  id: string;
  title: string;
  clientName: string;
  sessionDate: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  tonalAnalysis: string;
  keyPoints: string[];
  significantQuotes: string[];
  narrativeSummary: string;
  aiTags?: string[]; // AI-generated tags
  createdAt: string;
}

function ProgressNotesPage() {
  const [selectedNote, setSelectedNote] = useState<ProgressNote | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Fetch progress notes
  const { data: progressNotes, isLoading, refetch, error } = useQuery({
    queryKey: ['progress-notes'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/progress-notes/e66b8b8e-e7a2-40b9-ae74-00c93ffe503c');
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch progress notes: ${errorText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching progress notes:', error);
        throw error;
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  const handleProgressNoteGenerated = (newNote: ProgressNote) => {
    refetch();
    setSelectedNote(newNote);
    setShowUpload(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Progress Notes</h1>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Clinical Progress Notes</h1>
          <p className="text-therapy-text/60">AI-generated comprehensive clinical documentation</p>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-therapy-primary hover:bg-therapy-primary/90"
        >
          <Upload className="w-4 h-4 mr-2" />
          Process Documents
        </Button>
      </div>

      {showUpload && (
        <DocumentUploadZone onProgressNoteGenerated={handleProgressNoteGenerated} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Notes List */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-therapy-primary" />
            <h2 className="text-lg font-semibold">Recent Progress Notes</h2>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {progressNotes?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No progress notes yet</p>
                <p className="text-sm">Upload clinical documents to generate progress notes</p>
              </div>
            ) : (
              progressNotes?.map((note: ProgressNote) => (
                <div
                  key={note.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedNote?.id === note.id 
                      ? 'border-therapy-primary bg-therapy-primary/5' 
                      : 'border-gray-200 hover:border-therapy-primary/50'
                  }`}
                  onClick={() => setSelectedNote(note)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm line-clamp-2">{note.title}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{note.clientName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(note.sessionDate), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2">
                    {note.subjective.substring(0, 100)}...
                  </p>

                  {note.aiTags && note.aiTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.aiTags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-therapy-primary/10 text-therapy-primary rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {note.aiTags.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{note.aiTags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>Created {format(new Date(note.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Progress Note Detail View */}
        <Card className="p-6">
          {selectedNote ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">{selectedNote.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{selectedNote.clientName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(selectedNote.sessionDate), 'MMMM d, yyyy')}</span>
                  </div>
                </div>

                {selectedNote.aiTags && selectedNote.aiTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm font-medium text-gray-700">AI Tags:</span>
                    {selectedNote.aiTags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm bg-therapy-primary/10 text-therapy-primary rounded-full border border-therapy-primary/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Tabs defaultValue="soap" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="soap">SOAP</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="narrative">Summary</TabsTrigger>
                </TabsList>

                <TabsContent value="soap" className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-therapy-primary mb-2">Subjective</h3>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: selectedNote.subjective }}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-therapy-primary mb-2">Objective</h3>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: selectedNote.objective }}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-therapy-primary mb-2">Assessment</h3>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: selectedNote.assessment }}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-therapy-primary mb-2">Plan</h3>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: selectedNote.plan }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-therapy-primary mb-2">Tonal Analysis</h3>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: selectedNote.tonalAnalysis }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-therapy-primary mb-2">Key Points</h3>
                    <ul className="space-y-2">
                      {selectedNote.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-therapy-primary mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedNote.significantQuotes.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-therapy-primary mb-2">Significant Quotes</h3>
                      <div className="space-y-2">
                        {selectedNote.significantQuotes.map((quote, index) => (
                          <blockquote key={index} className="border-l-4 border-therapy-primary/30 pl-4 italic text-sm text-gray-700">
                            "{quote}"
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="narrative" className="mt-4">
                  <div>
                    <h3 className="font-semibold text-therapy-primary mb-2">Comprehensive Narrative Summary</h3>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: selectedNote.narrativeSummary }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a progress note to view details</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ProgressNotesPage;