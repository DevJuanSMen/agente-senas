// Anillo de progreso (SVG). `valor` entre 0 y 1.

export function Anillo({ valor, tamano = 120, grosor = 10, color = "var(--acento)", children }: {
  valor: number;
  tamano?: number;
  grosor?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (tamano - grosor) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor));
  return (
    <div className="anillo" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden>
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="var(--pista)" strokeWidth={grosor} />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
          style={{ transition: "stroke-dashoffset 0.12s linear, stroke 0.2s" }}
        />
      </svg>
      <div className="anillo-centro">{children}</div>
    </div>
  );
}
