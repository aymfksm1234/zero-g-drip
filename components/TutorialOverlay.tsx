'use client';

interface TutorialOverlayProps {
  onStart: () => void;
}

const steps = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        {/* 傾いたスマホ → 豆へ向かう粒子 */}
        <rect x="7" y="10" width="18" height="10" rx="2"
          stroke="white" strokeOpacity="0.5" strokeWidth="0.75"
          transform="rotate(15 16 16)" />
        <circle cx="9"  cy="23" r="1.5" fill="white" fillOpacity="0.5" />
        <circle cx="14" cy="26" r="1.5" fill="white" fillOpacity="0.4" />
        <ellipse cx="22" cy="26" rx="3" ry="2" fill="#7d4a22" fillOpacity="0.8" />
      </svg>
    ),
    ja: '傾けてお湯を当てる',
    en: 'Tilt to pour',
    sub_ja: '粒子が豆にヒットするほどゲージが溜まる',
    sub_en: 'Hits fill the extraction gauge',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        {/* 連続ヒット → ×コンボ */}
        <circle cx="10" cy="16" r="2.5" fill="#7d4a22" fillOpacity="0.8" />
        <circle cx="18" cy="13" r="2.5" fill="#7d4a22" fillOpacity="0.8" />
        <circle cx="24" cy="19" r="2.5" fill="#7d4a22" fillOpacity="0.8" />
        <path d="M12 15 L16 13" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" />
        <path d="M20 14 L22 18" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" />
        <text x="5" y="30" fontSize="7" fill="white" fillOpacity="0.45" fontFamily="monospace">×3 COMBO</text>
      </svg>
    ),
    ja: '連続ヒットでコンボ',
    en: 'Chain hits for combos',
    sub_ja: '×2 → ×3 → ×5 倍率でボーナス加算',
    sub_en: 'Multiplier boosts your score',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        {/* ピーベリー（丸い金色の豆） */}
        <circle cx="16" cy="16" r="6" fill="#c88830" fillOpacity="0.85" />
        <path d="M11.5 16 Q16 11 20.5 16" stroke="rgba(60,25,0,0.6)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <circle cx="13" cy="12.5" r="1" fill="rgba(255,235,150,0.7)" />
        <circle cx="21" cy="13"   r="0.6" fill="rgba(255,235,150,0.5)" />
      </svg>
    ),
    ja: 'ピーベリーは大チャンス',
    en: 'Peaberry = big bonus',
    sub_ja: '金色の丸い豆を狙え — ×80pt',
    sub_en: 'The rare round gold bean scores ×80',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 7 L28 25 L4 25 Z" stroke="rgba(255,80,60,0.7)" strokeWidth="0.75" fill="none" />
        <line x1="16" y1="13" x2="16" y2="20" stroke="rgba(255,80,60,0.7)" strokeWidth="1" strokeLinecap="round" />
        <circle cx="16" cy="22.5" r="0.8" fill="rgba(255,80,60,0.7)" />
      </svg>
    ),
    ja: '傾けすぎに注意',
    en: 'Don\'t over-tilt',
    sub_ja: 'G-Force AlertでコンボとゲージがDown',
    sub_en: 'Drops your combo and gauge',
  },
];

export default function TutorialOverlay({ onStart }: TutorialOverlayProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center bg-black/95 z-50 overflow-y-auto"
      onClick={onStart}
      style={{ cursor: 'pointer' }}
    >
      <div className="w-full max-w-xs px-8 flex flex-col items-center py-7 gap-5">

        {/* タイトル */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-[9px] tracking-[0.55em] text-white/25 uppercase">Zero-G</p>
          <p className="text-[20px] tracking-[0.12em] text-white/80 font-extralight">DRIP</p>
          <div className="mt-2 h-px w-8 bg-white/10" />
          <p className="mt-2 text-[9px] tracking-[0.4em] text-white/25 uppercase">How to brew</p>
        </div>

        {/* ステップ一覧 */}
        <div className="w-full flex flex-col gap-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 mt-0.5 flex items-center justify-center opacity-75">
                {step.icon}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] text-white/65 font-light tracking-wide">
                    {step.ja}
                  </span>
                  <span className="text-[8px] text-white/22 tracking-wider">
                    {step.en}
                  </span>
                </div>
                <p className="text-[8.5px] text-white/28 tracking-wide leading-relaxed">
                  {step.sub_ja}
                  <span className="text-white/15 ml-1">/ {step.sub_en}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 開始ボタン */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="px-9 py-2.5 border border-white/20 text-white/50 text-[10px] tracking-[0.45em] uppercase font-light">
            Tap to Start
          </div>
          <p className="text-[8px] tracking-[0.3em] text-white/15 uppercase">
            タップして開始
          </p>
        </div>

      </div>
    </div>
  );
}
