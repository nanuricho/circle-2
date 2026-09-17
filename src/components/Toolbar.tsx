import React, { useState, useEffect } from 'react';
import {
  Compass,
  MousePointer,
  Eraser,
  Grid,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  Palette,
  PlusCircle,
  Minus,
  Plus,
  AlertCircle,
  PaintBucket
} from 'lucide-react';
import { ToolMode, CompassDrawMode, GridConfig, CircleItem, CircleShapeType, SemicircleDirection } from '../types';
import { soundManager } from '../utils/audio';

interface ToolbarProps {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  compassDrawMode: CompassDrawMode;
  onSelectCompassDrawMode: (mode: CompassDrawMode) => void;
  shapeType: CircleShapeType;
  onChangeShapeType: (st: CircleShapeType) => void;
  semiDirection: SemicircleDirection;
  onChangeSemiDirection: (dir: SemicircleDirection) => void;
  radiusCm: number;
  onChangeRadiusCm: (cm: number) => void;
  selectedColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (w: number) => void;
  gridConfig: GridConfig;
  onChangeGridConfig: (cfg: Partial<GridConfig>) => void;
  // Global defaults for new circles & selected circle modifier
  showCenterDefault: boolean;
  onToggleShowCenter: () => void;
  showRadiusDefault: boolean;
  onToggleShowRadius: () => void;
  showDiameterDefault: boolean;
  onToggleShowDiameter: () => void;
  autoFillDefault: boolean;
  onToggleAutoFill: () => void;
  // Selected circle editing
  selectedCircle: CircleItem | null;
  onUpdateSelectedCircle: (updates: Partial<CircleItem>) => void;
  onDeleteSelectedCircle: () => void;
  onNewCanvas?: () => void;
}

const COLOR_PALETTE = [
  { name: '파랑', value: '#2563eb' },
  { name: '하늘', value: '#0284c7' },
  { name: '초록', value: '#16a34a' },
  { name: '연두', value: '#65a30d' },
  { name: '노랑', value: '#eab308' },
  { name: '주황', value: '#f97316' },
  { name: '빨강', value: '#ef4444' },
  { name: '분홍', value: '#ec4899' },
  { name: '보라', value: '#7c3aed' },
  { name: '갈색', value: '#854d0e' },
  { name: '검정', value: '#1e293b' },
];

const RADIUS_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  compassDrawMode,
  onSelectCompassDrawMode,
  shapeType,
  onChangeShapeType,
  semiDirection,
  onChangeSemiDirection,
  radiusCm,
  onChangeRadiusCm,
  selectedColor,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  gridConfig,
  onChangeGridConfig,
  showCenterDefault,
  onToggleShowCenter,
  showRadiusDefault,
  onToggleShowRadius,
  showDiameterDefault,
  onToggleShowDiameter,
  autoFillDefault,
  onToggleAutoFill,
  selectedCircle,
  onUpdateSelectedCircle,
  onDeleteSelectedCircle,
  onNewCanvas,
}) => {
  const activeShapeType = selectedCircle ? (selectedCircle.shapeType || 'circle') : shapeType;
  const activeSemiDirection = selectedCircle ? (selectedCircle.semiDirection || 'top') : semiDirection;

  const currentRadius = selectedCircle ? Number((selectedCircle.radius / 30).toFixed(1)) : Number(radiusCm.toFixed(1));
  const [localRadiusInput, setLocalRadiusInput] = useState<string>(currentRadius.toString());
  const [isOverLimitNotice, setIsOverLimitNotice] = useState<boolean>(false);

  useEffect(() => {
    setLocalRadiusInput(currentRadius.toString());
  }, [currentRadius]);

  const applyRadius = (val: number) => {
    let clamped = val;
    if (clamped > 10) {
      clamped = 10;
      setIsOverLimitNotice(true);
      setTimeout(() => setIsOverLimitNotice(false), 2500);
    } else if (clamped < 0.5) {
      clamped = 0.5;
    }
    clamped = Math.round(clamped * 10) / 10;

    if (selectedCircle) {
      onUpdateSelectedCircle({ radius: clamped * 30 });
    } else {
      onChangeRadiusCm(clamped);
    }
    setLocalRadiusInput(clamped.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setLocalRadiusInput(valStr);

    if (valStr.trim() === '') return;

    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      if (parsed > 10) {
        applyRadius(10);
      } else if (parsed >= 0.5) {
        if (selectedCircle) {
          onUpdateSelectedCircle({ radius: parsed * 30 });
        } else {
          onChangeRadiusCm(parsed);
        }
      }
    }
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(localRadiusInput);
    if (isNaN(parsed) || parsed < 0.5) {
      applyRadius(0.5);
    } else if (parsed > 10) {
      applyRadius(10);
    } else {
      applyRadius(parsed);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleStep = (delta: number) => {
    soundManager.playClick();
    const next = Math.round((currentRadius + delta) * 10) / 10;
    if (next > 10) {
      applyRadius(10);
    } else if (next < 0.5) {
      applyRadius(0.5);
    } else {
      applyRadius(next);
    }
  };
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-y-2.5 gap-x-4 shadow-xs select-none">
      {/* 1. Main Tool Selectors */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
        {onNewCanvas && (
          <button
            id="tool-new-canvas-btn"
            type="button"
            onClick={() => {
              soundManager.playClick();
              onNewCanvas();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100/70 transition-all cursor-pointer border border-emerald-300/60 bg-emerald-50"
            title="새로운 그림을 그릴 수 있는 깨끗한 새 화면 열기"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>새 도화지</span>
          </button>
        )}

        <button
          id="tool-compass-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onSelectTool('compass');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentTool === 'compass'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>컴퍼스 그리기</span>
        </button>

        <button
          id="tool-select-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onSelectTool('select');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentTool === 'select'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <MousePointer className="w-4 h-4" />
          <span>선택・수정</span>
        </button>

        <button
          id="tool-fill-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onSelectTool('fill');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentTool === 'fill'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
          title="원 안을 클릭하여 색깔을 칠해요"
        >
          <PaintBucket className="w-4 h-4" />
          <span>색 채우기</span>
        </button>

        <button
          id="tool-eraser-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onSelectTool('eraser');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            currentTool === 'eraser'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Eraser className="w-4 h-4" />
          <span>지우개</span>
        </button>
      </div>

      {/* 2. Compass Drawing Mode Option (only when compass is active) */}
      {currentTool === 'compass' && (
        <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-1 rounded-xl">
          <span className="text-[11px] font-bold text-blue-800 mr-1">그리기 방식:</span>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onSelectCompassDrawMode('auto');
            }}
            className={`px-2 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
              compassDrawMode === 'auto'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-700 hover:bg-blue-100'
            }`}
            title={activeShapeType === 'semicircle' ? "클릭하면 컴퍼스가 180° 회전하며 반원을 그려요" : "클릭하면 컴퍼스가 360° 회전하며 원을 완성해요"}
          >
            {activeShapeType === 'semicircle' ? '✨ 자동 180° 회전' : '✨ 자동 360° 회전'}
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onSelectCompassDrawMode('manual');
            }}
            className={`px-2 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
              compassDrawMode === 'manual'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-700 hover:bg-blue-100'
            }`}
            title="마우스나 손가락으로 컴퍼스 연필을 직접 돌려 그려요"
          >
            ✋ 직접 돌리기
          </button>
        </div>
      )}

      {/* 2.5 Shape Selector: 원 (360°) vs 반원 (180°) */}
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
        <span className="text-xs font-bold text-slate-700">모양:</span>
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
          <button
            id="shape-circle-btn"
            type="button"
            onClick={() => {
              soundManager.playClick();
              if (selectedCircle) {
                onUpdateSelectedCircle({
                  shapeType: 'circle',
                  label: `원 (${(selectedCircle.radius / 30).toFixed(1)}cm)`,
                });
              } else {
                onChangeShapeType('circle');
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeShapeType === 'circle'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="온전한 원 (360°)"
          >
            <span className="inline-block w-3 h-3 rounded-full border-2 border-current" />
            <span>원</span>
          </button>

          <button
            id="shape-semicircle-btn"
            type="button"
            onClick={() => {
              soundManager.playClick();
              if (selectedCircle) {
                onUpdateSelectedCircle({
                  shapeType: 'semicircle',
                  semiDirection: selectedCircle.semiDirection || 'top',
                  label: `반원 (${(selectedCircle.radius / 30).toFixed(1)}cm)`,
                });
              } else {
                onChangeShapeType('semicircle');
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeShapeType === 'semicircle'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="반원 (180° - 원을 지름으로 똑같이 나눈 모양)"
          >
            <span className="inline-block w-3 h-1.5 rounded-t-full border-t-2 border-x-2 border-current border-b" />
            <span>반원</span>
          </button>
        </div>

        {/* If semicircle: Direction selector */}
        {activeShapeType === 'semicircle' && (
          <div className="flex items-center gap-0.5 ml-0.5 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded-lg">
            <span className="text-[10px] font-bold text-indigo-800 px-0.5 hidden sm:inline">방향:</span>
            {[
              { dir: 'top', label: '위 ⬆', title: '위쪽 반원' },
              { dir: 'bottom', label: '아래 ⬇', title: '아래쪽 반원' },
              { dir: 'left', label: '좌 ⬅', title: '왼쪽 반원' },
              { dir: 'right', label: '우 ➡', title: '오른쪽 반원' },
            ].map(({ dir, label, title }) => (
              <button
                key={dir}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  if (selectedCircle) {
                    onUpdateSelectedCircle({ semiDirection: dir as SemicircleDirection });
                  } else {
                    onChangeSemiDirection(dir as SemicircleDirection);
                  }
                }}
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                  activeSemiDirection === dir
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-indigo-700 hover:bg-indigo-100'
                }`}
                title={title}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Radius Adjustment (Direct Input, Stepper, Slider, & Presets - Max 10cm) */}
      <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
        <div className="flex items-center gap-1.5">
          <label htmlFor="radius-direct-input" className="text-xs font-bold text-slate-700 cursor-pointer">
            반지름:
          </label>

          {/* Stepper Minus */}
          <button
            type="button"
            onClick={() => handleStep(-0.5)}
            disabled={currentRadius <= 0.5}
            className="w-5 h-5 rounded flex items-center justify-center bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="0.5cm 줄이기"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Direct Input */}
          <div className="relative flex items-center bg-white border border-blue-300 rounded-md px-1.5 py-0.5 focus-within:ring-2 focus-within:ring-blue-500 shadow-2xs">
            <input
              id="radius-direct-input"
              type="number"
              min="0.5"
              max="10"
              step="0.1"
              value={localRadiusInput}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="w-11 text-xs font-extrabold text-blue-600 text-right outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="3"
              title="반지름 직접 입력 (0.5 ~ 10cm)"
            />
            <span className="text-xs font-bold text-blue-700 ml-0.5 select-none">cm</span>
          </div>

          {/* Stepper Plus */}
          <button
            type="button"
            onClick={() => handleStep(0.5)}
            disabled={currentRadius >= 10}
            className="w-5 h-5 rounded flex items-center justify-center bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="0.5cm 늘리기 (최대 10cm)"
          >
            <Plus className="w-3 h-3" />
          </button>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            (지름 {(currentRadius * 2).toFixed(1)}cm)
          </span>
        </div>

        {/* Quick Presets */}
        <div className="hidden lg:flex items-center gap-1">
          {RADIUS_PRESETS.map((preset) => {
            const isMatch = Math.abs(currentRadius - preset) < 0.05;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  applyRadius(preset);
                }}
                className={`h-6 px-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  isMatch
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title={`${preset}cm 선택`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        {/* Slider for smooth control up to 10cm */}
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={currentRadius}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            applyRadius(val);
          }}
          className="w-20 accent-blue-600 cursor-pointer"
          title="반지름 슬라이더 (0.5 ~ 10cm)"
        />

        {/* Floating Warning badge if user tries to exceed 10cm */}
        {isOverLimitNotice && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1 whitespace-nowrap animate-bounce">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>반지름은 최대 10cm까지만 가능해요!</span>
          </div>
        )}
      </div>

      {/* 4. Color Palette & Fill Options */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-600 hidden sm:inline">색상:</span>
          <div className="flex items-center gap-1">
            {COLOR_PALETTE.map((c) => {
              const activeColor = selectedCircle ? (selectedCircle.fillColor || selectedCircle.color) : selectedColor;
              const isSelected = activeColor === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    if (selectedCircle) {
                      onUpdateSelectedCircle({
                        color: c.value,
                        fillColor: selectedCircle.isFilled ? c.value : selectedCircle.fillColor,
                      });
                    } else {
                      onChangeColor(c.value);
                    }
                  }}
                  title={c.name}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer border-2 ${
                    isSelected ? 'scale-115 border-slate-900 shadow-sm' : 'border-white hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              );
            })}

            {/* Custom Rainbow Color Picker */}
            <label
              title="원하는 색깔 직접 선택하기"
              className="w-6 h-6 rounded-full cursor-pointer overflow-hidden border-2 border-slate-300 hover:scale-115 transition-transform flex items-center justify-center shadow-2xs relative bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-sky-500 to-purple-600 ml-0.5"
            >
              <input
                type="color"
                value={selectedCircle ? (selectedCircle.fillColor || selectedCircle.color) : selectedColor}
                onChange={(e) => {
                  const newCol = e.target.value;
                  if (selectedCircle) {
                    onUpdateSelectedCircle({
                      color: newCol,
                      fillColor: selectedCircle.isFilled ? newCol : selectedCircle.fillColor,
                    });
                  } else {
                    onChangeColor(newCol);
                  }
                }}
                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>

        {/* Fill Toggle Button (색 채우기) */}
        <button
          id="toggle-fill-btn"
          type="button"
          onClick={() => {
            soundManager.playPaintSplash();
            if (selectedCircle) {
              const willFill = !selectedCircle.isFilled;
              onUpdateSelectedCircle({
                isFilled: willFill,
                fillColor: willFill ? (selectedCircle.fillColor || selectedColor) : undefined,
                fillOpacity: 0.35,
              });
            } else {
              onToggleAutoFill();
            }
          }}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
            (selectedCircle ? selectedCircle.isFilled : autoFillDefault)
              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title={
            selectedCircle
              ? selectedCircle.isFilled
                ? '선택된 원 색 채우기 끄기'
                : '선택된 원 내부에 색깔 채우기'
              : autoFillDefault
              ? '새 원을 그릴 때 자동으로 색 채우기 켜짐 (클릭시 끔)'
              : '새 원을 그릴 때 자동으로 색 채우기 (클릭시 켬)'
          }
        >
          <PaintBucket className="w-3.5 h-3.5 text-amber-600" />
          <span>{(selectedCircle ? selectedCircle.isFilled : autoFillDefault) ? '색 채움 ON' : '색 채우기'}</span>
        </button>
      </div>

      {/* 5. Circle Properties Display Options (3rd Grade Concepts) */}
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
        <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>표시:</span>
        </span>

        {/* Center marker ㅇ */}
        <button
          id="toggle-center-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            if (selectedCircle) {
              onUpdateSelectedCircle({ showCenter: !selectedCircle.showCenter });
            } else {
              onToggleShowCenter();
            }
          }}
          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
            (selectedCircle ? selectedCircle.showCenter : showCenterDefault)
              ? 'bg-rose-100 border-rose-300 text-rose-800'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title="원의 중심 점 ㅇ 표시"
        >
          중심(ㅇ)
        </button>

        {/* Radius marker */}
        <button
          id="toggle-radius-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            if (selectedCircle) {
              onUpdateSelectedCircle({ showRadius: !selectedCircle.showRadius });
            } else {
              onToggleShowRadius();
            }
          }}
          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
            (selectedCircle ? selectedCircle.showRadius : showRadiusDefault)
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title="반지름 선분과 길이 표시"
        >
          반지름
        </button>

        {/* Diameter marker */}
        <button
          id="toggle-diameter-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            if (selectedCircle) {
              onUpdateSelectedCircle({ showDiameter: !selectedCircle.showDiameter });
            } else {
              onToggleShowDiameter();
            }
          }}
          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
            (selectedCircle ? selectedCircle.showDiameter : showDiameterDefault)
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title="지름 선분과 길이 표시 (반지름의 2배)"
        >
          지름
        </button>
      </div>

      {/* 6. Grid Settings (모눈종이 설정) */}
      <div className="flex items-center gap-1.5">
        {/* Grid Snap Toggle */}
        <button
          id="toggle-grid-snap-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onChangeGridConfig({ snapToGrid: !gridConfig.snapToGrid });
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
            gridConfig.snapToGrid
              ? 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title="모눈 격자 교차점에 자석처럼 침 맞추기"
        >
          <Grid className="w-3.5 h-3.5 text-emerald-600" />
          <span>격자 자석 {gridConfig.snapToGrid ? 'ON' : 'OFF'}</span>
        </button>

        {/* Grid color selector */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
          <span className="px-1 text-slate-500 font-semibold">모눈:</span>
          {(['blue', 'green', 'slate'] as const).map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => {
                soundManager.playClick();
                onChangeGridConfig({ gridColor: col });
              }}
              className={`px-1.5 py-0.5 rounded font-bold capitalize cursor-pointer ${
                gridConfig.gridColor === col ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              {col === 'blue' ? '파랑' : col === 'green' ? '초록' : '회색'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
