'use client';

import dynamic from 'next/dynamic';

const ZeroGDrip = dynamic(() => import('@/components/ZeroGDrip'), { ssr: false });

export default function Home() {
  return <ZeroGDrip />;
}
