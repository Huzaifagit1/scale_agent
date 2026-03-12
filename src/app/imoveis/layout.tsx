import { Suspense } from 'react';

export default function ImoveisLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ fontSize: 14, color: '#999' }}>Carregando...</div>
    </div>
  }>{children}</Suspense>;
}
