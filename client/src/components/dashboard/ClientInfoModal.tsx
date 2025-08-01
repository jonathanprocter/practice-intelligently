import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Heart, 
  Shield, 
  AlertTriangle,
  Clock,
  FileText,
  Pill,
  UserCheck,
  Contact
} from 'lucide-react';
import { format } from 'date-fns';
import { Client } from '@shared/schema';
import { ApiClient } from '@/lib/api';

interface ClientInfoModalProps {
  clientName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientInfoModal({ clientName, isOpen, onOpenChange }: ClientInfoModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: ApiClient.getClients,
    enabled: isOpen,
  });

  // Find the client by name
  const client = clients?.find(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase() === clientName.toLowerCase()
  );

  if (!client) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Information</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Client "{clientName}" not found in database</p>
              <p className="text-sm text-gray-500 mt-2">
                This may be a Google Calendar appointment that hasn't been synced yet.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatAge = (dateOfBirth: string | Date) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-therapy-primary text-white rounded-full flex items-center justify-center font-bold">
              {client.firstName.charAt(0)}{client.lastName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {client.firstName} {client.lastName}
                {client.preferredName && (
                  <span className="text-sm text-gray-500 ml-2">"{client.preferredName}"</span>
                )}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getStatusColor(client.status)}>{client.status}</Badge>
                <Badge variant={getRiskLevelColor(client.riskLevel || 'low')}>
                  {client.riskLevel || 'low'} risk
                </Badge>
                {client.pronouns && <Badge variant="outline">{client.pronouns}</Badge>}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contact">Contact & Emergency</TabsTrigger>
              <TabsTrigger value="medical">Medical Info</TabsTrigger>
              <TabsTrigger value="treatment">Treatment Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {client.dateOfBirth && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p className="font-medium">
                          {format(new Date(client.dateOfBirth), 'MMM d, yyyy')} 
                          <span className="text-gray-500 ml-2">(Age {formatAge(client.dateOfBirth)})</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {client.gender && (
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Gender</p>
                        <p className="font-medium capitalize">{client.gender}</p>
                      </div>
                    </div>
                  )}
                  {client.referralSource && (
                    <div className="flex items-center gap-3">
                      <Contact className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Referral Source</p>
                        <p className="font-medium">{client.referralSource}</p>
                      </div>
                    </div>
                  )}
                  {client.clientNumber && (
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Client Number</p>
                        <p className="font-medium">{client.clientNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Primary Concerns */}
              {client.primaryConcerns && Array.isArray(client.primaryConcerns) && client.primaryConcerns.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Primary Concerns
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {client.primaryConcerns.map((concern: string, index: number) => (
                      <Badge key={index} variant="outline">{concern}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Recent Activity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {client.lastContact && (
                    <div>
                      <p className="text-sm text-gray-500">Last Contact</p>
                      <p className="font-medium">{format(new Date(client.lastContact), 'PPP')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Account Created</p>
                    <p className="font-medium">{format(new Date(client.createdAt), 'PPP')}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6 mt-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {client.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{client.email}</p>
                      </div>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Primary Phone</p>
                        <p className="font-medium">{client.phone}</p>
                      </div>
                    </div>
                  )}
                  {client.alternatePhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Alternate Phone</p>
                        <p className="font-medium">{client.alternatePhone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Address */}
              {client.address && typeof client.address === 'object' && (client.address as any).street && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{(client.address as any).street}</p>
                    <p>{(client.address as any).city}, {(client.address as any).state} {(client.address as any).zipCode}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Emergency Contact */}
              {client.emergencyContact && typeof client.emergencyContact === 'object' && (client.emergencyContact as any).name && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Emergency Contact
                  </h3>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="font-medium">{(client.emergencyContact as any).name}</p>
                    <p className="text-sm text-gray-600">{(client.emergencyContact as any).relationship}</p>
                    {(client.emergencyContact as any).phone && (
                      <p className="font-medium">{(client.emergencyContact as any).phone}</p>
                    )}
                    {(client.emergencyContact as any).email && (
                      <p className="text-sm">{(client.emergencyContact as any).email}</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="medical" className="space-y-6 mt-6">
              {/* Insurance Information */}
              {client.insuranceInfo && typeof client.insuranceInfo === 'object' && (client.insuranceInfo as any).provider && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Insurance Information
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                    <p><strong>Provider:</strong> {(client.insuranceInfo as any).provider}</p>
                    {(client.insuranceInfo as any).policyNumber && (
                      <p><strong>Policy Number:</strong> {(client.insuranceInfo as any).policyNumber}</p>
                    )}
                    {(client.insuranceInfo as any).groupNumber && (
                      <p><strong>Group Number:</strong> {(client.insuranceInfo as any).groupNumber}</p>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Medications */}
              {client.medications && Array.isArray(client.medications) && client.medications.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Current Medications
                  </h3>
                  <div className="space-y-2">
                    {client.medications.map((medication: any, index: number) => (
                      <div key={index} className="bg-green-50 p-3 rounded-lg">
                        <p className="font-medium">{medication.name || medication}</p>
                        {medication.dosage && <p className="text-sm text-gray-600">Dosage: {medication.dosage}</p>}
                        {medication.frequency && <p className="text-sm text-gray-600">Frequency: {medication.frequency}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Allergies */}
              {client.allergies && Array.isArray(client.allergies) && client.allergies.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Allergies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {client.allergies.map((allergy: string, index: number) => (
                      <Badge key={index} variant="destructive">{allergy}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Medical History */}
              {client.medicalHistory && typeof client.medicalHistory === 'object' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Medical History
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(client.medicalHistory, null, 2)}</pre>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="treatment" className="space-y-6 mt-6">
              {/* HIPAA Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance & Consent
                </h3>
                <div className="space-y-3">
                  {client.hipaaSignedDate && (
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm text-gray-500">HIPAA Signed</p>
                        <p className="font-medium">{format(new Date(client.hipaaSignedDate), 'PPP')}</p>
                      </div>
                    </div>
                  )}
                  {client.consentStatus && typeof client.consentStatus === 'object' && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm font-medium">Consent Status</p>
                      <pre className="text-sm mt-2">{JSON.stringify(client.consentStatus, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Treatment Notes Placeholder */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Treatment Progress
                </h3>
                <div className="bg-therapy-bg p-4 rounded-lg text-center">
                  <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">Session notes and treatment plans</p>
                  <p className="text-sm text-gray-500">Available in the Session Notes section</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}