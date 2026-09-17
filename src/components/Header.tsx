import React from 'react';
import {
  BookOpen,
  Save,
  RotateCcw,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
  Ruler,
  Info,
  PlusCircle
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onNewCanvas: () => void;
  onOpenSaveModal: () => void;
  onOpenLearnModal: () => void;
  showRuler: boolean;
  onToggleRuler: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  circleCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onNewCanvas,
  onOpenSaveModal,
  onOpenLearnModal,
  showRuler,
  onToggleRuler,
  soundEnabled,
  onToggleSound,
  circleCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0 select-none">
      {/* Brand & Grade badge */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-100">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" strokeDasharray="3 2" />
            <path d="M12 3v9l5 4" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2.5" fill="#fde047" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight">
              컴퍼스 원 탐구교실
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
              초등 3학년 수학
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            컴퍼스로 직접 원을 그리며 중심, 반지름, 지름의 성질을 발견해요
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Ruler toggle */}
        <button
          id="header-ruler-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onToggleRuler();
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
            showRuler
              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="눈금자 도구 켜기/끄기"
        >
          <Ruler className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">15cm 눈금자</span>
        </button>

        {/* Learn guide */}
        <button
          id="header-learn-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onOpenLearnModal();
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          title="원의 성질 학습 및 퀴즈"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>원의 성질 교실</span>
        </button>

        {/* New Canvas Button (새 도화지) */}
        <button
          id="header-new-canvas-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onNewCanvas();
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          title="새로운 그림을 그릴 수 있는 깨끗한 새 화면 열기"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-200" />
          <span>새 도화지</span>
        </button>

        {/* Save & Load */}
        <button
          id="header-save-btn"
          type="button"
          onClick={() => {
            soundManager.playClick();
            onOpenSaveModal();
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          title="작품 저장 및 불러오기"
        >
          <Save className="w-3.5 h-3.5 text-indigo-200" />
          <span>저장・보관함</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            id="header-undo-btn"
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="실행 취소"
            className="p-1.5 rounded-md hover:bg-white text-slate-700 disabled:text-slate-300 disabled:hover:bg-transparent cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            id="header-redo-btn"
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="다시 실행"
            className="p-1.5 rounded-md hover:bg-white text-slate-700 disabled:text-slate-300 disabled:hover:bg-transparent cursor-pointer transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sound toggle */}
        <button
          id="header-sound-btn"
          type="button"
          onClick={onToggleSound}
          title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Clear All */}
        {circleCount > 0 && (
          <button
            id="header-clear-btn"
            type="button"
            onClick={onClear}
            title="모두 지우기"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
