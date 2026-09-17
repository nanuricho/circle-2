import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CircleItem,
  ToolMode,
  CompassDrawMode,
  GridConfig,
  CircleShapeType,
  SemicircleDirection,
} from '../types';
import { CompassIllustration } from './CompassIllustration';
import { VirtualRuler } from './VirtualRuler';
import { soundManager } from '../utils/audio';
import { Trash2, Copy, Eye, Move, PlusCircle, Sparkles, PaintBucket, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export const getSemicirclePath = (
  cx: number,
  cy: number,
  r: number,
  dir: SemicircleDirection = 'top'
): string => {
  switch (dir) {
    case 'top':
      return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`;
    case 'bottom':
      return `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy} Z`;
    case 'left':
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`;
    case 'right':
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`;
  }
};

export const getSemicircleGeometry = (
  cx: number,
  cy: number,
  r: number,
  dir: SemicircleDirection = 'top'
) => {
  switch (dir) {
    case 'top':
      return {
        startX: cx - r,
        startY: cy,
        endX: cx + r,
        endY: cy,
        apexX: cx,
        apexY: cy - r,
        diameterX1: cx - r,
        diameterY1: cy,
        diameterX2: cx + r,
        diameterY2: cy,
        baseStartAngle: Math.PI,
      };
    case 'bottom':
      return {
        startX: cx + r,
        startY: cy,
        endX: cx - r,
        endY: cy,
        apexX: cx,
        apexY: cy + r,
        diameterX1: cx - r,
        diameterY1: cy,
        diameterX2: cx + r,
        diameterY2: cy,
        baseStartAngle: 0,
      };
    case 'left':
      return {
        startX: cx,
        startY: cy + r,
        endX: cx,
        endY: cy - r,
        apexX: cx - r,
        apexY: cy,
        diameterX1: cx,
        diameterY1: cy - r,
        diameterX2: cx,
        diameterY2: cy + r,
        baseStartAngle: Math.PI * 0.5,
      };
    case 'right':
      return {
        startX: cx,
        startY: cy - r,
        endX: cx,
        endY: cy + r,
        apexX: cx + r,
        apexY: cy,
        diameterX1: cx,
        diameterY1: cy - r,
        diameterX2: cx,
        diameterY2: cy + r,
        baseStartAngle: Math.PI * 1.5,
      };
  }
};

interface CompassCanvasProps {
  circles: CircleItem[];
  onCirclesChange: (newCircles: CircleItem[]) => void;
  onNewCanvas?: () => void;
  currentTool: ToolMode;
  compassDrawMode: CompassDrawMode;
  shapeType?: CircleShapeType;
  semiDirection?: SemicircleDirection;
  radiusCm: number;
  selectedColor: string;
  strokeWidth: number;
  gridConfig: GridConfig;
  showCenterDefault: boolean;
  showRadiusDefault: boolean;
  showDiameterDefault: boolean;
  autoFillDefault?: boolean;
  selectedCircleId: string | null;
  onSelectCircle: (id: string | null) => void;
  onNudgeCircle?: (dx: number, dy: number) => void;
  showRuler: boolean;
  onCloseRuler: () => void;
}

interface ActiveCompassState {
  cx: number;
  cy: number;
  radius: number;
  angle: number; // current angle in radians
  startAngle: number;
  isDrawing: boolean;
  color: string;
  strokeWidth: number;
  drawnArcEnd: number; // accumulated rotation
  shapeType: CircleShapeType;
  semiDirection: SemicircleDirection;
  diameterProgress?: number;
}

export const CompassCanvas: React.FC<CompassCanvasProps> = ({
  circles,
  onCirclesChange,
  onNewCanvas,
  currentTool,
  compassDrawMode,
  shapeType = 'circle' as CircleShapeType,
  semiDirection = 'top' as SemicircleDirection,
  radiusCm,
  selectedColor,
  strokeWidth,
  gridConfig,
  showCenterDefault,
  showRadiusDefault,
  showDiameterDefault,
  autoFillDefault = false,
  selectedCircleId,
  onSelectCircle,
  onNudgeCircle,
  showRuler,
  onCloseRuler,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Compass state
  const [activeCompass, setActiveCompass] = useState<ActiveCompassState | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Dragging / Editing state
  const [draggingMode, setDraggingMode] = useState<'none' | 'move' | 'resize' | 'manual-draw'>('none');
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialCx: number;
    initialCy: number;
    initialRadius: number;
  }>({ startX: 0, startY: 0, initialCx: 0, initialCy: 0, initialRadius: 0 });

  // Update canvas size dynamically
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(600, rect.width),
          height: Math.max(500, rect.height),
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Grid unit (30px = 1cm)
  const pxPerCm = gridConfig.gridSize; // 30

  // Snap point to grid vertex if snap enabled
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number, snap = gridConfig.snapToGrid) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      let x = clientX - rect.left;
      let y = clientY - rect.top;

      if (snap) {
        x = Math.round(x / pxPerCm) * pxPerCm;
        y = Math.round(y / pxPerCm) * pxPerCm;
      }
      return { x, y };
    },
    [gridConfig.snapToGrid, pxPerCm]
  );

  // Trigger automated compass drawing (circle or semicircle)
  const startAutoCompassDrawing = (cx: number, cy: number) => {
    soundManager.playPinTap();
    const clampedRadiusCm = Math.min(10, Math.max(0.5, radiusCm));
    const targetRadius = Math.round(clampedRadiusCm * pxPerCm);

    const isSemi = shapeType === 'semicircle';
    const geom = isSemi ? getSemicircleGeometry(cx, cy, targetRadius, semiDirection) : null;
    const startAngle = isSemi && geom ? geom.baseStartAngle : 0;

    setActiveCompass({
      cx,
      cy,
      radius: targetRadius,
      angle: startAngle,
      startAngle,
      isDrawing: true,
      color: selectedColor,
      strokeWidth,
      drawnArcEnd: 0,
      shapeType,
      semiDirection,
      diameterProgress: 0,
    });

    const duration = 1400; // ms
    const startTime = performance.now();
    let lastScratchTime = startTime;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Play scratching sound at intervals
      if (now - lastScratchTime > 120 && progress < 0.95) {
        soundManager.playPencilScratch();
        lastScratchTime = now;
      }

      if (isSemi) {
        // Semicircle: 0 - 950ms arc rotation (180 deg), 950ms - 1400ms straight diameter baseline
        const arcDuration = 950;
        let currentAngle = startAngle;
        let diamProg = 0;

        if (elapsed <= arcDuration) {
          const p = elapsed / arcDuration;
          const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          currentAngle = startAngle + eased * Math.PI;
          diamProg = 0;
        } else {
          currentAngle = startAngle + Math.PI;
          const pLine = Math.min(1, (elapsed - arcDuration) / (duration - arcDuration));
          diamProg = pLine;
        }

        setActiveCompass((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            angle: currentAngle,
            drawnArcEnd: Math.min(Math.PI, currentAngle - startAngle),
            diameterProgress: diamProg,
          };
        });
      } else {
        // Full circle: 0 - 1400ms 360 deg
        const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        const currentAngle = eased * Math.PI * 2;

        setActiveCompass((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            angle: currentAngle,
            drawnArcEnd: currentAngle,
          };
        });
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        // Complete circle / semicircle!
        soundManager.playCompleteChime();
        confetti({
          particleCount: 35,
          spread: 55,
          origin: {
            x: (containerRef.current?.getBoundingClientRect().left ?? 0 + cx) / window.innerWidth,
            y: (containerRef.current?.getBoundingClientRect().top ?? 0 + cy) / window.innerHeight,
          },
        });

        const newCircle: CircleItem = {
          id: 'circle_' + Date.now(),
          cx,
          cy,
          radius: targetRadius,
          color: selectedColor,
          strokeWidth,
          showCenter: showCenterDefault,
          showRadius: showRadiusDefault,
          showDiameter: showDiameterDefault,
          label: isSemi
            ? `반원 (${(targetRadius / pxPerCm).toFixed(1)}cm)`
            : `원 (${(targetRadius / pxPerCm).toFixed(1)}cm)`,
          isFilled: autoFillDefault,
          fillColor: selectedColor,
          fillOpacity: 0.35,
          shapeType,
          semiDirection: isSemi ? semiDirection : undefined,
        };

        onCirclesChange([...circles, newCircle]);
        onSelectCircle(newCircle.id);

        // Keep compass visible momentarily then clear
        setTimeout(() => {
          setActiveCompass(null);
        }, 500);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  // Pointer Down handler on main SVG
  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking on ruler, ruler handles it
    if ((e.target as HTMLElement).closest('#virtual-ruler-container')) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (currentTool === 'compass') {
      if (activeCompass?.isDrawing) return;

      if (compassDrawMode === 'auto') {
        startAutoCompassDrawing(coords.x, coords.y);
      } else {
        // Manual draw mode: pin needle at clicked point
        soundManager.playPinTap();
        const clampedRadiusCm = Math.min(10, Math.max(0.5, radiusCm));
        const r = Math.round(clampedRadiusCm * pxPerCm);
        const isSemi = shapeType === 'semicircle';
        const geom = isSemi ? getSemicircleGeometry(coords.x, coords.y, r, semiDirection) : null;
        const startA = isSemi && geom ? geom.baseStartAngle : 0;

        setActiveCompass({
          cx: coords.x,
          cy: coords.y,
          radius: r,
          angle: startA,
          startAngle: startA,
          isDrawing: true,
          color: selectedColor,
          strokeWidth,
          drawnArcEnd: 0,
          shapeType,
          semiDirection,
          diameterProgress: 0,
        });
        setDraggingMode('manual-draw');
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    } else if (currentTool === 'fill') {
      // Find circle under click (allow clicking inside circle)
      const clicked = findCircleAtPoint(coords.x, coords.y, true);
      if (clicked) {
        soundManager.playPaintSplash();
        const isSameFill = clicked.isFilled && (clicked.fillColor || clicked.color) === selectedColor;
        const willFill = !isSameFill;
        const updated = circles.map((c) =>
          c.id === clicked.id
            ? {
                ...c,
                isFilled: willFill,
                fillColor: willFill ? selectedColor : undefined,
                fillOpacity: 0.35,
              }
            : c
        );
        onCirclesChange(updated);
        onSelectCircle(clicked.id);

        if (willFill) {
          confetti({
            particleCount: 25,
            spread: 50,
            colors: [selectedColor],
            origin: {
              x: (containerRef.current?.getBoundingClientRect().left ?? 0 + clicked.cx) / window.innerWidth,
              y: (containerRef.current?.getBoundingClientRect().top ?? 0 + clicked.cy) / window.innerHeight,
            },
          });
        }
      }
    } else if (currentTool === 'eraser') {
      // Find circle under click
      const clicked = findCircleAtPoint(coords.x, coords.y);
      if (clicked) {
        soundManager.playClick();
        onCirclesChange(circles.filter((c) => c.id !== clicked.id));
        if (selectedCircleId === clicked.id) {
          onSelectCircle(null);
        }
      }
    } else if (currentTool === 'select') {
      const clicked = findCircleAtPoint(coords.x, coords.y);
      if (clicked) {
        soundManager.playClick();
        onSelectCircle(clicked.id);
        setDraggingMode('move');
        dragStartRef.current = {
          startX: coords.x,
          startY: coords.y,
          initialCx: clicked.cx,
          initialCy: clicked.cy,
          initialRadius: clicked.radius,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        onSelectCircle(null);
      }
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    const rawCoords = getCanvasCoords(e.clientX, e.clientY, false);
    setMousePos(rawCoords);

    if (draggingMode === 'manual-draw' && activeCompass) {
      // Calculate angle from needle center to current mouse
      const dx = rawCoords.x - activeCompass.cx;
      const dy = rawCoords.y - activeCompass.cy;
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;

      const isSemi = activeCompass.shapeType === 'semicircle';
      const targetSweep = isSemi ? Math.PI : Math.PI * 2;
      const targetThreshold = isSemi ? Math.PI * 0.95 : Math.PI * 1.95;

      // Calculate forward distance
      let drawn = activeCompass.drawnArcEnd;
      const angleDiff = angle - activeCompass.angle;
      if (Math.abs(angleDiff) < Math.PI) {
        drawn = Math.max(drawn, drawn + Math.max(0, angleDiff));
      }

      soundManager.playPencilScratch();

      setActiveCompass((prev) => (prev ? { ...prev, angle, drawnArcEnd: Math.min(targetSweep, drawn) } : null));

      // If drawn enough to finish
      if (drawn >= targetThreshold) {
        soundManager.playCompleteChime();
        confetti({
          particleCount: 30,
          spread: 60,
        });

        const newCircle: CircleItem = {
          id: 'circle_' + Date.now(),
          cx: activeCompass.cx,
          cy: activeCompass.cy,
          radius: activeCompass.radius,
          color: selectedColor,
          strokeWidth,
          showCenter: showCenterDefault,
          showRadius: showRadiusDefault,
          showDiameter: showDiameterDefault,
          isFilled: autoFillDefault,
          fillColor: selectedColor,
          fillOpacity: 0.35,
          shapeType: activeCompass.shapeType,
          semiDirection: isSemi ? activeCompass.semiDirection : undefined,
          label: isSemi
            ? `반원 (${(activeCompass.radius / pxPerCm).toFixed(1)}cm)`
            : `원 (${(activeCompass.radius / pxPerCm).toFixed(1)}cm)`,
        };
        onCirclesChange([...circles, newCircle]);
        onSelectCircle(newCircle.id);
        setDraggingMode('none');
        setActiveCompass(null);
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    } else if (draggingMode === 'move' && selectedCircleId) {
      const coords = getCanvasCoords(e.clientX, e.clientY, gridConfig.snapToGrid);
      const dx = coords.x - dragStartRef.current.startX;
      const dy = coords.y - dragStartRef.current.startY;

      onCirclesChange(
        circles.map((c) => {
          if (c.id === selectedCircleId) {
            return {
              ...c,
              cx: Math.max(c.radius, Math.min(dimensions.width - c.radius, dragStartRef.current.initialCx + dx)),
              cy: Math.max(c.radius, Math.min(dimensions.height - c.radius, dragStartRef.current.initialCy + dy)),
            };
          }
          return c;
        })
      );
    } else if (draggingMode === 'resize' && selectedCircleId) {
      const coords = getCanvasCoords(e.clientX, e.clientY, false);
      const circle = circles.find((c) => c.id === selectedCircleId);
      if (circle) {
        const dist = Math.hypot(coords.x - circle.cx, coords.y - circle.cy);
        const snappedRadius = gridConfig.snapToGrid ? Math.round(dist / pxPerCm) * pxPerCm : Math.round(dist);
        const clampedRadius = Math.max(pxPerCm * 0.5, Math.min(pxPerCm * 10, snappedRadius));

        onCirclesChange(
          circles.map((c) => (c.id === selectedCircleId ? { ...c, radius: clampedRadius } : c))
        );
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingMode === 'manual-draw' && activeCompass) {
      const isSemi = activeCompass.shapeType === 'semicircle';
      const minThreshold = isSemi ? Math.PI * 0.65 : Math.PI * 1.5;

      // If user released before completing
      if (activeCompass.drawnArcEnd < minThreshold) {
        // Did not finish circle
        setActiveCompass(null);
      } else {
        // Finish circle / semicircle
        soundManager.playCompleteChime();
        const newCircle: CircleItem = {
          id: 'circle_' + Date.now(),
          cx: activeCompass.cx,
          cy: activeCompass.cy,
          radius: activeCompass.radius,
          color: selectedColor,
          strokeWidth,
          showCenter: showCenterDefault,
          showRadius: showRadiusDefault,
          showDiameter: showDiameterDefault,
          isFilled: autoFillDefault,
          fillColor: selectedColor,
          fillOpacity: 0.35,
          shapeType: activeCompass.shapeType,
          semiDirection: isSemi ? activeCompass.semiDirection : undefined,
          label: isSemi
            ? `반원 (${(activeCompass.radius / pxPerCm).toFixed(1)}cm)`
            : `원 (${(activeCompass.radius / pxPerCm).toFixed(1)}cm)`,
        };
        onCirclesChange([...circles, newCircle]);
        onSelectCircle(newCircle.id);
        setActiveCompass(null);
      }
    }

    setDraggingMode('none');
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Helper to find a circle at (x, y)
  const findCircleAtPoint = (x: number, y: number, allowInside = false): CircleItem | null => {
    // Check in reverse order (topmost first)
    for (let i = circles.length - 1; i >= 0; i--) {
      const c = circles[i];
      const dist = Math.hypot(x - c.cx, y - c.cy);

      if (c.shapeType === 'semicircle') {
        const dir = c.semiDirection || 'top';
        // Check half plane
        const inHalfPlane =
          dir === 'top'
            ? y <= c.cy + 10
            : dir === 'bottom'
            ? y >= c.cy - 10
            : dir === 'left'
            ? x <= c.cx + 10
            : x >= c.cx - 10;

        // Near straight diameter line
        const nearDiameter =
          dir === 'top' || dir === 'bottom'
            ? Math.abs(y - c.cy) <= 12 && Math.abs(x - c.cx) <= c.radius + 8
            : Math.abs(x - c.cx) <= 12 && Math.abs(y - c.cy) <= c.radius + 8;

        // Near circular arc
        const nearArc = Math.abs(dist - c.radius) <= 15 && inHalfPlane;
        // Near center dot
        const nearCenter = dist <= 16;
        // Inside shape
        const inside = inHalfPlane && dist <= c.radius + 6;

        if (allowInside) {
          if (inside) return c;
        } else {
          if (nearArc || nearDiameter || nearCenter || (c.isFilled && inside)) {
            return c;
          }
        }
      } else {
        if (allowInside) {
          if (dist <= c.radius + 8) {
            return c;
          }
        } else {
          // Near perimeter or inside center dot or inside if filled
          if (Math.abs(dist - c.radius) <= 15 || dist <= 16 || (c.isFilled && dist <= c.radius)) {
            return c;
          }
        }
      }
    }
    return null;
  };

  // Start resizing selected circle from perimeter handle
  const handleStartResize = (e: React.PointerEvent, circle: CircleItem) => {
    e.stopPropagation();
    soundManager.playClick();
    setDraggingMode('resize');
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialCx: circle.cx,
      initialCy: circle.cy,
      initialRadius: circle.radius,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Selected circle object
  const selectedCircle = circles.find((c) => c.id === selectedCircleId);

  // Duplicate selected circle
  const handleDuplicate = (circle: CircleItem) => {
    soundManager.playClick();
    const copy: CircleItem = {
      ...circle,
      id: 'circle_' + Date.now(),
      cx: Math.min(dimensions.width - circle.radius, circle.cx + pxPerCm),
      cy: Math.min(dimensions.height - circle.radius, circle.cy + pxPerCm),
    };
    onCirclesChange([...circles, copy]);
    onSelectCircle(copy.id);
  };

  // Grid Colors theme
  const gridLineColor =
    gridConfig.gridColor === 'blue'
      ? '#cbd5e1'
      : gridConfig.gridColor === 'green'
      ? '#bbf7d0'
      : '#e2e8f0';

  const gridMajorColor =
    gridConfig.gridColor === 'blue'
      ? '#93c5fd'
      : gridConfig.gridColor === 'green'
      ? '#86efac'
      : '#cbd5e1';

  return (
    <div
      ref={containerRef}
      id="compass-canvas-viewport"
      className="relative flex-1 w-full h-full overflow-hidden select-none touch-none bg-[#fbfbfa]"
      style={{ minHeight: '520px' }}
    >
      {/* 1. Virtual Movable Ruler */}
      {showRuler && (
        <VirtualRuler pixelsPerCm={pxPerCm} onClose={onCloseRuler} />
      )}

      {/* 2. Main Interactive SVG Board */}
      <svg
        id="compass-grid-svg"
        className={`w-full h-full block ${
          currentTool === 'compass'
            ? 'cursor-crosshair'
            : currentTool === 'fill'
            ? 'cursor-pointer'
            : currentTool === 'eraser'
            ? 'cursor-pointer'
            : currentTool === 'select'
            ? 'cursor-default'
            : 'cursor-default'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          {/* Subtle Grid Pattern: 1cm (30px) subdivided into two 0.5cm steps */}
          <pattern
            id="subGrid"
            width={pxPerCm / 2}
            height={pxPerCm / 2}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${pxPerCm / 2} 0 L 0 0 0 ${pxPerCm / 2}`}
              fill="none"
              stroke={gridLineColor}
              strokeWidth="0.5"
              strokeDasharray="1,2"
            />
          </pattern>

          <pattern
            id="mainGrid"
            width={pxPerCm}
            height={pxPerCm}
            patternUnits="userSpaceOnUse"
          >
            <rect width={pxPerCm} height={pxPerCm} fill="url(#subGrid)" />
            <path
              d={`M ${pxPerCm} 0 L 0 0 0 ${pxPerCm}`}
              fill="none"
              stroke={gridMajorColor}
              strokeWidth="0.9"
            />
          </pattern>

          {/* Marker arrow for radius line */}
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#2563eb" />
          </marker>
        </defs>

        {/* --- Background Graph Paper (모눈종이) --- */}
        <rect width="100%" height="100%" fill="#ffffff" />
        <rect width="100%" height="100%" fill="url(#mainGrid)" />

        {/* Grid Axis Coordinate Labels along top and left edge */}
        <g className="pointer-events-none select-none opacity-60">
          {Array.from({ length: Math.ceil(dimensions.width / pxPerCm) }).map((_, i) => (
            <text
              key={`x_${i}`}
              x={i * pxPerCm}
              y={14}
              fontSize="9"
              fill="#64748b"
              textAnchor="middle"
              className="font-mono font-semibold"
            >
              {i > 0 && `${i}`}
            </text>
          ))}
          {Array.from({ length: Math.ceil(dimensions.height / pxPerCm) }).map((_, j) => (
            <text
              key={`y_${j}`}
              x={12}
              y={j * pxPerCm + 3}
              fontSize="9"
              fill="#64748b"
              textAnchor="middle"
              className="font-mono font-semibold"
            >
              {j > 0 && `${j}`}
            </text>
          ))}
        </g>

        {/* --- Render Existing Circles / Semicircles --- */}
        {circles.map((circle) => {
          const isSelected = circle.id === selectedCircleId;
          const isSemi = circle.shapeType === 'semicircle';
          const dir = circle.semiDirection || 'top';
          const radiusInCm = (circle.radius / pxPerCm).toFixed(1);
          const diameterInCm = ((circle.radius * 2) / pxPerCm).toFixed(1);
          const geom = isSemi ? getSemicircleGeometry(circle.cx, circle.cy, circle.radius, dir) : null;
          const semiPath = isSemi ? getSemicirclePath(circle.cx, circle.cy, circle.radius, dir) : '';

          return (
            <g key={circle.id} className="transition-opacity">
              {/* Optional Fill */}
              {circle.isFilled && (
                isSemi ? (
                  <path
                    d={semiPath}
                    fill={circle.fillColor || circle.color}
                    fillOpacity={circle.fillOpacity ?? 0.35}
                    className="transition-all"
                  />
                ) : (
                  <circle
                    cx={circle.cx}
                    cy={circle.cy}
                    r={circle.radius}
                    fill={circle.fillColor || circle.color}
                    fillOpacity={circle.fillOpacity ?? 0.35}
                    className="transition-all"
                  />
                )
              )}

              {/* Shape Perimeter Stroke */}
              {isSemi ? (
                <path
                  id={`circle-elem-${circle.id}`}
                  d={semiPath}
                  fill="transparent"
                  stroke={circle.color}
                  strokeWidth={isSelected ? circle.strokeWidth + 1.5 : circle.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cursor-pointer"
                />
              ) : (
                <circle
                  id={`circle-elem-${circle.id}`}
                  cx={circle.cx}
                  cy={circle.cy}
                  r={circle.radius}
                  fill="transparent"
                  stroke={circle.color}
                  strokeWidth={isSelected ? circle.strokeWidth + 1.5 : circle.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cursor-pointer"
                />
              )}

              {/* Selection Halo */}
              {isSelected && (
                isSemi ? (
                  <path
                    d={semiPath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5,4"
                    className="animate-pulse"
                  />
                ) : (
                  <circle
                    cx={circle.cx}
                    cy={circle.cy}
                    r={circle.radius}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5,4"
                    className="animate-pulse"
                  />
                )
              )}

              {/* 1. Property: Diameter Line (지름) */}
              {circle.showDiameter && (
                <g className="pointer-events-none select-none">
                  {isSemi && geom ? (
                    <>
                      <line
                        x1={geom.diameterX1}
                        y1={geom.diameterY1}
                        x2={geom.diameterX2}
                        y2={geom.diameterY2}
                        stroke="#dc2626"
                        strokeWidth="2.2"
                        strokeDasharray="4,3"
                      />
                      <circle cx={geom.diameterX1} cy={geom.diameterY1} r="3.5" fill="#dc2626" />
                      <circle cx={geom.diameterX2} cy={geom.diameterY2} r="3.5" fill="#dc2626" />
                      <g
                        transform={
                          dir === 'top'
                            ? `translate(${circle.cx - 36}, ${circle.cy + 10})`
                            : dir === 'bottom'
                            ? `translate(${circle.cx - 36}, ${circle.cy - 24})`
                            : dir === 'left'
                            ? `translate(${circle.cx + 8}, ${circle.cy - 9})`
                            : `translate(${circle.cx - 80}, ${circle.cy - 9})`
                        }
                      >
                        <rect x="0" y="0" width="72" height="18" rx="4" fill="#fef2f2" stroke="#f87171" strokeWidth="1" />
                        <text x="36" y="13" fontSize="10" fontWeight="bold" fill="#b91c1c" textAnchor="middle">
                          지름 {diameterInCm}cm
                        </text>
                      </g>
                    </>
                  ) : (
                    <>
                      {/* Horizontal line passing through center */}
                      <line
                        x1={circle.cx - circle.radius}
                        y1={circle.cy}
                        x2={circle.cx + circle.radius}
                        y2={circle.cy}
                        stroke="#dc2626"
                        strokeWidth="2"
                        strokeDasharray="4,3"
                      />
                      <circle cx={circle.cx - circle.radius} cy={circle.cy} r="3" fill="#dc2626" />
                      <circle cx={circle.cx + circle.radius} cy={circle.cy} r="3" fill="#dc2626" />
                      <g transform={`translate(${circle.cx - 36}, ${circle.cy + 10})`}>
                        <rect x="0" y="0" width="72" height="18" rx="4" fill="#fef2f2" stroke="#f87171" strokeWidth="1" />
                        <text x="36" y="13" fontSize="10" fontWeight="bold" fill="#b91c1c" textAnchor="middle">
                          지름 {diameterInCm}cm
                        </text>
                      </g>
                    </>
                  )}
                </g>
              )}

              {/* 2. Property: Radius Line (반지름) */}
              {circle.showRadius && (
                <g className="pointer-events-none select-none">
                  {isSemi && geom ? (
                    <>
                      <line
                        x1={circle.cx}
                        y1={circle.cy}
                        x2={geom.apexX}
                        y2={geom.apexY}
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx={geom.apexX} cy={geom.apexY} r="3.5" fill="#2563eb" />
                      <g
                        transform={
                          dir === 'top'
                            ? `translate(${circle.cx - 35}, ${circle.cy - circle.radius * 0.5 - 12})`
                            : dir === 'bottom'
                            ? `translate(${circle.cx - 35}, ${circle.cy + circle.radius * 0.5 - 6})`
                            : dir === 'left'
                            ? `translate(${circle.cx - circle.radius * 0.5 - 40}, ${circle.cy - 20})`
                            : `translate(${circle.cx + circle.radius * 0.5 - 30}, ${circle.cy - 20})`
                        }
                      >
                        <rect x="0" y="0" width="70" height="18" rx="4" fill="#eff6ff" stroke="#60a5fa" strokeWidth="1" />
                        <text x="35" y="13" fontSize="10" fontWeight="bold" fill="#1d4ed8" textAnchor="middle">
                          반지름 {radiusInCm}cm
                        </text>
                      </g>
                    </>
                  ) : (
                    (() => {
                      const angle = -Math.PI / 4;
                      const rx = circle.cx + circle.radius * Math.cos(angle);
                      const ry = circle.cy + circle.radius * Math.sin(angle);
                      const labelX = circle.cx + (circle.radius * 0.55) * Math.cos(angle);
                      const labelY = circle.cy + (circle.radius * 0.55) * Math.sin(angle) - 6;

                      return (
                        <>
                          <line
                            x1={circle.cx}
                            y1={circle.cy}
                            x2={rx}
                            y2={ry}
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <circle cx={rx} cy={ry} r="3.5" fill="#2563eb" />
                          <g transform={`translate(${labelX - 35}, ${labelY - 14})`}>
                            <rect
                              x="0"
                              y="0"
                              width="70"
                              height="18"
                              rx="4"
                              fill="#eff6ff"
                              stroke="#60a5fa"
                              strokeWidth="1"
                            />
                            <text
                              x="35"
                              y="13"
                              fontSize="10"
                              fontWeight="bold"
                              fill="#1d4ed8"
                              textAnchor="middle"
                            >
                              반지름 {radiusInCm}cm
                            </text>
                          </g>
                        </>
                      );
                    })()
                  )}
                </g>
              )}

              {/* 3. Property: Center Point (중심 점 ㅇ) */}
              {(circle.showCenter || isSelected) && (
                <g className="pointer-events-none select-none">
                  <circle
                    cx={circle.cx}
                    cy={circle.cy}
                    r="4.5"
                    fill="#e11d48"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={circle.cx}
                    y={circle.cy - 7}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="extrabold"
                    fill="#be123c"
                    className="font-sans"
                  >
                    ㅇ
                  </text>

                  {/* Center Coordinate Live Badge when selected */}
                  {isSelected && currentTool === 'select' && (
                    <g transform={`translate(${circle.cx}, ${circle.cy + 17})`}>
                      <rect
                        x="-34"
                        y="-8"
                        width="68"
                        height="16"
                        rx="4"
                        fill="#ffffff"
                        stroke="#e11d48"
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#be123c"
                        className="font-mono"
                      >
                        {Math.round(circle.cx)}, {Math.round(circle.cy)}
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* 4. Selection Resize Handle */}
              {isSelected && currentTool === 'select' && (
                <g>
                  {/* Perimeter Resize handle */}
                  <circle
                    cx={isSemi && geom ? geom.apexX : circle.cx + circle.radius}
                    cy={isSemi && geom ? geom.apexY : circle.cy}
                    r="8"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="cursor-pointer hover:scale-125 transition-transform"
                    onPointerDown={(e) => handleStartResize(e, circle)}
                    title="반지름 크기 조절"
                  />

                  {/* Center drag handle */}
                  <circle
                    cx={circle.cx}
                    cy={circle.cy}
                    r="12"
                    fill="transparent"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    className="cursor-move"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* --- Active Animated Compass In Progress --- */}
        {activeCompass && (
          <g>
            {/* Real-time drawn arc and diameter under the pencil tip */}
            {(() => {
              const {
                cx,
                cy,
                radius,
                startAngle,
                angle,
                drawnArcEnd,
                shapeType: aShape,
                semiDirection: aDir,
                diameterProgress = 0,
              } = activeCompass;

              if (aShape === 'semicircle') {
                const geom = getSemicircleGeometry(cx, cy, radius, aDir);
                const startX = cx + radius * Math.cos(startAngle);
                const startY = cy + radius * Math.sin(startAngle);
                const curArcX = cx + radius * Math.cos(startAngle + drawnArcEnd);
                const curArcY = cy + radius * Math.sin(startAngle + drawnArcEnd);

                let pathData = `M ${startX} ${startY}`;
                if (drawnArcEnd > 0) {
                  pathData += ` A ${radius} ${radius} 0 0 1 ${curArcX} ${curArcY}`;
                }
                if (diameterProgress > 0) {
                  const lineTargetX = curArcX + (startX - curArcX) * diameterProgress;
                  const lineTargetY = curArcY + (startY - curArcY) * diameterProgress;
                  pathData += ` L ${lineTargetX} ${lineTargetY}`;
                }

                return (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={activeCompass.color}
                    strokeWidth={activeCompass.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              } else {
                if (drawnArcEnd > 0) {
                  const endX = cx + radius * Math.cos(drawnArcEnd);
                  const endY = cy + radius * Math.sin(drawnArcEnd);
                  const largeArc = drawnArcEnd > Math.PI ? 1 : 0;
                  const pathData = `M ${cx + radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
                  return (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={activeCompass.color}
                      strokeWidth={activeCompass.strokeWidth}
                      strokeLinecap="round"
                    />
                  );
                }
                return null;
              }
            })()}

            {/* Compass Real 3D-Like Metallic SVG */}
            <CompassIllustration
              cx={activeCompass.cx}
              cy={activeCompass.cy}
              radius={activeCompass.radius}
              angle={activeCompass.angle}
              color={activeCompass.color}
              isDrawing={activeCompass.isDrawing}
            />
          </g>
        )}

        {/* Needle indicator when hovering in Compass mode and not currently drawing (No transparent circle) */}
        {currentTool === 'compass' && !activeCompass && mousePos && (
          <g className="pointer-events-none select-none">
            {(() => {
              const targetX = gridConfig.snapToGrid ? Math.round(mousePos.x / pxPerCm) * pxPerCm : mousePos.x;
              const targetY = gridConfig.snapToGrid ? Math.round(mousePos.y / pxPerCm) * pxPerCm : mousePos.y;
              return (
                <>
                  {/* Needle pin dot preview */}
                  <circle cx={targetX} cy={targetY} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x={targetX}
                    y={targetY - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#dc2626"
                  >
                    ㅇ (중심)
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* 3. Selected Circle Floating Actions Toolbar */}
      {selectedCircle && currentTool === 'select' && (
        <div
          id="selected-circle-floating-bar"
          className="absolute z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-full shadow-lg border border-slate-200 pointer-events-auto"
          style={{
            left: `${Math.min(dimensions.width - 410, Math.max(16, selectedCircle.cx - 180))}px`,
            top: `${Math.max(16, selectedCircle.cy - selectedCircle.radius - 46)}px`,
          }}
        >
          <div className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCircle.color }} />
            <span>
              {selectedCircle.shapeType === 'semicircle' ? '반원 ' : '원 '}
              {(selectedCircle.radius / pxPerCm).toFixed(1)}cm
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Delicate center fine-tuning control */}
          <div
            className="flex items-center gap-1 bg-slate-100/90 px-2 py-0.5 rounded-lg border border-slate-200"
            title="키보드 방향키(↑↓←→): 1px씩 섬세하게 이동&#10;Shift + 방향키: 10px 이동&#10;Ctrl + 방향키: 30px(1cm) 이동"
          >
            <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
              <span className="text-slate-400">중심</span>
              <span className="font-mono font-bold text-slate-700">
                ({Math.round(selectedCircle.cx)}, {Math.round(selectedCircle.cy)})
              </span>
            </div>
            {onNudgeCircle && (
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={(e) => onNudgeCircle(e.shiftKey ? -10 : -1, 0)}
                  title="중심 왼쪽으로 1px 이동 (방향키 ◀, Shift: 10px)"
                  className="w-4 h-4 flex items-center justify-center text-[9px] bg-white text-slate-700 hover:text-blue-600 rounded border border-slate-200 shadow-2xs hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  ◀
                </button>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => onNudgeCircle(0, e.shiftKey ? -10 : -1)}
                    title="중심 위로 1px 이동 (방향키 ▲, Shift: 10px)"
                    className="w-4 h-2 flex items-center justify-center text-[7px] leading-none bg-white text-slate-700 hover:text-blue-600 rounded border border-slate-200 shadow-2xs hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onNudgeCircle(0, e.shiftKey ? 10 : 1)}
                    title="중심 아래로 1px 이동 (방향키 ▼, Shift: 10px)"
                    className="w-4 h-2 flex items-center justify-center text-[7px] leading-none bg-white text-slate-700 hover:text-blue-600 rounded border border-slate-200 shadow-2xs hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => onNudgeCircle(e.shiftKey ? 10 : 1)}
                  title="중심 오른쪽으로 1px 이동 (방향키 ▶, Shift: 10px)"
                  className="w-4 h-4 flex items-center justify-center text-[9px] bg-white text-slate-700 hover:text-blue-600 rounded border border-slate-200 shadow-2xs hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  ▶
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Toggle between Circle and Semicircle */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              const nextShape: CircleShapeType = selectedCircle.shapeType === 'semicircle' ? 'circle' : 'semicircle';
              onCirclesChange(
                circles.map((c) =>
                  c.id === selectedCircle.id
                    ? {
                        ...c,
                        shapeType: nextShape,
                        semiDirection: c.semiDirection || 'top',
                        label: nextShape === 'semicircle'
                          ? `반원 (${(c.radius / pxPerCm).toFixed(1)}cm)`
                          : `원 (${(c.radius / pxPerCm).toFixed(1)}cm)`,
                      }
                    : c
                )
              );
            }}
            title={selectedCircle.shapeType === 'semicircle' ? "온전한 원으로 변환하기" : "반원으로 변환하기"}
            className="px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            <span>{selectedCircle.shapeType === 'semicircle' ? '🌕 원으로' : '🌓 반원으로'}</span>
          </button>

          {/* If semicircle: Direction Rotation button */}
          {selectedCircle.shapeType === 'semicircle' && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                const dirs: SemicircleDirection[] = ['top', 'right', 'bottom', 'left'];
                const currentIdx = dirs.indexOf(selectedCircle.semiDirection || 'top');
                const nextDir = dirs[(currentIdx + 1) % dirs.length];
                onCirclesChange(
                  circles.map((c) => (c.id === selectedCircle.id ? { ...c, semiDirection: nextDir } : c))
                );
              }}
              title="반원 방향 90° 회전하기"
              className="px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <RotateCw className="w-3 h-3 text-indigo-600" />
              <span>회전</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200" />

          {/* Color Fill toggle button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playPaintSplash();
              const willFill = !selectedCircle.isFilled;
              onCirclesChange(
                circles.map((c) =>
                  c.id === selectedCircle.id
                    ? {
                        ...c,
                        isFilled: willFill,
                        fillColor: willFill ? (selectedCircle.fillColor || selectedColor) : undefined,
                        fillOpacity: 0.35,
                      }
                    : c
                )
              );
            }}
            title={selectedCircle.isFilled ? "색 채우기 끄기" : "도형 내부 색 채우기"}
            className={`px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors border ${
              selectedCircle.isFilled
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PaintBucket className="w-3.5 h-3.5 text-amber-600" />
            <span>{selectedCircle.isFilled ? '채움 ON' : '색 채우기'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Duplicate button */}
          <button
            type="button"
            onClick={() => handleDuplicate(selectedCircle)}
            title="도형 복제하기"
            className="p-1 rounded-md text-slate-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onCirclesChange(circles.filter((c) => c.id !== selectedCircle.id));
              onSelectCircle(null);
            }}
            title="도형 삭제하기"
            className="p-1 rounded-md text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Bottom Hint Helper for 3rd Graders */}
      <div className="absolute bottom-3 left-4 pointer-events-none z-10 flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs text-slate-600">
        <span className="text-base">💡</span>
        <span>
          {currentTool === 'compass' ? (
            compassDrawMode === 'auto' ? (
              shapeType === 'semicircle' ? (
                <>
                  모눈종이 위를 클릭하면 <strong>침(점 ㅇ)을 꽂고 180° 반원</strong>을 그려요!
                </>
              ) : (
                <>
                  모눈종이 위를 클릭하면 <strong>침(점 ㅇ)을 꽂고</strong> 자동으로 원을 그려요!
                </>
              )
            ) : (
              shapeType === 'semicircle' ? (
                <>
                  모눈종이를 누르고 <strong>컴퍼스를 반 바퀴(180°) 돌려</strong> 반원을 완성해보세요!
                </>
              ) : (
                <>
                  모눈종이를 누르고 <strong>컴퍼스를 손으로 빙 둘러</strong> 원을 완성해보세요!
                </>
              )
            )
          ) : currentTool === 'select' ? (
            <>
              도형을 클릭하여 위치를 이동하거나, <strong>키보드 방향키(↑↓←→)</strong>로 중심을 <strong>1px씩 섬세하게</strong> 이동해보세요! (Shift: 10px, Ctrl: 30px)
            </>
          ) : currentTool === 'fill' ? (
            <>
              🎨 색칠할 원이나 반원을 클릭하면 <strong>예쁜 색깔</strong>이 채워져요! (다시 누르면 취소)
            </>
          ) : currentTool === 'eraser' ? (
            <>
              지우고 싶은 원이나 반원을 클릭하면 <strong>말끔히 지워져요</strong>.
            </>
          ) : null}
        </span>
      </div>

      {/* 5. Measurement Badge & Quick New Canvas on Bottom Right */}
      <div className="absolute bottom-3 right-4 z-10 flex items-center gap-2">
        {circles.length > 0 && onNewCanvas && (
          <button
            type="button"
            onClick={onNewCanvas}
            title="새로운 그림을 그릴 수 있도록 깨끗한 새 화면으로 시작해요"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-1.5 rounded-xl shadow-md font-bold text-xs cursor-pointer transition-all hover:shadow-lg pointer-events-auto"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>새 도화지로 그리기</span>
          </button>
        )}
        <div className="pointer-events-none flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs text-slate-500 font-mono">
          <span>1칸 = 1.0cm (30px)</span>
          <span className="text-slate-300">|</span>
          <span>총 {circles.length}개의 원</span>
        </div>
      </div>
    </div>
  );
};
