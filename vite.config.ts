import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { spawn, ChildProcess } from "child_process";

let backendProcess: ChildProcess | null = null;

function autoStartBackend() {
  return {
    name: "auto-start-backend",
    configureServer() {
      if (backendProcess) return;
      const serverDir = path.resolve(__dirname, "server");
      console.log("\n[vite] Starting backend server (port 4000)...");
      backendProcess = spawn("npm", ["run", "dev"], {
        cwd: serverDir,
        stdio: "inherit",
        shell: true,
        env: { ...process.env, SERVE_FRONTEND: "false" },
      });
      backendProcess.on("error", (err) => {
        console.error("[vite] Failed to start backend:", err.message);
      });
      const cleanup = () => { backendProcess?.kill(); backendProcess = null; };
      process.on("exit", cleanup);
      process.on("SIGINT", cleanup);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        // Retry so first requests don't fail while server is starting
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res: any) => {
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Backend server is starting, please retry in a moment" }));
          });
        },
      },
    },
  },
  plugins: [react(), autoStartBackend()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
