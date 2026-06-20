"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { Button } from "./ui/button";

export function ConnectWallet() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <div
            className={!mounted ? "pointer-events-none opacity-0" : undefined}
            aria-hidden={!mounted}
          >
            {!connected ? (
              <Button variant="primary" size="md" onClick={openConnectModal}>
                <Wallet className="h-4 w-4" />
                Connect wallet
              </Button>
            ) : chain.unsupported ? (
              <Button variant="gold" size="md" onClick={openChainModal}>
                Wrong network
              </Button>
            ) : (
              <button
                onClick={openAccountModal}
                className="flex items-center gap-2 rounded-full border border-line bg-surface py-2 pl-2.5 pr-3.5 text-sm font-medium text-ink shadow-soft transition-colors hover:border-primary-bright/40"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="font-mono">{account.displayName}</span>
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
