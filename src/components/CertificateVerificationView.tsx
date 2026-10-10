import React, { useEffect, useState } from 'react';
import { Award, AlertTriangle, CheckCircle, Search, ShieldCheck, Download, ExternalLink, Calendar, BookOpen, User, Percent, Sparkles, Loader2 } from 'lucide-react';
import { exportCertificateToPDF } from '../utils/watermark';
import { useSiteSettings } from '../context/SiteSettingsContext';

export const CertificateVerificationView: React.FC = () => {
  const { siteName, logoUrl, logoAlt, tagline } = useSiteSettings();
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');

  // Extract certificate ID from path parameter or URL query param (?id=...)
  const getUrlCertificateId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('id');
    if (queryId) return queryId;

    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart && lastPart !== 'verify' && lastPart !== 'verify-certificate' ? lastPart : '';
  };

  const initialCertId = getUrlCertificateId();

  const verifyCert = async (targetId: string) => {
    if (!targetId || targetId.trim().length === 0) {
      setLoading(false);
      setError('Please enter a Certificate ID to verify.');
      return;
    }

    setLoading(true);
    setError(null);
    setCert(null);

    try {
      const response = await fetch(`/api/certificates/verify/${encodeURIComponent(targetId.trim())}`);
      const data = await response.json();
      if (data.verified) {
        setCert(data);
      } else {
        setError(data.error || `Certificate record not found in ${siteName} registry.`);
      }
    } catch (err) {
      setError('Failed to connect to verification registry. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCertId) {
      setSearchId(initialCertId);
      verifyCert(initialCertId);
    } else {
      setLoading(false);
    }
  }, [initialCertId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      window.history.pushState({}, '', `/verify/${encodeURIComponent(searchId.trim())}`);
      verifyCert(searchId);
    }
  };

  const isRevoked = cert?.status === 'REVOKED';

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="flex justify-center mb-2">
            <img
              src={logoUrl || "/assets/taleemguru-logo-original.png"}
              alt={logoAlt || `${siteName} Logo`}
              className="h-16 sm:h-20 w-auto object-contain"
              onError={(e) => {
                // Fallback text logo if image unavailable
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {siteName} Pakistan
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Certificate Verification Registry
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {tagline}
            </p>
          </div>

          {/* Certificate ID Search Form */}
          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto pt-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Certificate ID (e.g., TG-CERT-...)"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Verify</span>
            </button>
          </form>
        </div>

        {/* Verification Status Banner & Details */}
        {loading && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Verifying record against {siteName} authoritative registry...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-rose-200 dark:border-rose-900/50 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-rose-700 dark:text-rose-400">Verification Failed</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">{error}</p>
          </div>
        )}

        {cert && !loading && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Status Header */}
            <div className={`p-6 rounded-2xl border text-center space-y-2 ${
              isRevoked
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            }`}>
              {isRevoked ? (
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              ) : (
                <ShieldCheck className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
              )}
              <h2 className="text-2xl font-black">
                {isRevoked ? 'Certificate Status: REVOKED' : 'Certificate Authenticated'}
              </h2>
              <p className="text-xs sm:text-sm font-semibold max-w-md mx-auto">
                {isRevoked
                  ? 'This certificate was previously issued but has been revoked by administration.'
                  : `This merit certificate is authentic and recorded in the ${siteName} online evaluation database.`}
              </p>
            </div>

            {/* Candidate & Test Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-500" /> Student Name
                </span>
                <p className="text-base font-black text-slate-900 dark:text-white">{cert.studentName}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Assessment Title
                </span>
                <p className="text-base font-black text-slate-900 dark:text-white">{cert.testName}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-500" /> Score & Percentage
                </span>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {cert.score} / {cert.totalMarks} ({cert.percentage}%) — Grade {cert.grade}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Issue Date
                </span>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Metadata Strip */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Certificate Identifier:</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                  {cert.certificateId}
                </p>
              </div>

              {!isRevoked && (
                <button
                  onClick={() =>
                    exportCertificateToPDF({
                      id: cert.certificateId,
                      studentName: cert.studentName,
                      testName: cert.testName,
                      score: cert.score,
                      totalMarks: cert.totalMarks,
                      percentage: cert.percentage,
                      grade: cert.grade,
                      issueDate: cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('en-GB') : '',
                      certificateNumber: cert.certificateId,
                      verificationUrl: cert.verificationUrl || `https://taleemguru.pk/verify/${cert.certificateId}`,
                    })
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Certificate PDF</span>
                </button>
              )}
            </div>

            {/* Footer Branding Guarantee */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold">TaleemGuru.pk Academic Document Registry</p>
              <p>Learn. Practice. Test. Improve. • https://taleemguru.pk</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

