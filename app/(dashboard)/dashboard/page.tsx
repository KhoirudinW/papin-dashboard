"use client";

export const dynamic = 'force-dynamic';
import { StatCard, PresetCard, ChartCard, PairCodeCard } from '@/components/DashboardWidgets';
import { faFaceSmile, faCamera, faFire } from '@fortawesome/free-solid-svg-icons';
import { useStats } from '@/hooks/useStats';

export default function DashboardPage() {
  const { totalPaps, currentStreak, totalPresets, loading } = useStats();

  
  return ( 
    <div className="p-6 space-y-6 md:space-y-8">
      {/* Barisan Atas: Stats */}
      <div className="grid grid-cols-2 lg:flex lg:flex-row gap-4 md:gap-6">
        {loading ? (
          <StatsSkeleton count={3} />
        ) : (
          <>
            <StatCard 
              title="Best Streak" 
              value={currentStreak.toString()} 
              unit="Hari" 
              icon={faFire} 
            />
            <StatCard 
              title="Photos" 
              value={totalPaps.toString()} 
              unit="Paps" 
              icon={faCamera} 
            />
            <div className="col-span-2 lg:flex-1">
              <StatCard 
                title="Reactions" 
                value={totalPresets.toString()} 
                unit="Presets" 
                icon={faFaceSmile} 
              />
            </div>
          </>
        )}
      </div>

      {/* Barisan Tengah: Pair Code & Preset */}
      <div className="flex flex-col xl:flex-row gap-6 md:gap-8">
        <div className="w-full xl:w-1/2">
          <PairCodeCard />
        </div>
        <div className="w-full xl:w-1/2">
          <PresetCard />
        </div>
      </div>

      {/* Barisan Bawah: Chart */}
      <div className="w-full">
        <ChartCard />
      </div>
    </div>
  );
}

// Komponen Loading Skeleton untuk Stats
const StatsSkeleton = ({ count }: { count: number }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className={`h-32 bg-gray-200 animate-pulse rounded-3xl ${
            i === 2 ? 'col-span-2 lg:flex-1' : 'col-span-1 lg:flex-1'
          }`}
        />
      ))}
    </>
  );
};