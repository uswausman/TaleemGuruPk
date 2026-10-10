import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  Zap,
  Layers,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { TestResult, MCQ, StudentProfile } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';

export interface StudyRoadmapTrendsChartProps {
  historyResults: TestResult[];
  allMCQs?: MCQ[];
  student?: StudentProfile | null;
}

interface TrendDataPoint {
  id: string;
  name: string;
  date: string;
  testTitle: string;
  subject: string;
  sessionQuestions: number;
  sessionCorrect: number;
  sessionWrong: number;
  sessionAccuracy: number;
  cumulativeQuestions: number;
  cumulativeCorrect: number;
  cumulativeAccuracy: number;
  cumulativeTimeMinutes: number;
  grade: string;
}

export const StudyRoadmapTrendsChart: React.FC<StudyRoadmapTrendsChartProps> = ({
  historyResults,
  student,
}) => {
  const [activeChartMetric, setActiveChartMetric] = useState<
    'cumulative_volume' | 'accuracy_progression' | 'subject_breakdown'
  >('cumulative_volume');
  const [timeSpan, setTimeSpan] = useState<'all' | 'recent_10' | 'recent_5'>('all');

  // Format and calculate cumulative time-series data
  const trendData = useMemo<TrendDataPoint[]>(() => {
    if (!historyResults || historyResults.length === 0) {
      return [];
    }

    // Sort chronologically ascending
    const sorted = [...historyResults].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime() || 0;
      const timeB = new Date(b.timestamp || 0).getTime() || 0;
      return timeA - timeB;
    });

    let cumQuestions = 0;
    let cumCorrect = 0;
    let cumSeconds = 0;

    return sorted.map((res, idx) => {
      const qCount = res.answeredCount || res.totalQuestions || 15;
      const correct = res.correctCount ?? Math.round(qCount * (res.percentage / 100));
      const wrong = res.wrongCount ?? (qCount - correct);
      cumQuestions += qCount;
      cumCorrect += correct;
      cumSeconds += res.timeUsedSeconds || qCount * 60;

      const dateObj = new Date(res.timestamp);
      const formattedDate = !isNaN(dateObj.getTime())
        ? `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
        : `Quiz #${idx + 1}`;

      const cumAcc = cumQuestions > 0 ? Math.round((cumCorrect / cumQuestions) * 100) : res.percentage;

      return {
        id: res.id,
        name: `T${idx + 1}`,
        date: formattedDate,
        testTitle: res.testTitle || `Assessment ${idx + 1}`,
        subject: res.subject || 'General',
        sessionQuestions: qCount,
        sessionCorrect: correct,
        sessionWrong: wrong,
        sessionAccuracy: res.percentage || Math.round((correct / qCount) * 100),
        cumulativeQuestions: cumQuestions,
        cumulativeCorrect: cumCorrect,
        cumulativeAccuracy: cumAcc,
        cumulativeTimeMinutes: Math.round(cumSeconds / 60),
        grade: res.grade || (res.percentage >= 80 ? 'A+' : 'B'),
      };
    });
  }, [historyResults]);

  // Filtered view by timeSpan
  const displayData = useMemo(() => {
    if (timeSpan === 'recent_5') return trendData.slice(-5);
    if (timeSpan === 'recent_10') return trendData.slice(-10);
    return trendData;
  }, [trendData, timeSpan]);

  // Aggregate Subject Distribution
  const subjectAggregates = useMemo(() => {
    const map = new Map<string, { subject: string; totalQuestions: number; correct: number; testsCount: number }>();
    trendData.forEach((d) => {
      const existing = map.get(d.subject) || {
        subject: d.subject,
        totalQuestions: 0,
        correct: 0,
        testsCount: 0,
      };
      existing.totalQuestions += d.sessionQuestions;
      existing.correct += d.sessionCorrect;
      existing.testsCount += 1;
      map.set(d.subject, existing);
    });

    return Array.from(map.values()).map((s) => ({
      subject: s.subject,
      totalQuestions: s.totalQuestions,
      correct: s.correct,
      accuracy: s.totalQuestions > 0 ? Math.round((s.correct / s.totalQuestions) * 100) : 0,
      testsCount: s.testsCount,
    }));
  }, [trendData]);

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    if (trendData.length === 0) {
      return { totalQ: 0, totalCorrect: 0, avgAcc: 0, growth: 0, totalTimeHrs: 0 };
    }
    const last = trendData[trendData.length - 1];
    const first = trendData[0];
    const growthRate = last.cumulativeAccuracy - first.sessionAccuracy;
    return {
      totalQ: last.cumulativeQuestions,
      totalCorrect: last.cumulativeCorrect,
      avgAcc: last.cumulativeAccuracy,
      growth: growthRate,
      totalTimeHrs: (last.cumulativeTimeMinutes / 60).toFixed(1),
    };
  }, [trendData]);

  if (trendData.length === 0) {
    return (
      <Card className="p-6 sm:p-8 space-y-4 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400">
            <TrendingUp className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Cumulative Progress & Mastery Trends
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track your cumulative question volume, accuracy trajectory, and learning pace over time.
            </p>
          </div>
        </div>
        <EmptyState
          title="No tests attempted yet"
          description="Start practicing to build your progress."
        />
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-7 space-y-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl">
      {/* Header & Metric Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Cumulative Progress & Mastery Trends
            </h2>
            <Badge variant="emerald" size="xs">
              Live MCQ Logs ({historyResults.length} Sessions)
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track your cumulative question volume, accuracy trajectory, and learning pace over time.
          </p>
        </div>

        {/* Chart View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveChartMetric('cumulative_volume')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartMetric === 'cumulative_volume'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Volume & Accuracy
            </button>
            <button
              onClick={() => setActiveChartMetric('accuracy_progression')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartMetric === 'accuracy_progression'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Session Scores (%)
            </button>
            <button
              onClick={() => setActiveChartMetric('subject_breakdown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartMetric === 'subject_breakdown'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Subject Share
            </button>
          </div>

          {/* Span filter */}
          {trendData.length > 5 && (
            <select
              value={timeSpan}
              onChange={(e) => setTimeSpan(e.target.value as any)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="all">All ({trendData.length} Tests)</option>
              <option value="recent_10">Last 10 Tests</option>
              <option value="recent_5">Last 5 Tests</option>
            </select>
          )}
        </div>
      </div>

      {/* KPI Micro Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
          <span className="text-[11px] font-bold text-blue-700 dark:text-cyan-400 uppercase tracking-wider block">
            Cumulative Solved
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summaryMetrics.totalQ.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {summaryMetrics.totalCorrect} Correct MCQs
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
            Overall Accuracy
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summaryMetrics.avgAcc}%
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            {summaryMetrics.growth >= 0 ? `+${summaryMetrics.growth}% Net Growth` : `${summaryMetrics.growth}%`}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
            Mastery Threshold
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">80%</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Target for Gold Mastery</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">
            Practice Time
          </span>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {summaryMetrics.totalTimeHrs} hrs
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Total focus duration</span>
        </div>
      </div>

      {/* Main Recharts Container */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {activeChartMetric === 'cumulative_volume' ? (
            <ComposedChart
              data={displayData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1', opacity: 0.3 }}
                tickLine={false}
              />

              {/* Left Y Axis: Cumulative Questions */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />

              {/* Right Y Axis: Cumulative Accuracy % */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as TrendDataPoint;
                    return (
                      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-md">
                        <div className="font-bold text-cyan-400 flex items-center justify-between gap-4">
                          <span>{data.testTitle}</span>
                          <span className="text-[10px] text-slate-400">{data.date}</span>
                        </div>
                        <div className="text-slate-300">
                          Subject: <strong className="text-white">{data.subject}</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                          <div>
                            <span className="text-slate-400">Cumulative MCQs: </span>
                            <strong className="text-blue-400">{data.cumulativeQuestions}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Cumulative Correct: </span>
                            <strong className="text-emerald-400">{data.cumulativeCorrect}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Overall Accuracy: </span>
                            <strong className="text-amber-400">{data.cumulativeAccuracy}%</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Session Score: </span>
                            <strong className="text-cyan-300">{data.sessionAccuracy}%</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeQuestions"
                name="Total Questions Practiced"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorQuestions)"
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeCorrect"
                name="Correct Answers"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCorrect)"
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeAccuracy"
                name="Cumulative Accuracy (%)"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5 }}
              />

              <ReferenceLine
                yAxisId="right"
                y={80}
                label={{ value: '80% Benchmark', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
            </ComposedChart>
          ) : activeChartMetric === 'accuracy_progression' ? (
            <ComposedChart
              data={displayData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSessionAcc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1', opacity: 0.3 }}
                tickLine={false}
              />

              <YAxis
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as TrendDataPoint;
                    return (
                      <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1">
                        <div className="font-bold text-white">{data.testTitle}</div>
                        <div className="text-cyan-300">
                          Session Score: <strong>{data.sessionAccuracy}%</strong> ({data.sessionCorrect}/{data.sessionQuestions} correct)
                        </div>
                        <div className="text-amber-300">
                          Cumulative Accuracy: <strong>{data.cumulativeAccuracy}%</strong>
                        </div>
                        <div className="text-slate-400 text-[10px]">Grade: {data.grade}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
              />

              <ReferenceLine
                y={80}
                label={{ value: 'Mastery Line (80%)', fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />

              <ReferenceLine
                y={60}
                label={{ value: 'Pass Line (60%)', fill: '#f59e0b', fontSize: 10, position: 'insideBottomLeft' }}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1}
              />

              <Bar
                dataKey="sessionAccuracy"
                name="Individual Quiz Score (%)"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />

              <Line
                type="monotone"
                dataKey="cumulativeAccuracy"
                name="Cumulative Running Average (%)"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ r: 3, fill: '#06b6d4', stroke: '#fff' }}
              />
            </ComposedChart>
          ) : (
            <ComposedChart
              data={subjectAggregates}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />

              <XAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1', opacity: 0.3 }}
                tickLine={false}
              />

              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1">
                        <div className="font-bold text-white">{data.subject}</div>
                        <div className="text-blue-400">Total MCQs: <strong>{data.totalQuestions}</strong></div>
                        <div className="text-emerald-400">Correct Answers: <strong>{data.correct}</strong></div>
                        <div className="text-amber-400">Accuracy Rate: <strong>{data.accuracy}%</strong></div>
                        <div className="text-slate-400 text-[10px]">Tests Taken: {data.testsCount}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
              />

              <Bar
                yAxisId="left"
                dataKey="totalQuestions"
                name="Total Questions Answered"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracy"
                name="Subject Accuracy (%)"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', stroke: '#fff' }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Insight Note */}
      <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>
            {activeChartMetric === 'cumulative_volume'
              ? 'Green line shows cumulative accuracy, blue area represents total question volume growth.'
              : activeChartMetric === 'accuracy_progression'
              ? 'Bars represent individual test scores, cyan curve tracks running cumulative average.'
              : 'Distribution of question volume and accuracy rate across academic subjects.'}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          Powered by Recharts Data Engine
        </span>
      </div>
    </Card>
  );
};

export default StudyRoadmapTrendsChart;
