// components/ProtectedRoute.tsx
'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('papin_session');
    if (!session) {
      router.push('/'); // Tendang balik ke login jika tidak ada session
    }
  }, [router]);

  return <>{children}</>;
}