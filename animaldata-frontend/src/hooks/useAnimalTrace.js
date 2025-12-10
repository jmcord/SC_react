// src/hooks/useAnimalTrace.js
import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../contractConfig";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const VETERINARIO_ROLE = ethers.id("VETERINARIO_ROLE");
const TRANSPORTISTA_ROLE = ethers.id("TRANSPORTISTA_ROLE");
const PRODUCTOR_ROLE = ethers.id("PRODUCTOR_ROLE");

export function useAnimalTrace() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [roles, setRoles] = useState({
    isAdmin: false,
    isVeterinario: false,
    isTransportista: false,
    isProductor: false,
  });
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        setError("MetaMask no está instalado.");
        return;
      }

      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setError("Conéctate a Sepolia en MetaMask.");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const addr = accounts[0];
      setAccount(addr);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const instance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(instance);

      // leer roles con hasRole
      const [isAdmin, isVet, isTransp, isProd] = await Promise.all([
        instance.hasRole(DEFAULT_ADMIN_ROLE, addr),
        instance.hasRole(VETERINARIO_ROLE, addr),
        instance.hasRole(TRANSPORTISTA_ROLE, addr),
        instance.hasRole(PRODUCTOR_ROLE, addr),
      ]);

      setRoles({
        isAdmin,
        isVeterinario: isVet,
        isTransportista: isTransp,
        isProductor: isProd,
      });
    } catch (e) {
      console.error(e);
      setError("Error al conectar la wallet.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- Escrituras ----------

  const registrarAnimal = useCallback(
    async (id, especie, propietario) => {
      if (!contract) throw new Error("Contrato no inicializado");
      setTxLoading(true);
      setError(null);
      try {
        const tx = await contract.registrarAnimal(id, especie, propietario);
        await tx.wait();
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al registrar animal.");
      } finally {
        setTxLoading(false);
      }
    },
    [contract]
  );

  const registrarVacunacion = useCallback(
    async (id, descripcion, fecha, ipfsHash, validadoIA) => {
      if (!contract) throw new Error("Contrato no inicializado");
      setTxLoading(true);
      setError(null);
      try {
        const tx = await contract.registrarVacunacion(
          id,
          descripcion,
          fecha,
          ipfsHash,
          validadoIA
        );
        await tx.wait();
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al registrar vacunación.");
      } finally {
        setTxLoading(false);
      }
    },
    [contract]
  );

  const registrarTransporte = useCallback(
    async (id, descripcion, fecha, ipfsHash, validadoIA) => {
      if (!contract) throw new Error("Contrato no inicializado");
      setTxLoading(true);
      setError(null);
      try {
        const tx = await contract.registrarTransporte(
          id,
          descripcion,
          fecha,
          ipfsHash,
          validadoIA
        );
        await tx.wait();
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al registrar transporte.");
      } finally {
        setTxLoading(false);
      }
    },
    [contract]
  );

  const registrarAlimentacion = useCallback(
    async (id, descripcion, fecha, ipfsHash, validadoIA) => {
      if (!contract) throw new Error("Contrato no inicializado");
      setTxLoading(true);
      setError(null);
      try {
        const tx = await contract.registrarAlimentacion(
          id,
          descripcion,
          fecha,
          ipfsHash,
          validadoIA
        );
        await tx.wait();
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al registrar alimentación.");
      } finally {
        setTxLoading(false);
      }
    },
    [contract]
  );

  // ---------- Asignar roles (solo ADMIN) ----------

  const asignarVeterinario = useCallback(
    async (address) => {
      if (!contract) throw new Error("Contrato no inicializado");
      setTxLoading(true);
      setError(null);
      try {
        const tx = await contract.grantRole(VETERINARIO_ROLE, address);
        await tx.wait();
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al asignar rol VETERINARIO.");
      } finally {
        setTxLoading(false);
      }
    },
    [contract]
  );

  const asignarTransportista = useCallback(
    async (address) => {
      if (!contract) throw new Error("Contrato no inicializado");
      setTxLoading(true);
      setError(null);
      try {
        const tx = await contract.grantRole(TRANSPORTISTA_ROLE, address);
        await tx.wait();
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al asignar rol TRANSPORTISTA.");
      } finally {
        setTxLoading(false);
      }
    },
    [contract]
  );

  const asignarProductor = useCallback(
    async (address) => {
      if (!contract) throw new Error("Contrato no inicializado");
      setTxLoading(true);
      setError(null);
      try {
        const tx = await contract.grantRole(PRODUCTOR_ROLE, address);
        await tx.wait();
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al asignar rol PRODUCTOR.");
      } finally {
        setTxLoading(false);
      }
    },
    [contract]
  );

  // ---------- Lecturas ----------

  const obtenerHistorial = useCallback(
    async (id) => {
      if (!contract) throw new Error("Contrato no inicializado");
      try {
        const eventos = await contract.obtenerHistorial(id);
        return eventos.map((ev) => ({
          tipo: ev.tipo,
          descripcion: ev.descripcion,
          fecha: ev.fecha,
          responsable: ev.responsable,
          ipfsHash: ev.ipfsHash,
          validadoIA: ev.validadoIA,
        }));
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al obtener historial.");
        return [];
      }
    },
    [contract]
  );

  const obtenerAnimal = useCallback(
    async (id) => {
      if (!contract) throw new Error("Contrato no inicializado");
      try {
        const a = await contract.obtenerAnimal(id);
        return {
          id: a.id,
          especie: a.especie,
          propietario: a.propietario,
          existe: a.existe,
        };
      } catch (e) {
        console.error(e);
        setError(e.reason || "Error al obtener animal.");
        return null;
      }
    },
    [contract]
  );

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
    registrarAlimentacion,
    obtenerHistorial,
    obtenerAnimal,
    asignarVeterinario,
    asignarTransportista,
    asignarProductor,
  };
}
