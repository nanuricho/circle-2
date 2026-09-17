import React, { useState, useRef } from 'react';
import { RotateCw, X } from 'lucide-react';

interface VirtualRulerProps {
  pixelsPerCm: number;
  onClose: () => void;
}

export const VirtualRuler: React.FC<VirtualRulerProps> = ({ pixelsPerCm, onClose }) => {
  const [pos, setPos] = useState({ x: 80, y: 120 });
  const [rotation, setRotation] = useState(0); // in degrees
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });

  const rulerLengthCm = 15;
  const rulerWidthPx = rulerLengthCm * pixelsPerCm;
  const rulerHeightPx = 64;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag if not clicking buttons
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPos({
      x: dragStartRef.current.startPosX + dx,
      y: dragStartRef.current.startPosY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const rotateRuler = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 45) % 360);
  };

  // Generate ticks for cm and mm
  const ticks = [];
  const totalMm = rulerLengthCm * 10;
  for (let mm = 0; mm <= totalMm; mm++) {
    const isCm = mm % 10 === 0;
    const isHalfCm = mm % 5 === 0 && !isCm;
    const x = 20 + (mm / 10) * pixelsPerCm;
    const height = isCm ? 22 : isHalfCm ? 14 : 8;

    ticks.push(
      <g key={mm}>
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#1e293b"
          strokeWidth={isCm ? 1.5 : 0.8}
        />
        {isCm && (
          <text
            x={x}
            y={34}
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            fill="#1e293b"
            className="select-none font-sans"
          >
            {mm / 10}
          </text>
        )}
      </g>
    );
  }

  return (
    <div
      id="virtual-ruler-container"
      className="absolute z-30 select-none touch-none cursor-move"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '20px 0px',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="relative bg-amber-100/90 backdrop-blur-xs border-2 border-amber-400 rounded-md shadow-xl transition-shadow hover:shadow-2xl overflow-hidden"
        style={{
          width: `${rulerWidthPx + 40}px`,
          height: `${rulerHeightPx}px`,
        }}
      >
        {/* Wood/Acrylic grain effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 to-amber-200/40 pointer-events-none" />

        {/* Action buttons inside the ruler */}
        <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
          <button
            id="ruler-rotate-btn"
            type="button"
            onClick={rotateRuler}
            title="자 45도 회전하기"
            className="p-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 shadow-xs cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            id="ruler-close-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="자 닫기"
            className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-700 shadow-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center label */}
        <div className="absolute left-1/2 top-7 -translate-x-1/2 text-[10px] text-amber-800 font-bold tracking-widest pointer-events-none flex items-center gap-1">
          <span>📏 15cm 눈금자</span>
          <span className="text-[9px] text-amber-700 font-normal">(드래그하여 이동)</span>
        </div>

        {/* Ticks SVG */}
        <svg
          className="w-full h-full pointer-events-none"
          viewBox={`0 0 ${rulerWidthPx + 40} ${rulerHeightPx}`}
        >
          {ticks}
        </svg>
      </div>
    </div>
  );
};
