"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#06100d", color: "#eefbf7", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 640, textAlign: "center" }}>
            <p style={{ opacity: 0.55, textTransform: "uppercase", letterSpacing: ".18em", fontSize: 12 }}>TractusLab recovery</p>
            <h1 style={{ fontSize: 38, margin: "16px 0" }}>The application shell needs a restart.</h1>
            <p style={{ opacity: 0.6, lineHeight: 1.7 }}>Your browser-stored learning progress is separate from this screen. Retry the app shell to continue.</p>
            <button onClick={reset} style={{ marginTop: 24, border: 0, borderRadius: 14, padding: "12px 18px", fontWeight: 700, background: "#6ee7b7", color: "#07110f", cursor: "pointer" }}>Reload TractusLab</button>
          </section>
        </main>
      </body>
    </html>
  );
}
