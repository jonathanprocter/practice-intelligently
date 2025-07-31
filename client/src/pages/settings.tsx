import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Calendar, Shield, Palette, Download } from "lucide-react";
import drProctorAvatar from "@assets/generated-image (1)_1753977205405.png";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    setLoading(true);
    try {
      // OAuth flow will be implemented here
      window.location.href = '/api/auth/google';
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Google Calendar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                  <Input id="name" defaultValue="Dr. Jonathan Procter" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Professional Title</Label>
                  <Input id="title" defaultValue="Licensed Therapist" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="dr.procter@practice.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="practice">Practice Name</Label>
                <Input id="practice" defaultValue="Procter Therapy Practice" />
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
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Action Item Alerts</h4>
                  <p className="text-sm text-gray-600">Notifications for overdue action items</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">AI Insights</h4>
                  <p className="text-sm text-gray-600">Weekly AI-generated practice insights</p>
                </div>
                <Switch defaultChecked />
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
                  <Badge variant="outline">Not Connected</Badge>
                  <Button onClick={connectGoogleCalendar} disabled={loading}>
                    Connect
                  </Button>
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
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Progress Tracking</h4>
                  <p className="text-sm text-gray-600">AI-powered client progress insights</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Pattern Recognition</h4>
                  <p className="text-sm text-gray-600">Identify patterns across sessions</p>
                </div>
                <Switch defaultChecked />
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
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}