import React, { useState, useEffect } from 'react';
import { X, Download, Save, FolderOpen, Trash2, Sparkles, Check } from 'lucide-react';
import { CircleItem, SavedCanvas } from '../types';
import { soundManager } from '../utils/audio';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCircles: CircleItem[];
  onLoadCanvas: (circles: CircleItem[], title: string) => void;
  onExportPng: (includeGrid: boolean, authorName: string) => void;
}

const STORAGE_KEY = 'compass_math_saved_works';

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  onClose,
  currentCircles,
  onLoadCanvas,
  onExportPng,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'load' | 'templates'>('save');
  const [workTitle, setWorkTitle] = useState('나의 멋진 원 그림');
  const [authorName, setAuthorName] = useState('');
  const [includeGridInExport, setIncludeGridInExport] = useState(true);
  const [savedList, setSavedList] = useState<SavedCanvas[]>([]);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState('');

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setSavedList(JSON.parse(data));
      }
    } catch {
      // LocalStorage might be restricted
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle saving to localStorage
  const handleSaveToStorage = () => {
    if (!workTitle.trim()) return;
    soundManager.playCompleteChime();

    const newSavedItem: SavedCanvas = {
      id: 'work_' + Date.now(),
      title: workTitle.trim(),
      circles: JSON.parse(JSON.stringify(currentCircles)),
      savedAt: new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updated = [newSavedItem, ...savedList.filter((item) => item.title !== workTitle.trim())].slice(0, 15);
    setSavedList(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    setSavedSuccessMsg(`'${workTitle}' 저장되었습니다!`);
    setTimeout(() => setSavedSuccessMsg(''), 2500);
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    const updated = savedList.filter((item) => item.id !== id);
    setSavedList(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleApplyTemplate = (type: 'flower' | 'snowman' | 'target' | 'olympic' | 'bear') => {
    soundManager.playCompleteChime();
    let newCircles: CircleItem[] = [];
    const baseUnit = 30; // 1cm = 30px

    if (type === 'flower') {
      // Beautiful 6-petal rosette compass pattern (standard Korean math workbook activity)
      const centerX = 420;
      const centerY = 300;
      const r = baseUnit * 3; // 3cm

      // Center circle
      newCircles.push({
        id: 'c_center',
        cx: centerX,
        cy: centerY,
        radius: r,
        color: '#3b82f6',
        strokeWidth: 3,
        showCenter: true,
        showRadius: false,
        showDiameter: false,
        label: '중심 원 (3cm)',
      });

      // 6 Petal circles around circumference
      const colors = ['#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        newCircles.push({
          id: `c_petal_${i}`,
          cx: Math.round(centerX + r * Math.cos(angle)),
          cy: Math.round(centerY + r * Math.sin(angle)),
          radius: r,
          color: colors[i],
          strokeWidth: 2.5,
          showCenter: true,
          showRadius: false,
          showDiameter: false,
        });
      }
      onLoadCanvas(newCircles, '컴퍼스 꽃 문양 (6잎)');
      onClose();
    } else if (type === 'snowman') {
      // Snowman (head + body + buttons + eyes)
      newCircles = [
        {
          id: 'body',
          cx: 420,
          cy: 390,
          radius: baseUnit * 4, // 4cm
          color: '#3b82f6',
          strokeWidth: 3,
          showCenter: true,
          showRadius: true,
          showDiameter: false,
          label: '몸통 (반지름 4cm)',
        },
        {
          id: 'head',
          cx: 420,
          cy: 220,
          radius: baseUnit * 2.5, // 2.5cm
          color: '#6366f1',
          strokeWidth: 3,
          showCenter: true,
          showRadius: true,
          showDiameter: false,
          label: '머리 (반지름 2.5cm)',
        },
        {
          id: 'eye_left',
          cx: 395,
          cy: 205,
          radius: 8,
          color: '#1e293b',
          strokeWidth: 2,
          showCenter: false,
          showRadius: false,
          showDiameter: false,
        },
        {
          id: 'eye_right',
          cx: 445,
          cy: 205,
          radius: 8,
          color: '#1e293b',
          strokeWidth: 2,
          showCenter: false,
          showRadius: false,
          showDiameter: false,
        },
        {
          id: 'button1',
          cx: 420,
          cy: 340,
          radius: 9,
          color: '#ef4444',
          strokeWidth: 2,
          showCenter: false,
          showRadius: false,
          showDiameter: false,
        },
        {
          id: 'button2',
          cx: 420,
          cy: 390,
          radius: 9,
          color: '#f59e0b',
          strokeWidth: 2,
          showCenter: false,
          showRadius: false,
          showDiameter: false,
        },
      ];
      onLoadCanvas(newCircles, '동글동글 눈사람');
      onClose();
    } else if (type === 'target') {
      // Concentric circles (동심원 - 같은 중심, 다른 반지름)
      const cx = 420;
      const cy = 300;
      const radii = [1.5, 3, 4.5, 6];
      const colors = ['#dc2626', '#f59e0b', '#2563eb', '#10b981'];

      radii.forEach((rCm, idx) => {
        newCircles.push({
          id: `target_${idx}`,
          cx,
          cy,
          radius: baseUnit * rCm,
          color: colors[idx],
          strokeWidth: 3,
          showCenter: idx === 0,
          showRadius: idx === 3,
          showDiameter: false,
          label: `${rCm}cm 원`,
        });
      });
      onLoadCanvas(newCircles, '과녁판 (동심원 탐구)');
      onClose();
    } else if (type === 'olympic') {
      // 5 Olympic rings (same radius, 3 top, 2 bottom)
      const r = baseUnit * 2.2;
      const topY = 250;
      const botY = 320;
      const startX = 260;
      const gap = r * 1.6;

      newCircles = [
        { id: 'ring_blue', cx: startX, cy: topY, radius: r, color: '#2563eb', strokeWidth: 4, showCenter: true, showRadius: false, showDiameter: false, label: '파랑' },
        { id: 'ring_black', cx: startX + gap, cy: topY, radius: r, color: '#1e293b', strokeWidth: 4, showCenter: true, showRadius: false, showDiameter: false, label: '검정' },
        { id: 'ring_red', cx: startX + gap * 2, cy: topY, radius: r, color: '#ef4444', strokeWidth: 4, showCenter: true, showRadius: false, showDiameter: false, label: '빨강' },
        { id: 'ring_yellow', cx: startX + gap * 0.5, cy: botY, radius: r, color: '#eab308', strokeWidth: 4, showCenter: true, showRadius: false, showDiameter: false, label: '노랑' },
        { id: 'ring_green', cx: startX + gap * 1.5, cy: botY, radius: r, color: '#22c55e', strokeWidth: 4, showCenter: true, showRadius: false, showDiameter: false, label: '초록' },
      ];
      onLoadCanvas(newCircles, '올림픽 오륜기');
      onClose();
    } else if (type === 'bear') {
      // Teddy bear face
      newCircles = [
        { id: 'ear_left', cx: 330, cy: 190, radius: baseUnit * 1.5, color: '#b45309', strokeWidth: 3.5, showCenter: false, showRadius: false, showDiameter: false },
        { id: 'ear_right', cx: 510, cy: 190, radius: baseUnit * 1.5, color: '#b45309', strokeWidth: 3.5, showCenter: false, showRadius: false, showDiameter: false },
        { id: 'face', cx: 420, cy: 300, radius: baseUnit * 4, color: '#d97706', strokeWidth: 4, showCenter: true, showRadius: true, showDiameter: false, label: '얼굴 (반지름 4cm)' },
        { id: 'snout', cx: 420, cy: 330, radius: baseUnit * 1.6, color: '#f59e0b', strokeWidth: 2.5, showCenter: false, showRadius: false, showDiameter: false },
        { id: 'eye_l', cx: 375, cy: 265, radius: 10, color: '#1c1917', strokeWidth: 2, showCenter: false, showRadius: false, showDiameter: false },
        { id: 'eye_r', cx: 465, cy: 265, radius: 10, color: '#1c1917', strokeWidth: 2, showCenter: false, showRadius: false, showDiameter: false },
        { id: 'nose', cx: 420, cy: 315, radius: 12, color: '#1c1917', strokeWidth: 2, showCenter: false, showRadius: false, showDiameter: false },
      ];
      onLoadCanvas(newCircles, '귀여운 곰돌이');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div
        id="save-load-modal-container"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold">도화지 저장 및 작품 보관함</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('save')}
            className={`pb-3 px-3 text-sm font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'save'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>이미지・보관 저장</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('load')}
            className={`pb-3 px-3 text-sm font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'load'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>내 작품 불러오기 ({savedList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-3 text-sm font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>예시 작품 따라하기</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700">
          {activeTab === 'save' && (
            <div className="space-y-4">
              {/* Local Storage Save Form */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Save className="w-4 h-4 text-blue-600" />
                  <span>웹 브라우저에 보관하기</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      작품 제목
                    </label>
                    <input
                      type="text"
                      value={workTitle}
                      onChange={(e) => setWorkTitle(e.target.value)}
                      placeholder="예: 우리 집 해바라기"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-blue-500 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveToStorage}
                    className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>작품 목록에 저장하기 (현재 {currentCircles.length}개의 원)</span>
                  </button>

                  {savedSuccessMsg && (
                    <div className="p-2 rounded bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{savedSuccessMsg}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PNG Download */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>그림 파일(PNG)로 다운로드</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      만든 사람 (학생 이름)
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="예: 3학년 1반 김수학"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-blue-500 bg-white"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeGridInExport}
                      onChange={(e) => setIncludeGridInExport(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>모눈종이 격자무늬도 함께 저장하기</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playCompleteChime();
                      onExportPng(includeGridInExport, authorName.trim());
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>고화질 PNG 이미지 저장하기</span>
                  </button>
                  <p className="text-[11px] text-slate-500 text-center">
                    선생님께 과제를 제출하거나 인쇄할 때 사용해요!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'load' && (
            <div className="space-y-3">
              {savedList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  아직 저장된 작품이 없어요.<br />
                  '이미지・보관 저장' 탭에서 첫 작품을 저장해보세요!
                </div>
              ) : (
                <div className="space-y-2">
                  {savedList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        soundManager.playClick();
                        onLoadCanvas(item.circles, item.title);
                        onClose();
                      }}
                      className="border border-slate-200 hover:border-blue-500 rounded-xl p-3 bg-white flex items-center justify-between cursor-pointer transition-all hover:shadow-md"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-800">{item.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.savedAt} ⬝ 원 {item.circles.length}개
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-xs rounded-md bg-blue-50 text-blue-600 font-semibold">
                          불러오기
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSaved(item.id, e)}
                          title="삭제"
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                수학 교과서에 등장하는 재미있는 원 문양을 불러와 직접 수정하고 관찰해보세요!
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('flower')}
                  className="p-3 border border-slate-200 hover:border-pink-400 bg-white hover:bg-pink-50/40 rounded-xl text-left flex items-center gap-3.5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-xl shrink-0">
                    🌸
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">컴퍼스로 만든 6잎 꽃 문양</div>
                    <div className="text-xs text-slate-500">
                      원의 둘레를 따라 반지름이 같은 원들을 겹쳐 그리는 수학 문양
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate('snowman')}
                  className="p-3 border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/40 rounded-xl text-left flex items-center gap-3.5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl shrink-0">
                    ⛄
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">동글동글 눈사람</div>
                    <div className="text-xs text-slate-500">
                      반지름 2.5cm 머리와 반지름 4cm 몸통으로 구성된 눈사람
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate('target')}
                  className="p-3 border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/40 rounded-xl text-left flex items-center gap-3.5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-xl shrink-0">
                    🎯
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">동심원 과녁판 (중심이 같은 원)</div>
                    <div className="text-xs text-slate-500">
                      중심은 하나이고 반지름이 1.5cm, 3cm, 4.5cm, 6cm 로 커지는 원들
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate('olympic')}
                  className="p-3 border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 rounded-xl text-left flex items-center gap-3.5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-xl shrink-0">
                    🥇
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">올림픽 오륜기</div>
                    <div className="text-xs text-slate-500">
                      반지름이 같은 5개의 원이 서로 이어져 있는 아름다운 배열
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate('bear')}
                  className="p-3 border border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/40 rounded-xl text-left flex items-center gap-3.5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-xl shrink-0">
                    🐻
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800">귀여운 곰돌이 얼굴</div>
                    <div className="text-xs text-slate-500">
                      여러 크기의 원을 조화롭게 조합하여 동물 캐릭터 완성하기
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
