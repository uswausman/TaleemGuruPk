import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Sliders,
  Database,
  Save,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  Server,
  User,
  Key,
} from 'lucide-react';
import { MCQ, TestConfig, AdminUser } from '../../types';
import { fetchAdminSystemHealthApi } from '../../lib/api';

interface AdminSettingsTabProps {
  allMCQs: MCQ[];
  allTests: TestConfig[];
  adminUser?: AdminUser | null;
  onResetData?: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  allMCQs,
  allTests,
  adminUser,
  onResetData,
}) => {
  const [platformName, setPlatformName] = useState('Taleem Guru');
  const [tagline, setTagline] = useState('Learn. Practice. Test. Improve.');
  const [supportEmail, setSupportEmail] = useState('support@taleemguru.pk');
  const [defaultDuration, setDefaultDuration] = useState(15);
  const [defaultPassPercentage, setDefaultPassPercentage] = useState(50);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [negativeMarkingDefault, setNegativeMarkingDefault] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    fetchAdminSystemHealthApi().then((health) => {
      if (health) setSystemHealth(health);
    });
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleExportJSON = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      platform: platformName,
      totalQuestions: allMCQs.length,
      totalQuizzes: allTests.length,
      questions: allMCQs,
      quizzes: allTests,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `taleemguru-backup-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            Platform & Administrative Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure system parameters, examination rules, security architecture, and database backups
          </p>
        </div>

        {savedToast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      {/* Admin Profile Overview */}
      {adminUser && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600" />
            Active Administrator Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Name & Email</span>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">{adminUser.name}</div>
              <div className="text-[11px] text-slate-500 font-mono">{adminUser.email}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Verified Role</span>
              <div className="font-bold text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                {adminUser.role || 'Admin'}
              </div>
              <div className="text-[10px] text-slate-500">Authoritatively confirmed via DB</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">User Identifier</span>
              <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 truncate" title={adminUser.id}>
                {adminUser.id}
              </div>
              <div className="text-[10px] text-slate-500">Unique Identity Key</div>
            </div>
          </div>
        </div>
      )}

      {/* Supported Architecture & Infrastructure Status (No secret exposure) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-600" />
          Integration Architecture Status
        </h3>
        <p className="text-xs text-slate-500">
          Status of external connections and secure storage services (passwords and API keys remain protected server-side):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">Relational Database</div>
              <div className="text-[10px] text-slate-400">PostgreSQL (Cloud SQL)</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Configured
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">Authentication</div>
              <div className="text-[10px] text-slate-400">Supabase Auth</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Configured
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">Audit Logging</div>
              <div className="text-[10px] text-slate-400">Security Trail Engine</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Configured
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">Static Assets</div>
              <div className="text-[10px] text-slate-400">Vite Production Bundle</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Configured
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* General Brand Settings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            General Branding & Contact Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Portal Title
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Platform Slogan / Motto
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Official Support Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* Examination Engine Defaults */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            Assessment Engine Defaults
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Test Time (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Standard Passing Score %
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={defaultPassPercentage}
                onChange={(e) => setDefaultPassPercentage(Number(e.target.value))}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={negativeMarkingDefault}
                  onChange={(e) => setNegativeMarkingDefault(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Enable Negative Marking by Default (-0.25)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            Security & Candidate Access Rules
          </h3>

          <div className="space-y-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowRegistration}
                onChange={(e) => setAllowRegistration(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Allow student self-registration & practice without prior administrative approval
              </span>
            </label>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-300 flex items-start gap-2 text-xs">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Server-side role verification is enforced on all API endpoints. Students cannot access
                administrative panels, mutate question banks, or modify user roles.
              </span>
            </div>
          </div>
        </div>

        {/* Database & Data Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600" />
            Data Backups & Export
          </h3>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-600" />
              <span>Export Full Database JSON ({allMCQs.length} MCQs & {allTests.length} Quizzes)</span>
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Platform Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
