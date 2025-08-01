import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Calendar, Shield, Palette, Download } from "lucide-react";
import { ApiClient } from "@/lib/api";
import drProctorAvatar from "@assets/generated-image (1)_1753977205405.png";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  practiceName: string;
  notificationPrefs: {
    appointmentReminders: boolean;
    actionItemAlerts: boolean;
    aiInsights: boolean;
  };
  aiSettings: {
    sessionAnalysis: boolean;
    progressTracking: boolean;
    patternRecognition: boolean;
  };
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({
    name: "",
    email: "",
    title: "",
    practiceName: "",
    notificationPrefs: {
      appointmentReminders: true,
      actionItemAlerts: true,
      aiInsights: true,
    },
    aiSettings: {
      sessionAnalysis: true,
      progressTracking: true,
      patternRecognition: true,
    }
  });

  // Load user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user-profile', ApiClient.therapistId],
    queryFn: () => ApiClient.getUser(ApiClient.therapistId),
    enabled: !!ApiClient.therapistId,
  });

  // Update form data when user data is loaded
  useEffect(() => {
    if (user) {
      const preferences = user.preferences || {};
      setProfileData({
        name: user.fullName || "",
        email: user.email || "",
        title: user.licenseType || "Licensed Therapist", 
        practiceName: preferences.practiceName || "Procter Therapy Practice",
        notificationPrefs: preferences.notificationPrefs || {
          appointmentReminders: true,
          actionItemAlerts: true,
          aiInsights: true,
        },
        aiSettings: preferences.aiSettings || {
          sessionAnalysis: true,
          progressTracking: true,
          patternRecognition: true,
        }
      });
    }
  }, [user]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => {
      const updateData = {
        fullName: data.name,
        email: data.email,
        licenseType: data.title,
        preferences: {
          practiceName: data.practiceName,
          notificationPrefs: data.notificationPrefs,
          aiSettings: data.aiSettings
        }
      };
      return ApiClient.updateUser(ApiClient.therapistId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-profile']);
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle profile field changes
  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle notification preference changes
  const handleNotificationChange = (field: string, value: boolean) => {
    setProfileData(prev => ({
      ...prev,
      notificationPrefs: {
        ...prev.notificationPrefs!,
        [field]: value
      }
    }));
  };

  // Handle AI settings changes
  const handleAISettingChange = (field: string, value: boolean) => {
    setProfileData(prev => ({
      ...prev,
      aiSettings: {
        ...prev.aiSettings!,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    updateUserMutation.mutate(profileData);
  };

  // Check Google Calendar connection status
  const { data: calendarStatus } = useQuery({
    queryKey: ['calendar-status'],
    queryFn: ApiClient.getCalendarConnectionStatus,
    refetchInterval: 5000, // Check every 5 seconds
  });

  const connectGoogleCalendar = async () => {
    try {
      window.location.href = '/api/auth/google';
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Google Calendar.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-therapy-text">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your Practice Intelligence preferences and integrations</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <img 
                  src={drProctorAvatar}
                  alt="Dr. Jonathan Procter"
                  className="w-20 h-20 rounded-full object-cover border-4 border-therapy-primary"
                />
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>Update your personal information and preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={profileData.name || ""} 
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    disabled={userLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Professional Title</Label>
                  <Input 
                    id="title" 
                    value={profileData.title || ""} 
                    onChange={(e) => handleProfileChange('title', e.target.value)}
                    disabled={userLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profileData.email || ""} 
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  disabled={userLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="practice">Practice Name</Label>
                <Input 
                  id="practice" 
                  value={profileData.practiceName || ""} 
                  onChange={(e) => handleProfileChange('practiceName', e.target.value)}
                  disabled={userLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Appointment Reminders</h4>
                  <p className="text-sm text-gray-600">Get notified about upcoming appointments</p>
                </div>
                <Switch 
                  checked={profileData.notificationPrefs?.appointmentReminders || false}
                  onCheckedChange={(checked) => handleNotificationChange('appointmentReminders', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Action Item Alerts</h4>
                  <p className="text-sm text-gray-600">Notifications for overdue action items</p>
                </div>
                <Switch 
                  checked={profileData.notificationPrefs?.actionItemAlerts || false}
                  onCheckedChange={(checked) => handleNotificationChange('actionItemAlerts', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">AI Insights</h4>
                  <p className="text-sm text-gray-600">Weekly AI-generated practice insights</p>
                </div>
                <Switch 
                  checked={profileData.notificationPrefs?.aiInsights || false}
                  onCheckedChange={(checked) => handleNotificationChange('aiInsights', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendar Integration
              </CardTitle>
              <CardDescription>Connect and sync with your Google Calendar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Google Calendar</h4>
                    <p className="text-sm text-gray-600">Sync appointments and availability</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={calendarStatus?.connected ? "default" : "outline"}>
                    {calendarStatus?.connected ? "Connected" : "Not Connected"}
                  </Badge>
                  {!calendarStatus?.connected && (
                    <Button onClick={connectGoogleCalendar}>
                      Connect
                    </Button>
                  )}
                  {calendarStatus?.connected && (
                    <Button variant="outline" onClick={() => window.location.href = '/api/auth/google/disconnect'}>
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                AI Configuration
              </CardTitle>
              <CardDescription>Configure AI analysis and insights preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Session Transcript Analysis</h4>
                  <p className="text-sm text-gray-600">Automatically analyze session transcripts</p>
                </div>
                <Switch 
                  checked={profileData.aiSettings?.sessionAnalysis || false}
                  onCheckedChange={(checked) => handleAISettingChange('sessionAnalysis', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Progress Tracking</h4>
                  <p className="text-sm text-gray-600">AI-powered client progress insights</p>
                </div>
                <Switch 
                  checked={profileData.aiSettings?.progressTracking || false}
                  onCheckedChange={(checked) => handleAISettingChange('progressTracking', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Pattern Recognition</h4>
                  <p className="text-sm text-gray-600">Identify patterns across sessions</p>
                </div>
                <Switch 
                  checked={profileData.aiSettings?.patternRecognition || false}
                  onCheckedChange={(checked) => handleAISettingChange('patternRecognition', checked)}
                />
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">AI Providers</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Primary: OpenAI GPT-4o | Fallback: Anthropic Claude
                </p>
                <div className="flex space-x-2 mt-2">
                  <Badge variant="secondary">OpenAI Connected</Badge>
                  <Badge variant="secondary">Anthropic Connected</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Data Export
              </CardTitle>
              <CardDescription>Export your practice data and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Download className="w-6 h-6" />
                  <span>Export Session Notes</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Download className="w-6 h-6" />
                  <span>Export Client Data</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Download className="w-6 h-6" />
                  <span>Export Calendar</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Download className="w-6 h-6" />
                  <span>Export Reports</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
        <Button onClick={handleSave} disabled={updateUserMutation.isPending || userLoading}>
          {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}