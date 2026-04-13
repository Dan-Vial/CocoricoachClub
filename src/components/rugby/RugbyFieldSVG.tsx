import { useState, useCallback, useMemo, useRef } from "react";
import { getKickDistances, type ZoneStat } from "@/lib/utils/kickingFieldZones";

interface RugbyFieldSVGProps {
  goalsOnRight: boolean;
  onClick?: (xPct: number, yPct: number) => void;
  children?: React.ReactNode;
  /** Zone stat overlays */
  zoneStats?: ZoneStat[];
  showZones?: boolean;
  /** Show cursor coordinate tracker */
  showCursorTracker?: boolean;
  className?: string;
}

// Field SVG constants
const SVG_W = 600;
const SVG_H = 400;
const MARGIN_X = 20;
const MARGIN_Y = 14;
const FIELD_LEFT = MARGIN_X;
const FIELD_RIGHT = SVG_W - MARGIN_X;
const FIELD_TOP = MARGIN_Y;
const FIELD_BOTTOM = SVG_H - MARGIN_Y;
const FIELD_W = FIELD_RIGHT - FIELD_LEFT;
const FIELD_H = FIELD_BOTTOM - FIELD_TOP;
const FIELD_LENGTH_M = 100;
const FIELD_WIDTH_M = 70;

/** Convert meters from try-line to SVG x */
function mToSvgX(meters: number, goalsOnRight: boolean): number {
  const tryLineX = goalsOnRight ? 540 : 60;
  const mToSvg = FIELD_W / FIELD_LENGTH_M;
  return goalsOnRight ? tryLineX - meters * mToSvg : tryLineX + meters * mToSvg;
}

/** Convert meters from top touchline to SVG y */
function mToSvgY(meters: number): number {
  return FIELD_TOP + (meters / FIELD_WIDTH_M) * FIELD_H;
}

// Regulation field lines with percentage positions (matching PDF)
const FIELD_LINES: { pct: number; label: string; solid: boolean; thick: boolean }[] = [
  { pct: 0, label: "BM", solid: true, thick: false },
  { pct: 0.05, label: "En-but", solid: true, thick: true },
  { pct: 0.1, label: "5m", solid: false, thick: false },
  { pct: 0.15, label: "10m", solid: false, thick: false },
  { pct: 0.27, label: "22m", solid: true, thick: false },
  { pct: 0.45, label: "40m", solid: false, thick: false },
  { pct: 0.5, label: "½", solid: true, thick: true },
  { pct: 0.55, label: "40m", solid: false, thick: false },
  { pct: 0.73, label: "22m", solid: true, thick: false },
  { pct: 0.85, label: "10m", solid: false, thick: false },
  { pct: 0.9, label: "5m", solid: false, thick: false },
  { pct: 0.95, label: "En-but", solid: true, thick: true },
  { pct: 1, label: "BM", solid: true, thick: false },
];

/** Width marks (from each touchline) at 5m and 15m */
const WIDTH_MARKS = [5, 15];

export function RugbyFieldSVG({
  goalsOnRight,
  onClick,
  children,
  zoneStats = [],
  showZones = false,
  showCursorTracker = true,
  className = "",
}: RugbyFieldSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorPos, setCursorPos] = useState<{ svgX: number; svgY: number; distM: number; lateralM: number; touchLeftM: number; touchRightM: number } | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!onClick) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
      const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
      onClick(xPct, yPct);
    },
    [onClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!showCursorTracker) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      const d = getKickDistances(xPct, yPct, goalsOnRight);
      const svgX = (xPct / 100) * SVG_W;
      const svgY = (yPct / 100) * SVG_H;
      setCursorPos({
        svgX,
        svgY,
        distM: d.distFromPosts,
        lateralM: d.lateralOffset,
        touchLeftM: d.touchLeft,
        touchRightM: d.touchRight,
      });
    },
    [goalsOnRight, showCursorTracker]
  );

  const handleMouseLeave = useCallback(() => setCursorPos(null), []);

  // Posts position
  const centerX = FIELD_LEFT + FIELD_W * 0.5;
  const centerY = FIELD_TOP + FIELD_H * 0.5;

  // Stripe data
  const stripeCount = 10;
  const stripeW = FIELD_W / stripeCount;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className={`w-full rounded-xl shadow-lg ${onClick ? "cursor-crosshair" : ""} ${className}`}
        style={{ background: "transparent" }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="fieldBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a7a42" />
            <stop offset="50%" stopColor="#1e8a4a" />
            <stop offset="100%" stopColor="#1a7a42" />
          </linearGradient>
          <linearGradient id="surroundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#125a2d" />
            <stop offset="100%" stopColor="#0e4a24" />
          </linearGradient>
          {/* Subtle inner shadow for depth */}
          <filter id="innerGlow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feOffset dx="0" dy="0" />
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feFlood floodColor="#000000" floodOpacity="0.15" />
            <feComposite in2="SourceGraphic" operator="in" />
            <feComposite in="SourceGraphic" />
          </filter>
          <clipPath id="fieldClip">
            <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_W} height={FIELD_H} />
          </clipPath>
        </defs>

        {/* Outer surround - dark green border area */}
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#surroundGrad)" rx={10} />

        {/* Inner field base */}
        <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_W} height={FIELD_H} fill="url(#fieldBg)" />

        {/* Alternating grass stripes (matching PDF: dark/light alternation) */}
        {Array.from({ length: stripeCount }).map((_, i) => (
          <rect
            key={`stripe-${i}`}
            x={FIELD_LEFT + i * stripeW}
            y={FIELD_TOP}
            width={stripeW}
            height={FIELD_H}
            fill={i % 2 === 0 ? "#228c48" : "#1e7838"}
            opacity={0.85}
          />
        ))}

        {/* In-goal area shading (darker) */}
        <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_W * 0.05} height={FIELD_H} fill="#166432" opacity={0.7} />
        <rect x={FIELD_LEFT + FIELD_W * 0.95} y={FIELD_TOP} width={FIELD_W * 0.05} height={FIELD_H} fill="#166432" opacity={0.7} />

        {/* Field outline - crisp white border */}
        <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_W} height={FIELD_H} fill="none" stroke="white" strokeWidth="2.5" opacity={0.9} />

        {/* Distance lines with labels */}
        {FIELD_LINES.map((line) => {
          const lx = FIELD_LEFT + line.pct * FIELD_W;
          return (
            <g key={`line-${line.pct}-${line.label}`}>
              <line
                x1={lx} y1={FIELD_TOP} x2={lx} y2={FIELD_BOTTOM}
                stroke="white"
                strokeWidth={line.thick ? 2.5 : line.solid ? 1.5 : 0.8}
                strokeDasharray={line.solid ? undefined : "5 5"}
                opacity={line.thick ? 0.85 : line.solid ? 0.6 : 0.3}
              />
              {/* Labels below field */}
              <text
                x={lx} y={SVG_H - 1}
                textAnchor="middle" fill="white" fontSize={line.thick ? 9 : 7}
                opacity={0.6} fontWeight={line.thick ? "bold" : "normal"}
                fontFamily="system-ui, sans-serif"
              >
                {line.label}
              </text>
            </g>
          );
        })}

        {/* Width marks: perpendicular tick marks at 5m and 15m from each touchline */}
        {WIDTH_MARKS.map((wm) => {
          const yTop = mToSvgY(wm);
          const yBot = mToSvgY(FIELD_WIDTH_M - wm);
          const ticks: React.ReactNode[] = [];
          // Tick marks every 5% along the field
          for (let p = 0; p <= 1; p += 0.05) {
            const tx = FIELD_LEFT + p * FIELD_W;
            ticks.push(
              <g key={`tick-${wm}-${p}`}>
                <line x1={tx - 3} y1={yTop} x2={tx + 3} y2={yTop} stroke="white" strokeWidth="0.8" opacity={0.35} />
                <line x1={tx - 3} y1={yBot} x2={tx + 3} y2={yBot} stroke="white" strokeWidth="0.8" opacity={0.35} />
              </g>
            );
          }
          return (
            <g key={`wm-${wm}`}>
              {/* Subtle dashed guide lines */}
              <line x1={FIELD_LEFT} y1={yTop} x2={FIELD_RIGHT} y2={yTop} stroke="white" strokeWidth="0.4" strokeDasharray="2 8" opacity={0.12} />
              <line x1={FIELD_LEFT} y1={yBot} x2={FIELD_RIGHT} y2={yBot} stroke="white" strokeWidth="0.4" strokeDasharray="2 8" opacity={0.12} />
              {ticks}
            </g>
          );
        })}

        {/* Center spot (small cross mark, no circle - this is rugby not football) */}
        <circle cx={centerX} cy={centerY} r={2.5} fill="white" opacity={0.5} />
        <line x1={centerX - 5} y1={centerY} x2={centerX + 5} y2={centerY} stroke="white" strokeWidth="1" opacity={0.3} />
        <line x1={centerX} y1={centerY - 5} x2={centerX} y2={centerY + 5} stroke="white" strokeWidth="1" opacity={0.3} />

        {/* 22m drop-out spots */}
        {[0.27, 0.73].map(pct => {
          const spotX = FIELD_LEFT + pct * FIELD_W;
          return (
            <g key={`spot-${pct}`}>
              <circle cx={spotX} cy={centerY} r={2.2} fill="white" opacity={0.5} />
              <line x1={spotX - 5} y1={centerY} x2={spotX + 5} y2={centerY} stroke="white" strokeWidth="1" opacity={0.3} />
            </g>
          );
        })}

        {/* Goal posts - H shape (both sides, matching PDF style) */}
        {[0.05, 0.95].map(pct => {
          const gx = FIELD_LEFT + pct * FIELD_W;
          const postTop = FIELD_TOP + FIELD_H * 0.38;
          const postBot = FIELD_TOP + FIELD_H * 0.62;
          const isPrimary = (goalsOnRight && pct === 0.95) || (!goalsOnRight && pct === 0.05);
          const outward = pct < 0.5 ? -1 : 1;
          const upLen = Math.min(18, FIELD_W * 0.04);
          const opacity = isPrimary ? 0.95 : 0.45;
          return (
            <g key={`posts-${pct}`}>
              {/* Crossbar - thicker */}
              <line x1={gx} y1={postTop} x2={gx} y2={postBot}
                stroke="white" strokeWidth={isPrimary ? 4 : 2}
                opacity={opacity} strokeLinecap="round" />
              {/* Uprights */}
              <line x1={gx} y1={postTop} x2={gx + outward * upLen} y2={postTop}
                stroke="white" strokeWidth={isPrimary ? 2.5 : 1.2}
                opacity={opacity} strokeLinecap="round" />
              <line x1={gx} y1={postBot} x2={gx + outward * upLen} y2={postBot}
                stroke="white" strokeWidth={isPrimary ? 2.5 : 1.2}
                opacity={opacity} strokeLinecap="round" />
              {/* Small tip circles for polish */}
              {isPrimary && (
                <>
                  <circle cx={gx + outward * upLen} cy={postTop} r={1.5} fill="white" opacity={0.6} />
                  <circle cx={gx + outward * upLen} cy={postBot} r={1.5} fill="white" opacity={0.6} />
                </>
              )}
            </g>
          );
        })}

        {/* Direction arrow */}
        {goalsOnRight ? (
          <polygon points="570,200 556,191 556,209" fill="white" opacity={0.15} />
        ) : (
          <polygon points="30,200 44,191 44,209" fill="white" opacity={0.15} />
        )}

        {/* Touchline labels */}
        <text x={SVG_W / 2} y={FIELD_TOP - 3} textAnchor="middle" fill="white" fontSize="7" opacity={0.4} fontStyle="italic" fontFamily="system-ui, sans-serif">
          Ligne de touche
        </text>
        <text x={SVG_W / 2} y={FIELD_BOTTOM + 10} textAnchor="middle" fill="white" fontSize="7" opacity={0.4} fontStyle="italic" fontFamily="system-ui, sans-serif">
          Ligne de touche
        </text>

        {/* Zone overlays */}
        {showZones && zoneStats.map((z) => {
          const color = z.rate >= 70 ? "#22c55e" : z.rate >= 40 ? "#f59e0b" : "#ef4444";
          return (
            <g key={z.zoneKey}>
              <rect
                x={z.svgRect.x} y={z.svgRect.y}
                width={z.svgRect.w} height={z.svgRect.h}
                fill={color} opacity={0.18}
                stroke={color} strokeWidth="1.5" strokeDasharray="4 3" rx={3}
              />
              <text
                x={z.svgRect.x + z.svgRect.w / 2}
                y={z.svgRect.y + z.svgRect.h / 2 - 6}
                textAnchor="middle" fill="white" fontSize="12" fontWeight="bold"
                fontFamily="system-ui, sans-serif"
              >
                {z.rate}%
              </text>
              <text
                x={z.svgRect.x + z.svgRect.w / 2}
                y={z.svgRect.y + z.svgRect.h / 2 + 9}
                textAnchor="middle" fill="white" fontSize="10" opacity={0.85}
                fontFamily="system-ui, sans-serif"
              >
                {z.success}/{z.total}
              </text>
            </g>
          );
        })}

        {/* Children (kicks, markers, etc.) */}
        {children}

        {/* Live cursor crosshair and coordinates */}
        {cursorPos && showCursorTracker && (
          <g pointerEvents="none">
            {/* Crosshair lines */}
            <line x1={cursorPos.svgX} y1={FIELD_TOP} x2={cursorPos.svgX} y2={FIELD_BOTTOM} stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" strokeDasharray="4 4" />
            <line x1={FIELD_LEFT} y1={cursorPos.svgY} x2={FIELD_RIGHT} y2={cursorPos.svgY} stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" strokeDasharray="4 4" />
            {/* Distance label (top) */}
            <rect
              x={cursorPos.svgX - 30} y={FIELD_TOP - 4}
              width={60} height={16} rx={4}
              fill="rgba(0,0,0,0.8)"
            />
            <text x={cursorPos.svgX} y={FIELD_TOP + 8} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="system-ui, sans-serif">
              {cursorPos.distM}m
            </text>
            {/* Lateral label (left side) */}
            <rect
              x={FIELD_LEFT - 2} y={cursorPos.svgY - 8}
              width={44} height={16} rx={4}
              fill="rgba(0,0,0,0.8)"
            />
            <text x={FIELD_LEFT + 20} y={cursorPos.svgY + 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui, sans-serif">
              {cursorPos.touchLeftM}m
            </text>
            {/* Right side label */}
            <rect
              x={FIELD_RIGHT - 42} y={cursorPos.svgY - 8}
              width={44} height={16} rx={4}
              fill="rgba(0,0,0,0.8)"
            />
            <text x={FIELD_RIGHT - 20} y={cursorPos.svgY + 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui, sans-serif">
              {cursorPos.touchRightM}m
            </text>
          </g>
        )}
      </svg>

      {/* Bottom coordinate bar */}
      {cursorPos && showCursorTracker && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono px-3 py-1 rounded-b-xl flex justify-between pointer-events-none">
          <span>📍 {cursorPos.distM}m des poteaux</span>
          <span>
            {Math.abs(cursorPos.lateralM) <= 5
              ? "au centre"
              : `${Math.abs(cursorPos.lateralM)}m côté ${cursorPos.lateralM < 0 ? "haut" : "bas"}`}
          </span>
          <span>Touche: {cursorPos.touchLeftM}m / {cursorPos.touchRightM}m</span>
        </div>
      )}
    </div>
  );
}
