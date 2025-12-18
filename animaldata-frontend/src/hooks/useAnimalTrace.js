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
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [roles, setRoles] = useState(EMPTY_ROLES);

  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1) Conectar wallet (manual)
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

  // 2) Listeners MetaMask (auto)
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

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // 3) Contratos read/write
  const contractRead = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(AnimalDataTrace.address, AnimalDataTrace.abi, provider);
  }, [provider]);

  const contractWrite = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(AnimalDataTrace.address, AnimalDataTrace.abi, signer);
  }, [signer]);

  // 4) Cargar roles
  useEffect(() => {
    const loadRoles = async () => {
      if (!account || !contractRead) {
        setRoles(EMPTY_ROLES);
        return;
      }
      try {
        const [adminRole, vetRole, transRole, prodRole, oracleRole] = await Promise.all([
          contractRead.DEFAULT_ADMIN_ROLE(),
          contractRead.VETERINARIO_ROLE(),
          contractRead.TRANSPORTISTA_ROLE(),
          contractRead.PRODUCTOR_ROLE(),
          contractRead.ORACLE_ROLE(),
        ]);

        const [isAdmin, isVeterinario, isTransportista, isProductor, isOracle] =
          await Promise.all([
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

  // ─────────────────────────────
  // Helpers
  // ─────────────────────────────
  const requireWrite = () => {
    if (!contractWrite) throw new Error("Contrato no inicializado (conecta wallet)");
    return contractWrite;
  };
  const requireRead = () => {
    if (!contractRead) throw new Error("Contrato no inicializado (provider)");
    return contractRead;
  };

  // ─────────────────────────────
  // ESCRITURAS (tx)
  // ─────────────────────────────

  const registrarAnimal = useCallback(async (id, especie, propietario) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try {
      const tx = await c.registrarAnimal(id, especie, propietario);
      await tx.wait();
    } catch (e) {
      console.error(e);
      setError(e?.reason || e?.shortMessage || "Error al registrar animal");
    } finally {
      setTxLoading(false);
    }
  }, [contractWrite]);

  const registrarVacunacion = useCallback(async (id, descripcion, fecha, ipfsHash, validadoIA) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try {
      const tx = await c.registrarVacunacion(id, descripcion, fecha, ipfsHash, validadoIA);
      await tx.wait();
    } catch (e) {
      console.error(e);
      setError(e?.reason || e?.shortMessage || "Error al registrar vacunación");
    } finally {
      setTxLoading(false);
    }
  }, [contractWrite]);

  const registrarTransporte = useCallback(async (id, descripcion, fecha, ipfsHash, validadoIA) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try {
      const tx = await c.registrarTransporte(id, descripcion, fecha, ipfsHash, validadoIA);
      await tx.wait();
    } catch (e) {
      console.error(e);
      setError(e?.reason || e?.shortMessage || "Error al registrar transporte");
    } finally {
      setTxLoading(false);
    }
  }, [contractWrite]);

  const registrarTransporteConMeteo = useCallback(async (id, descripcion, fecha, ipfsHash, zona) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try {
      const tx = await c.registrarTransporteConMeteo(id, descripcion, fecha, ipfsHash, zona);
      await tx.wait();
    } catch (e) {
      console.error(e);
      setError(e?.reason || e?.shortMessage || "Error al registrar transporte con meteo");
    } finally {
      setTxLoading(false);
    }
  }, [contractWrite]);

  const registrarAlimentacion = useCallback(async (id, descripcion, fecha, ipfsHash, validadoIA) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try {
      const tx = await c.registrarAlimentacion(id, descripcion, fecha, ipfsHash, validadoIA);
      await tx.wait();
    } catch (e) {
      console.error(e);
      setError(e?.reason || e?.shortMessage || "Error al registrar alimentación");
    } finally {
      setTxLoading(false);
    }
  }, [contractWrite]);

  // Roles (admin)
  const asignarVeterinario = useCallback(async (addr) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try { const tx = await c.asignarVeterinario(addr); await tx.wait(); }
    catch (e) { console.error(e); setError(e?.reason || e?.shortMessage || "Error asignar veterinario"); }
    finally { setTxLoading(false); }
  }, [contractWrite]);

  const asignarTransportista = useCallback(async (addr) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try { const tx = await c.asignarTransportista(addr); await tx.wait(); }
    catch (e) { console.error(e); setError(e?.reason || e?.shortMessage || "Error asignar transportista"); }
    finally { setTxLoading(false); }
  }, [contractWrite]);

  const asignarProductor = useCallback(async (addr) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try { const tx = await c.asignarProductor(addr); await tx.wait(); }
    catch (e) { console.error(e); setError(e?.reason || e?.shortMessage || "Error asignar productor"); }
    finally { setTxLoading(false); }
  }, [contractWrite]);

  const asignarOracle = useCallback(async (addr) => {
    const c = requireWrite();
    setTxLoading(true); setError(null);
    try { const tx = await c.asignarOracle(addr); await tx.wait(); }
    catch (e) { console.error(e); setError(e?.reason || e?.shortMessage || "Error asignar oracle"); }
    finally { setTxLoading(false); }
  }, [contractWrite]);

  // ─────────────────────────────
  // LECTURAS (view)
  // ─────────────────────────────
  const obtenerAnimal = useCallback(async (id) => {
    const c = requireRead();
    return await c.obtenerAnimal(id);
  }, [contractRead]);

  const obtenerHistorial = useCallback(async (id) => {
    const c = requireRead();
    return await c.obtenerHistorial(id);
  }, [contractRead]);

  // ─────────────────────────────
  // RETURN
  // ─────────────────────────────
  return {
    account,
    roles,
    loading,
    txLoading,
    error,

    connectWallet,

    registrarAnimal,
    registrarVacunacion,
    registrarTransporte,
    registrarTransporteConMeteo,
    registrarAlimentacion,

    obtenerHistorial,
    obtenerAnimal,

    asignarVeterinario,
    asignarTransportista,
    asignarProductor,
    asignarOracle,
  };
}
