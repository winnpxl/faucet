import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

import "@rainbow-me/rainbowkit/styles.css";

import {
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia } from "wagmi/chains";

const config = getDefaultConfig({
  appName: "Testnet Faucet",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [sepolia],
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
