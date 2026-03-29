'use client';

import { useEffect, useRef } from 'react';

interface ExtractionGaugeProps {
  progress: number; // 0~1
  isCharging: boolean;
  gForceAlert: boolean;
}

export default function ExtractionGauge({
  progress,
  isCharging,
  gForceAlert,
}: ExtractionGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 60;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * progress;

    // 外輪（薄い白）
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 進捗アーク
    if (progress > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = gForceAlert
        ? 'rgba(255, 80, 60, 0.9)'
        : isCharging
        ? 'rgba(200, 230, 255, 0.95)'
        : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // 内側の十字線
    const crossSize = 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    // パーセント表示
    const pct = Math.round(progress * 100);
    ctx.font = '400 14px "SF Mono", "Fira Mono", monospace';
    ctx.fillStyle = gForceAlert ? 'rgba(255,80,60,0.9)' : 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pct}%`, cx, cy - 4);

    ctx.font = '300 8px "SF Mono", "Fira Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('EXTRACT', cx, cy + 12);
  }, [progress, isCharging, gForceAlert]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
    />
  );
}
