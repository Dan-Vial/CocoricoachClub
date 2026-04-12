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
const FIELD_LEFT = 20;
const FIELD_RIGHT = 580;
const FIELD_TOP = 10;
const FIELD_BOTTOM = 390;
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

const DISTANCE_LINES = [
  { m: -5, label: "BM", solid: true, thick: false },
  { m: 0, label: "En-but", solid: true, thick: true },
  { m: 5, label: "5m", solid: false, thick: false },
  { m: 10, label: "10m", solid: false, thick: false },
  { m: 22, label: "22m", solid: true, thick: false },
  { m: 40, label: "40m", solid: false, thick: false },
  { m: 50, label: "½", solid: true, thick: true },
  { m: 60, label: "40m", solid: false, thick: false },
  { m: 78, label: "22m", solid: true, thick: false },
  { m: 90, label: "10m", solid: false, thick: false },
  { m: 95, label: "5m", solid: false, thick: false },
  { m: 100, label: "En-but", solid: true, thick: true },
  { m: 105, label: "BM", solid: true, thick: false },
];

/** Width marks (from each touchline) at 5m and 15m */
const WIDTH_MARKS = [5, 15];

/** Generate grass stripe positions (every ~5m of field width mapped to SVG) */
function getGrassStripes(goalsOnRight: boolean): Array<{ x: number; w: number }> {
  const stripes: Array<{ x: number; w: number }> = [];
  const stripeCount = 10; // 10 stripes across the field length
  const stripeW = FIELD_W / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      stripes.push({ x: FIELD_LEFT + i * stripeW, w: stripeW });
    }
  }
  return stripes;
}

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

  const grassStripes = useMemo(() => getGrassStripes(goalsOnRight), [goalsOnRight]);

  // Posts position
  const postsX = goalsOnRight ? 580 : 20;
  const centerX = mToSvgX(50, goalsOnRight);
  const centerY = mToSvgY(35);

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className={`w-full border-2 border-primary/20 rounded-lg ${onClick ? "cursor-crosshair" : ""} ${className}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Grass gradient for each stripe */}
          <linearGradient id="fieldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d8a4e" />
            <stop offset="50%" stopColor="#3a9d5e" />
            <stop offset="100%" stopColor="#2d8a4e" />
          </linearGradient>
          {/* Subtle noise/texture filter */}
          <filter id="grassNoise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
          </filter>
        </defs>

        {/* Base green background */}
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#2a7a42" rx={6} />

        {/* Grass stripes - alternating lighter/darker */}
        {grassStripes.map((stripe, i) => (
          <rect
            key={`stripe-${i}`}
            x={stripe.x} y={FIELD_TOP}
            width={stripe.w} height={FIELD_H}
            fill="#339955" opacity={0.25}
          />
        ))}

        {/* Surround area (outside touchlines) - slightly darker */}
        <rect x={0} y={0} width={SVG_W} height={FIELD_TOP} fill="#1f5e30" opacity={0.5} rx={6} />
        <rect x={0} y={FIELD_BOTTOM} width={SVG_W} height={SVG_H - FIELD_BOTTOM} fill="#1f5e30" opacity={0.5} rx={6} />
        <rect x={0} y={0} width={FIELD_LEFT} height={SVG_H} fill="#1f5e30" opacity={0.3} />
        <rect x={FIELD_RIGHT} y={0} width={SVG_W - FIELD_RIGHT} height={SVG_H} fill="#1f5e30" opacity={0.3} />

        {/* In-goal area shading */}
        {(() => {
          const enbutLeftX = mToSvgX(0, goalsOnRight);
          const deadLeftX = mToSvgX(-5, goalsOnRight);
          const enbutRightX = mToSvgX(100, goalsOnRight);
          const deadRightX = mToSvgX(105, goalsOnRight);
          return (
            <>
              <rect
                x={Math.min(enbutLeftX, deadLeftX)} y={FIELD_TOP}
                width={Math.abs(enbutLeftX - deadLeftX)} height={FIELD_H}
                fill="#1a6e35" opacity={0.4}
              />
              <rect
                x={Math.min(enbutRightX, deadRightX)} y={FIELD_TOP}
                width={Math.abs(enbutRightX - deadRightX)} height={FIELD_H}
                fill="#1a6e35" opacity={0.4}
              />
            </>
          );
        })()}

        {/* Field outline - thick white border */}
        <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_W} height={FIELD_H} fill="none" stroke="white" strokeWidth="2.5" opacity={0.85} />

        {/* Distance lines */}
        {DISTANCE_LINES.map((line) => {
          const x = mToSvgX(line.m, goalsOnRight);
          if (x < FIELD_LEFT - 2 || x > FIELD_RIGHT + 2) return null;
          return (
            <g key={`${line.m}-${line.label}`}>
              <line
                x1={x} y1={FIELD_TOP} x2={x} y2={FIELD_BOTTOM}
                stroke="white"
                strokeWidth={line.thick ? 2.5 : line.solid ? 1.5 : 1}
                strokeDasharray={line.solid ? undefined : "6 6"}
                opacity={line.thick ? 0.8 : line.solid ? 0.6 : 0.35}
              />
              <text x={x} y={SVG_H} textAnchor="middle" fill="white" fontSize={line.thick ? 9 : 7} opacity={0.5} fontWeight={line.thick ? "bold" : "normal"}>
                {line.label}
              </text>
            </g>
          );
        })}

        {/* Width marks: perpendicular dashes at 5m and 15m from each touchline */}
        {WIDTH_MARKS.map((wm) => {
          const yTop = mToSvgY(wm);
          const yBot = mToSvgY(FIELD_WIDTH_M - wm);
          // Draw small perpendicular tick marks along the field
          const ticks: React.ReactNode[] = [];
          for (let mDist = 0; mDist <= 105; mDist += 5) {
            const tx = mToSvgX(mDist, goalsOnRight);
            if (tx < FIELD_LEFT || tx > FIELD_RIGHT) continue;
            ticks.push(
              <g key={`tick-${wm}-${mDist}`}>
                <line x1={tx - 3} y1={yTop} x2={tx + 3} y2={yTop} stroke="white" strokeWidth="1" opacity={0.3} />
                <line x1={tx - 3} y1={yBot} x2={tx + 3} y2={yBot} stroke="white" strokeWidth="1" opacity={0.3} />
              </g>
            );
          }
          return (
            <g key={`wm-${wm}`}>
              {/* Full dashed line */}
              <line x1={FIELD_LEFT} y1={yTop} x2={FIELD_RIGHT} y2={yTop} stroke="white" strokeWidth="0.5" strokeDasharray="3 10" opacity={0.15} />
              <line x1={FIELD_LEFT} y1={yBot} x2={FIELD_RIGHT} y2={yBot} stroke="white" strokeWidth="0.5" strokeDasharray="3 10" opacity={0.15} />
              {ticks}
              {/* Labels */}
              <text x={FIELD_LEFT - 3} y={yTop + 3} textAnchor="end" fill="white" fontSize="6" opacity={0.35}>{wm}m</text>
              <text x={FIELD_LEFT - 3} y={yBot + 3} textAnchor="end" fill="white" fontSize="6" opacity={0.35}>{wm}m</text>
            </g>
          );
        })}

        {/* Center spot / cross */}
        <circle cx={centerX} cy={centerY} r={2.5} fill="white" opacity={0.7} />
        <line x1={centerX - 6} y1={centerY} x2={centerX + 6} y2={centerY} stroke="white" strokeWidth="1.5" opacity={0.5} />
        <line x1={centerX} y1={centerY - 6} x2={centerX} y2={centerY + 6} stroke="white" strokeWidth="1.5" opacity={0.5} />

        {/* Center circle at halfway (10m radius) */}
        {(() => {
          const radiusM = 10;
          const radiusSvg = (radiusM / FIELD_WIDTH_M) * FIELD_H;
          return (
            <circle cx={centerX} cy={centerY} r={radiusSvg} fill="none" stroke="white" strokeWidth="1.5" opacity={0.4} />
          );
        })()}

        {/* 22m drop-out spots (center of 22m lines) */}
        {[22, 78].map(m => {
          const spotX = mToSvgX(m, goalsOnRight);
          return (
            <g key={`spot-${m}`}>
              <circle cx={spotX} cy={centerY} r={2} fill="white" opacity={0.4} />
              <line x1={spotX - 4} y1={centerY} x2={spotX + 4} y2={centerY} stroke="white" strokeWidth="1" opacity={0.3} />
            </g>
          );
        })}

        {/* Goal posts - H shape (both sides) */}
        {[true, false].map((isPrimary) => {
          const gx = isPrimary
            ? (goalsOnRight ? FIELD_RIGHT : FIELD_LEFT)
            : (goalsOnRight ? FIELD_LEFT : FIELD_RIGHT);
          const postTop = mToSvgY(32.14); // ~32.14m from top (posts 5.6m apart, centered)
          const postBot = mToSvgY(37.86);
          const crossbarY = (postTop + postBot) / 2;
          const outward = isPrimary ? (goalsOnRight ? 1 : -1) : (goalsOnRight ? -1 : 1);
          const opacity = isPrimary ? 0.9 : 0.4;
          const postLen = 18;
          return (
            <g key={`posts-${isPrimary ? "main" : "other"}`}>
              {/* Left upright */}
              <line x1={gx} y1={postTop} x2={gx + outward * postLen} y2={postTop} stroke="white" strokeWidth={isPrimary ? 3 : 1.5} opacity={opacity} strokeLinecap="round" />
              {/* Right upright */}
              <line x1={gx} y1={postBot} x2={gx + outward * postLen} y2={postBot} stroke="white" strokeWidth={isPrimary ? 3 : 1.5} opacity={opacity} strokeLinecap="round" />
              {/* Crossbar */}
              <line x1={gx} y1={postTop} x2={gx} y2={postBot} stroke="white" strokeWidth={isPrimary ? 4 : 2} opacity={opacity} strokeLinecap="round" />
              {/* Center post extending out */}
              <line x1={gx + outward * postLen} y1={crossbarY - 3} x2={gx + outward * postLen} y2={crossbarY + 3} stroke="white" strokeWidth={isPrimary ? 2 : 1} opacity={opacity * 0.5} />
            </g>
          );
        })}

        {/* Goal direction arrow */}
        {goalsOnRight ? (
          <polygon points="570,200 558,192 558,208" fill="white" opacity={0.2} />
        ) : (
          <polygon points="30,200 42,192 42,208" fill="white" opacity={0.2} />
        )}

        {/* Touchline labels */}
        <text x={SVG_W / 2} y={FIELD_TOP - 1} textAnchor="middle" fill="white" fontSize="7" opacity={0.3} fontStyle="italic">
          Ligne de touche
        </text>
        <text x={SVG_W / 2} y={FIELD_BOTTOM + 9} textAnchor="middle" fill="white" fontSize="7" opacity={0.3} fontStyle="italic">
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
                fill={color} opacity={0.15}
                stroke={color} strokeWidth="1" strokeDasharray="4 2"
              />
              <text
                x={z.svgRect.x + z.svgRect.w / 2}
                y={z.svgRect.y + z.svgRect.h / 2 - 6}
                textAnchor="middle" fill="white" fontSize="11" fontWeight="bold"
              >
                {z.rate}%
              </text>
              <text
                x={z.svgRect.x + z.svgRect.w / 2}
                y={z.svgRect.y + z.svgRect.h / 2 + 8}
                textAnchor="middle" fill="white" fontSize="9" opacity={0.8}
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
            <line x1={cursorPos.svgX} y1={FIELD_TOP} x2={cursorPos.svgX} y2={FIELD_BOTTOM} stroke="rgba(255,255,255,0.6)" strokeWidth="0.7" strokeDasharray="3 4" />
            <line x1={FIELD_LEFT} y1={cursorPos.svgY} x2={FIELD_RIGHT} y2={cursorPos.svgY} stroke="rgba(255,255,255,0.6)" strokeWidth="0.7" strokeDasharray="3 4" />
            {/* Distance label (top) */}
            <rect
              x={cursorPos.svgX - 28} y={FIELD_TOP - 2}
              width={56} height={14} rx={3}
              fill="rgba(0,0,0,0.75)"
            />
            <text x={cursorPos.svgX} y={FIELD_TOP + 9} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
              {cursorPos.distM}m
            </text>
            {/* Lateral label (left side) */}
            <rect
              x={FIELD_LEFT - 1} y={cursorPos.svgY - 7}
              width={42} height={14} rx={3}
              fill="rgba(0,0,0,0.75)"
            />
            <text x={FIELD_LEFT + 20} y={cursorPos.svgY + 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
              {cursorPos.touchLeftM}m
            </text>
            {/* Right side label */}
            <rect
              x={FIELD_RIGHT - 41} y={cursorPos.svgY - 7}
              width={42} height={14} rx={3}
              fill="rgba(0,0,0,0.75)"
            />
            <text x={FIELD_RIGHT - 20} y={cursorPos.svgY + 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
              {cursorPos.touchRightM}m
            </text>
          </g>
        )}
      </svg>

      {/* Bottom coordinate bar */}
      {cursorPos && showCursorTracker && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[11px] font-mono px-2 py-0.5 rounded-b-lg flex justify-between pointer-events-none">
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
