'use client';
import dynamic from 'next/dynamic';

// The studio is canvas-heavy and browser-only, so it renders on the client.
const Studio = dynamic(() => import('@/components/Studio'), {
  ssr: false,
  loading: () => <div className="boot">Loading Glyphforge…</div>,
});

export default function Page() {
  return <Studio />;
}
