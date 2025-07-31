import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Appointments from "@/pages/appointments";
import Calendar from "@/pages/calendar";
import SessionNotes from "@/pages/session-notes";
import ActionItems from "@/pages/action-items";
import Analytics from "@/pages/analytics";
import AiInsights from "@/pages/ai-insights";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-therapy-bg">
      <Sidebar />
      <div className="flex-1 lg:ml-0">
        <Header />
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/session-notes" component={SessionNotes} />
      <Route path="/action-items" component={ActionItems} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/ai-insights" component={AiInsights} />
      <Route path="/settings" component={Settings} />
      <Route path="/oauth-debug" component={() => import('./pages/oauth-debug').then(m => m.default)} />
      <Route path="/oauth-test" component={() => import('./pages/oauth-test').then(m => m.default)} />
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
