'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import ExtractionGauge from './ExtractionGauge';
import TutorialOverlay from './TutorialOverlay';
import ScoreOverlay from './ScoreOverlay';

const ZeroGCanvas = dynamic(() => import('./ZeroGCanvas'), { ssr: false });

const G_FORCE_THRESHOLD = 35;
const SCATTER_THRESHOLD = 0.6;
const HIT_CHARGE = 0.025;
const HIT_CHARGE_PEABERRY = 0.10;
const GFORCE_DECAY = 0.006;
const NATURAL_DECAY = 0.0003;
const COMBO_TIMEOUT_MS = 1500;
const HS_KEY = 'zerog_drip_hs';

function comboMultiplier(combo: number) {
  if (combo >= 10) return 5;
  if (combo >= 6)  return 3;
  if (combo >= 3)  return 2;
  return 1;
}

export default function ZeroGDrip() {
  const { beta, gamma, permissionState, requestPermission } = useDeviceOrientation();

  // UI state
  const [progress, setProgress]       = useState(0);
  const [gForceAlert, setGForceAlert] = useState(false);
  const [scattered, setScattered]     = useState(false);
  const [isDesktop, setIsDesktop]     = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showScore, setShowScore]     = useState(false);
  const [combo, setCombo]             = useState(0);

  // refs（レンダーをまたぐ状態管理 / クロージャ対策）
  const progressRef      = useRef(0);
  const scatteredRef     = useRef(false);
  const gForceAlertRef   = useRef(false);
  const prevGForceRef    = useRef(false);
  const animFrameRef     = useRef<number | null>(null);

  // スコア計測用 refs
  const gForceCountRef   = useRef(0);
  const collisionCountRef = useRef(0);
  const peaberryHitsRef  = useRef(0);
  const maxComboRef      = useRef(0);
  const comboRef         = useRef(0);
  const comboTimerRef    = useRef<NodeJS.Timeout | null>(null);

  const scoreDataRef = useRef({ hits: 0, peaberryHits: 0, maxCombo: 0, gForceCount: 0 });

  // ゲージロジック（G-Force検出 + 自然減衰のみ）
  const betaRef  = useRef(beta);
  const gammaRef = useRef(gamma);
  useEffect(() => { betaRef.current  = beta; },  [beta]);
  useEffect(() => { gammaRef.current = gamma; }, [gamma]);

  useEffect(() => {
    function tick() {
      const b = betaRef.current ?? 0;
      const g = gammaRef.current ?? 0;
      const tilt = Math.sqrt(b * b + g * g);
      const isAlert = tilt > G_FORCE_THRESHOLD;

      gForceAlertRef.current = isAlert;
      setGForceAlert(isAlert);

      if (isAlert && !prevGForceRef.current) {
        gForceCountRef.current += 1;
        // コンボリセット
        comboRef.current = 0;
        setCombo(0);
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      }
      prevGForceRef.current = isAlert;

      if (isAlert) {
        progressRef.current = Math.max(0, progressRef.current - GFORCE_DECAY);
      } else {
        progressRef.current = Math.max(0, progressRef.current - NATURAL_DECAY);
      }
      setProgress(progressRef.current);

      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  // 衝突コールバック（ヒットでゲージ充電 + コンボ）
  const handleCollision = useCallback((isPeaberry: boolean) => {
    if (gForceAlertRef.current || scatteredRef.current) return;

    // コンボ更新
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboRef.current += 1;
    if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
    const currentCombo = comboRef.current;
    setCombo(currentCombo);
    comboTimerRef.current = setTimeout(() => {
      comboRef.current = 0;
      setCombo(0);
    }, COMBO_TIMEOUT_MS);

    // ゲージ充電
    const mult = comboMultiplier(currentCombo);
    const charge = (isPeaberry ? HIT_CHARGE_PEABERRY : HIT_CHARGE) * mult;
    progressRef.current = Math.min(1, progressRef.current + charge);
    setProgress(progressRef.current);

    // カウント
    collisionCountRef.current += 1;
    if (isPeaberry) peaberryHitsRef.current += 1;

    // 散乱トリガー
    if (progressRef.current >= SCATTER_THRESHOLD && !scatteredRef.current) {
      scatteredRef.current = true;
      setScattered(true);
    }
  }, []);

  // 飛散 → スコア表示
  useEffect(() => {
    if (!scattered) return;
    const t = setTimeout(() => {
      scoreDataRef.current = {
        hits:        collisionCountRef.current,
        peaberryHits: peaberryHitsRef.current,
        maxCombo:    maxComboRef.current,
        gForceCount: gForceCountRef.current,
      };
      setShowScore(true);
      setScattered(false);
      progressRef.current = 0;
      setProgress(0);
    }, 3000);
    return () => clearTimeout(t);
  }, [scattered]);

  const handleReplay = useCallback(() => {
    setShowScore(false);
    scatteredRef.current    = false;
    collisionCountRef.current = 0;
    peaberryHitsRef.current   = 0;
    maxComboRef.current       = 0;
    gForceCountRef.current    = 0;
    comboRef.current          = 0;
    prevGForceRef.current     = false;
    setCombo(0);
  }, []);

  useEffect(() => {
    setIsDesktop(!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  const tiltDeg = Math.round(Math.sqrt((beta ?? 0) ** 2 + (gamma ?? 0) ** 2));
  const mult = comboMultiplier(combo);

  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden select-none">
      {/* Physics Canvas */}
      <ZeroGCanvas
        beta={beta}
        gamma={gamma}
        onCollision={handleCollision}
        scattered={scattered}
        gForceAlert={gForceAlert}
      />

      {/* UI overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none" style={{ zIndex: 10 }}>

        {/* Header */}
        <div className="w-full flex justify-between items-start px-6 pt-10">
          <div>
            <p className="text-[9px] tracking-[0.35em] text-white/25 uppercase font-light">Zero-G</p>
            <p className="text-[18px] tracking-[0.15em] text-white/80 font-extralight mt-0.5">DRIP</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-[0.3em] text-white/25 uppercase font-light">Tilt</p>
            <p className={`text-[13px] font-light tracking-widest mt-0.5 transition-colors duration-300 ${gForceAlert ? 'text-red-400' : 'text-white/60'}`}>
              {tiltDeg}°
            </p>
          </div>
        </div>

        {/* Center: ゲージ + コンボ */}
        <div className="flex flex-col items-center gap-3">
          <ExtractionGauge progress={progress} isCharging={!gForceAlert && combo > 0} gForceAlert={gForceAlert} />

          {/* コンボ表示 */}
          <div className="h-5 flex items-center justify-center">
            {combo >= 2 && !gForceAlert && (
              <p className="text-[11px] tracking-[0.3em] font-light transition-all"
                style={{ color: mult >= 5 ? '#ffd060' : mult >= 3 ? '#c0e0ff' : 'rgba(255,255,255,0.6)' }}>
                ×{mult} <span className="text-[9px] opacity-60">COMBO {combo}</span>
              </p>
            )}
          </div>

          <div className="h-px w-16 bg-white/10" />

          {/* ステータスラベル */}
          <p className={`text-[9px] tracking-[0.4em] font-light uppercase transition-all duration-300 ${
            gForceAlert ? 'text-red-400 animate-pulse'
            : scattered ? 'text-amber-200/60'
            : combo >= 6  ? 'text-yellow-300/70'
            : 'text-white/20'
          }`}>
            {gForceAlert ? 'G-Force Alert'
              : scattered ? 'Dispersing...'
              : combo >= 10 ? 'Perfect Pour'
              : combo >= 6  ? 'On Fire'
              : combo >= 3  ? 'Nice Aim'
              : 'Aim & Pour'}
          </p>
        </div>

        {/* Footer */}
        <div className="w-full px-6 pb-10 flex justify-between items-end">
          <div>
            <p className="text-[8px] tracking-[0.3em] text-white/15 uppercase">Hits</p>
            <p className="text-[11px] text-white/35 font-light tracking-widest">
              {collisionCountRef.current.toString().padStart(4, '0')}
            </p>
          </div>

          {isDesktop && (
            <div className="text-center">
              <p className="text-[8px] tracking-[0.3em] text-white/15 uppercase">PC mode</p>
              <p className="text-[9px] text-white/22 font-light tracking-wider mt-0.5">
                mouse → tilt · center → level
              </p>
            </div>
          )}

          <div className="text-right">
            <p className="text-[8px] tracking-[0.3em] text-white/15 uppercase">β / γ</p>
            <p className="text-[11px] text-white/35 font-light tracking-widest">
              {(beta ?? 0).toFixed(1)} / {(gamma ?? 0).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Permission overlay */}
      {permissionState !== 'granted' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 pointer-events-auto" style={{ zIndex: 50 }}>
          <div className="flex flex-col items-center gap-8 px-10 text-center">
            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="7" stroke="white" strokeOpacity="0.4" strokeWidth="0.75" />
                <circle cx="14" cy="14" r="3" fill="white" fillOpacity="0.2" />
                <line x1="14" y1="4"  x2="14" y2="7"  stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                <line x1="14" y1="21" x2="14" y2="24" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                <line x1="4"  y1="14" x2="7"  y2="14" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
                <line x1="21" y1="14" x2="24" y2="14" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.5em] text-white/30 uppercase mb-3">Zero-G Drip</p>
              <p className="text-white/60 text-sm font-light leading-relaxed">
                スマホのモーションセンサーへの<br />アクセスが必要です
              </p>
            </div>
            <button onClick={requestPermission}
              className="px-8 py-3 border border-white/20 text-white/60 text-[10px] tracking-[0.4em] uppercase font-light hover:border-white/40 hover:text-white/80 active:scale-95 transition-all duration-300 pointer-events-auto">
              {permissionState === 'requesting' ? 'Requesting...' : 'Enable Sensor'}
            </button>
            {permissionState === 'denied' && (
              <p className="text-red-400/60 text-[9px] tracking-widest uppercase">Access Denied — Check Settings</p>
            )}
            <p className="text-white/15 text-[8px] tracking-[0.3em] uppercase">Mouse simulation on desktop</p>
          </div>
        </div>
      )}

      {/* チュートリアル */}
      {permissionState === 'granted' && showTutorial && (
        <TutorialOverlay onStart={() => setShowTutorial(false)} />
      )}

      {/* スコア画面 */}
      {showScore && (
        <ScoreOverlay data={scoreDataRef.current} onReplay={handleReplay} />
      )}

      <DesktopSimulator />
    </div>
  );
}

function DesktopSimulator() {
  useEffect(() => {
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return;
    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', {
        alpha: 0,
        beta:  ((e.clientY - cy) / cy) * 45,
        gamma: ((e.clientX - cx) / cx) * 45,
        absolute: false,
      }));
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: 0, beta: 0, gamma: 0, absolute: false }));
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  return null;
}
