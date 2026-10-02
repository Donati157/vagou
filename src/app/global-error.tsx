"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#fafbfa", color: "#17382A" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>Algo deu errado</h1>
          <p style={{ color: "#67736e" }}>Não foi possível carregar a Vagou agora. Tente novamente em instantes.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 10, border: 0, background: "#17382A", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
