'use client';

import { useEffect, useRef } from 'react';
import Matter from 'matter-js';

interface ZeroGCanvasProps {
  beta: number | null;
  gamma: number | null;
  onCollision: (isPeaberry: boolean, x: number, y: number) => void;
  scattered: boolean;
  gForceAlert: boolean;
}

const PARTICLE_RADIUS = 4;
const BEAN_RX = 10;
const BEAN_RY = 6.5;
const GROUND_RADIUS = BEAN_RX;
const GROUND_COUNT = 18;
const PEABERRY_COUNT = 2;
const PEABERRY_R = 7.5;

type Ripple = { x: number; y: number; r: number; maxR: number; alpha: number; isPeaberry: boolean };

// 通常豆描画
function drawRegularBean(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, scattered: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.shadowColor = scattered ? 'rgba(200,130,60,0.5)' : 'rgba(100,55,15,0.4)';
  ctx.shadowBlur = scattered ? 12 : 7;

  ctx.beginPath();
  ctx.ellipse(0, 0, BEAN_RX, BEAN_RY, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-BEAN_RX * 0.25, -BEAN_RY * 0.3, 0.5, 0, 0, BEAN_RX);
  if (scattered) {
    grad.addColorStop(0, '#c07840'); grad.addColorStop(0.5, '#8a5025'); grad.addColorStop(1, '#4e2a0a');
  } else {
    grad.addColorStop(0, '#8d5428'); grad.addColorStop(0.5, '#5e3418'); grad.addColorStop(1, '#341808');
  }
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(15,5,0,0.75)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // ハイライト
  ctx.beginPath();
  ctx.ellipse(-BEAN_RX * 0.2, -BEAN_RY * 0.35, BEAN_RX * 0.45, BEAN_RY * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,200,150,0.1)';
  ctx.fill();

  // クリース
  ctx.beginPath();
  ctx.moveTo(-BEAN_RX * 0.62, 0);
  ctx.bezierCurveTo(-BEAN_RX * 0.15, -BEAN_RY * 0.72, BEAN_RX * 0.15, -BEAN_RY * 0.72, BEAN_RX * 0.62, 0);
  ctx.strokeStyle = scattered ? 'rgba(25,8,0,0.55)' : 'rgba(18,5,0,0.6)';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.restore();
}

// ピーベリー描画（丸い・金色）
function drawPeaberry(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, scattered: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const r = PEABERRY_R;

  // ゴールドグロー
  ctx.shadowColor = scattered ? 'rgba(255,200,80,0.85)' : 'rgba(210,155,40,0.7)';
  ctx.shadowBlur = scattered ? 20 : 14;

  // 本体（ほぼ真円）
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(-r * 0.22, -r * 0.28, 0.5, 0, 0, r);
  if (scattered) {
    grad.addColorStop(0, '#ffe090'); grad.addColorStop(0.4, '#e0a030'); grad.addColorStop(1, '#7a4e08');
  } else {
    grad.addColorStop(0, '#f0c060'); grad.addColorStop(0.45, '#c88830'); grad.addColorStop(1, '#7a5010');
  }
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(80,40,0,0.7)';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // 光沢
  ctx.beginPath();
  ctx.ellipse(-r * 0.22, -r * 0.32, r * 0.35, r * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,240,200,0.18)';
  ctx.fill();

  // 短めのクリース
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, 0.5);
  ctx.bezierCurveTo(-r * 0.12, -r * 0.58, r * 0.12, -r * 0.58, r * 0.5, 0.5);
  ctx.strokeStyle = 'rgba(60,25,0,0.5)';
  ctx.lineWidth = 1.0;
  ctx.lineCap = 'round';
  ctx.stroke();

  // ✦ スパークル（希少さの印）
  ctx.fillStyle = `rgba(255,235,150,${scattered ? 0.9 : 0.65})`;
  ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.38, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.28, 0.8, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

export default function ZeroGCanvas({ beta, gamma, onCollision, scattered, gForceAlert }: ZeroGCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const groundBodiesRef = useRef<Matter.Body[]>([]);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scatteredRef = useRef(false);
  const beanScatteredRef = useRef(false);
  const ripplesRef = useRef<Ripple[]>([]);
  const onCollisionRef = useRef(onCollision);
  const gForceAlertRef = useRef(gForceAlert);

  // 最新コールバックをrefに同期
  useEffect(() => { onCollisionRef.current = onCollision; }, [onCollision]);
  useEffect(() => { gForceAlertRef.current = gForceAlert; }, [gForceAlert]);

  // 初期化
  useEffect(() => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.clientWidth || window.innerWidth;
    const height = canvasRef.current.clientHeight || window.innerHeight;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0, scale: 0.001 } });
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: canvasRef.current, engine,
      options: { width, height, wireframes: false, background: 'transparent' },
    });
    renderRef.current = render;
    runnerRef.current = Matter.Runner.create();

    // 透明な境界壁
    const wallOpts = { isStatic: true, label: 'wall', restitution: 0.5, friction: 0,
      render: { fillStyle: 'rgba(0,0,0,0)', strokeStyle: 'rgba(0,0,0,0)', lineWidth: 0 } };
    Matter.World.add(engine.world, [
      Matter.Bodies.rectangle(width / 2, -30, width + 100, 60, wallOpts),
      Matter.Bodies.rectangle(width / 2, height + 30, width + 100, 60, wallOpts),
      Matter.Bodies.rectangle(-30, height / 2, 60, height + 100, wallOpts),
      Matter.Bodies.rectangle(width + 30, height / 2, 60, height + 100, wallOpts),
    ]);

    // ピーベリーのインデックスをランダムに選択
    const peaberryIndices = new Set<number>();
    while (peaberryIndices.size < PEABERRY_COUNT) {
      peaberryIndices.add(Math.floor(Math.random() * GROUND_COUNT));
    }

    // コーヒー豆を配置
    const grounds: Matter.Body[] = [];
    for (let i = 0; i < GROUND_COUNT; i++) {
      const isPeaberry = peaberryIndices.has(i);
      const angle = (i / GROUND_COUNT) * Math.PI * 2;
      const r = 28 + (i % 6) * 7;
      const body = Matter.Bodies.circle(
        width / 2 + Math.cos(angle) * r,
        height / 2 + Math.sin(angle) * r,
        isPeaberry ? PEABERRY_R : GROUND_RADIUS,
        {
          frictionAir: 0.04, restitution: 0.55, mass: isPeaberry ? 1.5 : 2,
          label: isPeaberry ? 'peaberry' : 'ground',
          render: { fillStyle: 'rgba(0,0,0,0)', strokeStyle: 'rgba(0,0,0,0)', lineWidth: 0 },
        }
      );
      grounds.push(body);
    }
    groundBodiesRef.current = grounds;
    Matter.World.add(engine.world, grounds);

    // カスタム描画（afterRender）
    Matter.Events.on(render, 'afterRender', () => {
      const ctx = render.context;

      // 波紋を更新・描画
      ripplesRef.current = ripplesRef.current.filter(rp => rp.alpha > 0.02);
      ripplesRef.current.forEach(rp => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.isPeaberry
          ? `rgba(220,170,60,${rp.alpha})`
          : `rgba(180,210,255,${rp.alpha})`;
        ctx.lineWidth = rp.isPeaberry ? 1.5 : 1;
        ctx.stroke();
        ctx.restore();
        rp.r += (rp.maxR - rp.r) * 0.12;
        rp.alpha *= 0.84;
      });

      // 豆を描画
      groundBodiesRef.current.forEach(body => {
        if (body.label === 'peaberry') {
          drawPeaberry(ctx, body.position.x, body.position.y, body.angle, beanScatteredRef.current);
        } else {
          drawRegularBean(ctx, body.position.x, body.position.y, body.angle, beanScatteredRef.current);
        }
      });
    });

    // 衝突検出
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const isGround = (b: Matter.Body) => b.label === 'ground' || b.label === 'peaberry';
        const isWater  = (b: Matter.Body) => b.label === 'water';
        const groundBody = isGround(pair.bodyA) ? pair.bodyA : isGround(pair.bodyB) ? pair.bodyB : null;
        const waterBody  = isWater(pair.bodyA)  ? pair.bodyA : isWater(pair.bodyB)  ? pair.bodyB : null;

        if (groundBody && waterBody) {
          const isPeaberry = groundBody.label === 'peaberry';
          const { x, y } = groundBody.position;

          // 波紋追加
          ripplesRef.current.push({
            x, y, r: 6,
            maxR: isPeaberry ? 38 : 24,
            alpha: isPeaberry ? 0.9 : 0.65,
            isPeaberry,
          });

          onCollisionRef.current(isPeaberry, x, y);
        }
      });
    });

    Matter.Render.run(render);
    Matter.Runner.run(runnerRef.current, engine);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      Matter.Runner.stop(runnerRef.current!);
      Matter.Render.stop(render);
      render.canvas.remove();
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 重力をジャイロ/マウスで更新
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.gravity.x = ((gamma ?? 0) / 90) * 0.8;
    engineRef.current.gravity.y = ((beta  ?? 0) / 90) * 0.8;
  }, [beta, gamma]);

  // 傾き量に応じてお湯のスポーン速度を変える（傾けるほど水が多く出る）
  useEffect(() => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    const tilt = Math.sqrt((beta ?? 0) ** 2 + (gamma ?? 0) ** 2);
    const tiltNorm = Math.min(tilt / 50, 1);
    const interval = gForceAlert ? 700 : Math.round(500 - tiltNorm * 320);

    spawnTimerRef.current = setInterval(() => {
      if (!engineRef.current || !canvasRef.current) return;
      const engine = engineRef.current;
      const width  = canvasRef.current.clientWidth  || window.innerWidth;
      const height = canvasRef.current.clientHeight || window.innerHeight;

      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if      (edge === 0) { x = Math.random() * width;  y = -10; }
      else if (edge === 1) { x = width + 10;              y = Math.random() * height; }
      else if (edge === 2) { x = Math.random() * width;  y = height + 10; }
      else                 { x = -10;                     y = Math.random() * height; }

      const body = Matter.Bodies.circle(x, y, PARTICLE_RADIUS, {
        frictionAir: 0.01, restitution: 0.5, mass: 0.3, label: 'water',
        render: { fillStyle: 'rgba(180,210,255,0.85)', strokeStyle: 'rgba(200,230,255,0.5)', lineWidth: 0.5 },
      });
      Matter.World.add(engine.world, body);
      setTimeout(() => {
        if (engineRef.current) Matter.World.remove(engineRef.current.world, body);
      }, 8000);
    }, interval);

    return () => { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); };
  }, [beta, gamma, gForceAlert]);

  // 飛散エフェクト
  useEffect(() => {
    if (scattered && !scatteredRef.current && engineRef.current) {
      scatteredRef.current = true;
      beanScatteredRef.current = true;
      groundBodiesRef.current.forEach(body => {
        const forceMag = 0.07 + Math.random() * 0.09;
        const angle = Math.random() * Math.PI * 2;
        Matter.Body.applyForce(body, body.position, {
          x: Math.cos(angle) * forceMag,
          y: Math.sin(angle) * forceMag,
        });
      });
    }
    if (!scattered) {
      scatteredRef.current = false;
      beanScatteredRef.current = false;
      if (engineRef.current && canvasRef.current) {
        const width  = canvasRef.current.clientWidth  || window.innerWidth;
        const height = canvasRef.current.clientHeight || window.innerHeight;
        groundBodiesRef.current.forEach((body, i) => {
          const angle = (i / GROUND_COUNT) * Math.PI * 2;
          const r = 28 + (i % 6) * 7;
          Matter.Body.setPosition(body, { x: width / 2 + Math.cos(angle) * r, y: height / 2 + Math.sin(angle) * r });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Body.setAngle(body, 0);
          Matter.Body.setAngularVelocity(body, 0);
        });
        ripplesRef.current = [];
      }
    }
  }, [scattered]);

  return <div ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />;
}
