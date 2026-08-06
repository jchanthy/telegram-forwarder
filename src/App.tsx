import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BotConnectionCard } from './components/BotConnectionCard';
import { TargetDestinations } from './components/TargetDestinations';
import { ForwardingRules } from './components/ForwardingRules';
import { BroadcastTester } from './components/BroadcastTester';
import { InteractiveSimulator } from './components/InteractiveSimulator';
import { ActivityLogs } from './components/ActivityLogs';
import { SetupGuideModal } from './components/SetupGuideModal';

import { Send, Zap, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Radio, Sparkles, ArrowRight, Bot, Key } from 'lucide-react';
import type { SystemStatus, AppConfig, TargetDestination, ForwardingRule, ForwardLog, BotInfo, TargetResult } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // System State
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [targets, setTargets] = useState<TargetDestination[]>([]);
  const [rules, setRules] = useState<ForwardingRule[]>([]);
  const [logs, setLogs] = useState<ForwardLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStatus, resConfig, resTargets, resRules, resLogs] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
        fetch('/api/targets').then(r => r.json()),
        fetch('/api/rules').then(r => r.json()),
        fetch('/api/logs').then(r => r.json()),
      ]);

      setStatus(resStatus);
      setConfig(resConfig);
      setTargets(resTargets || []);
      setRules(resRules || []);
      setLogs(resLogs || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      fetch('/api/status').then(r => r.json()).then(setStatus).catch(() => {});
      fetch('/api/logs').then(r => r.json()).then(setLogs).catch(() => {});
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Handlers
  const handleSaveConfig = async (updated: Partial<AppConfig>) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchData();
  };

  const handleTestToken = async (token: string): Promise<BotInfo | null> => {
    const res = await fetch('/api/bot/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.botInfo;
  };

  const handleAddTarget = async (targetData: Partial<TargetDestination>) => {
    const res = await fetch('/api/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(targetData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchData();
  };

  const handleUpdateTarget = async (id: string, updated: Partial<TargetDestination>) => {
    const res = await fetch(`/api/targets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleDeleteTarget = async (id: string) => {
    const res = await fetch(`/api/targets/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleCheckPermissions = async (chatId: string) => {
    const res = await fetch('/api/targets/check-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId }),
    });
    return res.json();
  };

  const handleAddRule = async (ruleData: Partial<ForwardingRule>) => {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleUpdateRule = async (id: string, updated: Partial<ForwardingRule>) => {
    const res = await fetch(`/api/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleDeleteRule = async (id: string) => {
    const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    await fetchData();
  };

  const handleSendBroadcast = async (payload: {
    text: string;
    targetIds: string[];
    customHeader?: string;
    customFooter?: string;
  }) => {
    const res = await fetch('/api/test-forward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchData();
    return data;
  };

  const handleSimulateMessage = async (payload: any) => {
    const res = await fetch('/api/simulate-incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchData();
    return data;
  };

  const handleClearLogs = async () => {
    await fetch('/api/logs/clear', { method: 'POST' });
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white flex flex-col">
      {/* Header */}
      <Header
        status={status}
        loading={loading}
        onRefresh={fetchData}
        onOpenGuide={() => setIsGuideOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Connection Banner if Bot not configured */}
            {!status?.botConnected && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-6 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-start space-x-3">
                  <Bot className="w-8 h-8 text-amber-400 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-base text-amber-300">Telegram Bot Disconnected</h3>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Enter your Bot Token in the credentials panel to start auto-forwarding messages to your channels.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
                >
                  Configure Token Now
                </button>
              </div>
            )}

            {/* Workflow Concept Explanation Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-slate-100">Auto-Forwarding Architecture</h2>
                    <p className="text-xs text-slate-400">How messages flow from your Telegram account to your target channels & groups</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-semibold text-xs transition-colors border border-slate-700/60"
                >
                  Full Setup Guide →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px]">1</span>
                    <span>Send or Forward to Bot</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Using your personal Telegram account, post or forward any text, image, document, or link directly into a private DM with your bot (<code className="bg-slate-800 text-sky-300 px-1 py-0.5 rounded font-mono">@{status?.botInfo?.username || 'your_bot'}</code>).
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">2</span>
                    <span>Engine Rules & Formatting</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    This server catches incoming posts, applies your filter rules (keyword blocks, text replacement, watermarks, headers/footers), and formats the message.
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">3</span>
                    <span>Auto-Broadcast to Targets</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Your bot immediately posts or forwards the content into all added target Telegram Channels & Groups where your bot is an Administrator with <strong className="text-emerald-400">Post Messages</strong> rights.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Total Posts Forwarded</p>
                  <p className="text-2xl font-black text-slate-100 mt-0.5">{status?.totalForwardedCount || 0}</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Active Channels/Groups</p>
                  <p className="text-2xl font-black text-slate-100 mt-0.5">{status?.activeTargetsCount || 0}</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Active Filter Rules</p>
                  <p className="text-2xl font-black text-slate-100 mt-0.5">{status?.activeRulesCount || 0}</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                  status?.botConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Bot Engine Status</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">
                    {status?.botConnected ? 'Online & Polling' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => setActiveTab('targets')}
                className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-6 cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                  <span>Manage Target Destinations</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Add or edit Telegram channels and groups, set copy vs native forward modes, and add custom signatures.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('broadcast')}
                className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-6 cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                  <span>Manual Broadcast Studio</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Draft and dispatch announcements or news directly to your Telegram channels from this web interface.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('simulator')}
                className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-6 cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                  <span>Test Event Simulator</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Simulate receiving messages or forwards to verify keyword rules, word replacements, and headers in real time.
                </p>
              </div>
            </div>

            {/* Recent Log Activity Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>Recent Forwarding Activity</span>
                </h3>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-xs text-sky-400 hover:underline font-medium"
                >
                  View All Logs ({logs.length})
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
                  No activity recorded yet. Posts forwarded to your bot will appear here automatically.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {log.overallStatus === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-semibold text-slate-200 block truncate">
                            {log.sourceChatTitle || log.sourceSenderName}
                          </span>
                          <span className="text-slate-400 text-[11px] block truncate">
                            "{log.messageSnippet}"
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          log.overallStatus === 'success' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {log.overallStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Targets Tab */}
        {activeTab === 'targets' && (
          <TargetDestinations
            targets={targets}
            onAddTarget={handleAddTarget}
            onUpdateTarget={handleUpdateTarget}
            onDeleteTarget={handleDeleteTarget}
            onCheckPermissions={handleCheckPermissions}
          />
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <ForwardingRules
            rules={rules}
            onAddRule={handleAddRule}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
          />
        )}

        {/* Broadcast Studio Tab */}
        {activeTab === 'broadcast' && (
          <BroadcastTester targets={targets} onSendBroadcast={handleSendBroadcast} />
        )}

        {/* Simulator Tab */}
        {activeTab === 'simulator' && (
          <InteractiveSimulator
            onSimulateMessage={handleSimulateMessage}
            onRefreshLogs={fetchData}
          />
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <ActivityLogs logs={logs} onClearLogs={handleClearLogs} onRefreshLogs={fetchData} />
        )}

        {/* Bot Credentials & Settings Tab */}
        {activeTab === 'settings' && (
          <BotConnectionCard
            config={config}
            botInfo={status?.botInfo || null}
            onSaveConfig={handleSaveConfig}
            onTestToken={handleTestToken}
            onRefreshStatus={fetchData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        <p>Telegram Auto Forwarder Engine & Dashboard • Built with React, Tailwind CSS & Node.js</p>
      </footer>

      {/* Setup Guide Modal */}
      <SetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
