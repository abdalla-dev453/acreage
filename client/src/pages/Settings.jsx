import { useState, useContext } from 'react';
import { Settings, Sun, Moon, Monitor, Globe, Bell, BellOff, Volume2, VolumeX, Type, ZoomIn, ZoomOut, RotateCw, Save, Palette, Crown, CreditCard, User as UserIcon, Shield, HelpCircle, LifeBuoy, Globe as GlobeIcon, Smartphone } from 'lucide-react';
import { SettingsContext } from '../context/SettingsContext';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useContext(SettingsContext);
  const { user } = useContext(AuthContext);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'subscription', label: 'Subscription', icon: Crown },
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'help', label: 'Help & Feedback', icon: LifeBuoy },
  ];

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Always use light mode' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always use dark mode' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Follow system preference' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'sw', label: 'Kiswahili' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Large' },
  ];

  const SettingCard = ({ title, description, children }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
      <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 mb-4">{description}</p>
      {children}
    </div>
  );

  const ToggleSwitch = ({ checked, onChange, label, desc }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <label className="text-xs font-bold text-slate-700">{label}</label>
        <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-slate-300'
        }`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
          checked ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-white'
        }`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 w-full pb-12">
      <SEO title="Settings | Acreage" description="Manage your theme, language, notification, and website preferences." />
      <Navbar title="Settings" />

      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-green-600" />
          System Configuration
        </h1>
        {saved && (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
            Saved
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Tab Navigation */}
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
                    ? 'bg-white text-green-700 shadow border border-green-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content: General */}
        {activeTab === 'general' && (
          <>
            {/* Theme Settings */}
            <SettingCard
              title="Theme"
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
                          ? 'border-green-500 bg-green-50/50 text-green-800'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </SettingCard>

            {/* Language Settings */}
            <SettingCard
              title="Language"
              description="Select your preferred interface language."
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <select
                  value={settings.language}
                  onChange={(e) => updateSetting('language', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                >
                  {languageOptions.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </SettingCard>

            {/* Notification Settings */}
            <SettingCard
              title="Notifications"
              description="Manage how you receive alerts and notifications."
            >
              <ToggleSwitch
                checked={settings.notifications}
                onChange={(v) => updateSetting('notifications', v)}
                label="Push Notifications"
                desc={settings.notifications ? 'Receive real-time notifications' : 'Notifications are disabled'}
              />
              <ToggleSwitch
                checked={settings.sound}
                onChange={(v) => updateSetting('sound', v)}
                label="Notification Sound"
                desc={settings.sound ? 'Play sound on new notifications' : 'Sounds are muted'}
              />
            </SettingCard>

            {/* Display Settings */}
            <SettingCard
              title="Display"
              description="Adjust text size and interface density."
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <label className="text-xs font-bold text-slate-700">Font Size</label>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => updateSetting('fontSize', 'small')}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        settings.fontSize === 'small' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'
                      }`}
                    >
                      A
                    </button>
                    <button
                      onClick={() => updateSetting('fontSize', 'normal')}
                      className={`px-2 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        settings.fontSize === 'normal' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'
                      }`}
                    >
                      Aa
                    </button>
                    <button
                      onClick={() => updateSetting('fontSize', 'large')}
                      className={`px-2 py-1.5 rounded-lg text-base font-bold transition-all ${
                        settings.fontSize === 'large' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'
                      }`}
                    >
                      Aa
                    </button>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.compactMode}
                  onChange={(v) => updateSetting('compactMode', v)}
                  label="Compact Mode"
                  desc="Reduce vertical spacing for more content"
                />
              </div>
            </SettingCard>

            {/* Website Updates */}
            <SettingCard
              title="Website Updates"
              description="How you receive updates about new features and improvements."
            >
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="Feature Announcements"
                desc="Get notified about new features and releases"
              />
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="Beta Program"
                desc="Early access to new features and improvements"
              />
            </SettingCard>
          </>
        )}

        {/* Tab Content: Subscription */}
        {activeTab === 'subscription' && (
          <div className="space-y-4">
            <SettingCard
              title="Current Plan"
              description="Your subscription status and plan details."
            >
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-green-600" />
                  <div>
                    <span className="font-bold text-sm text-green-800">Free Plan</span>
                    <p className="text-[10px] text-green-600">Basic marketplace features</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-lg">
                  Active
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Premium Benefits</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <GlobeIcon className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-500">Premium marketplace visibility</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-500">Priority support and early access</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Crown className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-500">No listing fees on premium plans</p>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2">
                <Crown className="w-4 h-4" />
                Upgrade to Premium
              </button>
            </SettingCard>
          </div>
        )}

        {/* Tab Content: Account */}
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
                <ToggleSwitch
                  checked={true}
                  onChange={() => {}}
                  label="Private Account"
                  desc="Only approved followers can message you"
                />
                <ToggleSwitch
                  checked={true}
                  onChange={() => {}}
                  label="Two-Factor Authentication"
                  desc="Add an extra layer of security to your account"
                />
              </div>
            </SettingCard>

            <SettingCard
              title="Password & Security"
              description="Manage your password and login credentials."
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700">Current Password</label>
                    <p className="text-[10px] text-slate-400 mt-0.5">Last changed 3 months ago</p>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition">
                    Change
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700">Email Address</label>
                    <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-slate-700">Connected Apps</label>
                    <p className="text-[10px] text-slate-400 mt-0.5">3 integrations active</p>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                    Manage
                  </button>
                </div>
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
                  <button className="px-3 py-1.5 text-xs font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition">
                    Deactivate
                  </button>
                </div>
              </div>
            </SettingCard>
          </div>
        )}

        {/* Tab Content: Help */}
        {activeTab === 'help' && (
          <div className="space-y-4">
            <SettingCard
              title="Help Center"
              description="Get support and learn how to use Acreage."
            >
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition">
                  <HelpCircle className="w-5 h-5 text-slate-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">FAQ</p>
                    <p className="text-[10px] text-slate-400">Frequently asked questions</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition">
                  <LifeBuoy className="w-5 h-5 text-slate-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">Contact Support</p>
                    <p className="text-[10px] text-slate-400">Chat with our team</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition">
                  <GlobeIcon className="w-5 h-5 text-slate-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">Documentation</p>
                    <p className="text-[10px] text-slate-400">Developer guides and API docs</p>
                  </div>
                </button>
              </div>
            </SettingCard>

            <SettingCard
              title="Send Feedback"
              description="Help us improve Acreage."
            >
              <textarea
                placeholder="What would you like to tell us?"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                rows={3}
              />
              <button className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold transition">
                Submit Feedback
              </button>
            </SettingCard>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <button
            onClick={resetSettings}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center gap-2"
          >
            <RotateCw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
