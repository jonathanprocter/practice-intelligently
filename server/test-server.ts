import express from "express";
import { createServer } from 'http';
import { createServer as createViteServer } from "vite";
import path from "path";

const app = express();
app.use(express.json());

(async () => {
  try {
    const server = createServer(app);
    
    // Create Vite server in middleware mode with proper settings
    const vite = await createViteServer({
      configFile: false,
      root: path.resolve(process.cwd(), "client"),
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      resolve: {
        alias: {
          "@": path.resolve(process.cwd(), "client", "src"),
          "@shared": path.resolve(process.cwd(), "shared"),
          "@assets": path.resolve(process.cwd(), "attached_assets"),
        },
      },
    });

    // Use Vite's middleware properly - no custom HTML bypass
    app.use(vite.middlewares);

    const PORT = 3001;
    server.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      console.log(`Visit http://localhost:${PORT} to test the app`);
    });

  } catch (error) {
    console.error("Failed to start test server:", error);
    process.exit(1);
  }
})();