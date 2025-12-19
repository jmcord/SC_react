// src/App.jsx
import { useState } from "react";
import { useAnimalTrace } from "./hooks/useAnimalTrace";
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  const {
    account,
    roles = {
      isAdmin: false,
      isVeterinario: false,
      isTransportista: false,
      isProductor: false,
      isOracle: false,
    },
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
  } = useAnimalTrace();

  // ───── Estados ─────
  const [nuevoAnimal, setNuevoAnimal] = useState({
    id: "",
    especie: "",
    propietario: "",
  });

  const [evento, setEvento] = useState({
    id: "",
    descripcion: "",
    fecha: "",
    ipfsHash: "",
    validadoIA: false,
    zona: "",
  });

  const [historialId, setHistorialId] = useState("");
  const [historial, setHistorial] = useState([]);

  const [consultaId, setConsultaId] = useState("");
  const [animalConsultado, setAnimalConsultado] = useState(null);

  const [nuevoRol, setNuevoRol] = useState({
    role: "VETERINARIO",
    address: "",
  });

  // ───── Handlers ─────
  const handleRegistrarAnimal = async (e) => {
    e.preventDefault();
    if (!nuevoAnimal.id) return;
    await registrarAnimal(
      Number(nuevoAnimal.id),
      nuevoAnimal.especie,
      nuevoAnimal.propietario
    );
  };

  const handleRegistrarVacunacion = async (e) => {
    e.preventDefault();
    if (!evento.id) return;
    await registrarVacunacion(
      Number(evento.id),
      evento.descripcion,
      evento.fecha,
      evento.ipfsHash,
      evento.validadoIA
    );
  };

  const handleRegistrarTransporte = async (e) => {
    e.preventDefault();
    if (!evento.id) return;
    await registrarTransporte(
      Number(evento.id),
      evento.descripcion,
      evento.fecha,
      evento.ipfsHash,
      evento.validadoIA
    );
  };

  const handleRegistrarTransporteConMeteo = async (e) => {
    e.preventDefault();
    if (!evento.id) return;
    await registrarTransporteConMeteo(
      Number(evento.id),
      evento.descripcion,
      evento.fecha,
      evento.ipfsHash,
      evento.zona
    );
  };

  const handleRegistrarAlimentacion = async (e) => {
    e.preventDefault();
    if (!evento.id) return;
    await registrarAlimentacion(
      Number(evento.id),
      evento.descripcion,
      evento.fecha,
      evento.ipfsHash,
      evento.validadoIA
    );
  };

  const handleObtenerHistorial = async (e) => {
    e.preventDefault();
    if (!historialId) return;
    const evs = await obtenerHistorial(Number(historialId));
    setHistorial(evs);
  };

  const handleObtenerAnimal = async (e) => {
    e.preventDefault();
    if (!consultaId) return;
    const a = await obtenerAnimal(Number(consultaId));
    setAnimalConsultado(a);
  };

  const handleAsignarRol = async (e) => {
    e.preventDefault();
    if (!nuevoRol.address) return;

    if (nuevoRol.role === "VETERINARIO") {
      await asignarVeterinario(nuevoRol.address);
    } else if (nuevoRol.role === "TRANSPORTISTA") {
      await asignarTransportista(nuevoRol.address);
    } else if (nuevoRol.role === "PRODUCTOR") {
      await asignarProductor(nuevoRol.address);
    } else if (nuevoRol.role === "ORACLE") {
      await asignarOracle(nuevoRol.address);
    }
  };

  // ───── UI ─────
  return (
    <>
      <Header />

      <main className="container">
        {/* Conexión */}
        <section style={{ marginBottom: 20 }}>
          {!account ? (
            <button onClick={connectWallet} disabled={loading}>
              {loading ? "Conectando..." : "Conectar MetaMask"}
            </button>
          ) : (
            <>
              <p>
                Cuenta conectada: <b>{account}</b>
              </p>
              <p>
                Roles → Admin: {roles.isAdmin ? "✅" : "❌"} · Veterinario:{" "}
                {roles.isVeterinario ? "✅" : "❌"} · Transportista:{" "}
                {roles.isTransportista ? "✅" : "❌"} · Productor:{" "}
                {roles.isProductor ? "✅" : "❌"} · Oráculo:{" "}
                {roles.isOracle ? "✅" : "❌"}
              </p>
            </>
          )}
          {error && <p style={{ color: "red" }}>⚠ {error}</p>}
        </section>

        {/* Asignar roles */}
        {roles.isAdmin && (
          <>
            <hr />
            <section>
              <h2>🔐 Asignar roles (solo ADMIN)</h2>
              <form
                onSubmit={handleAsignarRol}
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
              >
                <select
                  value={nuevoRol.role}
                  onChange={(e) =>
                    setNuevoRol({ ...nuevoRol, role: e.target.value })
                  }
                >
                  <option value="VETERINARIO">VETERINARIO</option>
                  <option value="TRANSPORTISTA">TRANSPORTISTA</option>
                  <option value="PRODUCTOR">PRODUCTOR</option>
                  <option value="ORACLE">ORACLE</option>
                </select>

                <input
                  type="text"
                  placeholder="Dirección 0x..."
                  value={nuevoRol.address}
                  onChange={(e) =>
                    setNuevoRol({ ...nuevoRol, address: e.target.value })
                  }
                  style={{ minWidth: 260 }}
                />

                <button type="submit" disabled={txLoading}>
                  {txLoading ? "Enviando..." : "Asignar rol"}
                </button>
              </form>
            </section>
          </>
        )}

        <hr />

        {/* Registrar animal */}
        <section>
          <h2>1️⃣ Registrar animal (solo ADMIN)</h2>
          <form
            onSubmit={handleRegistrarAnimal}
            style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <input
              type="number"
              placeholder="ID"
              value={nuevoAnimal.id}
              onChange={(e) =>
                setNuevoAnimal({ ...nuevoAnimal, id: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Especie"
              value={nuevoAnimal.especie}
              onChange={(e) =>
                setNuevoAnimal({ ...nuevoAnimal, especie: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Propietario"
              value={nuevoAnimal.propietario}
              onChange={(e) =>
                setNuevoAnimal({ ...nuevoAnimal, propietario: e.target.value })
              }
            />
            <button type="submit" disabled={txLoading}>
              {txLoading ? "Enviando..." : "Registrar animal"}
            </button>
          </form>
        </section>

        <hr />

        {/* Registrar eventos */}
        <section>
          <h2>2️⃣ Registrar eventos</h2>

          <form
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxWidth: 520,
            }}
          >
            <input
              type="number"
              placeholder="ID animal"
              value={evento.id}
              onChange={(e) => setEvento({ ...evento, id: e.target.value })}
            />
            <input
              type="text"
              placeholder="Descripción"
              value={evento.descripcion}
              onChange={(e) =>
                setEvento({ ...evento, descripcion: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="Fecha (ej. 2025-12-10)"
              value={evento.fecha}
              onChange={(e) => setEvento({ ...evento, fecha: e.target.value })}
            />
            <input
              type="text"
              placeholder="IPFS hash (opcional)"
              value={evento.ipfsHash}
              onChange={(e) => setEvento({ ...evento, ipfsHash: e.target.value })}
            />
            <input
              type="text"
              placeholder="Zona meteo (ej. Sevilla, ES)"
              value={evento.zona}
              onChange={(e) => setEvento({ ...evento, zona: e.target.value })}
            />

            <label>
              <input
                type="checkbox"
                checked={evento.validadoIA}
                onChange={(e) =>
                  setEvento({ ...evento, validadoIA: e.target.checked })
                }
              />{" "}
              Validado por IA (manual)
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleRegistrarVacunacion}
                disabled={txLoading}
              >
                Registrar vacunación
              </button>
              <button
                type="button"
                onClick={handleRegistrarTransporte}
                disabled={txLoading}
              >
                Registrar transporte
              </button>
              <button
                type="button"
                onClick={handleRegistrarTransporteConMeteo}
                disabled={txLoading}
              >
                Transporte con meteo
              </button>
              <button
                type="button"
                onClick={handleRegistrarAlimentacion}
                disabled={txLoading}
              >
                Registrar alimentación
              </button>
            </div>
          </form>
        </section>

        <hr />

        {/* Historial */}
        <section>
          <h2>3️⃣ Historial de eventos</h2>
          <form
            onSubmit={handleObtenerHistorial}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              type="number"
              placeholder="ID animal"
              value={historialId}
              onChange={(e) => setHistorialId(e.target.value)}
            />
            <button type="submit">Ver historial</button>
          </form>

          <ul>
            {historial.map((ev, idx) => (
              <li key={idx}>
                <b>{ev.tipo}</b> · {ev.descripcion} · {ev.fecha} <br />
                IPFS: {ev.ipfsMeteoHash || ev.ipfsHash || "-"}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default App;
