import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tsconfigPaths(), tailwindcss()],
    server: {
        port: 8080,
    },
    
});
