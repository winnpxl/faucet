import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";

import { contractAddress, contractAbi } from "./faucetConfig";

function App() {
  const { address, isConnected } = useAccount();

  const { data: balance } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getBalance",
  });

  const { data: cooldown } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "cooldownTime",
  });

  const { writeContractAsync } = useWriteContract();

  async function claim() {
    try {
      const tx = await writeContractAsync({
        address: contractAddress,
        abi: contractAbi,
        functionName: "claim",
      });

      alert("Transaction sent: " + tx);
    } catch (err: any) {
      alert(err.shortMessage || "Transaction failed");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>🚰 Testnet Faucet</h2>

      <ConnectButton />

      {isConnected && (
        <>
          <p>Connected: {address}</p>

          <p>
            Contract Balance:{" "}
            {balance ? formatEther(balance as bigint) : "0"} ETH
          </p>

          <p>Cooldown: {cooldown?.toString()} seconds</p>

          <button onClick={claim}>Claim ETH</button>
        </>
      )}
    </div>
  );
}

export default App;
