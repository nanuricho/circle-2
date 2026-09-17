import React from 'react';

interface CompassIllustrationProps {
  cx: number; // needle tip x
  cy: number; // needle tip y
  radius: number; // radius in px
  angle: number; // current rotation angle in radians
  color?: string; // pencil stroke color
  isDrawing?: boolean;
}

export const CompassIllustration: React.FC<CompassIllustrationProps> = ({
  cx,
  cy,
  radius,
  angle,
  color = '#2563eb',
  isDrawing = false,
}) => {
  // Pencil tip position on the circle
  const px = cx + radius * Math.cos(angle);
  const py = cy + radius * Math.sin(angle);

  // Compass leg length in pixels (approx. 130px)
  const legLength = 135;
  // Calculate hinge apex height above the base chord
  const halfDist = radius / 2;
  const clampedHalf = Math.min(halfDist, legLength * 0.95);
  const apexHeight = Math.sqrt(Math.max(45 * 45, legLength * legLength - clampedHalf * clampedHalf));

  // Midpoint between needle and pencil tip
  const mx = (cx + px) / 2;
  const my = (cy + py) / 2;

  // Direction vector from needle to pencil
  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  // Upward normal vector (perpendicular) tilted slightly in the drawing direction
  // Screen Y is inverted, so "up" is negative Y
  const tiltFactor = isDrawing ? 0.15 : 0;
  // Tangent direction for natural forward tilt
  const tx = -Math.sin(angle);
  const ty = Math.cos(angle);

  // Apex position: above the midpoint with a slight 3D isometric perspective lift
  const apexX = mx + tx * (radius * tiltFactor);
  const apexY = my - apexHeight * 0.85 + ty * (radius * tiltFactor * 0.3);

  // Handle extends above apex
  const handleLength = 32;
  const handleTopX = apexX;
  const handleTopY = apexY - handleLength;

  return (
    <g className="pointer-events-none select-none drop-shadow-md">
      <defs>
        {/* Metallic gradient for needle leg */}
        <linearGradient id="metalLegGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="35%" stopColor="#e2e8f0" />
          <stop offset="70%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* Brass / gold hinge gradient */}
        <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        {/* Handle knurling texture */}
        <linearGradient id="handleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="40%" stopColor="#94a3b8" />
          <stop offset="70%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Shadow on paper */}
      <ellipse
        cx={cx + 3}
        cy={cy + 4}
        rx={5}
        ry={2.5}
        fill="rgba(0,0,0,0.25)"
      />
      <ellipse
        cx={px + 2}
        cy={py + 3}
        rx={4}
        ry={2}
        fill="rgba(0,0,0,0.2)"
      />

      {/* --- 1. NEEDLE LEG (Left leg fixed at center cx, cy) --- */}
      {/* Needle sharp tip (silver pin) */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + (apexX - cx) * 0.22}
        y2={cy + (apexY - cy) * 0.22}
        stroke="#475569"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Needle upper metal body */}
      <polygon
        points={`
          ${cx + (apexX - cx) * 0.2 - uy * 3},${cy + (apexY - cy) * 0.2 + ux * 3}
          ${cx + (apexX - cx) * 0.2 + uy * 3},${cy + (apexY - cy) * 0.2 - ux * 3}
          ${apexX + 3.5},${apexY}
          ${apexX - 3.5},${apexY}
        `}
        fill="url(#metalLegGradient)"
        stroke="#475569"
        strokeWidth="0.8"
      />

      {/* --- 2. PENCIL LEG (Right leg holding pencil) --- */}
      {/* Upper metal body */}
      <polygon
        points={`
          ${apexX - 3.5},${apexY}
          ${apexX + 3.5},${apexY}
          ${px + (apexX - px) * 0.45 + uy * 4.5},${py + (apexY - py) * 0.45 - ux * 4.5}
          ${px + (apexX - px) * 0.45 - uy * 4.5},${py + (apexY - py) * 0.45 + ux * 4.5}
        `}
        fill="url(#metalLegGradient)"
        stroke="#475569"
        strokeWidth="0.8"
      />

      {/* Clamp & Adjustment Screw */}
      <g>
        {/* Clamp ring */}
        <rect
          x={px + (apexX - px) * 0.42 - 5}
          y={py + (apexY - py) * 0.42 - 5}
          width="10"
          height="10"
          rx="2"
          fill="url(#brassGradient)"
          stroke="#854d0e"
          strokeWidth="0.8"
        />
        {/* Screw wing */}
        <circle
          cx={px + (apexX - px) * 0.42 + 7}
          cy={py + (apexY - py) * 0.42}
          r="3"
          fill="url(#brassGradient)"
          stroke="#713f12"
          strokeWidth="0.7"
        />
      </g>

      {/* The Pencil itself */}
      {/* Wooden pencil body */}
      <line
        x1={px + (apexX - px) * 0.4}
        y1={py + (apexY - py) * 0.4}
        x2={px + (apexX - px) * 0.12}
        y2={py + (apexY - py) * 0.12}
        stroke="#f59e0b"
        strokeWidth="6"
        strokeLinecap="butt"
      />
      {/* Pencil wood sharpened cone */}
      <polygon
        points={`
          ${px + (apexX - px) * 0.12 - uy * 3},${py + (apexY - py) * 0.12 + ux * 3}
          ${px + (apexX - px) * 0.12 + uy * 3},${py + (apexY - py) * 0.12 - ux * 3}
          ${px + (apexX - px) * 0.04},${py + (apexY - py) * 0.04}
        `}
        fill="#fde68a"
        stroke="#d97706"
        strokeWidth="0.5"
      />
      {/* Graphite / Colored Pencil Tip touching paper! */}
      <polygon
        points={`
          ${px + (apexX - px) * 0.05 - uy * 1.5},${py + (apexY - py) * 0.05 + ux * 1.5}
          ${px + (apexX - px) * 0.05 + uy * 1.5},${py + (apexY - py) * 0.05 - ux * 1.5}
          ${px},${py}
        `}
        fill={color}
      />
      {/* Glowing touch spark when drawing */}
      {isDrawing && (
        <circle
          cx={px}
          cy={py}
          r="4"
          fill={color}
          className="animate-ping opacity-75"
        />
      )}

      {/* --- 3. HINGE AND KNOB HANDLE --- */}
      {/* Hinge base circle */}
      <circle
        cx={apexX}
        cy={apexY}
        r="8"
        fill="url(#brassGradient)"
        stroke="#854d0e"
        strokeWidth="1.2"
      />
      {/* Hinge inner bolt */}
      <circle
        cx={apexX}
        cy={apexY}
        r="3.5"
        fill="#cbd5e1"
        stroke="#475569"
        strokeWidth="0.8"
      />

      {/* Turning Handle (top cylindrical knurled stem for fingers) */}
      <rect
        x={handleTopX - 3.5}
        y={handleTopY}
        width="7"
        height={handleLength}
        rx="2"
        fill="url(#handleGradient)"
        stroke="#0f172a"
        strokeWidth="0.8"
      />
      {/* Handle ribbing */}
      <line x1={handleTopX - 3} y1={handleTopY + 6} x2={handleTopX + 3} y2={handleTopY + 6} stroke="#64748b" strokeWidth="1" />
      <line x1={handleTopX - 3} y1={handleTopY + 12} x2={handleTopX + 3} y2={handleTopY + 12} stroke="#64748b" strokeWidth="1" />
      <line x1={handleTopX - 3} y1={handleTopY + 18} x2={handleTopX + 3} y2={handleTopY + 18} stroke="#64748b" strokeWidth="1" />
      <line x1={handleTopX - 3} y1={handleTopY + 24} x2={handleTopX + 3} y2={handleTopY + 24} stroke="#64748b" strokeWidth="1" />

      {/* Little red/gold spherical cap on top */}
      <circle
        cx={handleTopX}
        cy={handleTopY}
        r="4.5"
        fill="url(#brassGradient)"
        stroke="#713f12"
        strokeWidth="0.8"
      />

      {/* Center point pin marker badge on paper */}
      <g>
        <circle
          cx={cx}
          cy={cy}
          r="4"
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="#dc2626"
          className="font-sans"
        >
          ㅇ
        </text>
      </g>
    </g>
  );
};
