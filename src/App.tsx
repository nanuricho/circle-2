/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CircleItem, ToolMode, CompassDrawMode, GridConfig, CircleShapeType, SemicircleDirection } from './types';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { CompassCanvas } from './components/CompassCanvas';
import { LearnModal } from './components/LearnModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { exportCanvasToPng } from './utils/exportImage';
import { soundManager } from './utils/audio';

// Initial welcoming example circle (3cm radius at center)
const INITIAL_CIRCLES: CircleItem[] = [
  {
    id: 'starter_circle',
    cx: 420,
    cy: 280,
    radius: 90, // 3cm (30px * 3)
    color: '#2563eb',
    strokeWidth: 3,
    showCenter: true,
    showRadius: true,
    showDiameter: false,
    label: '반지름 3cm 원',
    isFilled: true,
    fillColor: '#2563eb',
    fillOpacity: 0.18,
  },
];

export default function App() {
  // Main circle list
  const [circles, setCircles] = useState<CircleItem[]>(INITIAL_CIRCLES);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<CircleItem[][]>([INITIAL_CIRCLES]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Current Tool and Compass drawing options
  const [currentTool, setCurrentTool] = useState<ToolMode>('compass');
  const [compassDrawMode, setCompassDrawMode] = useState<CompassDrawMode>('auto');
  const [shapeType, setShapeType] = useState<CircleShapeType>('circle');
  const [semiDirection, setSemiDirection] = useState<SemicircleDirection>('top');

  // Drawing settings
  const [radiusCm, setRadiusCm] = useState<number>(3);
  const [selectedColor, setSelectedColor] = useState<string>('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Grid Configuration (모눈종이)
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    gridSize: 30, // 1cm = 30px
    subDivisions: 2,
    snapToGrid: true,
    showCoordinates: true,
    gridColor: 'blue',
  });

  // Circle Property defaults (원의 성질 기본 표시 옵션)
  const [showCenterDefault, setShowCenterDefault] = useState(true);
  const [showRadiusDefault, setShowRadiusDefault] = useState(true);
  const [showDiameterDefault, setShowDiameterDefault] = useState(false);
  const [autoFillDefault, setAutoFillDefault] = useState(false);

  // Selection state
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  // Tools & Modals
  const [showRuler, setShowRuler] = useState(false);
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [currentCanvasTitle, setCurrentCanvasTitle] = useState('새로운 원 도화지');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync sound manager enabled
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    soundManager.enabled = nextVal;
  };

  // Push new state to history stack
  const updateCirclesWithHistory = useCallback((newCircles: CircleItem[]) => {
    setCircles(newCircles);
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newCircles];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      soundManager.playClick();
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setCircles(history[prevIdx]);
      setSelectedCircleId(null);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      soundManager.playClick();
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCircles(history[nextIdx]);
      setSelectedCircleId(null);
    }
  }, [history, historyIndex]);

  // Refs for debouncing history during arrow-key fine nudging
  const nudgeHistoryInitialRef = useRef<CircleItem[] | null>(null);
  const nudgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, Arrow Keys for center fine-tuning)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCircleId) {
          e.preventDefault();
          soundManager.playClick();
          updateCirclesWithHistory(circles.filter((c) => c.id !== selectedCircleId));
          setSelectedCircleId(null);
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Target circle: selected circle, or the most recent circle if none is currently selected
        const targetId = selectedCircleId || (circles.length > 0 ? circles[circles.length - 1].id : null);
        if (!targetId) return;

        e.preventDefault();

        // Ensure target circle is selected visually
        if (!selectedCircleId) {
          setSelectedCircleId(targetId);
        }

        // Tactile audio feedback on initial press
        if (!e.repeat) {
          soundManager.playPinTap();
        }

        // Record starting snapshot for single-step Undo before starting a nudge sequence
        if (!nudgeHistoryInitialRef.current) {
          nudgeHistoryInitialRef.current = circles;
        }

        // Step calculation:
        // - Default: 1px (delicate micro-nudge for pixel-level precision)
        // - Shift: 10px (faster fine nudge)
        // - Ctrl / Meta / Alt: 30px (1cm / 1 whole grid block)
        const step = (e.ctrlKey || e.metaKey || e.altKey) ? 30 : (e.shiftKey ? 10 : 1);
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        setCircles((prevCircles) => {
          const nextCircles = prevCircles.map((c) => {
            if (c.id === targetId) {
              return {
                ...c,
                cx: Math.round(c.cx + dx),
                cy: Math.round(c.cy + dy),
              };
            }
            return c;
          });

          // Debounced history commit so continuous holding doesn't flood history stack
          if (nudgeTimeoutRef.current) {
            clearTimeout(nudgeTimeoutRef.current);
          }
          nudgeTimeoutRef.current = setTimeout(() => {
            if (nudgeHistoryInitialRef.current) {
              setHistory((prevHistory) => {
                const sliced = prevHistory.slice(0, historyIndex + 1);
                return [...sliced, nextCircles];
              });
              setHistoryIndex((prevIdx) => prevIdx + 1);
              nudgeHistoryInitialRef.current = null;
            }
          }, 350);

          return nextCircles;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (nudgeTimeoutRef.current) {
          clearTimeout(nudgeTimeoutRef.current);
          nudgeTimeoutRef.current = null;
        }
        if (nudgeHistoryInitialRef.current) {
          setCircles((currentCircles) => {
            setHistory((prevHistory) => {
              const sliced = prevHistory.slice(0, historyIndex + 1);
              return [...sliced, currentCircles];
            });
            setHistoryIndex((prevIdx) => prevIdx + 1);
            nudgeHistoryInitialRef.current = null;
            return currentCircles;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, selectedCircleId, circles, historyIndex, updateCirclesWithHistory]);

  // Fine center adjustment helper (for on-screen D-pad buttons as well)
  const handleNudgeCircle = useCallback(
    (dx: number, dy: number) => {
      const targetId = selectedCircleId || (circles.length > 0 ? circles[circles.length - 1].id : null);
      if (!targetId) return;

      if (!selectedCircleId) {
        setSelectedCircleId(targetId);
      }
      soundManager.playPinTap();

      const updated = circles.map((c) => {
        if (c.id === targetId) {
          return {
            ...c,
            cx: Math.round(c.cx + dx),
            cy: Math.round(c.cy + dy),
          };
        }
        return c;
      });
      updateCirclesWithHistory(updated);
    },
    [selectedCircleId, circles, updateCirclesWithHistory]
  );

  // Clear all
  const handleClear = () => {
    if (circles.length === 0) return;
    if (window.confirm('도화지의 모든 원을 지우시겠습니까?')) {
      soundManager.playClick();
      updateCirclesWithHistory([]);
      setSelectedCircleId(null);
    }
  };

  // Immediate New Canvas: clears circles and sets up fresh drawing mode immediately
  const handleNewCanvas = () => {
    soundManager.playClick();
    updateCirclesWithHistory([]);
    setSelectedCircleId(null);
    setCurrentTool('compass');
    setCurrentCanvasTitle('새로운 원 그림');
  };

  // Clamped radius handler (maximum 10cm)
  const handleRadiusCmChange = (cm: number) => {
    const clamped = Math.max(0.5, Math.min(10, Math.round(cm * 10) / 10));
    setRadiusCm(clamped);
  };

  // Update selected circle directly with max 10cm limit (300px)
  const handleUpdateSelectedCircle = (updates: Partial<CircleItem>) => {
    if (!selectedCircleId) return;
    const safeUpdates = { ...updates };
    if (safeUpdates.radius !== undefined) {
      // 0.5cm (15px) to 10cm (300px)
      safeUpdates.radius = Math.max(15, Math.min(300, safeUpdates.radius));
    }
    const updated = circles.map((c) => (c.id === selectedCircleId ? { ...c, ...safeUpdates } : c));
    updateCirclesWithHistory(updated);
  };

  // Delete selected circle
  const handleDeleteSelectedCircle = () => {
    if (!selectedCircleId) return;
    soundManager.playClick();
    updateCirclesWithHistory(circles.filter((c) => c.id !== selectedCircleId));
    setSelectedCircleId(null);
  };

  // Load from template / saved work
  const handleLoadCanvas = (loadedCircles: CircleItem[], title: string) => {
    setCurrentCanvasTitle(title);
    updateCirclesWithHistory(loadedCircles);
    setSelectedCircleId(null);
  };

  // Export to PNG image
  const handleExportPng = (includeGrid: boolean, authorName: string) => {
    exportCanvasToPng(circles, gridConfig, includeGrid, authorName, currentCanvasTitle);
  };

  const selectedCircle = circles.find((c) => c.id === selectedCircleId) || null;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-100 font-sans">
      {/* 1. Header with App Title, Grade, Learning Guide & Modals */}
      <Header
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onNewCanvas={handleNewCanvas}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenLearnModal={() => setIsLearnModalOpen(true)}
        showRuler={showRuler}
        onToggleRuler={() => setShowRuler(!showRuler)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        circleCount={circles.length}
      />

      {/* 2. Interactive Tool & Properties Bar */}
      <Toolbar
        currentTool={currentTool}
        onSelectTool={(tool) => {
          setCurrentTool(tool);
          if (tool !== 'select') {
            setSelectedCircleId(null);
          }
        }}
        compassDrawMode={compassDrawMode}
        onSelectCompassDrawMode={setCompassDrawMode}
        shapeType={shapeType}
        onChangeShapeType={setShapeType}
        semiDirection={semiDirection}
        onChangeSemiDirection={setSemiDirection}
        radiusCm={radiusCm}
        onChangeRadiusCm={handleRadiusCmChange}
        selectedColor={selectedColor}
        onChangeColor={setSelectedColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        gridConfig={gridConfig}
        onChangeGridConfig={(cfg) => setGridConfig((prev) => ({ ...prev, ...cfg }))}
        showCenterDefault={showCenterDefault}
        onToggleShowCenter={() => setShowCenterDefault(!showCenterDefault)}
        showRadiusDefault={showRadiusDefault}
        onToggleShowRadius={() => setShowRadiusDefault(!showRadiusDefault)}
        showDiameterDefault={showDiameterDefault}
        onToggleShowDiameter={() => setShowDiameterDefault(!showDiameterDefault)}
        autoFillDefault={autoFillDefault}
        onToggleAutoFill={() => setAutoFillDefault(!autoFillDefault)}
        selectedCircle={selectedCircle}
        onUpdateSelectedCircle={handleUpdateSelectedCircle}
        onDeleteSelectedCircle={handleDeleteSelectedCircle}
        onNewCanvas={handleNewCanvas}
      />

      {/* 3. Main Grid Paper (모눈종이) Canvas with Compass Animation */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <CompassCanvas
          circles={circles}
          onCirclesChange={updateCirclesWithHistory}
          onNewCanvas={handleNewCanvas}
          currentTool={currentTool}
          compassDrawMode={compassDrawMode}
          shapeType={shapeType}
          semiDirection={semiDirection}
          radiusCm={radiusCm}
          selectedColor={selectedColor}
          strokeWidth={strokeWidth}
          gridConfig={gridConfig}
          showCenterDefault={showCenterDefault}
          showRadiusDefault={showRadiusDefault}
          showDiameterDefault={showDiameterDefault}
          autoFillDefault={autoFillDefault}
          selectedCircleId={selectedCircleId}
          onSelectCircle={setSelectedCircleId}
          onNudgeCircle={handleNudgeCircle}
          showRuler={showRuler}
          onCloseRuler={() => setShowRuler(false)}
        />
      </main>

      {/* 4. Educational Learning Guide & Quiz Modal */}
      <LearnModal
        isOpen={isLearnModalOpen}
        onClose={() => setIsLearnModalOpen(false)}
      />

      {/* 5. Save / Load & Templates Modal */}
      <SaveLoadModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        currentCircles={circles}
        onLoadCanvas={handleLoadCanvas}
        onExportPng={handleExportPng}
      />
    </div>
  );
}
