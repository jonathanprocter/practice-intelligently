import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import App from "./App.tsx";
import Dashboard from "./pages/dashboard.tsx";
import Clients from "./pages/clients.tsx";
import Appointments from "./pages/appointments.tsx";
import SessionNotes from "./pages/session-notes.tsx";
import ProgressNotes from "./pages/progress-notes.tsx";
import ActionItems from "./pages/action-items.tsx";
import Calendar from "./pages/calendar.tsx";
import Analytics from "./pages/analytics.tsx";
import ClientChart from "./pages/ClientChart.tsx";
import Assessments from "./pages/assessments.tsx";
import Settings from "./pages/settings.tsx";
import AIInsights from "./pages/ai-insights.tsx";
import ClientCheckins from "./pages/client-checkins.tsx";
import NotFound from "./pages/not-found.tsx";
import CalendarIntegration from "./pages/calendar-integration.tsx";
import SessionSummaries from "./pages/session-summaries.tsx";
import SmartDocuments from "./pages/smart-documents.tsx";
import DocumentProcessing from "./pages/DocumentProcessing.tsx";
import ProcessingResults from "./pages/ProcessingResults.tsx";
import NotesManagement from "./pages/notes-management.tsx";
import ContentViewer from "./pages/content-viewer.tsx";

// OAuth test pages
import OAuthTest from "./pages/oauth-test.tsx";
import OAuthDebug from "./pages/oauth-debug.tsx";
import OAuthQuickTest from "./pages/oauth-quick-test.tsx";
import OAuthSimple from "./pages/oauth-simple.tsx";
import OAuthTroubleshoot from "./pages/oauth-troubleshoot.tsx";
import OAuthTestSimple from "./pages/oauth-test-simple.tsx";
import ReauthGoogle from "./pages/reauth-google.tsx";
import GoogleCloudSetup from "./pages/google-cloud-setup.tsx";

import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/ErrorBoundary";

// Global error handler for network issues
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Failed to fetch')) {
    console.warn('Network request failed, but continuing...', event.reason);
    event.preventDefault(); // Prevent the error from showing in console
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry network errors more than once
        if (error?.message?.includes('Failed to fetch')) {
          return failureCount < 1;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="session-notes" element={<SessionNotes />} />
              <Route path="progress-notes" element={<ProgressNotes />} />
              <Route path="action-items" element={<ActionItems />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="client-chart/:clientId" element={<ClientChart />} />
              <Route path="assessments" element={<Assessments />} />
              <Route path="settings" element={<Settings />} />
              <Route path="ai-insights" element={<AIInsights />} />
              <Route path="client-checkins" element={<ClientCheckins />} />
              <Route path="calendar-integration" element={<CalendarIntegration />} />
              <Route path="session-summaries" element={<SessionSummaries />} />
              <Route path="smart-documents" element={<SmartDocuments />} />
              <Route path="document-processing" element={<DocumentProcessing />} />
              <Route path="processing-results" element={<ProcessingResults />} />
              <Route path="notes-management" element={<NotesManagement />} />
              <Route path="content-viewer" element={<ContentViewer />} />

              {/* OAuth test routes */}
              <Route path="oauth-test" element={<OAuthTest />} />
              <Route path="oauth-debug" element={<OAuthDebug />} />
              <Route path="oauth-quick-test" element={<OAuthQuickTest />} />
              <Route path="oauth-simple" element={<OAuthSimple />} />
              <Route path="oauth-troubleshoot" element={<OAuthTroubleshoot />} />
              <Route path="oauth-test-simple" element={<OAuthTestSimple />} />
              <Route path="reauth-google" element={<ReauthGoogle />} />
              <Route path="google-cloud-setup" element={<GoogleCloudSetup />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);