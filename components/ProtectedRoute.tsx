// components/ProtectedRoute.tsx
'use client'
import { useEffect } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const guard = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const localSession = localStorage.getItem("papin_session");
        if (!data.session?.user && !localSession) {
          router.push('/login');
          return;
        }

        setIsAuthorized(true);
      } catch {
        router.push('/login');
      }
    };

    guard();
  }, [router]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
