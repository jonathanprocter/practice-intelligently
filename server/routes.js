// server/routes.ts
import { Router } from "express";
var router = Router();
router.get("/health", (req, res) => {
  // Check if AI services are configured
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasDatabase = !!process.env.DATABASE_URL;
  
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "Practice Intelligence API",
    integrations: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      gemini: false, // Not configured
      perplexity: false, // Not configured  
      database: hasDatabase
    }
  });
});
router.get("/status", (req, res) => {
  res.json({
    status: "running",
    message: "API is operational",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});
router.get("/clients", (req, res) => {
  res.json({ message: "Clients endpoint - implementation pending" });
});
router.get("/appointments", (req, res) => {
  res.json({ message: "Appointments endpoint - implementation pending" });
});
router.get("/session-notes", (req, res) => {
  res.json({ message: "Session notes endpoint - implementation pending" });
});
var routes_default = router;
export {
  routes_default as default
};
