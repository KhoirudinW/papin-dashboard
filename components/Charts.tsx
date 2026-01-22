'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { useDataChart } from '@/hooks/useDataChart';

function Charts() {
  const {
    chartData,
    loading,
    error,
    viewType,
    setViewType,
  } = useDataChart();

  if (loading) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 text-sm">
        Loading chart...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
          barGap={4}
        >
          <XAxis
            dataKey="display"
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 2 }}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }}
            dy={10}
          />

          <YAxis
            axisLine={{ stroke: '#E5E7EB', strokeWidth: 2 }}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }}
            allowDecimals={false}
          />

          <Tooltip
            cursor={{ fill: '#FFF5F7' }}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
              fontSize: '12px',
            }}
            itemStyle={{ fontWeight: 'bold' }}
          />

          {/* Jumlah PAP */}
          <Bar
            dataKey="pap"
            name="PAP"
            fill="#A0D1FF"
            radius={[4, 4, 0, 0]}
            barSize={12}
          />

          {/* Jumlah Reaction */}
          <Bar
            dataKey="reaction"
            name="Reaction"
            fill="#FFC0D9"
            radius={[4, 4, 0, 0]}
            barSize={12}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Charts;
