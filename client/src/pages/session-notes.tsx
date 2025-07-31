import { FileText, Plus, Search, Filter, Mic, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function SessionNotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Mock data for demonstration
  const sessionNotes = [
    {
      id: 1,
      date: "2024-07-31",
      clientName: "Michael Rodriguez",
      sessionType: "Individual Therapy - CBT",
      summary: "Client showed significant progress in anxiety management techniques. Introduced mindfulness exercises.",
      tags: ["anxiety", "CBT", "mindfulness", "progress"],
      hasTranscript: true,
      aiAnalyzed: true
    },
    {
      id: 2,
      date: "2024-07-30",
      clientName: "Emma Thompson",
      sessionType: "Couples Therapy - EFT",
      summary: "Worked on communication patterns and emotional connection. Assigned homework exercises.",
      tags: ["couples", "EFT", "communication", "homework"],
      hasTranscript: false,
      aiAnalyzed: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Session Notes</h1>
          <p className="text-therapy-text/60">Document and analyze therapy sessions</p>
        </div>
        <Button 
          className="bg-therapy-primary hover:bg-therapy-primary/90"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session Note
        </Button>
      </div>

      {isCreating && (
        <div className="therapy-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Create Session Note</h3>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <select className="w-full border border-therapy-border rounded-lg px-3 py-2">
                <option>Select client...</option>
                <option>Michael Rodriguez</option>
                <option>Emma Thompson</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Session Type</label>
              <Input placeholder="e.g., Individual Therapy - CBT" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Session Notes</label>
            <Textarea 
              placeholder="Enter your session notes here..."
              rows={6}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Mic className="w-4 h-4 mr-2" />
                Record Audio
              </Button>
              <Button variant="outline" size="sm">
                <Bot className="w-4 h-4 mr-2" />
                AI Analysis
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button className="bg-therapy-success hover:bg-therapy-success/90">
                Save Note
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search session notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="grid gap-4">
        {sessionNotes.length > 0 ? (
          sessionNotes.map((note) => (
            <div key={note.id} className="therapy-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-therapy-text mb-1">
                    {note.clientName} - {note.sessionType}
                  </h3>
                  <p className="text-sm text-therapy-text/60">
                    {new Date(note.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {note.hasTranscript && (
                    <Badge variant="outline" className="text-xs">
                      <Mic className="w-3 h-3 mr-1" />
                      Audio
                    </Badge>
                  )}
                  {note.aiAnalyzed && (
                    <Badge variant="outline" className="text-xs">
                      <Bot className="w-3 h-3 mr-1" />
                      AI Analyzed
                    </Badge>
                  )}
                </div>
              </div>
              
              <p className="text-therapy-text mb-4">
                {note.summary}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    View Full Note
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="therapy-card p-12 text-center">
            <FileText className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-therapy-text mb-2">
              No session notes yet
            </h3>
            <p className="text-therapy-text/60 mb-4">
              Start documenting your therapy sessions to track progress and insights
            </p>
            <Button 
              className="bg-therapy-primary hover:bg-therapy-primary/90"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
