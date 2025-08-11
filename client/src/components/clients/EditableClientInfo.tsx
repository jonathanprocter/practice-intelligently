import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit2, 
  Save, 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Users,
  FileText,
  AlertCircle
} from 'lucide-react';
import { ApiClient } from '@/lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes?: string;
  preferredName?: string;
  address?: string;
  status?: string;
  riskLevel?: string;
}

interface EditableClientInfoProps {
  client: Client;
  mode?: 'compact' | 'full';
}

export default function EditableClientInfo({ client, mode = 'full' }: EditableClientInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Client>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateClientMutation = useMutation({
    mutationFn: async (data: Partial<Client>) => {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', client.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditing(false);
      setEditData({});
      toast({
        title: "Client Updated",
        description: "Client information has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "There was an error updating the client information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditData({ ...client });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSave = () => {
    if (!editData.firstName?.trim() || !editData.lastName?.trim() || !editData.email?.trim()) {
      toast({
        title: "Validation Error",
        description: "First name, last name, and email are required fields.",
        variant: "destructive",
      });
      return;
    }

    updateClientMutation.mutate(editData);
  };

  const handleFieldChange = (field: keyof Client, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  if (mode === 'compact') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Client Information</h3>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              data-testid="button-edit-client-info"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateClientMutation.isPending}
                data-testid="button-save-client-info"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateClientMutation.isPending}
                data-testid="button-cancel-edit-client-info"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            {isEditing ? (
              <Input
                id="firstName"
                value={editData.firstName || ''}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                data-testid="input-first-name"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded" data-testid="text-first-name">
                {client.firstName}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            {isEditing ? (
              <Input
                id="lastName"
                value={editData.lastName || ''}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                data-testid="input-last-name"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded" data-testid="text-last-name">
                {client.lastName}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {isEditing ? (
              <Input
                id="email"
                type="email"
                value={editData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                data-testid="input-email"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded" data-testid="text-email">
                {client.email}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            {isEditing ? (
              <Input
                id="phone"
                value={editData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                data-testid="input-phone"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded" data-testid="text-phone">
                {client.phone}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Information Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <CardTitle>Basic Information</CardTitle>
          </div>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              data-testid="button-edit-client-basic"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateClientMutation.isPending}
                data-testid="button-save-client-basic"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateClientMutation.isPending}
                data-testid="button-cancel-edit-client-basic"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              {isEditing ? (
                <Input
                  id="firstName"
                  value={editData.firstName || ''}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  data-testid="input-first-name"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md" data-testid="text-first-name">
                  {client.firstName}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              {isEditing ? (
                <Input
                  id="lastName"
                  value={editData.lastName || ''}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  data-testid="input-last-name"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md" data-testid="text-last-name">
                  {client.lastName}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredName">Preferred Name</Label>
              {isEditing ? (
                <Input
                  id="preferredName"
                  value={editData.preferredName || ''}
                  onChange={(e) => handleFieldChange('preferredName', e.target.value)}
                  placeholder="Optional"
                  data-testid="input-preferred-name"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md" data-testid="text-preferred-name">
                  {client.preferredName || '—'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              {isEditing ? (
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={editData.dateOfBirth ? new Date(editData.dateOfBirth).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                  data-testid="input-date-of-birth"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md" data-testid="text-date-of-birth">
                  {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : '—'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-600" />
            <CardTitle>Contact Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  data-testid="input-email"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md" data-testid="text-email">
                  {client.email}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={editData.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  data-testid="input-phone"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md" data-testid="text-phone">
                  {client.phone || '—'}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              {isEditing ? (
                <Textarea
                  id="address"
                  value={editData.address || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="Street address, city, state, zip"
                  data-testid="input-address"
                  rows={3}
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md min-h-[80px]" data-testid="text-address">
                  {client.address || '—'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <CardTitle>Emergency Contact</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
              {isEditing ? (
                <Input
                  id="emergencyContact"
                  value={editData.emergencyContact || ''}
                  onChange={(e) => handleFieldChange('emergencyContact', e.target.value)}
                  data-testid="input-emergency-contact"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md" data-testid="text-emergency-contact">
                  {client.emergencyContact || '—'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
              {isEditing ? (
                <Input
                  id="emergencyPhone"
                  value={editData.emergencyPhone || ''}
                  onChange={(e) => handleFieldChange('emergencyPhone', e.target.value)}
                  data-testid="input-emergency-phone"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md" data-testid="text-emergency-phone">
                  {client.emergencyPhone || '—'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Notes Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <CardTitle>Clinical Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            {isEditing ? (
              <Textarea
                id="notes"
                value={editData.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Add any additional notes about this client..."
                data-testid="input-notes"
                rows={4}
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md min-h-[100px]" data-testid="text-notes">
                {client.notes || 'No additional notes'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}