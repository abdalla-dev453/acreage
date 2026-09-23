import { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Sun, Moon, Monitor, Globe, User as UserIcon, Shield, HelpCircle, LifeBuoy, Globe as GlobeIcon, Save, RotateCw, LogOut } from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { settings, updateSetting, resetSettings } = useContext(SettingsContext);
  const { user, logout } = useContext(AuthContext);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState({});
  const [feedback, setFeedback] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [phoneValue, setPhoneValue] = useState(user?.phone_number || '');
  const [locationValue, setLocationValue] = useState(user?.location || '');
  const [showFAQ, setShowFAQ] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState(false);

  useEffect(() => {
    if (user) {
      setPasswordForm((prev) => ({ ...prev, current_password: '' }));
      setPhoneValue(user?.phone_number || '');
      setLocationValue(user?.location || '');
    }
  }, [user]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleToggle = async (key) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await updateSetting(key, !settings[key]);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!feedback.trim()) return;
    try {
      await API.post('/settings/feedback', { message: feedback, rating: feedbackRating });
      setFeedbackNotice(t('settings.feedbackThanks'));
      setFeedback('');
      setFeedbackRating(5);
    } catch (err) {
      setFeedbackNotice(err.response?.data?.message || t('settings.feedbackFailed'));
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError(t('settings.passwordMismatch'));
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError(t('settings.passwordTooShort'));
      return;
    }
    try {
      await API.put('/settings/account', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordNotice(t('settings.passwordChanged'));
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || t('settings.passwordChangeFailed'));
    }
  };

  const deactivateAccount = async () => {
    if (!window.confirm(t('settings.deactivateConfirm'))) return;
    try {
      await API.delete('/settings/account');
      logout();
    } catch (err) {
      alert(err.response?.data?.message || t('settings.deactivateFailed'));
    }
  };

  const updatePhone = async () => {
    try {
      await API.put('/settings/account', { phone_number: phoneValue });
      setEditingPhone(false);
      handleSave();
    } catch (err) {
      alert(err.response?.data?.message || t('settings.accountUpdateFailed'));
    }
  };

  const updateLocation = async () => {
    try {
      await API.put('/settings/account', { location: locationValue });
      setEditingLocation(false);
      handleSave();
    } catch (err) {
      alert(err.response?.data?.message || t('settings.accountUpdateFailed'));
    }
  };

  const tabs = [
    { id: 'general', label: t('settings.tabGeneral'), icon: Settings },
    { id: 'account', label: t('settings.tabAccount'), icon: UserIcon },
    { id: 'security', label: t('settings.tabSecurity'), icon: Shield },
    { id: 'help', label: t('settings.tabHelp'), icon: LifeBuoy },
  ];

  const themeOptions = [
    { value: 'light', label: t('settings.themeLight'), icon: Sun, desc: t('settings.themeLightDesc') },
    { value: 'dark', label: t('settings.themeDark'), icon: Moon, desc: t('settings.themeDarkDesc') },
    { value: 'system', label: t('settings.themeSystem'), icon: Monitor, desc: t('settings.themeSystemDesc') },
  ];

  const languageOptions = [
    { value: 'en', label: t('languages.english') },
    { value: 'sw', label: t('languages.swahili') },
  ];

  const SettingCard = ({ title, description, children }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm transition-colors">
      <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{description}</p>
      {children}
    </div>
  );

  const ToggleSwitch = ({ settingKey, label, desc }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
      <div className="flex-1 min-w-0 pr-3">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</label>
        <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => handleToggle(settingKey)}
        disabled={loading[settingKey]}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
          settings[settingKey] ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        } disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          settings[settingKey] ? 'translate-x-5.5' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );

  const fontSizeOptions = [
    { value: 'small', label: t('settings.fontSizeSmall') },
    { value: 'normal', label: t('settings.fontSizeNormal') },
    { value: 'large', label: t('settings.fontSizeLarge') },
  ];

  return (
    <div className="space-y-6 w-full pb-16">
      <SEO title={`${t('settings.title')} | Acreage`} description="Manage your theme, language, notification, and website preferences." />
      <Navbar title={t('settings.title')} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-green-600 dark:text-emerald-400" />
          {t('settings.systemConfiguration')}
        </h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 px-3 py-1 rounded-lg">
              {t('settings.saved')}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> {t('settings.saveSettings')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 rounded-xl overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-emerald-300 shadow-sm border border-green-100/60 dark:border-slate-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'general' && (
          <>
            <SettingCard
              title={t('settings.theme')}
              description={t('settings.themeDescription')}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = settings.theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateSetting('theme', opt.value)}
                      className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1.5" />
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 block">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </SettingCard>

            <SettingCard
              title={t('settings.language')}
              description={t('settings.languageDescription')}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                <select
                  value={settings.language}
                  onChange={(e) => updateSetting('language', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 text-slate-900 dark:text-white"
                >
                  {languageOptions.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </SettingCard>

            <SettingCard
              title={t('settings.notifications')}
              description={t('settings.notificationsDescription')}
            >
              <ToggleSwitch
                settingKey="notifications"
                label={t('settings.pushNotifications')}
                desc={settings.notifications ? t('settings.pushNotificationsOn') : t('settings.pushNotificationsOff')}
              />
              <ToggleSwitch
                settingKey="sound"
                label={t('settings.notificationSound')}
                desc={settings.sound ? t('settings.notificationSoundOn') : t('settings.notificationSoundOff')}
              />
            </SettingCard>

            <SettingCard
              title={t('settings.display')}
              description={t('settings.displayDescription')}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('settings.fontSize')}</label>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/80 rounded-xl p-1 border border-slate-200/50 dark:border-slate-600">
                    {fontSizeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateSetting('fontSize', opt.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          settings.fontSize === opt.value
                            ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {opt.label === 'small' ? 'A' : opt.label === 'normal' ? 'Aa' : 'AaA'}
                      </button>
                    ))}
                  </div>
                </div>
                <ToggleSwitch
                  settingKey="compactMode"
                  label={t('settings.compactMode')}
                  desc={t('settings.compactModeDesc')}
                />
              </div>
            </SettingCard>

            <SettingCard
              title={t('settings.websiteUpdates')}
              description={t('settings.websiteUpdatesDescription')}
            >
              <ToggleSwitch
                settingKey="featureAnnouncements"
                label={t('settings.featureAnnouncements')}
                desc={t('settings.featureAnnouncementsDesc')}
              />
              <ToggleSwitch
                settingKey="betaProgram"
                label={t('settings.betaProgram')}
                desc={t('settings.betaProgramDesc')}
              />
              {settings.betaProgram && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>{t('settings.betaProgramActive')}</strong> {t('settings.betaProgramActiveDesc')}
                  </p>
                </div>
              )}
            </SettingCard>
          </>
        )}

        {activeTab === 'account' && (
          <div className="space-y-4">
            <SettingCard
              title={t('settings.accountInfo')}
              description={t('settings.accountInfoDescription')}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <div className="w-10 h-10 bg-green-600 dark:bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center">
                    {user?.username?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{user?.username}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/60 gap-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('settings.phone')}</label>
                    {editingPhone ? (
                      <input
                        type="text"
                        value={phoneValue}
                        onChange={(e) => setPhoneValue(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                        placeholder={t('settings.phonePlaceholder')}
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{user?.phone_number || t('settings.notSet')}</p>
                    )}
                  </div>
                  {editingPhone ? (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={updatePhone}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                      >
                        {t('settings.save')}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPhone(false);
                          setPhoneValue(user?.phone_number || '');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        {t('settings.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingPhone(true)}
                      className="self-start sm:self-center px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                    >
                      {t('settings.edit')}
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/60 gap-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('settings.location')}</label>
                    {editingLocation ? (
                      <input
                        type="text"
                        value={locationValue}
                        onChange={(e) => setLocationValue(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                        placeholder={t('settings.locationPlaceholder')}
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{user?.location || t('settings.notSet')}</p>
                    )}
                  </div>
                  {editingLocation ? (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={updateLocation}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                      >
                        {t('settings.save')}
                      </button>
                      <button
                        onClick={() => {
                          setEditingLocation(false);
                          setLocationValue(user?.location || '');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        {t('settings.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingLocation(true)}
                      className="self-start sm:self-center px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                    >
                      {t('settings.edit')}
                    </button>
                  )}
                </div>
                <ToggleSwitch
                  settingKey="privateAccount"
                  label={t('settings.privateAccount')}
                  desc={t('settings.privateAccountDesc')}
                />
              </div>
            </SettingCard>

            <SettingCard
              title="Danger Zone"
              description="Actions that permanently affect your account."
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <label className="text-xs font-bold text-rose-600 dark:text-rose-400">Deactivate Account</label>
                    <p className="text-[10px] text-slate-400 mt-0.5">Permanently delete your account and all data</p>
                  </div>
                  <button
                    onClick={deactivateAccount}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </SettingCard>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <SettingCard
              title="Password & Security"
              description="Manage your password and login credentials."
            >
              <form onSubmit={changePassword} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    required
                  />
                </div>
                {passwordError && <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{passwordError}</p>}
                {passwordNotice && <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{passwordNotice}</p>}
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  Change Password
                </button>
              </form>
            </SettingCard>

            <SettingCard
              title="Two-Factor Authentication"
              description="Add an extra layer of security to your account."
            >
              <ToggleSwitch
                settingKey="twoFactorAuth"
                label="Enable 2FA"
                desc={settings.twoFactorAuth ? 'Two-factor authentication is enabled' : 'Two-factor authentication is disabled'}
              />
              {settings.twoFactorAuth && !twoFactorSetup && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Setup Required:</strong> Please complete 2FA setup by scanning the QR code in your authenticator app.
                  </p>
                  <button
                    onClick={() => setTwoFactorSetup(true)}
                    className="mt-2 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 transition cursor-pointer"
                  >
                    Complete Setup
                  </button>
                </div>
              )}
              {twoFactorSetup && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-emerald-950/50 border border-green-200 dark:border-emerald-800 rounded-xl">
                  <p className="text-xs text-green-800 dark:text-emerald-200">
                    <strong>2FA Active:</strong> Your account is now protected with two-factor authentication.
                  </p>
                </div>
              )}
            </SettingCard>

            <SettingCard
              title="Active Sessions"
              description="Manage your logged-in sessions."
            >
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  window.dispatchEvent(new Event('auth-logout'));
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out of all devices
              </button>
            </SettingCard>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="space-y-4">
            <SettingCard
              title="Help Center"
              description="Get support and learn how to use Acreage."
            >
              <div className="space-y-2">
                <button
                  onClick={() => setShowFAQ(!showFAQ)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition cursor-pointer"
                >
                  <HelpCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <div className="text-left flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">FAQ</p>
                    <p className="text-[10px] text-slate-400">Frequently asked questions</p>
                  </div>
                  <span className="text-slate-400">{showFAQ ? '−' : '+'}</span>
                </button>
                {showFAQ && (
                  <div className="ml-4 sm:ml-8 p-3 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-2">
                    <p><strong>Q: How do I change my password?</strong><br/>A: Go to Security tab and use the password change form.</p>
                    <p><strong>Q: How do I update my profile?</strong><br/>A: Go to Account tab and edit your phone/location information.</p>
                    <p><strong>Q: How do I enable notifications?</strong><br/>A: Go to General tab and toggle Push Notifications.</p>
                  </div>
                )}
                <button
                  onClick={() => window.open('https://wa.me/?text=Hello%20Acreage%20Support', '_blank')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition cursor-pointer"
                >
                  <LifeBuoy className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Contact Support</p>
                    <p className="text-[10px] text-slate-400">Chat with our team</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowDocs(!showDocs)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition cursor-pointer"
                >
                  <GlobeIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <div className="text-left flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Documentation</p>
                    <p className="text-[10px] text-slate-400">Developer guides and API docs</p>
                  </div>
                  <span className="text-slate-400">{showDocs ? '−' : '+'}</span>
                </button>
                {showDocs && (
                  <div className="ml-4 sm:ml-8 p-3 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-2">
                    <p><strong>Getting Started:</strong> Learn how to set up your account and start using Acreage.</p>
                    <p><strong>API Documentation:</strong> Integrate Acreage with your applications using our REST API.</p>
                    <p><strong>User Guides:</strong> Step-by-step tutorials for farmers and buyers.</p>
                  </div>
                )}
              </div>
            </SettingCard>

            <SettingCard
              title="Send Feedback"
              description="Help us improve Acreage."
            >
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What would you like to tell us?"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                rows={3}
              />
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-base cursor-pointer ${star <= feedbackRating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              {feedbackNotice && <p className={`mt-2 text-[10px] font-bold ${feedbackNotice.includes('Thank you') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{feedbackNotice}</p>}
              <button
                onClick={submitFeedback}
                disabled={!feedback.trim()}
                className="mt-3 w-full bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                Submit Feedback
              </button>
            </SettingCard>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            onClick={resetSettings}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
