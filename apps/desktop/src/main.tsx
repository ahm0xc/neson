import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { ThemeProvider } from "./components/theme-provider";
import { DownloadsProvider } from "./lib/downloads-store";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <DownloadsProvider>
        <RouterProvider router={router} />
      </DownloadsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
