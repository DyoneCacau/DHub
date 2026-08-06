import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { envBootstrap } from "@/config/env";
import { ConfigErrorState } from "@/features/auth/components/auth-states";

import "@/styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento #root não encontrado");
}

const root = createRoot(rootElement);

if (!envBootstrap.ok) {
  root.render(
    <StrictMode>
      <ConfigErrorState message={envBootstrap.message} />
    </StrictMode>,
  );
} else {
  void import("@/app/bootstrap").then(({ mountApp }) => {
    mountApp(root);
  });
}
