import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupGlobalErrorHandling } from "./utils/errorHandler";
import { ApiClient } from "./lib/api";

// Setup global error handling
setupGlobalErrorHandling();

// Initialize therapist ID early to prevent constant fallback warnings
// This ensures stable operation during development
ApiClient.getTherapistId();

createRoot(document.getElementById("root")!).render(<App />);
