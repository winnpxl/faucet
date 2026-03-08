import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, maxUint256 } from "viem";
import { useState } from "react";
import { contractAddress, contractAbi } from "./faucetConfig";

function App() {
  const { address, isConnected } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

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

  async function claim() {
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

  const canClaim = timeUntilClaim === BigInt(0);
  const isBusy = isPending || isConfirming;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        color: "#fff",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>Sepolia Faucet</h1>
      <p style={{ color: "#888", marginBottom: "32px" }}>
        Get free Sepolia testnet ETH
      </p>

      <ConnectButton />

      {isConnected && (
        <div
          style={{
            marginTop: "32px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "24px",
            width: "100%",
            maxWidth: "460px",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "#888" }}>Faucet Balance</span>
              <span>{balance ? formatEther(balance as bigint) : "0"} ETH</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "#888" }}>Drip Amount</span>
              <span>
                {dripAmount ? formatEther(dripAmount as bigint) : "0"} ETH
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#888" }}>Your Cooldown</span>
              <span style={{ color: canClaim ? "#4ade80" : "#f87171" }}>
                {canClaim
                  ? "Ready to claim"
                  : `${timeUntilClaim?.toString()}s remaining`}
              </span>
            </div>
          </div>

          <button
            onClick={claim}
            disabled={isBusy || !canClaim}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              background: isBusy || !canClaim ? "#333" : "#4f46e5",
              color: isBusy || !canClaim ? "#666" : "#fff",
              fontSize: "1rem",
              fontFamily: "monospace",
              cursor: isBusy || !canClaim ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
              ? "Confirming..."
              : "Claim ETH"}
          </button>

          {txHash && (
            <div
              style={{ marginTop: "16px", fontSize: "0.8rem", color: "#888" }}
            >
              <span>Tx: </span>
              <a
                href={"https://sepolia.etherscan.io/tx/" + txHash}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#4f46e5" }}
              >
                {txHash.slice(0, 20)}...
              </a>
              {isConfirmed && (
                <span style={{ color: "#4ade80", marginLeft: "8px" }}>
                  Confirmed
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "24px", fontSize: "0.75rem", color: "#555" }}>
        <a
          href={"https://sepolia.etherscan.io/address/" + contractAddress}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#555" }}
        >
          View contract on Etherscan
        </a>
      </div>
    </div>
  );
}

export default App;
