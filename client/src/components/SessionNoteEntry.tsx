import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Save, Users, Clock, MapPin, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SessionNoteEntryProps {
  eventId?: string;
  clientId?: string;
  eventTitle?: string;
  eventDate?: string;
  participants?: string[];
  onSave?: (noteId: string) => void;
  onCancel?: () => void;
}

export function SessionNoteEntry({ 
  eventId, 
  clientId, 
  eventTitle, 
  eventDate, 
  participants = [],
  onSave,
  onCancel 
}: SessionNoteEntryProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: eventTitle || '',
    content: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    meetingType: 'therapy_session' as string,
    participants: participants,
    location: '',
    duration: '',
    followUpRequired: false,
    followUpNotes: '',
    confidentialityLevel: 'standard' as string,
    tags: [] as string[],
    keyPoints: [] as string[]
  });

  const [newTag, setNewTag] = useState('');
  const [newKeyPoint, setNewKeyPoint] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addKeyPoint = () => {
    if (newKeyPoint.trim() && !formData.keyPoints.includes(newKeyPoint.trim())) {
      setFormData(prev => ({
        ...prev,
        keyPoints: [...prev.keyPoints, newKeyPoint.trim()]
      }));
      setNewKeyPoint('');
    }
  };

  const removeKeyPoint = (pointToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      keyPoints: prev.keyPoints.filter(point => point !== pointToRemove)
    }));
  };

  const handleSave = async () => {
    if (!formData.content.trim() && !formData.subjective.trim()) {
      toast({
        title: "Missing Content",
        description: "Please provide either general content or subjective notes.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const sessionNoteData = {
        eventId,
        clientId,
        therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c', // Current therapist
        title: formData.title,
        content: formData.content,
        subjective: formData.subjective,
        objective: formData.objective,
        assessment: formData.assessment,
        plan: formData.plan,
        meetingType: formData.meetingType,
        participants: formData.participants,
        location: formData.location,
        duration: formData.duration ? parseInt(formData.duration) : null,
        followUpRequired: formData.followUpRequired,
        followUpNotes: formData.followUpNotes,
        confidentialityLevel: formData.confidentialityLevel,
        manualEntry: true,
        sessionDate: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
        tags: formData.tags,
        keyPoints: formData.keyPoints,
        aiTags: formData.tags // Copy user tags to AI tags initially
      };

      const response = await fetch('/api/session-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionNoteData)
      });

      if (!response.ok) {
        throw new Error('Failed to save session note');
      }

      const result = await response.json();
      
      toast({
        title: "Session Note Saved",
        description: `Successfully saved notes for ${formData.title || 'session'}.`
      });

      onSave?.(result.id);
    } catch (error) {
      console.error('Error saving session note:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save session note. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Manual Session Note Entry
        </CardTitle>
        {eventDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarIcon className="w-4 h-4" />
            {new Date(eventDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter session title..."
            />
          </div>
          
          <div>
            <Label htmlFor="meetingType">Meeting Type</Label>
            <Select value={formData.meetingType} onValueChange={(value) => handleInputChange('meetingType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="therapy_session">Therapy Session</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="supervision">Supervision</SelectItem>
                <SelectItem value="team_meeting">Team Meeting</SelectItem>
                <SelectItem value="planning">Planning Session</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Office, Virtual, Phone..."
            />
          </div>
          
          <div>
            <Label htmlFor="duration" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              placeholder="60"
            />
          </div>
          
          <div>
            <Label htmlFor="confidentiality">Confidentiality Level</Label>
            <Select value={formData.confidentialityLevel} onValueChange={(value) => handleInputChange('confidentialityLevel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* SOAP Notes Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">SOAP Notes</h3>
          
          <div>
            <Label htmlFor="subjective">Subjective</Label>
            <Textarea
              id="subjective"
              value={formData.subjective}
              onChange={(e) => handleInputChange('subjective', e.target.value)}
              placeholder="Client's reported experiences, feelings, and perspectives..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="objective">Objective</Label>
            <Textarea
              id="objective"
              value={formData.objective}
              onChange={(e) => handleInputChange('objective', e.target.value)}
              placeholder="Observable behaviors, mental state, and clinical observations..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="assessment">Assessment</Label>
            <Textarea
              id="assessment"
              value={formData.assessment}
              onChange={(e) => handleInputChange('assessment', e.target.value)}
              placeholder="Clinical analysis, progress evaluation, and diagnostic impressions..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="plan">Plan</Label>
            <Textarea
              id="plan"
              value={formData.plan}
              onChange={(e) => handleInputChange('plan', e.target.value)}
              placeholder="Treatment plans, interventions, and next steps..."
              rows={3}
            />
          </div>
        </div>

        {/* General Content */}
        <div>
          <Label htmlFor="content">General Session Notes</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            placeholder="Additional notes, observations, or general content..."
            rows={4}
          />
        </div>

        {/* Tags */}
        <div>
          <Label>Tags</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button onClick={addTag} variant="outline" size="sm">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>

        {/* Key Points */}
        <div>
          <Label>Key Points</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newKeyPoint}
              onChange={(e) => setNewKeyPoint(e.target.value)}
              placeholder="Add key point..."
              onKeyPress={(e) => e.key === 'Enter' && addKeyPoint()}
            />
            <Button onClick={addKeyPoint} variant="outline" size="sm">Add</Button>
          </div>
          <div className="space-y-1">
            {formData.keyPoints.map((point, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm">{point}</span>
                <Button variant="ghost" size="sm" onClick={() => removeKeyPoint(point)}>×</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="followUp"
              checked={formData.followUpRequired}
              onCheckedChange={(checked) => handleInputChange('followUpRequired', checked)}
            />
            <Label htmlFor="followUp">Follow-up required</Label>
          </div>
          
          {formData.followUpRequired && (
            <Textarea
              value={formData.followUpNotes}
              onChange={(e) => handleInputChange('followUpNotes', e.target.value)}
              placeholder="Follow-up notes and required actions..."
              rows={2}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Session Note'}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}