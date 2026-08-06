import type { Root } from "react-dom/client";
import { StrictMode } from "react";

import { App } from "@/app/app";
import { AppProviders } from "@/app/providers/app-providers";

export function mountApp(root: Root) {
  root.render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
}
