'use client';

import { useEffect, useRef } from 'react';

const HS_KEY = 'zerog_drip_hs';

export interface ScoreData {
  hits: number;
  peaberryHits: number;
  maxCombo: number;
  gForceCount: number;
}

interface ScoreOverlayProps {
  data: ScoreData;
  onReplay: () => void;
}

function calcScore(data: ScoreData) {
  const hitScore      = Math.min(data.hits * 5, 400);
  const peaberryScore = data.peaberryHits * 80;
  const comboScore    = Math.min(data.maxCombo * 12, 200);
  const penalty       = data.gForceCount * 80;
  const total         = Math.max(0, hitScore + peaberryScore + comboScore - penalty);
  return { hitScore, peaberryScore, comboScore, penalty, total };
}

function grade(total: number) {
  if (total >= 700) return { label: 'MASTER BREW',  ja: 'マスターブリュー', color: 'rgba(255,210,120,0.95)' };
  if (total >= 450) return { label: 'CRAFT BREW',   ja: 'クラフトブリュー', color: 'rgba(180,220,255,0.9)' };
  if (total >= 250) return { label: 'DECENT CUP',   ja: 'まあまあ',         color: 'rgba(160,220,160,0.85)' };
  if (total >= 80)  return { label: 'ROOKIE',        ja: 'ルーキー',         color: 'rgba(190,190,190,0.7)' };
  return               { label: 'SPILLED',          ja: 'こぼした',         color: 'rgba(255,100,80,0.85)' };
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const ratio = Math.min(value / max, 1);
  return (
    <div className="flex-1 h-px bg-white/8 relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 transition-all duration-700"
        style={{ width: `${ratio * 100}%`, background: color, opacity: 0.75 }} />
    </div>
  );
}

export default function ScoreOverlay({ data, onReplay }: ScoreOverlayProps) {
  const { hitScore, peaberryScore, comboScore, penalty, total } = calcScore(data);
  const { label, ja, color } = grade(total);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ハイスコア
  const prevBest = typeof window !== 'undefined' ? Number(localStorage.getItem(HS_KEY) ?? 0) : 0;
  const isNewRecord = total > prevBest;
  useEffect(() => {
    if (isNewRecord) localStorage.setItem(HS_KEY, String(total));
  }, [isNewRecord, total]);

  // スコア数字カウントアップアニメーション
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = 220 * dpr;
    canvas.height = 80  * dpr;
    canvas.style.width  = '220px';
    canvas.style.height = '80px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let frame = 0;
    const duration = 55;
    let raf: number;
    function draw() {
      ctx.clearRect(0, 0, 220, 80);
      const p = Math.min(frame / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      ctx.font = '200 54px "SF Pro Display","Helvetica Neue",sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(total * eased).toString(), 110, 40);
      if (frame < duration) { frame++; raf = requestAnimationFrame(draw); }
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [total, color]);

  const rows = [
    { labelJa: '命中',       labelEn: 'HITS',       value: hitScore,      max: 400, color: 'rgba(180,210,255,0.85)', detail: `${data.hits} × 5` },
    { labelJa: 'ピーベリー', labelEn: 'PEABERRY',   value: peaberryScore, max: 160, color: 'rgba(255,210,100,0.9)',  detail: `${data.peaberryHits} × 80` },
    { labelJa: 'コンボ',     labelEn: 'COMBO',       value: comboScore,    max: 200, color: 'rgba(180,255,200,0.8)',  detail: `MAX ×${data.maxCombo}` },
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/96 z-50">
      <div className="w-full max-w-xs px-8 flex flex-col items-center gap-5">

        {/* グレード */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-[8px] tracking-[0.5em] text-white/18 uppercase">Brew Result</p>
          {isNewRecord && (
            <p className="text-[8px] tracking-[0.4em] uppercase mt-0.5" style={{ color: 'rgba(255,210,100,0.8)' }}>
              ★ New Record
            </p>
          )}
          <p className="text-[12px] tracking-[0.3em] font-light mt-1" style={{ color }}>{label}</p>
          <p className="text-[9px] tracking-[0.25em] text-white/25 font-light">{ja}</p>
        </div>

        {/* スコア数字 */}
        <canvas ref={canvasRef} />

        {/* 内訳 */}
        <div className="w-full flex flex-col gap-3">
          {rows.map(row => (
            <div key={row.labelEn} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-[10px] text-white/50 font-light">{row.labelJa}</p>
                  <p className="text-[7px] tracking-[0.3em] text-white/18 uppercase">{row.labelEn}</p>
                </div>
                <p className="text-[9px] text-white/30">{row.detail} = <span style={{ color: row.color }}>{row.value}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <ScoreBar value={row.value} max={row.max} color={row.color} />
              </div>
            </div>
          ))}

          {penalty > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-[10px] text-white/50 font-light">Gフォース</p>
                  <p className="text-[7px] tracking-[0.3em] text-white/18 uppercase">G-FORCE</p>
                </div>
                <p className="text-[9px] text-red-400/60">{data.gForceCount} × 80 = −{penalty}</p>
              </div>
              <div className="flex items-center gap-3">
                <ScoreBar value={penalty} max={400} color="rgba(255,80,60,0.7)" />
              </div>
            </div>
          )}

          <div className="mt-1 h-px w-full bg-white/8" />

          <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-1.5">
              <p className="text-[10px] text-white/40 font-light">合計</p>
              <p className="text-[7px] tracking-[0.3em] text-white/18 uppercase">TOTAL</p>
            </div>
            <div className="flex items-baseline gap-2">
              {!isNewRecord && prevBest > 0 && (
                <p className="text-[8px] text-white/20">Best {prevBest}</p>
              )}
              <p className="text-[12px] font-light tracking-widest" style={{ color }}>{total}</p>
            </div>
          </div>
        </div>

        {/* リプレイ */}
        <button onClick={onReplay}
          className="mt-1 px-9 py-2.5 border border-white/18 text-white/40 text-[9px] tracking-[0.45em] uppercase font-light hover:border-white/35 hover:text-white/60 transition-all duration-300 active:scale-95">
          Brew Again
        </button>
        <p className="text-[7px] tracking-[0.3em] text-white/12 uppercase -mt-4">もう一度</p>
      </div>
    </div>
  );
}
