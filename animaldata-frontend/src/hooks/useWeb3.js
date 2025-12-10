import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contractConfig";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 hex

export function useWeb3() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [roles, setRoles] = useState({
    isVeterinario: false,
    isTransportista: false,
    isProductor: false,
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const VETERINARIO_ROLE = ethers.id("VETERINARIO_ROLE");
  const TRANSPORTISTA_ROLE = ethers.id("TRANSPORTISTA_ROLE");
  const PRODUCTOR_ROLE = ethers.id("PRODUCTOR_ROLE");

  const checkNetwork = async () => {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    return chainId === SEPOLIA_CHAIN_ID;
  };

  const loadRoles = async (instance, user) => {
    const v = await instance.hasRole(VETERINARIO_ROLE, user);
    const t = await instance.hasRole(TRANSPORTISTA_ROLE, user);
    const p = await instance.hasRole(PRODUCTOR_ROLE, user);

    setRoles({
      isVeterinario: v,
      isTransportista: t,
      isProductor: p,
    });
  };

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const ok = await checkNetwork();
      if (!ok) {
        setError("Conéctate a Sepolia.");
        setLoading(false);
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];
      setAccount(address);

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const instance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setProvider(browserProvider);
      setSigner(signer);
      setContract(instance);

      await loadRoles(instance, address);

    } catch (err) {
      setError("Error al conectar MetaMask.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    account,
    contract,
    roles,
    error,
    loading,
    connectWallet,
  };
}
