import React, { useState } from 'react';
import { X, BookOpen, CheckCircle, HelpCircle, Award, Compass, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/audio';

interface LearnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LearnModal: React.FC<LearnModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'concept' | 'compass' | 'quiz'>('concept');
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number | null }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  if (!isOpen) return null;

  const quizQuestions = [
    {
      id: 1,
      question: '반지름이 4cm인 원의 지름은 몇 cm일까요?',
      options: ['2cm', '4cm', '8cm', '12cm'],
      correct: 2, // 8cm
      explanation: '지름은 반지름의 2배이므로, 4cm × 2 = 8cm 입니다!',
    },
    {
      id: 2,
      question: '원의 중심을 지나도록 원 위의 두 점을 곧게 이은 선분을 무엇이라고 하나요?',
      options: ['원의 중심', '반지름', '지름', '모눈'],
      correct: 2, // 지름
      explanation: '원의 중심을 지나는 가장 긴 선분은 바로 "지름"입니다!',
    },
    {
      id: 3,
      question: '컴퍼스로 반지름이 3cm인 원을 그리려면 컴퍼스 다리를 몇 cm 벌려야 할까요?',
      options: ['1.5cm', '3cm', '6cm', '9cm'],
      correct: 1, // 3cm
      explanation: '컴퍼스를 벌리는 길이는 그리고자 하는 원의 "반지름"과 같아요!',
    },
  ];

  const handleSelectOption = (qId: number, optIdx: number) => {
    if (quizSubmitted) return;
    soundManager.playClick();
    setQuizAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const handleGradeQuiz = () => {
    setQuizSubmitted(true);
    const score = quizQuestions.filter((q) => quizAnswers[q.id] === q.correct).length;
    if (score === 3) {
      soundManager.playCompleteChime();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      soundManager.playClick();
    }
  };

  const handleResetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        id="learn-modal-content"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">초등 3학년 수학 ⬝ 원의 성질 교실</h2>
              <p className="text-xs text-blue-100">원의 중심, 반지름, 지름과 컴퍼스 사용법을 쏙쏙 배워요!</p>
            </div>
          </div>
          <button
            id="close-learn-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('concept')}
            className={`pb-3 px-3 text-sm font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'concept'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🟡 원의 중심・반지름・지름</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compass')}
            className={`pb-3 px-3 text-sm font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'compass'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-600" />
            <span>컴퍼스로 원 그리는 순서</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`pb-3 px-3 text-sm font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'quiz'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>척척 박사 퀴즈</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700">
          {activeTab === 'concept' && (
            <div className="space-y-5">
              {/* Concept 1: 원이란? */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
                <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-xs">1</span>
                  원(Circle)이란 어떤 모양일까요?
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-blue-950">
                  어느 쪽에서 보아도 똑같이 둥근 모양의 도형이에요. <strong>한 점(원의 중심)에서 같은 거리에 있는 모든 점들을 이은 선</strong>이 바로 원입니다.
                </p>
              </div>

              {/* Graphic Diagram */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-around gap-4">
                <svg width="180" height="180" viewBox="0 0 180 180" className="drop-shadow-sm">
                  {/* Background Circle */}
                  <circle cx="90" cy="90" r="65" fill="#f0fdf4" stroke="#22c55e" strokeWidth="3" />
                  
                  {/* Diameter Line */}
                  <line x1="25" y1="90" x2="155" y2="90" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="3 3" />
                  {/* Diameter Label */}
                  <text x="58" y="82" fill="#dc2626" fontSize="11" fontWeight="bold">지름 (2배)</text>

                  {/* Radius Line */}
                  <line x1="90" y1="90" x2="136" y2="44" stroke="#2563eb" strokeWidth="3" />
                  {/* Radius Label */}
                  <text x="110" y="60" fill="#1d4ed8" fontSize="11" fontWeight="bold">반지름</text>

                  {/* Center Point */}
                  <circle cx="90" cy="90" r="5" fill="#e11d48" />
                  <text x="90" y="108" fill="#e11d48" fontSize="12" fontWeight="bold" textAnchor="middle">
                    중심 ㅇ
                  </text>
                </svg>

                <div className="text-sm space-y-3 flex-1">
                  <div className="border-l-4 border-rose-500 pl-3">
                    <div className="font-bold text-rose-700">📍 원의 중심 (점 ㅇ)</div>
                    <p className="text-xs text-slate-600 mt-0.5">원의 가장 한가운데 있는 점이에요. 모든 방향으로 같은 거리에 있어요.</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-3">
                    <div className="font-bold text-blue-700">📏 반지름 (Radius)</div>
                    <p className="text-xs text-slate-600 mt-0.5">원의 중심과 원 위의 한 점을 이은 선분이에요. 한 원에서 반지름은 무수히 많고 길이가 모두 같아요!</p>
                  </div>
                  <div className="border-l-4 border-red-500 pl-3">
                    <div className="font-bold text-red-700">📐 지름 (Diameter)</div>
                    <p className="text-xs text-slate-600 mt-0.5">원의 중심을 지나도록 원 위의 두 점을 곧게 이은 선분이에요. 원에서 가장 긴 선분이에요.</p>
                  </div>
                </div>
              </div>

              {/* Relationship Callout */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3">
                <div className="text-2xl">💡</div>
                <div className="text-sm">
                  <div className="font-bold text-amber-900">가장 중요한 성질 공식!</div>
                  <div className="text-amber-800 mt-0.5">
                    <strong>지름 = 반지름 × 2</strong> &nbsp; | &nbsp; <strong>반지름 = 지름 ÷ 2</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compass' && (
            <div className="space-y-4">
              <div className="text-sm text-slate-600 bg-slate-100 p-3 rounded-lg">
                컴퍼스는 <strong>원이나 호를 그릴 때</strong> 사용하는 특별한 수학 도구예요. 교과서에 나오는 바른 순서를 알아볼까요?
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center mb-2 text-sm">
                    1단계
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">반지름만큼 벌리기</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    눈금자의 눈금 0에 컴퍼스의 침을 대고, 그리고 싶은 <strong>반지름의 길이만큼</strong> 연필 끝을 벌립니다.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mb-2 text-sm">
                    2단계
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">침 꽂기</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    모눈종이 위에 원의 중심이 될 점을 정하고, 컴퍼스의 <strong>뾰족한 침을 꼭 꽂아</strong> 움직이지 않게 고정합니다.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center mb-2 text-sm">
                    3단계
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">손잡이 잡고 돌리기</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    컴퍼스 윗부분의 손잡이를 가볍게 잡고, <strong>도는 방향으로 살짝 기울이며</strong> 360도 빙 둘러 원을 그립니다.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>선생님의 꿀팁: 침이 꽂힌 중심점이 흔들리지 않아야 예쁜 동그라미가 완성돼요!</span>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-5">
              {quizQuestions.map((q, qIndex) => {
                const selected = quizAnswers[q.id];
                const isCorrect = selected === q.correct;
                return (
                  <div key={q.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <div className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                        {qIndex + 1}
                      </span>
                      <span>{q.question}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isChosen = selected === optIdx;
                        let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';
                        if (isChosen) {
                          btnStyle = 'bg-blue-600 border-blue-600 text-white font-bold';
                        }
                        if (quizSubmitted) {
                          if (optIdx === q.correct) {
                            btnStyle = 'bg-emerald-600 border-emerald-600 text-white font-bold';
                          } else if (isChosen && !isCorrect) {
                            btnStyle = 'bg-rose-500 border-rose-500 text-white';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`p-2.5 rounded-lg border text-xs text-left transition-colors cursor-pointer ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                      }`}>
                        {isCorrect ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <strong>{isCorrect ? '정답입니다! 🎉' : '다시 생각해 볼까요?'}</strong> {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                {!quizSubmitted ? (
                  <button
                    type="button"
                    onClick={handleGradeQuiz}
                    disabled={Object.keys(quizAnswers).length < 3}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                  >
                    채점하기 (모든 문제를 풀어보세요)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetQuiz}
                    className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                  >
                    다시 풀기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            초등학교 3학년 2학기 3단원: 원
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
          >
            이해했어요! 직접 원 그리기
          </button>
        </div>
      </div>
    </div>
  );
};
