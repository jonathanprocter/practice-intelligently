import React, { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Appointments from "@/pages/appointments";
import Calendar from "@/pages/calendar";
import CalendarIntegration from "@/pages/calendar-integration";
import GoogleCloudSetup from "@/pages/google-cloud-setup";
import OAuthDebug from "@/pages/oauth-debug";
import SessionNotes from "@/pages/session-notes";
import ClientCheckins from "@/pages/client-checkins";
import ActionItems from "@/pages/action-items";
import Analytics from "@/pages/analytics";
import AiInsights from "@/pages/ai-insights";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import Assessments from "@/pages/assessments";
import DocumentProcessing from "@/pages/DocumentProcessing";
import ProcessingResults from "@/pages/ProcessingResults";
import ClientChart from "@/pages/ClientChart";
import SessionSummaries from "@/pages/session-summaries";
import SmartDocuments from "@/pages/smart-documents";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import CompassStable from "@/components/CompassStable";
import OAuthTestSimple from './pages/oauth-test-simple';
import OAuthQuickTest from './pages/oauth-quick-test';
import ContentViewer from './pages/content-viewer';
import ReauthGoogle from './pages/reauth-google';

const OAuthTest = lazy(() => import("./pages/oauth-test"));
const OAuthSimple = lazy(() => import("./pages/oauth-simple"));
const OAuthTroubleshoot = lazy(() => import("./pages/oauth-troubleshoot"));
const NotesManagement = lazy(() => import('./pages/notes-management'));

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-therapy-bg overflow-x-hidden touch-manipulation">
      <Sidebar />
      <div className="flex-1 lg:ml-0 min-w-0 flex flex-col relative">
        <Header />
        <main className="p-2 xs:p-3 sm:p-4 lg:p-6 flex-1 min-h-0 overflow-y-auto iphone-scroll-container safe-area-bottom">
          <div className="main-content max-w-full touch-manipulation">
            {children}
          </div>
        </main>
      </div>
      <CompassStable />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/:clientId/chart">
        {(params) => <ClientChart key={params.clientId} />}
      </Route>
      <Route path="/appointments" component={Appointments} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/calendar/integration" component={CalendarIntegration} />
      <Route path="/calendar/setup" component={GoogleCloudSetup} />
      <Route path="/oauth/debug" component={OAuthDebug} />
      <Route path="/session-notes" component={SessionNotes} />
      <Route path="/session-summaries" component={SessionSummaries} />
      {/* Progress Notes merged into Session Notes - redirect for compatibility */}
      <Route path="/progress-notes" component={SessionNotes} />
      <Route path="/document-processing" component={DocumentProcessing} />
      <Route path="/processing-results" component={ProcessingResults} />
      <Route path="/notes-management">
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <NotesManagement />
        </Suspense>
      </Route>
      <Route path="/smart-documents" component={SmartDocuments} />
      <Route path="/assessments" component={Assessments} />
      <Route path="/client-checkins" component={ClientCheckins} />
      <Route path="/action-items" component={ActionItems} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/ai-insights" component={AiInsights} />
      <Route path="/content-viewer" component={ContentViewer} />
      <Route path="/reauth-google" component={ReauthGoogle} />
      <Route path="/settings" component={Settings} />

      <Route path="/oauth-test">
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <OAuthTest />
        </Suspense>
      </Route>
      <Route path="/oauth-simple">
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <OAuthSimple />
        </Suspense>
      </Route>
      <Route path="/oauth-test-simple">
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <OAuthTestSimple />
        </Suspense>
      </Route>
      <Route path="/oauth-quick-test" component={OAuthQuickTest} />
      <Route path="/oauth-troubleshoot">
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <OAuthTroubleshoot />
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppLayout>
          <Router />
        </AppLayout>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;