import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Shield,
  Save,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Server,
  User,
  Image as ImageIcon,
  Search,
  Share2,
  Layout,
  Home,
  FileText,
  Palette,
  PhoneCall,
  Scale,
  BarChart3,
  Upload,
  Trash2,
  RotateCcw,
  Check,
  Eye,
  ExternalLink,
  Info,
  Lock,
} from 'lucide-react';
import { MCQ, TestConfig, AdminUser } from '../../types';
import {
  fetchAdminSettingsApi,
  saveAdminSettingsApi,
  uploadAdminSettingAssetApi,
  fetchAdminSystemHealthApi,
} from '../../lib/api';
import { useSiteSettings, parseBrandNameParts } from '../../context/SiteSettingsContext';
import { DEFAULT_SITE_SETTINGS } from '../../data/defaultSettings';

interface AdminSettingsTabProps {
  allMCQs: MCQ[];
  allTests: TestConfig[];
  adminUser?: AdminUser | null;
  onResetData?: () => void;
}

export type SettingsCategoryTab =
  | 'general'
  | 'branding'
  | 'seo'
  | 'header'
  | 'homepage'
  | 'footer'
  | 'social'
  | 'theme'
  | 'contact'
  | 'legal'
  | 'analytics';

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  allMCQs,
  allTests,
  adminUser,
  onResetData,
}) => {
  const { refreshSettings: reloadContextSettings, updateLocalSettings } = useSiteSettings();

  const [activeSubTab, setActiveSubTab] = useState<SettingsCategoryTab>('general');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // File input refs for image uploads
  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);

  // Load all settings from server database
  const loadSettings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchAdminSettingsApi();
      if (res.success && res.settings) {
        setFormData(res.settings);
      } else {
        // Fallback to default values
        const fallback: Record<string, string> = {};
        Object.entries(DEFAULT_SITE_SETTINGS).forEach(([k, v]) => {
          fallback[k] = v.value;
        });
        setFormData(fallback);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load site settings from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    fetchAdminSystemHealthApi().then((health) => {
      if (health) setSystemHealth(health);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'general.websiteName' || key === 'branding.siteName' || key === 'site_name') {
        next['branding.siteName'] = value;
        next['general.websiteName'] = value;
        next['site_name'] = value;
      } else if (key === 'branding.siteNamePrimaryColor' || key === 'site_name_primary_color') {
        next['branding.siteNamePrimaryColor'] = value;
        next['site_name_primary_color'] = value;
      } else if (key === 'branding.siteNameSecondaryColor' || key === 'site_name_secondary_color') {
        next['branding.siteNameSecondaryColor'] = value;
        next['site_name_secondary_color'] = value;
      }
      return next;
    });
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const authoritativeSiteName =
        formData['site_name'] ||
        formData['general.websiteName'] ||
        formData['branding.siteName'] ||
        'Taleem Guru';
      const primaryColor =
        formData['site_name_primary_color'] ||
        formData['branding.siteNamePrimaryColor'] ||
        '#FFFFFF';
      const secondaryColor =
        formData['site_name_secondary_color'] ||
        formData['branding.siteNameSecondaryColor'] ||
        '#3B82F6';

      const payload = {
        ...formData,
        'general.websiteName': authoritativeSiteName,
        'branding.siteName': authoritativeSiteName,
        'site_name': authoritativeSiteName,
        'branding.siteNamePrimaryColor': primaryColor,
        'site_name_primary_color': primaryColor,
        'branding.siteNameSecondaryColor': secondaryColor,
        'site_name_secondary_color': secondaryColor,
      };

      const res = await saveAdminSettingsApi(payload);
      if (res.success) {
        setSaveSuccess(true);
        if (res.settings) {
          const syncedSettings = {
            ...res.settings,
            'general.websiteName': authoritativeSiteName,
            'branding.siteName': authoritativeSiteName,
            'site_name': authoritativeSiteName,
            'branding.siteNamePrimaryColor': primaryColor,
            'site_name_primary_color': primaryColor,
            'branding.siteNameSecondaryColor': secondaryColor,
            'site_name_secondary_color': secondaryColor,
          };
          setFormData(syncedSettings);
          updateLocalSettings(syncedSettings);
        }
        await reloadContextSettings();
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(res.error || 'Failed to save settings to database.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCategoryDefaults = (category: SettingsCategoryTab) => {
    const updated = { ...formData };
    Object.entries(DEFAULT_SITE_SETTINGS).forEach(([k, def]) => {
      if (def.category === category) {
        updated[k] = def.value;
      }
    });
    setFormData(updated);
  };

  const handleFileUpload = async (
    fieldKey: string,
    file: File,
    maxSizeMb = 5
  ) => {
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      setErrorMessage(`File exceeds maximum size limit of ${maxSizeMb}MB.`);
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpg|jpeg|svg|webp|ico)$/i)) {
      setErrorMessage('Invalid file format. Please upload PNG, JPG, SVG, WebP, or ICO images.');
      return;
    }

    setUploadingField(fieldKey);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await uploadAdminSettingAssetApi(base64, file.name);
      setUploadingField(null);

      if (res.success && res.url) {
        handleChange(fieldKey, res.url);
      } else {
        setErrorMessage(res.error || 'Failed to upload asset file.');
      }
    };
    reader.onerror = () => {
      setUploadingField(null);
      setErrorMessage('Error reading image file.');
    };
    reader.readAsDataURL(file);
  };

  const categories: { id: SettingsCategoryTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Globe className="w-4 h-4" /> },
    { id: 'branding', label: 'Branding & Identity', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'seo', label: 'SEO & Meta', icon: <Search className="w-4 h-4" /> },
    { id: 'header', label: 'Header & Nav', icon: <Layout className="w-4 h-4" /> },
    { id: 'homepage', label: 'Homepage', icon: <Home className="w-4 h-4" /> },
    { id: 'footer', label: 'Footer', icon: <FileText className="w-4 h-4" /> },
    { id: 'social', label: 'Social Media', icon: <Share2 className="w-4 h-4" /> },
    { id: 'theme', label: 'Theme & Colors', icon: <Palette className="w-4 h-4" /> },
    { id: 'contact', label: 'Contact & Support', icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'legal', label: 'Legal Pages', icon: <Scale className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Loading Site Settings Management...
        </h3>
        <p className="text-xs text-slate-500">
          Fetching authoritative configuration parameters from Cloud SQL database...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[85vh] flex flex-col min-h-0">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              CENTRALIZED SYSTEM
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">Real DB Persistence</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 mt-1">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Site Settings Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure global platform identity, branding logos, SEO tags, theme palettes, and public metadata
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings Saved & Applied Live!</span>
            </div>
          )}

          <button
            onClick={() => handleResetCategoryDefaults(activeSubTab)}
            type="button"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Reset active tab fields to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset {categories.find((c) => c.id === activeSubTab)?.label} Defaults</span>
          </button>

          <button
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            type="button"
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving Changes...' : 'Save Site Settings'}</span>
          </button>
        </div>
      </div>

      {/* Global Alert Banners */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Category Navigation Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {categories.map((cat) => {
            const isActive = activeSubTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveSubTab(cat.id)}
                type="button"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Form Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4">
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* TAB 1: GENERAL WEBSITE SETTINGS */}
          {activeSubTab === 'general' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  General Website & Platform Parameters
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage core site identity, support contact parameters, localization, and system status modes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Website Name
                  </label>
                  <input
                    type="text"
                    value={formData['general.websiteName'] || ''}
                    onChange={(e) => handleChange('general.websiteName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                    placeholder="TaleemGuru"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Primary platform brand name</span>
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Platform Tagline
                  </label>
                  <input
                    type="text"
                    value={formData['general.tagline'] || ''}
                    onChange={(e) => handleChange('general.tagline', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                    placeholder="Learn. Practice. Test. Improve."
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Short brand slogan displayed in header/footer</span>
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Website Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData['general.websiteDescription'] || ''}
                    onChange={(e) => handleChange('general.websiteDescription', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Pakistan's Premier Educational Platform for Board Exams, Entry Tests & Competitive Prep"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Site Name Primary Color (TALEEM)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData['branding.siteNamePrimaryColor'] || '#FFFFFF'}
                      onChange={(e) => handleChange('branding.siteNamePrimaryColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData['branding.siteNamePrimaryColor'] || '#FFFFFF'}
                      onChange={(e) => handleChange('branding.siteNamePrimaryColor', e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Site Name Secondary Color (GURU)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData['branding.siteNameSecondaryColor'] || '#3B82F6'}
                      onChange={(e) => handleChange('branding.siteNameSecondaryColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData['branding.siteNameSecondaryColor'] || '#3B82F6'}
                      onChange={(e) => handleChange('branding.siteNameSecondaryColor', e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 p-4 bg-slate-950 rounded-2xl border border-slate-700 text-center">
                  <label className="font-bold text-slate-200 block mb-3">Live Preview</label>
                  <span className="font-black text-3xl tracking-tight uppercase">
                    <span style={{ color: formData['branding.siteNamePrimaryColor'] || '#FFFFFF' }}>TALEEM</span>
                    <span style={{ color: formData['branding.siteNameSecondaryColor'] || '#3B82F6' }}> GURU</span>
                  </span>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                        handleChange('branding.siteNamePrimaryColor', '#FFFFFF');
                        handleChange('branding.siteNameSecondaryColor', '#3B82F6');
                    }}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs"
                  >
                    Reset to Default Colors
                  </button>
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData['general.contactEmail'] || ''}
                    onChange={(e) => handleChange('general.contactEmail', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="info@taleemguru.pk"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={formData['general.supportEmail'] || ''}
                    onChange={(e) => handleChange('general.supportEmail', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="support@taleemguru.pk"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData['general.contactPhone'] || ''}
                    onChange={(e) => handleChange('general.contactPhone', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="+92 300 1234567"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    WhatsApp Helpline Number
                  </label>
                  <input
                    type="text"
                    value={formData['general.whatsappNumber'] || ''}
                    onChange={(e) => handleChange('general.whatsappNumber', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="+92 300 1234567"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    value={formData['general.address'] || ''}
                    onChange={(e) => handleChange('general.address', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="Lahore, Punjab, Pakistan"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={formData['general.timezone'] || ''}
                    onChange={(e) => handleChange('general.timezone', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="Asia/Karachi"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Default Country
                  </label>
                  <input
                    type="text"
                    value={formData['general.defaultCountry'] || ''}
                    onChange={(e) => handleChange('general.defaultCountry', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="Pakistan"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={formData['general.currency'] || ''}
                    onChange={(e) => handleChange('general.currency', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="PKR"
                  />
                </div>

                {/* Maintenance Mode Controls */}
                <div className="md:col-span-2 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-xs block">
                        Maintenance Mode
                      </span>
                      <span className="text-[11px] text-slate-500">
                        When enabled, visitors will see a maintenance notice banner
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          'general.maintenanceMode',
                          formData['general.maintenanceMode'] === 'true' ? 'false' : 'true'
                        )
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formData['general.maintenanceMode'] === 'true' ? 'bg-amber-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          formData['general.maintenanceMode'] === 'true' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {formData['general.maintenanceMode'] === 'true' && (
                    <div className="animate-in fade-in duration-200">
                      <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Maintenance Notice Message
                      </label>
                      <input
                        type="text"
                        value={formData['general.maintenanceMessage'] || ''}
                        onChange={(e) => handleChange('general.maintenanceMessage', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING & IDENTITY */}
          {activeSubTab === 'branding' && (() => {
            const currentSiteName =
              formData['site_name'] ||
              formData['branding.siteName'] ||
              formData['general.websiteName'] ||
              'Taleem Guru';
            const currentPrimaryColor =
              formData['site_name_primary_color'] ||
              formData['branding.siteNamePrimaryColor'] ||
              '#FFFFFF';
            const currentSecondaryColor =
              formData['site_name_secondary_color'] ||
              formData['branding.siteNameSecondaryColor'] ||
              '#3B82F6';
            const brandParts = parseBrandNameParts(currentSiteName);

            return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                  Branding, Identity & Visual Assets
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure platform site name typography, dual-color header branding, official logos, and favicon icons.
                </p>
              </div>

              {/* SITE NAME & TWO-COLOR BRANDING CONFIGURATION CARD */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-700/80 shadow-xl text-white space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-blue-400" />
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        Site Name & Two-Color Branding Configuration
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        Authoritative
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Customize the site name and the two distinct colors for the Primary and Secondary text segments across the Header, Footer, and Platform assets.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleChange('branding.siteName', 'Taleem Guru');
                      handleChange('branding.siteNamePrimaryColor', '#FFFFFF');
                      handleChange('branding.siteNameSecondaryColor', '#3B82F6');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center border border-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Default Colors
                  </button>
                </div>

                {/* LIVE PREVIEW BOX */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      Live Branding Preview
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Synchronized live preview (Header & Footer match this)
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl bg-slate-950/95 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                    {/* Visual Brand Preview matching Header/Footer */}
                    <div className="flex items-center gap-3.5 select-none">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden shrink-0">
                        <img
                          src={formData['branding.logoLight'] || '/assets/taleemguru-logo-original.png'}
                          alt="Brand Logo"
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as any).src = '/assets/taleemguru-logo-original.png';
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-2xl font-black tracking-tight uppercase transition-colors">
                          <span style={{ color: currentPrimaryColor }}>
                            {brandParts.primary.toUpperCase()}
                          </span>
                          {brandParts.secondary && (
                            <span style={{ color: currentSecondaryColor }}>
                              {' '}{brandParts.secondary.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                          {formData['branding.tagline'] || 'Learn. Practice. Test. Improve.'}
                        </p>
                      </div>
                    </div>

                    {/* Color Badges & Diagnostics */}
                    <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs" style={{ backgroundColor: currentPrimaryColor }} />
                        <span className="text-white font-mono text-[11px] font-bold">{currentPrimaryColor}</span>
                        <span className="text-slate-400 text-[10px]">({brandParts.primary.toUpperCase()})</span>
                      </div>
                      <span className="text-slate-600">|</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs" style={{ backgroundColor: currentSecondaryColor }} />
                        <span className="text-blue-400 font-mono text-[11px] font-bold">{currentSecondaryColor}</span>
                        <span className="text-slate-400 text-[10px]">({brandParts.secondary.toUpperCase() || 'None'})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORM INPUTS: Site Name, Primary Color, Secondary Color */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Site Name text input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 block">
                      Site Name
                    </label>
                    <input
                      type="text"
                      value={currentSiteName}
                      onChange={(e) => handleChange('branding.siteName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold text-xs focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Taleem Guru"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Primary: <strong className="text-white">{brandParts.primary}</strong></span>
                      <span>Secondary: <strong className="text-blue-400">{brandParts.secondary || '(None)'}</strong></span>
                    </div>
                  </div>

                  {/* Site Name Color (Primary) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span>Site Name Color (Primary)</span>
                      <span className="text-[10px] text-slate-300 font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                        {brandParts.primary.toUpperCase()}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative shrink-0">
                        <input
                          type="color"
                          value={currentPrimaryColor}
                          onChange={(e) => handleChange('branding.siteNamePrimaryColor', e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-slate-900 p-0.5"
                        />
                      </div>
                      <input
                        type="text"
                        value={currentPrimaryColor}
                        onChange={(e) => handleChange('branding.siteNamePrimaryColor', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-xs uppercase"
                        placeholder="#FFFFFF"
                        maxLength={7}
                      />
                      <button
                        type="button"
                        onClick={() => handleChange('branding.siteNamePrimaryColor', '#FFFFFF')}
                        title="Set to Default White (#FFFFFF)"
                        className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold shrink-0 border border-slate-700 transition-colors"
                      >
                        White
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Default: <code className="text-slate-200 font-bold">#FFFFFF</code> (White)
                    </span>
                  </div>

                  {/* Site Name Secondary Color */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                      <span>Site Name Secondary Color</span>
                      <span className="text-[10px] text-blue-300 font-mono uppercase bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800/40">
                        {brandParts.secondary.toUpperCase() || 'GURU'}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative shrink-0">
                        <input
                          type="color"
                          value={currentSecondaryColor}
                          onChange={(e) => handleChange('branding.siteNameSecondaryColor', e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-slate-900 p-0.5"
                        />
                      </div>
                      <input
                        type="text"
                        value={currentSecondaryColor}
                        onChange={(e) => handleChange('branding.siteNameSecondaryColor', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono text-xs uppercase"
                        placeholder="#3B82F6"
                        maxLength={7}
                      />
                      <button
                        type="button"
                        onClick={() => handleChange('branding.siteNameSecondaryColor', '#3B82F6')}
                        title="Set to Taleem Guru Blue (#3B82F6)"
                        className="px-2.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shrink-0 transition-colors"
                      >
                        Blue
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Default: <code className="text-blue-400 font-bold">#3B82F6</code> (Taleem Guru Blue)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Light Mode Logo */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Main / Light-Mode Logo
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Recommended: PNG/SVG, 512×512px, transparent background
                      </span>
                    </div>
                    {uploadingField === 'branding.logoLight' && (
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border p-2 shrink-0">
                      {formData['branding.logoLight'] ? (
                        <img
                          src={formData['branding.logoLight']}
                          alt="Light Logo Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as any).src = '/assets/taleemguru-logo-original.png';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={formData['branding.logoLight'] || ''}
                        onChange={(e) => handleChange('branding.logoLight', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono"
                        placeholder="/assets/taleemguru-logo-original.png"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          ref={lightLogoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload('branding.logoLight', e.target.files[0]);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => lightLogoInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload File
                        </button>
                        {formData['branding.logoLight'] && (
                          <button
                            type="button"
                            onClick={() => handleChange('branding.logoLight', '')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 text-[11px] font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dark Mode Logo */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Dark-Mode Logo
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Optimized for dark slate headers
                      </span>
                    </div>
                    {uploadingField === 'branding.logoDark' && (
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800 text-white">
                    <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 p-2 shrink-0">
                      {formData['branding.logoDark'] ? (
                        <img
                          src={formData['branding.logoDark']}
                          alt="Dark Logo Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as any).src = '/assets/taleemguru-logo-original.png';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={formData['branding.logoDark'] || ''}
                        onChange={(e) => handleChange('branding.logoDark', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono"
                        placeholder="/assets/taleemguru-logo-original.png"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          ref={darkLogoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload('branding.logoDark', e.target.files[0]);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => darkLogoInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload File
                        </button>
                        {formData['branding.logoDark'] && (
                          <button
                            type="button"
                            onClick={() => handleChange('branding.logoDark', '')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-950 text-rose-400 text-[11px] font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Favicon Browser Tab Icon */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Favicon / Site Icon
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Browser tab icon (32×32px or 64×64px ICO/PNG)
                      </span>
                    </div>
                    {uploadingField === 'branding.favicon' && (
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border p-2 shrink-0">
                      {formData['branding.favicon'] ? (
                        <img
                          src={formData['branding.favicon']}
                          alt="Favicon Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={formData['branding.favicon'] || ''}
                        onChange={(e) => handleChange('branding.favicon', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono"
                        placeholder="/assets/taleemguru-logo-original.png"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload('branding.favicon', e.target.files[0]);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => faviconInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Favicon
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Brand Metadata */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Logo Alt Description Text
                    </label>
                    <input
                      type="text"
                      value={formData['branding.logoAlt'] || ''}
                      onChange={(e) => handleChange('branding.logoAlt', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      placeholder="TaleemGuru Official Logo"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Accessibility label for image screen readers</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      Short Site Identifier
                    </label>
                    <input
                      type="text"
                      value={formData['branding.shortSiteName'] || ''}
                      onChange={(e) => handleChange('branding.shortSiteName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      placeholder="TaleemGuru"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Used in concise SMS notifications and watermarks</span>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* TAB 3: SEO SETTINGS */}
          {activeSubTab === 'seo' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-600" />
                  Search Engine Optimization (SEO) & Social Cards
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure default Meta tags, canonical production domain, OpenGraph cards, and search console verification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Canonical Production URL
                  </label>
                  <input
                    type="text"
                    value={formData['seo.canonicalUrl'] || 'https://www.taleemguru.pk/'}
                    onChange={(e) => handleChange('seo.canonicalUrl', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-bold"
                    placeholder="https://www.taleemguru.pk/"
                  />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
                    ✓ Canonical URL strictly enforced: https://www.taleemguru.pk/
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Default Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData['seo.defaultMetaTitle'] || ''}
                    onChange={(e) => handleChange('seo.defaultMetaTitle', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="TaleemGuru – Board Exam & Entry Test Preparation"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Meta Keywords
                  </label>
                  <input
                    type="text"
                    value={formData['seo.defaultKeywords'] || ''}
                    onChange={(e) => handleChange('seo.defaultKeywords', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="TaleemGuru, MCQs, Past Papers, BISE Punjab, MDCAT, ECAT"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Default Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData['seo.defaultMetaDescription'] || ''}
                    onChange={(e) => handleChange('seo.defaultMetaDescription', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    OpenGraph Share Title (og:title)
                  </label>
                  <input
                    type="text"
                    value={formData['seo.ogTitle'] || ''}
                    onChange={(e) => handleChange('seo.ogTitle', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Robots Directive
                  </label>
                  <input
                    type="text"
                    value={formData['seo.robots'] || 'index, follow'}
                    onChange={(e) => handleChange('seo.robots', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                {/* OpenGraph Image Upload */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    OpenGraph & Twitter Card Preview Image
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center border overflow-hidden shrink-0">
                      {formData['seo.ogImage'] ? (
                        <img
                          src={formData['seo.ogImage']}
                          alt="OG Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={formData['seo.ogImage'] || ''}
                        onChange={(e) => handleChange('seo.ogImage', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono"
                        placeholder="/assets/taleemguru-logo-original.png"
                      />
                      <input
                        ref={ogImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload('seo.ogImage', e.target.files[0]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => ogImageInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Upload Social Card Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HEADER & NAVIGATION SETTINGS */}
          {activeSubTab === 'header' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layout className="w-5 h-5 text-cyan-600" />
                  Header & Top Navigation Settings
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage primary call-to-action button, navigation visibility, and login options.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Header CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={formData['header.ctaText'] || ''}
                    onChange={(e) => handleChange('header.ctaText', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="Start Practice"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Header CTA Target URL
                  </label>
                  <input
                    type="text"
                    value={formData['header.ctaUrl'] || ''}
                    onChange={(e) => handleChange('header.ctaUrl', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="/tests"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Display Header Logo
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(
                        'header.showLogo',
                        formData['header.showLogo'] === 'false' ? 'true' : 'false'
                      )
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      formData['header.showLogo'] !== 'false' ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                        formData['header.showLogo'] !== 'false' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Show Login Button
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleChange(
                        'header.showLoginBtn',
                        formData['header.showLoginBtn'] === 'false' ? 'true' : 'false'
                      )
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      formData['header.showLoginBtn'] !== 'false' ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                        formData['header.showLoginBtn'] !== 'false' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HOMEPAGE SETTINGS */}
          {activeSubTab === 'homepage' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Home className="w-5 h-5 text-emerald-600" />
                  Homepage Hero & Announcement Banner
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Customize hero copy, action buttons, and active top announcement banner.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Hero Headline
                  </label>
                  <input
                    type="text"
                    value={formData['homepage.heroTitle'] || ''}
                    onChange={(e) => handleChange('homepage.heroTitle', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Hero Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={formData['homepage.heroSubtitle'] || ''}
                    onChange={(e) => handleChange('homepage.heroSubtitle', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Primary CTA Label
                  </label>
                  <input
                    type="text"
                    value={formData['homepage.primaryCtaText'] || ''}
                    onChange={(e) => handleChange('homepage.primaryCtaText', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Primary CTA Link
                  </label>
                  <input
                    type="text"
                    value={formData['homepage.primaryCtaLink'] || ''}
                    onChange={(e) => handleChange('homepage.primaryCtaLink', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                {/* Announcement Banner */}
                <div className="md:col-span-2 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                      Top Announcement Banner
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange(
                          'homepage.showAnnouncement',
                          formData['homepage.showAnnouncement'] === 'false' ? 'true' : 'false'
                        )
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        formData['homepage.showAnnouncement'] !== 'false' ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                          formData['homepage.showAnnouncement'] !== 'false' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                      Announcement Banner Copy
                    </label>
                    <input
                      type="text"
                      value={formData['homepage.announcementText'] || ''}
                      onChange={(e) => handleChange('homepage.announcementText', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FOOTER SETTINGS */}
          {activeSubTab === 'footer' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-rose-600" />
                  Footer & Legal Links Settings
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage footer brand copy, copyright statement, and essential navigation links.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Footer Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData['footer.description'] || ''}
                    onChange={(e) => handleChange('footer.description', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Copyright Notice
                  </label>
                  <input
                    type="text"
                    value={formData['footer.copyrightText'] || ''}
                    onChange={(e) => handleChange('footer.copyrightText', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Privacy Policy URL
                  </label>
                  <input
                    type="text"
                    value={formData['footer.privacyPolicyUrl'] || '/privacy-policy'}
                    onChange={(e) => handleChange('footer.privacyPolicyUrl', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Terms & Conditions URL
                  </label>
                  <input
                    type="text"
                    value={formData['footer.termsUrl'] || '/terms-of-service'}
                    onChange={(e) => handleChange('footer.termsUrl', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Disclaimer URL
                  </label>
                  <input
                    type="text"
                    value={formData['footer.disclaimerUrl'] || '/terms-of-service#disclaimer'}
                    onChange={(e) => handleChange('footer.disclaimerUrl', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SOCIAL MEDIA SETTINGS */}
          {activeSubTab === 'social' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-600" />
                  Official Social Media Channels
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure social profile links. Only non-empty links will be displayed in website headers/footers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Facebook Page
                  </label>
                  <input
                    type="text"
                    value={formData['social.facebook'] || ''}
                    onChange={(e) => handleChange('social.facebook', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="https://facebook.com/taleemgurupk"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={formData['social.instagram'] || ''}
                    onChange={(e) => handleChange('social.instagram', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="https://instagram.com/taleemgurupk"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    YouTube Channel
                  </label>
                  <input
                    type="text"
                    value={formData['social.youtube'] || ''}
                    onChange={(e) => handleChange('social.youtube', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="https://youtube.com/@taleemgurupk"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    TikTok Profile
                  </label>
                  <input
                    type="text"
                    value={formData['social.tiktok'] || ''}
                    onChange={(e) => handleChange('social.tiktok', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="https://tiktok.com/@taleemgurupk"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    X / Twitter Handle
                  </label>
                  <input
                    type="text"
                    value={formData['social.twitter'] || ''}
                    onChange={(e) => handleChange('social.twitter', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="https://x.com/taleemgurupk"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    LinkedIn Page
                  </label>
                  <input
                    type="text"
                    value={formData['social.linkedin'] || ''}
                    onChange={(e) => handleChange('social.linkedin', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="https://linkedin.com/company/taleemguru"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Telegram Group / Channel
                  </label>
                  <input
                    type="text"
                    value={formData['social.telegram'] || ''}
                    onChange={(e) => handleChange('social.telegram', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="https://t.me/taleemgurupk"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    WhatsApp Official Channel Link
                  </label>
                  <input
                    type="text"
                    value={formData['social.whatsapp'] || ''}
                    onChange={(e) => handleChange('social.whatsapp', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                    placeholder="https://wa.me/923001234567"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: THEME & COLOR PALETTE SETTINGS */}
          {activeSubTab === 'theme' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-600" />
                  Theme, Primary Colors & UI Radius
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust primary brand accent colors dynamically without altering core TaleemGuru layout structure.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData['theme.primaryColor'] || '#2563eb'}
                      onChange={(e) => handleChange('theme.primaryColor', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={formData['theme.primaryColor'] || '#2563eb'}
                      onChange={(e) => handleChange('theme.primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData['theme.secondaryColor'] || '#4f46e5'}
                      onChange={(e) => handleChange('theme.secondaryColor', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={formData['theme.secondaryColor'] || '#4f46e5'}
                      onChange={(e) => handleChange('theme.secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData['theme.accentColor'] || '#06b6d4'}
                      onChange={(e) => handleChange('theme.accentColor', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={formData['theme.accentColor'] || '#06b6d4'}
                      onChange={(e) => handleChange('theme.accentColor', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: CONTACT & SUPPORT */}
          {activeSubTab === 'contact' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-blue-600" />
                  Candidate Contact & Help Message
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure custom message text displayed to students on contact and support portals.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Student Support Notice Message
                  </label>
                  <textarea
                    rows={3}
                    value={formData['contact.supportMessage'] || ''}
                    onChange={(e) => handleChange('contact.supportMessage', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: LEGAL PAGES */}
          {activeSubTab === 'legal' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-600" />
                  Legal Statements & Cookie Consent
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure candidate cookie consent notice and disclaimer copy.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Cookie Banner Consent Copy
                  </label>
                  <input
                    type="text"
                    value={formData['legal.cookieConsentText'] || ''}
                    onChange={(e) => handleChange('legal.cookieConsentText', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Platform Legal Disclaimer
                  </label>
                  <textarea
                    rows={3}
                    value={formData['legal.disclaimerText'] || ''}
                    onChange={(e) => handleChange('legal.disclaimerText', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: ANALYTICS & SEARCH VERIFICATION */}
          {activeSubTab === 'analytics' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                  Analytics Measurement & Search Console Verification
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Public tracking IDs and Search Console meta codes. Private secrets & server keys are strictly isolated server-side.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Google Analytics GA4 Measurement ID
                  </label>
                  <input
                    type="text"
                    value={formData['analytics.gaMeasurementId'] || ''}
                    onChange={(e) => handleChange('analytics.gaMeasurementId', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Google Search Console Verification Code
                  </label>
                  <input
                    type="text"
                    value={formData['analytics.googleSearchConsole'] || ''}
                    onChange={(e) => handleChange('analytics.googleSearchConsole', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    placeholder="google-site-verification=..."
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Meta / Facebook Pixel ID
                  </label>
                  <input
                    type="text"
                    value={formData['analytics.facebookPixelId'] || ''}
                    onChange={(e) => handleChange('analytics.facebookPixelId', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* System Health Overview Card */}
        {systemHealth && (
          <div className="mt-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              Infrastructure & Connection Diagnostics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Relational Database</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {systemHealth.database?.type || 'PostgreSQL (Cloud SQL)'} Connected
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Auth Provider</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {systemHealth.auth?.provider || 'Supabase Auth'} Verified
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">System Uptime</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold mt-0.5 block">
                  {Math.floor((systemHealth.uptime || 0) / 3600)}h {Math.floor(((systemHealth.uptime || 0) % 3600) / 60)}m
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
