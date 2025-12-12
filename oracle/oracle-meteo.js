// oracle/oracle-meteo.js
import "dotenv/config";
import { ethers } from "ethers";
import fetch from "node-fetch";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractConfig.js";

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!RPC_URL || !PRIVATE_KEY) {
  console.error("Faltan RPC_URL o PRIVATE_KEY en .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

async function obtenerMeteo(zona, fecha) {
  console.log(`Llamando API meteo (mock) para zona="${zona}", fecha="${fecha}"`);
  const temperatura = 28;
  const alerta = false;
  const ok = true;
  return { temperatura, alerta, ok };
}

async function main() {
  console.log("Oráculo meteo escuchando en Sepolia...");
  console.log("Bot address:", await wallet.getAddress());

  contract.on(
    "ValidacionMeteoSolicitada",
    async (animalId, indexEvento, zona, fecha, event) => {
      try {
        console.log("🛰  Solicitud meteo:", {
          animalId: animalId.toString(),
          indexEvento: indexEvento.toString(),
          zona,
          fecha,
        });

        const { temperatura, alerta, ok } = await obtenerMeteo(zona, fecha);

        const tx = await contract.completarValidacionMeteo(
          animalId,
          indexEvento,
          temperatura,
          alerta,
          ok
        );

        console.log("   → Tx enviada:", tx.hash);
        await tx.wait();
        console.log("   → Validación meteo completada ✅");
      } catch (err) {
        console.error("   ✖ Error procesando solicitud meteo:", err);
      }
    }
  );
}

main().catch(console.error);
