
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { CheckCircle, AlertCircle, Edit3, Calendar, User, FileText } from 'lucide-react';

interface MetadataReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent: string;
  extractedMetadata: {
    clientName?: string;
    sessionDate?: string;
    confidence?: { name: number; date: number };
    extractionMethods?: string[];
    alternatives?: { names: string[]; dates: string[] };
  };
  availableClients: Array<{ id: string; firstName: string; lastName: string }>;
  onConfirm: (finalMetadata: any, createNote: boolean) => void;
  isProcessing?: boolean;
}

export const ManualMetadataReviewModal: React.FC<MetadataReviewModalProps> = ({
  isOpen,
  onClose,
  documentContent,
  extractedMetadata,
  availableClients,
  onConfirm,
  isProcessing = false
}) => {
  const [manualClientName, setManualClientName] = useState('');
  const [manualSessionDate, setManualSessionDate] = useState('');
  const [createProgressNote, setCreateProgressNote] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    if (isOpen && extractedMetadata) {
      setManualClientName(extractedMetadata.clientName || '');
      setManualSessionDate(extractedMetadata.sessionDate || '');
      setShowAlternatives(false);
    }
  }, [isOpen, extractedMetadata]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const handleClientNameSelect = (clientName: string) => {
    setManualClientName(clientName);
  };

  const handleDateSelect = (date: string) => {
    setManualSessionDate(date);
  };

  const handleConfirm = () => {
    const finalMetadata = {
      clientName: manualClientName.trim() || extractedMetadata.clientName,
      sessionDate: manualSessionDate.trim() || extractedMetadata.sessionDate,
    };

    const manualOverrides = {
      ...(manualClientName.trim() !== extractedMetadata.clientName ? { clientName: manualClientName.trim() } : {}),
      ...(manualSessionDate.trim() !== extractedMetadata.sessionDate ? { sessionDate: manualSessionDate.trim() } : {}),
    };

    onConfirm({ finalMetadata, manualOverrides }, createProgressNote);
  };

  const isValidDate = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date.getFullYear() > 2020 && date.getFullYear() < 2030;
  };

  const hasChanges = 
    manualClientName.trim() !== (extractedMetadata.clientName || '') ||
    manualSessionDate.trim() !== (extractedMetadata.sessionDate || '');

  const canConfirm = manualClientName.trim() && isValidDate(manualSessionDate.trim());

  const matchingClients = availableClients.filter(client => {
    const fullName = `${client.firstName} ${client.lastName}`;
    return fullName.toLowerCase().includes(manualClientName.toLowerCase()) ||
           manualClientName.toLowerCase().includes(fullName.toLowerCase());
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Manual Metadata Review & Override
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Extraction Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">AI Extraction Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Name Extraction */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <Label className="text-sm font-medium">Extracted Client Name</Label>
                    {extractedMetadata.confidence && (
                      <Badge className={getConfidenceColor(extractedMetadata.confidence.name)}>
                        {getConfidenceLabel(extractedMetadata.confidence.name)} ({Math.round(extractedMetadata.confidence.name * 100)}%)
                      </Badge>
                    )}
                  </div>
                  <div className="p-2 bg-gray-50 rounded text-sm">
                    {extractedMetadata.clientName || 'Not detected'}
                  </div>
                </div>

                {/* Session Date Extraction */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <Label className="text-sm font-medium">Extracted Session Date</Label>
                    {extractedMetadata.confidence && (
                      <Badge className={getConfidenceColor(extractedMetadata.confidence.date)}>
                        {getConfidenceLabel(extractedMetadata.confidence.date)} ({Math.round(extractedMetadata.confidence.date * 100)}%)
                      </Badge>
                    )}
                  </div>
                  <div className="p-2 bg-gray-50 rounded text-sm">
                    {extractedMetadata.sessionDate || 'Not detected'}
                  </div>
                </div>
              </div>

              {/* Extraction Methods */}
              {extractedMetadata.extractionMethods && extractedMetadata.extractionMethods.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Extraction Methods Used</Label>
                  <div className="flex flex-wrap gap-1">
                    {extractedMetadata.extractionMethods.map((method, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {extractedMetadata.alternatives && (
                extractedMetadata.alternatives.names.length > 0 || extractedMetadata.alternatives.dates.length > 0
              ) && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAlternatives(!showAlternatives)}
                  >
                    {showAlternatives ? 'Hide' : 'Show'} Alternative Options
                  </Button>
                  
                  {showAlternatives && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-blue-50 rounded">
                      {extractedMetadata.alternatives.names.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Alternative Names</Label>
                          <div className="space-y-1 mt-1">
                            {extractedMetadata.alternatives.names.map((name, index) => (
                              <Button
                                key={index}
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 text-xs justify-start"
                                onClick={() => handleClientNameSelect(name)}
                              >
                                {name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {extractedMetadata.alternatives.dates.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Alternative Dates</Label>
                          <div className="space-y-1 mt-1">
                            {extractedMetadata.alternatives.dates.map((date, index) => (
                              <Button
                                key={index}
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 text-xs justify-start"
                                onClick={() => handleDateSelect(date)}
                              >
                                {date}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Manual Override Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Manual Override & Correction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manual Client Name */}
                <div className="space-y-2">
                  <Label htmlFor="manualClientName">Client Name</Label>
                  <Input
                    id="manualClientName"
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    placeholder="Enter exact client name..."
                    className={hasChanges && manualClientName !== extractedMetadata.clientName ? 'border-orange-300' : ''}
                  />
                  
                  {/* Matching Clients Suggestions */}
                  {manualClientName && matchingClients.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Matching Clients in Database</Label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {matchingClients.slice(0, 5).map((client) => (
                          <Button
                            key={client.id}
                            variant="ghost"
                            size="sm"
                            className="h-auto p-2 text-xs justify-start w-full"
                            onClick={() => handleClientNameSelect(`${client.firstName} ${client.lastName}`)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                            {client.firstName} {client.lastName}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual Session Date */}
                <div className="space-y-2">
                  <Label htmlFor="manualSessionDate">Session Date</Label>
                  <Input
                    id="manualSessionDate"
                    type="date"
                    value={manualSessionDate}
                    onChange={(e) => setManualSessionDate(e.target.value)}
                    className={hasChanges && manualSessionDate !== extractedMetadata.sessionDate ? 'border-orange-300' : ''}
                  />
                  {manualSessionDate && !isValidDate(manualSessionDate) && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      Invalid date format
                    </div>
                  )}
                </div>
              </div>

              {/* Document Preview */}
              <div className="space-y-2">
                <Label>Document Content Preview</Label>
                <Textarea
                  value={documentContent.substring(0, 500) + (documentContent.length > 500 ? '...' : '')}
                  readOnly
                  className="h-32 text-xs bg-gray-50"
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="createProgressNote"
                    checked={createProgressNote}
                    onChange={(e) => setCreateProgressNote(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="createProgressNote" className="text-sm">
                    Create progress note after metadata confirmation
                  </Label>
                </div>
              </div>

              {/* Changes Summary */}
              {hasChanges && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit3 className="h-4 w-4 text-orange-600" />
                    <Label className="text-sm font-medium text-orange-800">Manual Changes</Label>
                  </div>
                  <div className="text-xs space-y-1 text-orange-700">
                    {manualClientName !== (extractedMetadata.clientName || '') && (
                      <div>• Client name: "{extractedMetadata.clientName || 'None'}" → "{manualClientName}"</div>
                    )}
                    {manualSessionDate !== (extractedMetadata.sessionDate || '') && (
                      <div>• Session date: "{extractedMetadata.sessionDate || 'None'}" → "{manualSessionDate}"</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm & Process
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualMetadataReviewModal;
