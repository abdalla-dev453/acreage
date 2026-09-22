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
      setFeedbackNotice('Thank you for your feedback!');
      setFeedback('');
      setFeedbackRating(5);
    } catch (err) {
      setFeedbackNotice(err.response?.data?.message || 'Unable to submit feedback.');
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    try {
      await API.put('/settings/account', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordNotice('Password changed successfully.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Unable to change password.');
    }
  };

  const deactivateAccount = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) return;
    try {
      await API.delete('/settings/account');
      logout();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to deactivate account.');
    }
  };

  const updatePhone = async () => {
    try {
      await API.put('/settings/account', { phone_number: phoneValue });
      setEditingPhone(false);
      handleSave();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update phone number.');
    }
  };

  const updateLocation = async () => {
    try {
      await API.put('/settings/account', { location: locationValue });
      setEditingLocation(false);
      handleSave();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update location.');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'security', label: 'Security & Privacy', icon: Shield },
    { id: 'help', label: 'Help & Feedback', icon: LifeBuoy },
  ];

  const themeOptions = [
    { value: 'light', label: t('settings.themeLight'), icon: Sun, desc: 'Always use light mode' },
    { value: 'dark', label: t('settings.themeDark'), icon: Moon, desc: 'Always use dark mode' },
    { value: 'system', label: t('settings.themeSystem'), icon: Monitor, desc: 'Follow system preference' },
  ];

  const languageOptions = [
    { value: 'en', label: t('languages.english') },
    { value: 'sw', label: t('languages.swahili') },
  ];

  const SettingCard = ({ title, description, children }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
      <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{description}</p>
      {children}
    </div>
  );

  const ToggleSwitch = ({ settingKey, label, desc }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex-1 min-w-0">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => handleToggle(settingKey)}
        disabled={loading[settingKey]}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          settings[settingKey] ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
        } disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
          settings[settingKey] ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-white'
        }`} />
      </button>
    </div>
  );

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Large' },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      <SEO title={`${t('settings.title')} | Acreage`} description="Manage your theme, language, notification, and website preferences." />
      <Navbar title={t('settings.title')} />

      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-green-600" />
          System Configuration
        </h1>
        <div className="flex items-center gap-4">
          {saved && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
          >
            <Save className="w-3.5 h-3.5" /> Save Settings
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 shadow border border-green-100 dark:border-green-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              description="Choose your preferred color scheme."
            >
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateSetting('theme', opt.value)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        settings.theme === opt.value
                          ? 'border-green-500 bg-green-50/50 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </SettingCard>

            <SettingCard
              title={t('settings.language')}
              description="Select your preferred interface language."
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500" />
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
              description="Manage how you receive alerts and notifications."
            >
              <ToggleSwitch
                settingKey="notifications"
                label="Push Notifications"
                desc={settings.notifications ? 'Receive real-time notifications' : 'Notifications are disabled'}
              />
              <ToggleSwitch
                settingKey="sound"
                label="Notification Sound"
                desc={settings.sound ? 'Play sound on new notifications' : 'Sounds are muted'}
              />
            </SettingCard>

            <SettingCard
              title="Display"
              description="Adjust text size and interface density."
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Font Size</label>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                    {fontSizeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateSetting('fontSize', opt.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          settings.fontSize === opt.value ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {opt.label === 'small' ? 'A' : opt.label === 'normal' ? 'Aa' : 'AaA'}
                      </button>
                    ))}
                  </div>
                </div>
                <ToggleSwitch
                  settingKey="compactMode"
                  label="Compact Mode"
                  desc="Reduce vertical spacing for more content"
                />
              </div>
            </SettingCard>

            <SettingCard
              title="Website Updates"
              description="How you receive updates about new features and improvements."
            >
              <ToggleSwitch
                settingKey="featureAnnouncements"
                label="Feature Announcements"
                desc="Get notified about new features and releases"
              />
              <ToggleSwitch
                settingKey="betaProgram"
                label="Beta Program"
                desc="Early access to new features and improvements"
              />
              {settings.betaProgram && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Beta Program Active:</strong> You'll receive early access to new features. Thank you for helping us improve!
                  </p>
                </div>
              )}
            </SettingCard>
          </>
        )}

        {activeTab === 'account' && (
          <div className="space-y-4">
            <SettingCard
              title="Account Information"
              description="Your personal and contact details."
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-600 text-white font-bold rounded-lg flex items-center justify-center">
                    {user?.username?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{user?.username}</p>
                    <p className="text-[10px] text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700">Phone</label>
                    {editingPhone ? (
                      <input
                        type="text"
                        value={phoneValue}
                        onChange={(e) => setPhoneValue(e.target.value)}
                        className="w-full mt-1 px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-0.5">{user?.phone_number || 'Not set'}</p>
                    )}
                  </div>
                  {editingPhone ? (
                    <div className="flex gap-2">
                      <button
                        onClick={updatePhone}
                        className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingPhone(false);
                          setPhoneValue(user?.phone_number || '');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingPhone(true)}
                      className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700">Location</label>
                    {editingLocation ? (
                      <input
                        type="text"
                        value={locationValue}
                        onChange={(e) => setLocationValue(e.target.value)}
                        className="w-full mt-1 px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                        placeholder="Enter location"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-0.5">{user?.location || 'Not set'}</p>
                    )}
                  </div>
                  {editingLocation ? (
                    <div className="flex gap-2">
                      <button
                        onClick={updateLocation}
                        className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingLocation(false);
                          setLocationValue(user?.location || '');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingLocation(true)}
                      className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <ToggleSwitch
                  settingKey="privateAccount"
                  label="Private Account"
                  desc="Only approved followers can message you"
                />
              </div>
            </SettingCard>

            <SettingCard
              title="Danger Zone"
              description="Actions that permanently affect your account."
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-rose-600">Deactivate Account</label>
                    <p className="text-[10px] text-slate-400 mt-0.5">Permanently delete your account and all data</p>
                  </div>
                  <button
                    onClick={deactivateAccount}
                    className="px-3 py-1.5 text-xs font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition"
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
                  <label className="text-xs font-bold text-slate-700">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    required
                  />
                </div>
                {passwordError && <p className="text-[10px] font-bold text-rose-600">{passwordError}</p>}
                {passwordNotice && <p className="text-[10px] font-bold text-green-600">{passwordNotice}</p>}
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold transition"
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
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>Setup Required:</strong> Please complete 2FA setup by scanning the QR code in your authenticator app.
                  </p>
                  <button
                    onClick={() => setTwoFactorSetup(true)}
                    className="mt-2 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition"
                  >
                    Complete Setup
                  </button>
                </div>
              )}
              {twoFactorSetup && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800">
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 transition"
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
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition"
                >
                  <HelpCircle className="w-5 h-5 text-slate-600" />
                  <div className="text-left flex-1">
                    <p className="text-xs font-bold text-slate-800">FAQ</p>
                    <p className="text-[10px] text-slate-400">Frequently asked questions</p>
                  </div>
                  <span className="text-slate-400">{showFAQ ? '−' : '+'}</span>
                </button>
                {showFAQ && (
                  <div className="ml-8 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-2">
                    <p><strong>Q: How do I change my password?</strong><br/>A: Go to Security & Privacy tab and use the password change form.</p>
                    <p><strong>Q: How do I update my profile?</strong><br/>A: Go to Account tab and edit your phone/location information.</p>
                    <p><strong>Q: How do I enable notifications?</strong><br/>A: Go to General tab and toggle Push Notifications.</p>
                  </div>
                )}
                <button
                  onClick={() => window.open('https://wa.me/?text=Hello%20Acreage%20Support', '_blank')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition"
                >
                  <LifeBuoy className="w-5 h-5 text-slate-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">Contact Support</p>
                    <p className="text-[10px] text-slate-400">Chat with our team</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowDocs(!showDocs)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition"
                >
                  <GlobeIcon className="w-5 h-5 text-slate-600" />
                  <div className="text-left flex-1">
                    <p className="text-xs font-bold text-slate-800">Documentation</p>
                    <p className="text-[10px] text-slate-400">Developer guides and API docs</p>
                  </div>
                  <span className="text-slate-400">{showDocs ? '−' : '+'}</span>
                </button>
                {showDocs && (
                  <div className="ml-8 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-2">
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
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                rows={3}
              />
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-${star <= feedbackRating ? 'amber' : 'slate'}-400 text-base`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              {feedbackNotice && <p className={`mt-2 text-[10px] font-bold ${feedbackNotice.includes('Thank you') ? 'text-green-600' : 'text-rose-600'}`}>{feedbackNotice}</p>}
              <button
                onClick={submitFeedback}
                disabled={!feedback.trim()}
                className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Submit Feedback
              </button>
            </SettingCard>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <button
            onClick={resetSettings}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center gap-2"
          >
            <RotateCw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
