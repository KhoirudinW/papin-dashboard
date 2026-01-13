'use client'
import React from 'react'
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    ResponsiveContainer, 
    Cell 
  } from 'recharts';

function Charts() {
    // Data simulasi: Intensitas kirim PAP per hari (Man vs Woman)
  const data = [
    { name: '0', man: 750, woman: 250 },
    { name: '1', man: 300, woman: 650 },
    { name: '2', man: 50, woman: 200 },
    { name: '3', man: 850, woman: 600 },
    { name: '4', man: 350, woman: 650 },
    { name: '5', man: 320, woman: 200 },
    { name: '6', man: 200, woman: 550 },
    { name: '7', man: 300, woman: 950 },
    { name: '8', man: 500, woman: 1000 },
    { name: '9', man: 500, woman: 300 },
  ];
  return (
    <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 0, right: 0, left: -25, bottom: 0 }}
            barGap={4}
          >
            {/* Sumbu X: Menampilkan angka 0-9 */}
            <XAxis 
              dataKey="name" 
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 2 }} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }}
              dy={10}
            />
            
            {/* Sumbu Y: Kelipatan 250 */}
            <YAxis 
              axisLine={{ stroke: '#E5E7EB', strokeWidth: 2 }} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }}
              domain={[0, 1000]}
              ticks={[0, 250, 500, 750, 1000]}
            />
            
            {/* Tooltip Custom yang Cantik */}
            <Tooltip 
              cursor={{ fill: '#FFF5F7' }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                fontSize: '12px'
              }}
              itemStyle={{ fontWeight: 'bold' }}
            />

            {/* Bar untuk Pria (Warna Biru Muda/Soft) */}
            <Bar 
              dataKey="man" 
              fill="#A0D1FF" 
              radius={[4, 4, 0, 0]} 
              barSize={12} 
            />

            {/* Bar untuk Wanita (Warna Pink Utama) */}
            <Bar 
              dataKey="woman" 
              fill="#FFC0D9" 
              radius={[4, 4, 0, 0]} 
              barSize={12} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
  )
}

export default Charts