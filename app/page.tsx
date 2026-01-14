// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Langsung arahkan ke /login yang ada di dalam grup (auth)
  redirect('/(auth)/login');
}