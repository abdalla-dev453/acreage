import { useState } from 'react';
import { Smartphone, MessageSquare, HelpCircle, ArrowRight, Copy, Check } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';

export default function SmsHub() {
  const [copied, setCopied] = useState(false);

  const smsNumber = '+254700000000'; // Replace with actual SMS short code
  const exampleCommands = [
    {
      command: 'ORDER 123 5',
      description: 'Order 5 units of product ID 123',
      example: 'Send: ORDER 123 5'
    },
    {
      command: 'STATUS ACR-ABC123',
      description: 'Check status of order ACR-ABC123',
      example: 'Send: STATUS ACR-ABC123'
    },
    {
      command: 'PRODUCTS',
      description: 'Get list of available products',
      example: 'Send: PRODUCTS'
    },
    {
      command: 'HELP',
      description: 'Get help with SMS commands',
      example: 'Send: HELP'
    }
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 w-full pb-16">
      <SEO title="SMS Ordering | Acreage" description="Order products via SMS - no internet required. Simple text commands to buy from farmers directly." />
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
              Place orders, check status, and browse products using simple text messages. 
              Perfect for areas with limited internet connectivity.
            </p>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-slate-900">Getting Started</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">1</div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Ensure your phone is registered</h4>
              <p className="text-sm text-slate-600">Your phone number must be linked to your Acreage buyer account.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">2</div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Send commands to our SMS number</h4>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg font-mono font-bold text-green-700">{smsNumber}</span>
                <button
                  onClick={() => copyToClipboard(smsNumber)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition"
                  title="Copy number"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">3</div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Use simple commands</h4>
              <p className="text-sm text-slate-600">Text commands like ORDER, STATUS, PRODUCTS to interact with the marketplace.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Commands */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-slate-900">Available Commands</h3>
        </div>
        
        <div className="space-y-3">
          {exampleCommands.map((item, index) => (
            <div key={index} className="border border-slate-200 rounded-xl p-4 hover:border-green-200 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <code className="text-sm font-mono font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                    {item.command}
                  </code>
                  <p className="text-sm text-slate-600 mt-2">{item.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium">{item.example}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example Flow */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Example: Ordering via SMS</h3>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Browse products</p>
              <p className="text-sm text-slate-600">Send: <code className="bg-slate-100 px-1 rounded">PRODUCTS</code></p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Place your order</p>
              <p className="text-sm text-slate-600">Send: <code className="bg-slate-100 px-1 rounded">ORDER 123 5</code> (5 units of product #123)</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Receive confirmation</p>
              <p className="text-sm text-slate-600">Get SMS with order code and M-Pesa payment instructions</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Track your order</p>
              <p className="text-sm text-slate-600">Send: <code className="bg-slate-100 px-1 rounded">STATUS ACR-ABC123</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-amber-800 mb-3">Important Notes</h3>
        <ul className="space-y-2 text-sm text-amber-700">
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
            <span>For support, contact us through the app or website.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}