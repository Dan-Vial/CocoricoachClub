/**
 * Full regulation rugby field SVG — mirrors the PDF version (pdfRugbyField.ts).
 * Includes: grass stripes, in-goal shading, all regulation lines (BM, en-but, 5m, 10m, 22m, 40m, ½),
 * width marks (5m/15m), center circle + spot, 22m drop-out spots, H-shaped goal posts, touchline labels.
 */

interface RugbyFieldSvgProps {
  svgW: number;
  svgH: number;
  fieldLeft: number;
  fieldRight: number;
  fieldTop: number;
  fieldBottom: number;
  showLabels?: boolean;
}

const FIELD_LINES: { pct: number; label: string; solid: boolean; thick: boolean }[] = [
  { pct: 0, label: "BM", solid: true, thick: false },
  { pct: 0.05, label: "En-but", solid: true, thick: true },
  { pct: 0.10, label: "5m", solid: false, thick: false },
  { pct: 0.15, label: "10m", solid: false, thick: false },
  { pct: 0.27, label: "22m", solid: true, thick: false },
  { pct: 0.45, label: "40m", solid: false, thick: false },
  { pct: 0.50, label: "½", solid: true, thick: true },
  { pct: 0.55, label: "40m", solid: false, thick: false },
  { pct: 0.73, label: "22m", solid: true, thick: false },
  { pct: 0.85, label: "10m", solid: false, thick: false },
  { pct: 0.90, label: "5m", solid: false, thick: false },
  { pct: 0.95, label: "En-but", solid: true, thick: true },
  { pct: 1, label: "BM", solid: true, thick: false },
];

export function RugbyFieldSvg({
  svgW, svgH, fieldLeft, fieldRight, fieldTop, fieldBottom, showLabels = true,
}: RugbyFieldSvgProps) {
  const fw = fieldRight - fieldLeft;
  const fh = fieldBottom - fieldTop;
  const stripeCount = 10;
  const stripeW = fw / stripeCount;
  const centerX = fieldLeft + fw * 0.5;
  const centerY = fieldTop + fh * 0.5;

  return (
    <g>
      {/* Surround area */}
      <rect x={0} y={0} width={svgW} height={svgH} fill="#12592d" rx="4" />

      {/* Grass stripes */}
      {Array.from({ length: stripeCount }).map((_, i) => (
        <rect
          key={`stripe-${i}`}
          x={fieldLeft + i * stripeW}
          y={fieldTop}
          width={stripeW}
          height={fh}
          fill={i % 2 === 0 ? "#228c48" : "#1e7838"}
        />
      ))}

      {/* In-goal shading */}
      <rect x={fieldLeft} y={fieldTop} width={fw * 0.05} height={fh} fill="#166432" />
      <rect x={fieldLeft + fw * 0.95} y={fieldTop} width={fw * 0.05} height={fh} fill="#166432" />

      {/* Field outline */}
      <rect x={fieldLeft} y={fieldTop} width={fw} height={fh}
        fill="none" stroke="white" strokeWidth="2" opacity={0.7} />

      {/* Regulation lines */}
      {FIELD_LINES.map((line) => {
        const lx = fieldLeft + line.pct * fw;
        return (
          <g key={`line-${line.pct}`}>
            {line.solid ? (
              <line x1={lx} y1={fieldTop} x2={lx} y2={fieldBottom}
                stroke="white"
                strokeWidth={line.thick ? 2 : 1.5}
                opacity={line.thick ? 0.7 : 0.5} />
            ) : (
              <line x1={lx} y1={fieldTop} x2={lx} y2={fieldBottom}
                stroke="white"
                strokeWidth={1}
                strokeDasharray="6 5"
                opacity={0.35} />
            )}
            {showLabels && (
              <text x={lx} y={svgH} textAnchor="middle" fill="white" fontSize={line.thick ? 9 : 7} opacity={0.5}>
                {line.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Width marks (5m and 15m from each touchline) */}
      {[5, 15].map(wm => {
        const yTop = fieldTop + (wm / 70) * fh;
        const yBot = fieldTop + ((70 - wm) / 70) * fh;
        return (
          <g key={`wm-${wm}`}>
            <line x1={fieldLeft} y1={yTop} x2={fieldRight} y2={yTop}
              stroke="white" strokeWidth="0.5" strokeDasharray="4 10" opacity={0.25} />
            <line x1={fieldLeft} y1={yBot} x2={fieldRight} y2={yBot}
              stroke="white" strokeWidth="0.5" strokeDasharray="4 10" opacity={0.25} />
            <text x={fieldLeft - 3} y={yTop + 3} textAnchor="end" fill="white" fontSize="6" opacity={0.3}>{wm}m</text>
            <text x={fieldLeft - 3} y={yBot + 3} textAnchor="end" fill="white" fontSize="6" opacity={0.3}>{wm}m</text>
          </g>
        );
      })}

      {/* Goal-line drop-out spots (on the try line) */}
      {[0.05, 0.95].map(pct => (
        <circle key={`spot-en-but-${pct}`}
          cx={fieldLeft + pct * fw} cy={centerY} r={2.5}
          fill="white" opacity={0.4} />
      ))}

      {/* 22m drop-out spots (exactly on the 22m solid line) */}
      {[0.27, 0.73].map(pct => (
        <circle key={`spot-${pct}`}
          cx={fieldLeft + pct * fw} cy={centerY} r={2.5}
          fill="white" opacity={0.4} />
      ))}

      {/* H-shaped goal posts (both sides) */}
      {[0.05, 0.95].map(pct => {
        const gx = fieldLeft + pct * fw;
        const postTop = fieldTop + fh * 0.38;
        const postBot = fieldTop + fh * 0.62;
        const outward = pct < 0.5 ? -1 : 1;
        const upLen = Math.min(20, fw * 0.035);
        return (
          <g key={`post-${pct}`}>
            {/* Crossbar */}
            <line x1={gx} y1={postTop} x2={gx} y2={postBot}
              stroke="white" strokeWidth="3" opacity={0.8} />
            {/* Uprights */}
            <line x1={gx} y1={postTop} x2={gx + outward * upLen} y2={postTop}
              stroke="white" strokeWidth="1.5" opacity={0.6} />
            <line x1={gx} y1={postBot} x2={gx + outward * upLen} y2={postBot}
              stroke="white" strokeWidth="1.5" opacity={0.6} />
          </g>
        );
      })}

      {/* Touchline labels */}
      {showLabels && (
        <>
          <text x={centerX} y={fieldTop - 2} textAnchor="middle" fill="white" fontSize="7" opacity={0.35}>
            Ligne de touche
          </text>
          <text x={centerX} y={fieldBottom + 10} textAnchor="middle" fill="white" fontSize="7" opacity={0.35}>
            Ligne de touche
          </text>
        </>
      )}
    </g>
  );
}
