import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Crown,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Play,
  Award,
} from 'lucide-react';
import { fetchLeaderboardApi } from '../lib/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

interface LeaderboardViewProps {
  currentStudentPoints: number;
  currentStudentName: string;
  onStartQuiz?: () => void;
}

type Timeframe = 'weekly' | 'monthly' | 'allTime';

interface LiveLeaderboardEntry {
  rank: number;
  name: string;
  city: string;
  institution: string;
  avatar: string;
  score: number;
  testsCompleted: number;
  accuracy: number;
  streakDays: number;
  badge: string;
  category: string;
  isCurrentStudent?: boolean;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentStudentPoints,
  currentStudentName,
  onStartQuiz,
}) => {
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('allTime');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const itemsPerPage = 10;

  // Sanitized privacy-safe student name
  const getPrivacySafeName = (rawName: string) => {
    if (!rawName) return 'Student';
    const parts = rawName.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
    }
    return parts[0];
  };

  // Fetch genuine leaderboard records from database API
  useEffect(() => {
    let isMounted = true;
    async function loadLeaderboard() {
      setIsLoading(true);
      try {
        const data = await fetchLeaderboardApi();
        if (isMounted) {
          setDbUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('Notice: Failed to load leaderboard from database:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadLeaderboard();
    return () => {
      isMounted = false;
    };
  }, []);

  // Build authentic dataset from database users
  const dataset = useMemo(() => {
    // Only genuine users from DB who have accumulated points
    const validDbUsers = (dbUsers || [])
      .filter((u) => (u.points || 0) > 0)
      .map((u) => ({
        id: u.id || u.uid,
        name: getPrivacySafeName(u.name),
        city: u.board ? `${u.board.replace('bise-', '').toUpperCase()} Board` : 'Pakistan',
        institution: u.board ? `${u.board.replace('bise-', '').toUpperCase()}` : 'Enrolled Student',
        avatar: u.avatar || '🎓',
        score: u.points || 0,
        testsCompleted: u.testsTaken || 1,
        accuracy: 90,
        streakDays: u.streakDays || 1,
        badge: 'Merit Scholar',
        category: u.classLevel || 'General',
        isCurrentStudent: false,
      }));

    // If current student has points, integrate into genuine ranking
    if (currentStudentPoints > 0) {
      const alreadyExists = validDbUsers.some(
        (u) => u.name.toLowerCase() === getPrivacySafeName(currentStudentName).toLowerCase()
      );
      if (!alreadyExists) {
        validDbUsers.push({
          id: 'current-student',
          name: `${getPrivacySafeName(currentStudentName)} (You)`,
          city: 'Your Board',
          institution: 'Active Candidate',
          avatar: '🌟',
          score: currentStudentPoints,
          testsCompleted: 1,
          accuracy: 92,
          streakDays: 1,
          badge: 'Active Candidate',
          category: 'Your Class',
          isCurrentStudent: true,
        });
      }
    }

    // Sort descending by actual score
    validDbUsers.sort((a, b) => b.score - a.score);

    // Assign rank index
    return validDbUsers.map((u, idx) => ({ ...u, rank: idx + 1 }));
  }, [dbUsers, currentStudentPoints, currentStudentName]);

  const filteredUsers = useMemo(() => {
    return dataset.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        u.city.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' || u.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [dataset, searchFilter, selectedCategory]);

  const currentUserCard = useMemo(() => {
    return dataset.find((u) => u.isCurrentStudent);
  }, [dataset]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="max-w-2xl relative z-10 space-y-3">
          <Badge variant="amber" size="sm" icon={<Trophy className="w-3.5 h-3.5" />}>
            Academic Merit Rankings
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Pakistan Student Leaderboard
          </h1>
          <p className="text-indigo-200/80 text-xs sm:text-sm md:text-base leading-relaxed">
            Rankings are calculated strictly from authenticated student test submissions and practice assessments across Pakistan education boards.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacy Guard: Candidate emails and private details are protected. Only verified scores appear.</span>
          </div>
        </div>
      </div>

      {/* Authenticated Student Current Rank (if points exist) */}
      {currentUserCard && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black shrink-0">
              #{currentUserCard.rank}
            </div>
            <div>
              <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Your Current Standing
              </div>
              <h3 className="text-lg sm:text-xl font-black">
                {currentUserCard.name}
              </h3>
              <p className="text-xs text-blue-100/80">
                {currentUserCard.institution} • {currentUserCard.city}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 text-center">
            <div className="bg-white/10 px-3.5 py-2 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-blue-200">Merit Points</div>
              <div className="text-base sm:text-lg font-black">{currentUserCard.score.toLocaleString()}</div>
            </div>
            <div className="bg-white/10 px-3.5 py-2 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-blue-200">Tests</div>
              <div className="text-base sm:text-lg font-black">{currentUserCard.testsCompleted}</div>
            </div>
          </div>
        </div>
      )}

      {/* Real Data State: Top 3 Podium or Empty State */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading verified merit rankings...
        </div>
      ) : dataset.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto text-3xl">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              No Public Rankings Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              TaleemGuru rankings are strictly based on authentic test results. Complete chapter tests and practice quizzes to earn points and record your academic ranking!
            </p>
          </div>
          {onStartQuiz && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                onClick={onStartQuiz}
              >
                Start a Practice Test
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Podium for Top 3 (When real records exist) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
            {/* Rank 2 (Silver) */}
            {dataset[1] && (
              <Card hoverLift className="p-6 text-center shadow-xs order-2 md:order-1 relative border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-600 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
                  🥈
                </div>
                <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Rank #2 Silver</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{dataset[1].name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{dataset[1].city}</p>
                <div className="mt-4 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-around text-xs font-bold">
                  <div>
                    <div className="text-slate-400 text-[10px]">Points</div>
                    <div className="text-slate-900 dark:text-white">{dataset[1].score.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Tests</div>
                    <div className="text-slate-900 dark:text-white">{dataset[1].testsCompleted}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Rank 1 (Gold Champion) */}
            {dataset[0] && (
              <div className="bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-3xl border-2 border-amber-400 dark:border-amber-500/50 p-7 text-center shadow-lg relative order-1 md:order-2 scale-105">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 px-3.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 shadow-md">
                  <Crown className="w-4 h-4 fill-current" /> Rank #1
                </div>
                <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950 border-4 border-amber-400 flex items-center justify-center text-4xl mx-auto mb-3 shadow-inner mt-2">
                  🥇
                </div>
                <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400">Top Performer</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{dataset[0].name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{dataset[0].city}</p>
                <div className="mt-4 p-3 bg-amber-100/60 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-around text-xs font-bold">
                  <div>
                    <div className="text-amber-800 dark:text-amber-400 text-[10px]">Score</div>
                    <div className="text-base text-amber-900 dark:text-amber-200">{dataset[0].score.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-amber-800 dark:text-amber-400 text-[10px]">Tests Done</div>
                    <div className="text-base text-amber-900 dark:text-amber-200">{dataset[0].testsCompleted}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {dataset[2] && (
              <Card hoverLift className="p-6 text-center shadow-xs order-3 md:order-3 border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/40 border-4 border-orange-300 dark:border-orange-700/60 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
                  🥉
                </div>
                <span className="text-xs font-black uppercase text-orange-600 dark:text-orange-400">Rank #3 Bronze</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{dataset[2].name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{dataset[2].city}</p>
                <div className="mt-4 p-2.5 bg-orange-50/60 dark:bg-orange-950/20 rounded-2xl flex items-center justify-around text-xs font-bold">
                  <div>
                    <div className="text-slate-400 text-[10px]">Points</div>
                    <div className="text-slate-900 dark:text-white">{dataset[2].score.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Tests</div>
                    <div className="text-slate-900 dark:text-white">{dataset[2].testsCompleted}</div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Search & Filter Bar */}
          <Card className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates by name or board..."
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="all">All Classes</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 10">Class 10</option>
              <option value="Class 11">Class 11</option>
              <option value="Class 12">Class 12</option>
              <option value="MDCAT">MDCAT</option>
              <option value="ECAT">ECAT</option>
            </select>
          </Card>

          {/* Real Leaderboard Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-16">Rank</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4 text-center">Board / Level</th>
                    <th className="py-3.5 px-4 text-center">Tests Taken</th>
                    <th className="py-3.5 px-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {paginatedUsers.map((user) => {
                    const isYou = Boolean(user.isCurrentStudent);
                    return (
                      <tr
                        key={`${user.rank}-${user.name}`}
                        className={`transition-colors ${
                          isYou
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 font-bold border-l-4 border-blue-600'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-black">
                          {user.rank === 1 ? (
                            <span className="text-base">🥇</span>
                          ) : user.rank === 2 ? (
                            <span className="text-base">🥈</span>
                          ) : user.rank === 3 ? (
                            <span className="text-base">🥉</span>
                          ) : (
                            <span className="text-slate-500">#{user.rank}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{user.avatar || '🎓'}</span>
                            <div>
                              <div className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isYou && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-600 text-white font-black">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {user.city}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {user.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                          {user.testsCompleted}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white text-sm">
                          {user.score.toLocaleString()} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} students
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-bold text-slate-700 dark:text-slate-300 px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
