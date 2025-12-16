import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { ethers } from "ethers";
import { fileURLToPath } from "url";
// ─────────────────────────────────────────────
// Carga contracts JSON (address + abi)
// ─────────────────────────────────────────────


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const animalTraceJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "contracts", "AnimalDataTrace.json"),
    "utf-8"
  )
);

const oraculoJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "contracts", "OraculoMeteo.json"),
    "utf-8"
  )
);

// ─────────────────────────────────────────────
// Provider + Wallet
// ─────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const animalTrace = new ethers.Contract(
  animalTraceJson.address,
  animalTraceJson.abi,
  provider // read-only para escuchar + leer
);

const oraculo = new ethers.Contract(
  oraculoJson.address,
  oraculoJson.abi,
  wallet // signer para escribir
);

console.log("🛰 Oráculo meteo iniciado");
console.log("Bot address:", wallet.address);
console.log("AnimalDataTrace:", animalTraceJson.address);
console.log("OraculoMeteo:", oraculoJson.address);

// ─────────────────────────────────────────────
// Estado persistente (recovery)
// ─────────────────────────────────────────────
const STATE_FILE = process.env.STATE_FILE || "./state.json";

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const s = JSON.parse(raw);
    return { lastProcessedBlock: Number(s.lastProcessedBlock || 0) };
  } catch {
    return { lastProcessedBlock: 0 };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─────────────────────────────────────────────
// IPFS Pinning (Pinata JWT)
// ─────────────────────────────────────────────
async function uploadJsonToIPFS(json) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("Falta PINATA_JWT en .env");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ pinataContent: json }),
  });

  if (!res.ok) {
    throw new Error(`IPFS upload failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.IpfsHash; // CID
}

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
  if (!res.ok) throw new Error(`Geocoding error ${res.status}`);

  const data = await res.json();
  if (!data.length) throw new Error(`No se pudo geocodificar zona: ${zona}`);

  return { lat: data[0].lat, lon: data[0].lon, name: data[0].name, country: data[0].country };
}

// ─────────────────────────────────────────────
// Meteo real (One Call 3.0) + cálculo alerta
// ─────────────────────────────────────────────
async function obtenerMeteo(zona) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("Falta OPENWEATHER_API_KEY");

  const geo = await geocode(zona);

  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${geo.lat}&lon=${geo.lon}&units=metric&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OneCall error ${res.status}`);

  const data = await res.json();

  const temperatura = Math.round(data.current.temp);
  const alertaAPI = Array.isArray(data.alerts) && data.alerts.length > 0;
  const alertaTemp = temperatura >= 32 || temperatura <= 0;

  const alerta = alertaAPI || alertaTemp;
  const ok = !alerta;

  // guardamos un "raw mínimo" para metadata (no metas tu API key nunca)
  const oracleMeta = {
    source: "openweathermap-onecall-3.0",
    geocoding: {
      query: zona,
      resolved: { lat: geo.lat, lon: geo.lon, name: geo.name, country: geo.country },
    },
    computed: { temperatura, alertaAPI, alertaTemp, alerta, ok },
    snapshot: {
      dt: data.current?.dt,
      temp: data.current?.temp,
      humidity: data.current?.humidity,
      wind_speed: data.current?.wind_speed,
      weather: data.current?.weather?.[0]?.main,
    },
    hasAlerts: alertaAPI,
    alerts: alertaAPI
      ? data.alerts.map((a) => ({
          event: a.event,
          start: a.start,
          end: a.end,
          sender_name: a.sender_name,
        }))
      : [],
  };

  return { temperatura, alerta, ok, oracleMeta };
}

// ─────────────────────────────────────────────
// Construcción metadata IPFS del evento meteo
// ─────────────────────────────────────────────
function buildMeteoEventMetadata({ animalId, indexEvento, zona, fecha, temperatura, alerta, ok, oracleMeta, chainHint }) {
  return {
    name: `Evento ${indexEvento} – METEO`,
    description: "Validación meteorológica automática (oráculo off-chain + evidencia IPFS).",
    attributes: [
      { trait_type: "AnimalId", value: Number(animalId) },
      { trait_type: "IndexEvento", value: Number(indexEvento) },
      { trait_type: "Zona", value: zona },
      { trait_type: "Fecha", value: fecha },
      { trait_type: "Temperatura", value: temperatura },
      { trait_type: "Alerta", value: alerta },
      { trait_type: "OK", value: ok },
    ],
    properties: {
      animalId: Number(animalId),
      indexEvento: Number(indexEvento),
      tipo: "METEO_VALIDATION",
      input: { zona, fecha },
      oracle: oracleMeta,
      chainHint,
    },
  };
}

// ─────────────────────────────────────────────
// Idempotencia: si ya hay ipfsMeteoHash, saltar
// ─────────────────────────────────────────────
async function yaProcesado(animalId, indexEvento) {
  // obtenerHistorial devuelve array de struct Evento
  // IMPORTANTE: esto puede ser pesado si el historial es enorme; en tu caso está ok.
  const historial = await animalTrace.obtenerHistorial(animalId);
  const ev = historial[Number(indexEvento)];
  const ipfsMeteoHash = ev.ipfsMeteoHash ?? ev[5]; // por si el decoder cambia; mejor con nombre

  return typeof ipfsMeteoHash === "string" && ipfsMeteoHash.length > 0;
}

// ─────────────────────────────────────────────
// Procesamiento de una solicitud
// ─────────────────────────────────────────────
async function procesarSolicitud({ animalId, indexEvento, zona, fecha, requestedTx, requestedBlock }) {
  const aId = animalId.toString();
  const iEv = indexEvento.toString();

  console.log("🛰 Solicitud meteo:", { animalId: aId, indexEvento: iEv, zona, fecha });

  // idempotencia
  try {
    if (await yaProcesado(animalId, indexEvento)) {
      console.log("↪ Ya procesado (ipfsMeteoHash existe). Saltando:", { animalId: aId, indexEvento: iEv });
      return;
    }
  } catch (e) {
    // si falla la lectura, seguimos pero lo logueamos
    console.warn("⚠️ No pude comprobar idempotencia leyendo historial:", e.message);
  }

  const { temperatura, alerta, ok, oracleMeta } = await obtenerMeteo(zona);

  console.log("🌦 Meteo real:", { temperatura, alerta, ok });

  // 1) Subir evidencia a IPFS
  const metadata = buildMeteoEventMetadata({
    animalId: Number(aId),
    indexEvento: Number(iEv),
    zona,
    fecha,
    temperatura,
    alerta,
    ok,
    oracleMeta,
    chainHint: {
      network: "sepolia",
      animalDataTrace: animalTraceJson.address,
      oraculoMeteo: oraculoJson.address,
      requestedTx,
      requestedBlock,
      botAddress: wallet.address,
      ts: new Date().toISOString(),
    },
  });

  const cid = await uploadJsonToIPFS(metadata);
  const ipfsMeteoHash = `ipfs://${cid}`;
  console.log("🧩 IPFS CID meteo:", ipfsMeteoHash);

  // 2) Escribir on-chain vía OraculoMeteo (2 tx)
  const tx1 = await oraculo.reportarMeteo(animalId, indexEvento, temperatura, alerta, ok);
  console.log("→ Tx reportarMeteo:", tx1.hash);
  await tx1.wait(1);

  const tx2 = await oraculo.reportarMeteoCID(animalId, indexEvento, ipfsMeteoHash);
  console.log("→ Tx reportarMeteoCID:", tx2.hash);
  await tx2.wait(1);

  console.log("✅ Validación meteo + CID completados:", { animalId: aId, indexEvento: iEv });
}

// ─────────────────────────────────────────────
// Recovery: re-scan de logs desde lastProcessedBlock
// ─────────────────────────────────────────────
async function recoveryScan() {
  const state = loadState();
  const latest = await provider.getBlockNumber();
  const start = Number(process.env.START_BLOCK || 0);

  let fromBlock = Math.max(state.lastProcessedBlock + 1, start);
  const toBlock = latest;

  if (fromBlock > toBlock) {
    console.log("🧠 Recovery: nada que escanear.");
    return;
  }

  const STEP = 10; // Alchemy Free tier limit

  console.log(`🧠 Recovery scan (chunked): ${fromBlock} → ${toBlock} (step=${STEP})`);

  const filter = animalTrace.filters.ValidacionMeteoSolicitada();

  while (fromBlock <= toBlock) {
    const end = Math.min(fromBlock + STEP - 1, toBlock);

    try {
      const logs = await animalTrace.queryFilter(filter, fromBlock, end);

      for (const log of logs) {
        const { animalId, indexEvento, zona, fecha } = log.args;

        try {
          await procesarSolicitud({
            animalId,
            indexEvento,
            zona,
            fecha,
            requestedTx: log.transactionHash,
            requestedBlock: log.blockNumber,
          });
        } catch (err) {
          console.error("❌ Error procesando log (recovery):", err.message);
        }
      }

      // Guarda progreso por chunk (así si se cae, reanuda casi donde iba)
      saveState({ lastProcessedBlock: end });
    } catch (err) {
      // Si por lo que sea Alchemy cambia el límite o hay rate limit, lo verás aquí
      console.error(`❌ Error eth_getLogs chunk ${fromBlock}-${end}:`, err?.shortMessage || err?.message);
      // Avanza igual 10 bloques para no quedarte bloqueado (opcional)
      saveState({ lastProcessedBlock: end });
    }

    fromBlock = end + 1;
  }

  console.log("🧠 Recovery finalizado. lastProcessedBlock =", toBlock);
}


// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
await recoveryScan();

// Listener en vivo
console.log("👂 Escuchando ValidacionMeteoSolicitada...");
animalTrace.on("ValidacionMeteoSolicitada", async (animalId, indexEvento, zona, fecha, event) => {
  try {
    await procesarSolicitud({
      animalId,
      indexEvento,
      zona,
      fecha,
      requestedTx: event?.log?.transactionHash,
      requestedBlock: event?.log?.blockNumber,
    });

    // actualiza estado (para no re-scanear de más)
    const b = event?.log?.blockNumber;
    if (typeof b === "number") {
      const s = loadState();
      if (b > s.lastProcessedBlock) saveState({ lastProcessedBlock: b });
    }
  } catch (err) {
    console.error("❌ Error en listener:", err.message);
  }
});
