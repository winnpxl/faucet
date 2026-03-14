import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther } from "viem";
import { useState, useEffect, useRef } from "react";
import { contractAddress, contractAbi } from "./faucetConfig";
import "./faucet.css";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

function App() {
  const { address, isConnected } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [ripple, setRipple] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getBalance",
  });

  const { data: dripAmount } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "dripAmount",
  });

  const { data: cooldownDuration } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "cooldown",
  });

  const { data: timeUntilClaim, refetch: refetchTime } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getTimeUntilNextClaim",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Live countdown timer
  useEffect(() => {
    if (timeUntilClaim !== undefined) {
      setCountdown(Number(timeUntilClaim));
    }
  }, [timeUntilClaim]);

  useEffect(() => {
    if (countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            refetchTime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [countdown]);

  async function claim(e: React.MouseEvent<HTMLButtonElement>) {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: contractAbi,
        functionName: "claim",
        gas: BigInt(100000),
      });
      setTxHash(hash);
      setTimeout(() => {
        refetchBalance();
        refetchTime();
      }, 3000);
    } catch (err: any) {
      alert(err.shortMessage || err.message || "Transaction failed");
    }
  }

  const canClaim = countdown === 0 && isConnected;
  const isBusy = isPending || isConfirming;

  function formatCountdown(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  const balanceEth = balance ? parseFloat(formatEther(balance as bigint)).toFixed(4) : "0.0000";
  const dripEth = dripAmount ? formatEther(dripAmount as bigint) : "0.01";
  const cooldownSecs = cooldownDuration ? Number(cooldownDuration) : 60;

  return (
    <div className="root">
      {/* Background effects */}
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-noise" />

      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="logo">
            <div className="logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor" opacity="0.3"/>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
                <path d="M11 7h2v2h-2zM11 11h2v6h-2z" fill="currentColor"/>
              </svg>
            </div>
            <span className="logo-text">Sepolia Faucet</span>
          </div>
          <div className="connect-wrapper">
            <ConnectButton />
          </div>
        </div>

        {/* Hero */}
        <div className="hero">
          <h1 className="hero-title">
            Get SepoliaEth tokens,<br />
            <span className="hero-accent">instantly.</span>
          </h1>
          <p className="hero-sub">
            Connect your wallet and claim {dripEth} Sepolia ETH every {cooldownSecs >= 60 ? `${cooldownSecs / 60} minute${cooldownSecs > 60 ? "s" : ""}` : `${cooldownSecs} seconds`}.
          </p>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <StatCard
            label="Faucet Balance"
            value={`${balanceEth} ETH`}
            sub="Sepolia Testnet"
          />
          <StatCard
            label="Drip Amount"
            value={`${dripEth} ETH`}
            sub="Per claim"
          />
          <StatCard
            label="Cooldown"
            value={cooldownSecs >= 60 ? `${cooldownSecs / 60}m` : `${cooldownSecs}s`}
            sub="Between claims"
          />
        </div>

        {/* Claim card */}
        <div className="claim-card">
          {/* Wallet field */}
          <div className="field-group">
            <label className="field-label">Wallet Address</label>
            <div className="field-input">
              {isConnected && address ? (
                <>
                  <div className="field-dot connected" />
                  <span className="field-address">{address}</span>
                </>
              ) : (
                <>
                  <div className="field-dot disconnected" />
                  <span className="field-placeholder">Connect your wallet above to continue</span>
                </>
              )}
            </div>
          </div>

          {/* Cooldown status */}
          {isConnected && (
            <div className="cooldown-bar-wrap">
              <div className="cooldown-bar-header">
                <span className="cooldown-label">Claim Status</span>
                <span className={`cooldown-badge ${canClaim ? "ready" : "waiting"}`}>
                  {canClaim ? "Ready" : formatCountdown(countdown)}
                </span>
              </div>
              <div className="cooldown-track">
                <div
                  className="cooldown-fill"
                  style={{
                    width: canClaim
                      ? "100%"
                      : `${((cooldownSecs - countdown) / cooldownSecs) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Claim button */}
          <button
            className={`claim-btn ${isBusy ? "busy" : ""} ${!canClaim || isBusy ? "disabled" : ""} ${ripple ? "ripple" : ""}`}
            onClick={claim}
            disabled={isBusy || !canClaim}
          >
            <span className="claim-btn-inner">
              {isPending
                ? "Confirm in wallet..."
                : isConfirming
                ? "Confirming..."
                : canClaim
                ? "Claim ETH"
                : `Wait ${formatCountdown(countdown)}`}
            </span>
            {!isBusy && canClaim && <div className="btn-glow" />}
          </button>

          {/* Tx feedback */}
          {txHash && (
            <div className="tx-feedback">
              <div className="tx-row">
                <span className="tx-label">Transaction</span>
                <a
                  className="tx-link"
                  href={"https://sepolia.etherscan.io/tx/" + txHash}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {txHash.slice(0, 18)}...{txHash.slice(-6)}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{marginLeft: 4}}>
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </a>
              </div>
              {isConfirmed && (
                <div className="tx-confirmed">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Transaction confirmed
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <a
            className="footer-link"
            href={"https://sepolia.etherscan.io/address/" + contractAddress}
            target="_blank"
            rel="noopener noreferrer"
          >
            View contract on Etherscan
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{marginLeft: 4}}>
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
