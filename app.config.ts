import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  tsr: {
    appDirectory: "src",
  },
  vite: {
    plugins: [
      TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
  },
});
