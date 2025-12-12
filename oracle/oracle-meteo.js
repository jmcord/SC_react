import "dotenv/config";
import { ethers } from "ethers";
import fetch from "node-fetch";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractConfig.js";

// ─────────────────────────────────────────────
// Provider + Wallet
// ─────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  wallet
);

console.log("🛰 Oráculo meteo iniciado");
console.log("Bot address:", wallet.address);

// ─────────────────────────────────────────────
// Geocoding: zona → lat/lon
// ─────────────────────────────────────────────
async function geocode(zona) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("Falta OPENWEATHER_API_KEY");

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    zona
  )}&limit=1&appid=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding error ${res.status}`);
  }

  const data = await res.json();
  if (!data.length) {
    throw new Error(`No se pudo geocodificar zona: ${zona}`);
  }

  return {
    lat: data[0].lat,
    lon: data[0].lon,
  };
}

// ─────────────────────────────────────────────
// Meteo real (One Call 3.0)
// ─────────────────────────────────────────────
async function obtenerMeteo(zona) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("Falta OPENWEATHER_API_KEY");

  const { lat, lon } = await geocode(zona);

  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`OneCall error ${res.status}`);
  }

  const data = await res.json();

  const temperatura = Math.round(data.current.temp);

  const alertaAPI =
    Array.isArray(data.alerts) && data.alerts.length > 0;

  const alertaTemp = temperatura >= 32 || temperatura <= 0;

  const alerta = alertaAPI || alertaTemp;
  const ok = !alerta;

  return { temperatura, alerta, ok };
}

// ─────────────────────────────────────────────
// Listener del contrato
// ─────────────────────────────────────────────
contract.on(
  "ValidacionMeteoSolicitada",
  async (animalId, indexEvento, zona, fecha) => {
    console.log("🛰 Solicitud meteo:", {
      animalId: animalId.toString(),
      indexEvento: indexEvento.toString(),
      zona,
      fecha,
    });

    try {
      const { temperatura, alerta, ok } = await obtenerMeteo(zona);

      console.log("🌦 Meteo real:", {
        temperatura,
        alerta,
        ok,
      });

      const tx = await contract.completarValidacionMeteo(
        animalId,
        indexEvento,
        temperatura,
        alerta,
        ok
      );

      console.log("→ Tx enviada:", tx.hash);
      await tx.wait();
      console.log("→ Validación meteo completada ✅");
    } catch (err) {
      console.error("❌ Error en oráculo:", err.message);
    }
  }
);

console.log("👂 Escuchando eventos ValidacionMeteoSolicitada...");
