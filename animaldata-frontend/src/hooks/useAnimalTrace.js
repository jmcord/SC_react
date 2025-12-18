// src/hooks/useAnimalTrace.js
import { useState, useEffect, useMemo, useCallback } from "react";
import { ethers } from "ethers";
import AnimalDataTrace from "../contracts/AnimalDataTrace.json";

const EMPTY_ROLES = {
  isAdmin: false,
  isVeterinario: false,
  isTransportista: false,
  isProductor: false,
  isOracle: false,
};

export function useAnimalTrace() {
  // ─────────────────────────────────────────
  // 1️⃣ ESTADOS
  // ─────────────────────────────────────────
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [roles, setRoles] = useState(EMPTY_ROLES);

  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────
  // 2️⃣ CONECTAR WALLET (manual)
  // ─────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask no disponible");
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);

      const s = await p.getSigner();
      const addr = await s.getAddress();

      setProvider(p);
      setSigner(s);
      setAccount(addr);
    } catch (e) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Error al conectar wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────
  // 3️⃣ LISTENERS DE METAMASK (AUTO)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        setAccount(null);
        setSigner(null);
        setProvider(null);
        setRoles(EMPTY_ROLES);
        return;
      }

      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();

      setProvider(p);
      setSigner(s);
      setAccount(accounts[0]);
    };

    const handleChainChanged = () => {
      // Recomendación MetaMask
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // ─────────────────────────────────────────
  // 4️⃣ CONTRATOS (read / write)
  // ─────────────────────────────────────────
  const contractRead = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(
      AnimalDataTrace.address,
      AnimalDataTrace.abi,
      provider
    );
  }, [provider]);

  const contractWrite = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(
      AnimalDataTrace.address,
      AnimalDataTrace.abi,
      signer
    );
  }, [signer]);

  // ─────────────────────────────────────────
  // 5️⃣ CARGAR ROLES (cada vez que cambia cuenta/contrato)
  // ─────────────────────────────────────────
  useEffect(() => {
    const loadRoles = async () => {
      if (!account || !contractRead) {
        setRoles(EMPTY_ROLES);
        return;
      }

      try {
        // Si tus roles son public bytes32, esto funciona:
        const [
          adminRole,
          vetRole,
          transRole,
          prodRole,
          oracleRole,
        ] = await Promise.all([
          contractRead.DEFAULT_ADMIN_ROLE(),
          contractRead.VETERINARIO_ROLE(),
          contractRead.TRANSPORTISTA_ROLE(),
          contractRead.PRODUCTOR_ROLE(),
          contractRead.ORACLE_ROLE(),
        ]);

        const [
          isAdmin,
          isVeterinario,
          isTransportista,
          isProductor,
          isOracle,
        ] = await Promise.all([
          contractRead.hasRole(adminRole, account),
          contractRead.hasRole(vetRole, account),
          contractRead.hasRole(transRole, account),
          contractRead.hasRole(prodRole, account),
          contractRead.hasRole(oracleRole, account),
        ]);

        setRoles({ isAdmin, isVeterinario, isTransportista, isProductor, isOracle });
      } catch (e) {
        console.error("Error cargando roles:", e);
        setRoles(EMPTY_ROLES);
      }
    };

    loadRoles();
  }, [account, contractRead]);

  // ─────────────────────────────────────────
  // 6️⃣ FUNCIÓN: TRANSPORTE CON METEO (write)
  // ─────────────────────────────────────────
  const registrarTransporteConMeteo = useCallback(
    async (id, descripcion, fecha, ipfsHash, zona) => {
      if (!contractWrite) throw new Error("Contrato no inicializado");

      setTxLoading(true);
      setError(null);

      try {
        const tx = await contractWrite.registrarTransporteConMeteo(
          id,
          descripcion,
          fecha,
          ipfsHash,
          zona
        );
        await tx.wait();
      } catch (e) {
        console.error(e);
        setError(e?.reason || e?.shortMessage || "Error al registrar transporte con meteo");
      } finally {
        setTxLoading(false);
      }
    },
    [contractWrite]
  );

  // ─────────────────────────────────────────
  // 7️⃣ DEVOLVER API DEL HOOK
  // ─────────────────────────────────────────
  return {
    account,
    roles,
    loading,
    txLoading,
    error,
    connectWallet,
    registrarTransporteConMeteo,
  };
}
