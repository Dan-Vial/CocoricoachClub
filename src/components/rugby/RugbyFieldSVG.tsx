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
  { m: -5, label: "Ballon mort", solid: true, thick: false },
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
  { m: 105, label: "Ballon mort", solid: true, thick: false },
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
  const postsX = goalsOnRight ? 580 : 20;
  const postsRectX = goalsOnRight ? 565 : 20;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className={`w-full border-2 border-primary/20 rounded-lg bg-emerald-700/90 dark:bg-emerald-900/80 ${onClick ? "cursor-crosshair" : ""} ${className}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Field outline */}
        <rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_W} height={FIELD_H} fill="none" stroke="white" strokeWidth="2" opacity={0.6} />

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
                fill="white" opacity={0.06}
              />
              <rect
                x={Math.min(enbutRightX, deadRightX)} y={FIELD_TOP}
                width={Math.abs(enbutRightX - deadRightX)} height={FIELD_H}
                fill="white" opacity={0.06}
              />
            </>
          );
        })()}

        {/* Posts (both sides) */}
        <line x1={postsX} y1={170} x2={postsX} y2={230} stroke="white" strokeWidth="5" opacity={0.9} />
        <rect x={postsRectX} y={170} width={15} height={60} fill="none" stroke="white" strokeWidth="2" opacity={0.5} />
        {/* Posts on other side */}
        {(() => {
          const otherPostsX = goalsOnRight ? 20 : 580;
          const otherRectX = goalsOnRight ? 20 : 565;
          return (
            <>
              <line x1={otherPostsX} y1={170} x2={otherPostsX} y2={230} stroke="white" strokeWidth="3" opacity={0.4} />
              <rect x={otherRectX} y={170} width={15} height={60} fill="none" stroke="white" strokeWidth="1" opacity={0.25} />
            </>
          );
        })()}

        {/* Goal direction arrow */}
        {goalsOnRight ? (
          <polygon points="570,200 555,190 555,210" fill="white" opacity={0.3} />
        ) : (
          <polygon points="30,200 45,190 45,210" fill="white" opacity={0.3} />
        )}

        {/* Center circle at halfway */}
        {(() => {
          const centerX = mToSvgX(50, goalsOnRight);
          const centerY = mToSvgY(35);
          const radiusM = 10;
          const radiusSvg = (radiusM / FIELD_WIDTH_M) * FIELD_H;
          return (
            <circle cx={centerX} cy={centerY} r={radiusSvg} fill="none" stroke="white" strokeWidth="1" opacity={0.3} />
          );
        })()}

        {/* Distance lines */}
        {DISTANCE_LINES.map((line) => {
          const x = mToSvgX(line.m, goalsOnRight);
          if (x < FIELD_LEFT - 2 || x > FIELD_RIGHT + 2) return null;
          return (
            <g key={`${line.m}-${line.label}`}>
              <line
                x1={x} y1={FIELD_TOP} x2={x} y2={FIELD_BOTTOM}
                stroke="white"
                strokeWidth={line.thick ? 2 : line.solid ? 1.5 : 1}
                strokeDasharray={line.solid ? undefined : "5 5"}
                opacity={line.thick ? 0.6 : line.solid ? 0.5 : 0.35}
              />
              <text x={x} y={SVG_H} textAnchor="middle" fill="white" fontSize={line.thick ? 9 : 8} opacity={0.5}>
                {line.label}
              </text>
            </g>
          );
        })}

        {/* Width marks (5m and 15m from each touchline) - small dashes */}
        {WIDTH_MARKS.map((wm) => {
          const yTop = mToSvgY(wm);
          const yBot = mToSvgY(FIELD_WIDTH_M - wm);
          return (
            <g key={`wm-${wm}`}>
              <line x1={FIELD_LEFT} y1={yTop} x2={FIELD_RIGHT} y2={yTop} stroke="white" strokeWidth="0.5" strokeDasharray="3 8" opacity={0.2} />
              <line x1={FIELD_LEFT} y1={yBot} x2={FIELD_RIGHT} y2={yBot} stroke="white" strokeWidth="0.5" strokeDasharray="3 8" opacity={0.2} />
              {/* Labels on left edge */}
              <text x={FIELD_LEFT - 2} y={yTop + 3} textAnchor="end" fill="white" fontSize="7" opacity={0.3}>{wm}m</text>
              <text x={FIELD_LEFT - 2} y={yBot + 3} textAnchor="end" fill="white" fontSize="7" opacity={0.3}>{wm}m</text>
            </g>
          );
        })}

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
            <line x1={cursorPos.svgX} y1={FIELD_TOP} x2={cursorPos.svgX} y2={FIELD_BOTTOM} stroke="white" strokeWidth="0.5" strokeDasharray="2 4" opacity={0.4} />
            <line x1={FIELD_LEFT} y1={cursorPos.svgY} x2={FIELD_RIGHT} y2={cursorPos.svgY} stroke="white" strokeWidth="0.5" strokeDasharray="2 4" opacity={0.4} />
            {/* Distance label (top) */}
            <rect
              x={cursorPos.svgX - 28} y={FIELD_TOP - 2}
              width={56} height={14} rx={3}
              fill="rgba(0,0,0,0.7)"
            />
            <text x={cursorPos.svgX} y={FIELD_TOP + 9} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
              {cursorPos.distM}m
            </text>
            {/* Lateral label (left side) */}
            <rect
              x={FIELD_LEFT - 1} y={cursorPos.svgY - 7}
              width={42} height={14} rx={3}
              fill="rgba(0,0,0,0.7)"
            />
            <text x={FIELD_LEFT + 20} y={cursorPos.svgY + 4} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
              {cursorPos.touchLeftM}m
            </text>
            {/* Right side label */}
            <rect
              x={FIELD_RIGHT - 41} y={cursorPos.svgY - 7}
              width={42} height={14} rx={3}
              fill="rgba(0,0,0,0.7)"
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
