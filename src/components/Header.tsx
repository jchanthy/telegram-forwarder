import React from 'react';
import { Send, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Zap, BookOpen } from 'lucide-react';
import type { SystemStatus } from '../types';

interface HeaderProps {
  status: SystemStatus | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenGuide: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  loading,
  onRefresh,
  onOpenGuide,
  activeTab,
  setActiveTab,
}) => {
  const isConnected = status?.botConnected;
  const botUsername = status?.botInfo?.username;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                  Telegram Auto Forwarder
                </h1>
                <span className="bg-sky-500/10 text-sky-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-sky-500/20">
                  v2.0 Bot Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Auto-forward & broadcast messages from private DMs or channels to groups
              </p>
            </div>
          </div>

          {/* Right Status & Quick Actions */}
          <div className="flex items-center space-x-3">
            {/* Connection Status Pill */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
              {isConnected ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 font-medium">Bot Online</span>
                  {botUsername && (
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-300 hover:text-sky-400 underline font-mono text-[11px] ml-1"
                    >
                      @{botUsername}
                    </a>
                  )}
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-amber-400 font-medium">Bot Disconnected</span>
                </>
              )}
            </div>

            {/* Guide Button */}
            <button
              onClick={onOpenGuide}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-medium transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Setup Guide</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
              title="Refresh System Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none pt-1">
          {[
            { id: 'dashboard', label: 'Dashboard & Overview', icon: Zap },
            { id: 'targets', label: `Targets & Destinations (${status?.activeTargetsCount || 0})`, icon: Send },
            { id: 'rules', label: `Forwarding Rules (${status?.activeRulesCount || 0})`, icon: ShieldCheck },
            { id: 'broadcast', label: 'Manual Broadcast Studio', icon: Zap },
            { id: 'simulator', label: 'Test Simulator', icon: CheckCircle2 },
            { id: 'logs', label: 'Activity Logs', icon: AlertTriangle },
            { id: 'settings', label: 'Bot Credentials & Settings', icon: RefreshCw },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
