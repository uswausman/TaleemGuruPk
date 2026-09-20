import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Card } from './ui/Card';
import { TrendingUp } from 'lucide-react';

interface PerformanceData {
  subject: string;
  score: number;
  fullMark: number;
}

interface PerformanceRadarProps {
  data: PerformanceData[];
}

export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({ data }) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-indigo-500" />
        Subject Performance
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="Performance"
              dataKey="score"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
