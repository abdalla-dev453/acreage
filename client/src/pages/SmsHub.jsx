import { useState } from 'react';
import {
  Smartphone,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  Copy,
  Check,
  Phone,
  Send,
  ShoppingBag,
  Package,
  Search,
  BookOpen,
  Sparkles,
  Zap,
} from 'lucide-react';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';
import ErrorBoundary from '../components/common/ErrorBoundary';

const ALL_COMMANDS = [
  {
    command: 'ORDER <product_id> <quantity>',
    description: 'Place an order for a product',
    example: 'ORDER 123 5',
    icon: ShoppingBag,
    category: 'Ordering',
  },
  {
    command: 'STATUS <order_code>',
    description: 'Check the status of your order',
    example: 'STATUS ACR-ABC123',
    icon: Package,
    category: 'Ordering',
  },
  {
    command: 'PRODUCTS',
    description: 'Get a list of all available products',
    example: 'PRODUCTS',
    icon: Search,
    category: 'Browsing',
  },
  {
    command: 'SEARCH <query>',
    description: 'Search for products by name',
    example: 'SEARCH maize',
    icon: Search,
    category: 'Browsing',
  },
  {
    command: 'HELP',
    description: 'Get help with SMS commands',
    example: 'HELP',
    icon: HelpCircle,
    category: 'Support',
  },
  {
    command: 'BALANCE',
    description: 'Check your M-Pesa balance',
    example: 'BALANCE',
    icon: Zap,
    category: 'Account',
  },
  {
    command: 'PROFILE',
    description: 'View your account profile',
    example: 'PROFILE',
    icon: BookOpen,
    category: 'Account',
  },
];

const CATEGORIES = ['All', 'Ordering', 'Browsing', 'Support', 'Account'];

export default function SmsHub() {
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const smsNumber = import.meta.env.VITE_SMS_NUMBER || '0182142621';

  const filteredCommands =
    activeCategory === 'All'
      ? ALL_COMMANDS
      : ALL_COMMANDS.filter((cmd) => cmd.category === activeCategory);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 w-full pb-16">
        <SEO
          title="SMS Ordering | Acreage"
          description="Order products via SMS - no internet required. Simple text commands to buy from farmers directly."
        />
        <Navbar title="SMS Ordering Gateway" />

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Smartphone className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Order via SMS - No Internet Required</h2>
              <p className="text-green-100 text-sm">
                Place orders, check status, and browse products using simple text
                messages. Perfect for areas with limited internet connectivity.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href={`sms:${smsNumber}?body=PRODUCTS`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-green-300 hover:shadow-md transition text-sm font-bold text-green-700"
          >
            <Send className="w-4 h-4" />
            Send Products
          </a>
          <a
            href={`sms:${smsNumber}?body=HELP`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-green-300 hover:shadow-md transition text-sm font-bold text-green-700"
          >
            <HelpCircle className="w-4 h-4" />
            Get Help
          </a>
          <a
            href={`tel:${smsNumber}`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-green-300 hover:shadow-md transition text-sm font-bold text-green-700"
          >
            <Phone className="w-4 h-4" />
            Call Support
          </a>
        </div>

        {/* SMS Number */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-gold-500" />
            <h3 className="text-lg font-bold text-slate-900">Our SMS Number</h3>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 p-4 bg-slate-50 rounded-xl">
              <Smartphone className="w-5 h-5 text-green-600 shrink-0" />
              <span className="text-2xl font-mono font-black text-green-700 tracking-wide">
                {smsNumber}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(smsNumber)}
              className="p-4 hover:bg-slate-100 rounded-xl transition flex items-center gap-2"
              title="Copy number"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-bold text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-bold text-slate-600">Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Save this number in your contacts as "Acreage SMS"
          </p>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-slate-900">Getting Started</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                1
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Ensure your phone is registered</h4>
                <p className="text-sm text-slate-600">
                  Your phone number must be linked to your Acreage buyer account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Send commands to our SMS number</h4>
                <p className="text-sm text-slate-600">
                  Text <code className="bg-green-100 text-green-800 px-1 rounded font-mono">{smsNumber}</code> with any command below.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Use simple commands</h4>
                <p className="text-sm text-slate-600">
                  Text commands like ORDER, STATUS, PRODUCTS to interact with the marketplace.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Command Categories Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-green-600 text-white shadow'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Available Commands */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-slate-900">Available Commands</h3>
          </div>

          <div className="space-y-3">
            {filteredCommands.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="border border-slate-200 rounded-xl p-4 hover:border-green-200 hover:shadow-sm transition group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-green-600" />
                        <code className="text-sm font-mono font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                          {item.command}
                        </code>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.command)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition shrink-0"
                      title="Copy command"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                      )}
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">
                      Example: {item.example}
                    </p>
                    <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Tap to copy
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Example Flow */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Example: Ordering via SMS</h3>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Browse products</p>
                <p className="text-sm text-slate-600">
                  Send: <code className="bg-slate-100 px-1 rounded cursor-pointer hover:bg-slate-200 transition" onClick={() => copyToClipboard('PRODUCTS')}>PRODUCTS</code>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Place your order</p>
                <p className="text-sm text-slate-600">
                  Send: <code className="bg-slate-100 px-1 rounded cursor-pointer hover:bg-slate-200 transition" onClick={() => copyToClipboard('ORDER 123 5')}>ORDER 123 5</code> (5 units of product #123)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Receive confirmation</p>
                <p className="text-sm text-slate-600">
                  Get SMS with order code and M-Pesa payment instructions
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Track your order</p>
                <p className="text-sm text-slate-600">
                  Send: <code className="bg-slate-100 px-1 rounded cursor-pointer hover:bg-slate-200 transition" onClick={() => copyToClipboard('STATUS ACR-ABC123')}>STATUS ACR-ABC123</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Reference Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Command Reference</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-bold text-slate-700">Command</th>
                  <th className="text-left py-2 px-3 font-bold text-slate-700">What it does</th>
                  <th className="text-left py-2 px-3 font-bold text-slate-700">Copy</th>
                </tr>
              </thead>
              <tbody>
                {ALL_COMMANDS.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-2 px-3">
                      <code className="font-mono font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs">
                        {item.command}
                      </code>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{item.description}</td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => copyToClipboard(item.command)}
                        className="p-1.5 hover:bg-slate-200 rounded transition"
                        title="Copy"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 mb-3">Important Notes</h3>
          <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-200/90">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Standard SMS rates apply. Check with your mobile provider for costs.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Ensure you have sufficient M-Pesa balance before placing orders.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Product IDs can be found in the marketplace or by texting PRODUCTS.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>For support, text HELP to {smsNumber} or contact us through the app.</span>
            </li>
          </ul>
        </div>
      </div>
    </ErrorBoundary>
  );
}
