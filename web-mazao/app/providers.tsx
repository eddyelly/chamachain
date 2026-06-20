"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { Toaster } from "sonner";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi";

const chamaTheme = lightTheme({
  accentColor: "#1f7a3d",
  accentColorForeground: "#f4faf2",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={chamaTheme} initialChain={wagmiConfig.chains[0]}>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-surface !border !border-line !text-ink !rounded-2xl !shadow-[0_2px_6px_rgba(33,28,23,0.06),0_24px_60px_-20px_rgba(33,28,23,0.22)] !font-sans",
                description: "!text-ink-soft",
                actionButton: "!bg-primary !text-cream",
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
