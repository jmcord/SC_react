// src/components/Footer.jsx

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 40,
        padding: 20,
        textAlign: "center",
        color: "#666",
        fontSize: "14px",
        borderTop: "1px solid #ddd",
      }}
    >
      <p>© {new Date().getFullYear()} AnimalDataTrace — Trazabilidad Blockchain 🐮</p>
      <p>
        Desarrollado por <b>JMC</b> · Smart Contracts · React · Sepolia
      </p>
    </footer>
  );
}
