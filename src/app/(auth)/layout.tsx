export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 30% 10%, rgba(147,197,253,0.5) 0%, transparent 50%),
          radial-gradient(ellipse 60% 70% at 70% 30%, rgba(196,181,253,0.4) 0%, transparent 50%),
          radial-gradient(ellipse 50% 50% at 50% 60%, rgba(186,230,253,0.45) 0%, transparent 50%),
          radial-gradient(ellipse 70% 55% at 20% 80%, rgba(219,234,254,0.5) 0%, transparent 50%),
          radial-gradient(ellipse 55% 65% at 80% 75%, rgba(224,231,255,0.45) 0%, transparent 50%),
          linear-gradient(135deg, #eff6ff 0%, #f0f9ff 25%, #f5f3ff 50%, #fdf2f8 75%, #fef3c7 100%)
        `,
      }}
    >
      {/* ── Floating white glass orbs (subtle pink hint) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large orb top-left */}
        <div
          className="absolute top-[10%] left-[5%] rounded-full animate-[float_8s_ease-in-out_infinite]"
          style={{
            width: 220,
            height: 220,
            background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.9), rgba(255,255,255,0.7), rgba(253,242,248,0.5), rgba(249,168,212,0.08))",
            backdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
            animationDelay: "0s",
          }}
        />
        {/* Medium orb top-right */}
        <div
          className="absolute top-[20%] right-[10%] rounded-full animate-[float_10s_ease-in-out_infinite]"
          style={{
            width: 160,
            height: 160,
            background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.92), rgba(255,255,255,0.75), rgba(252,238,245,0.45), rgba(249,168,212,0.06))",
            backdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
            animationDelay: "1.5s",
          }}
        />
        {/* Small orb center-right */}
        <div
          className="absolute top-[45%] right-[15%] rounded-full animate-[float_7s_ease-in-out_infinite]"
          style={{
            width: 100,
            height: 100,
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.8), rgba(252,238,245,0.4), rgba(249,168,212,0.05))",
            backdropFilter: "blur(18px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.75)",
            boxShadow: "0 6px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
            animationDelay: "2.5s",
          }}
        />
        {/* Large orb bottom-left */}
        <div
          className="absolute bottom-[15%] left-[10%] rounded-full animate-[float_9s_ease-in-out_infinite]"
          style={{
            width: 190,
            height: 190,
            background: "radial-gradient(circle at 45% 40%, rgba(255,255,255,0.88), rgba(255,255,255,0.7), rgba(253,242,248,0.5), rgba(244,114,182,0.07))",
            backdropFilter: "blur(22px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
            animationDelay: "3s",
          }}
        />
        {/* Small orb bottom-center */}
        <div
          className="absolute bottom-[25%] right-[30%] rounded-full animate-[float_8s_ease-in-out_infinite]"
          style={{
            width: 80,
            height: 80,
            background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.82), rgba(252,238,245,0.35), rgba(249,168,212,0.04))",
            backdropFilter: "blur(16px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.8)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.92)",
            animationDelay: "4s",
          }}
        />
        {/* Tiny orb top-center */}
        <div
          className="absolute top-[35%] left-[40%] rounded-full animate-[float_6s_ease-in-out_infinite]"
          style={{
            width: 50,
            height: 50,
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.97), rgba(255,255,255,0.85), rgba(253,242,248,0.3), rgba(249,168,212,0.03))",
            backdropFilter: "blur(12px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.85)",
            boxShadow: "0 3px 14px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.95)",
            animationDelay: "5s",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {children}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-24px) scale(1.06); }
        }
      `}</style>
    </div>
  );
}
