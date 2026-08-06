import React, { useState, useEffect } from 'react';
import { Bot, Key, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, RefreshCw, Link as LinkIcon, Lock, Unlock, Radio } from 'lucide-react';
import type { AppConfig, BotInfo } from '../types';

interface BotConnectionCardProps {
  config: AppConfig | null;
  botInfo: BotInfo | null;
  onSaveConfig: (updated: Partial<AppConfig>) => Promise<void>;
  onTestToken: (token: string) => Promise<BotInfo | null>;
  onRefreshStatus: () => void;
}

export const BotConnectionCard: React.FC<BotConnectionCardProps> = ({
  config,
  botInfo,
  onSaveConfig,
  onTestToken,
  onRefreshStatus,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [allowedUsersInput, setAllowedUsersInput] = useState('');
  const [requireAuth, setRequireAuth] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(true);
  const [isWebhookActive, setIsWebhookActive] = useState(false);
  const [globalHeader, setGlobalHeader] = useState('');
  const [globalFooter, setGlobalFooter] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<BotInfo | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setRequireAuth(config.requireAuth || false);
      setAllowedUsersInput((config.allowedAdminUsernames || []).join(', '));
      setIsPollingActive(config.isPollingActive ?? true);
      setIsWebhookActive(config.isWebhookActive ?? false);
      setGlobalHeader(config.globalHeader || '');
      setGlobalFooter(config.globalFooter || '');
    }
  }, [config]);

  const handleTestToken = async () => {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await onTestToken(tokenInput || (config?.botToken || ''));
      if (res) {
        setTestResult(res);
      } else {
        setTestError('Failed to verify token with Telegram API.');
      }
    } catch (err: any) {
      setTestError(err.message || 'Invalid Bot Token');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const usersArray = allowedUsersInput
        .split(',')
        .map(u => u.trim())
        .filter(Boolean);

      await onSaveConfig({
        ...(tokenInput ? { botToken: tokenInput } : {}),
        allowedAdminUsernames: usersArray,
        requireAuth,
        isPollingActive,
        isWebhookActive,
        globalHeader,
        globalFooter,
      });

      setSuccessMsg('Settings and Bot Credentials saved successfully!');
      setTokenInput('');
      onRefreshStatus();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setTestError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const activeBot = testResult || botInfo;

  return (
    <div className="space-y-6">
      {/* Bot Info Profile Card if connected */}
      {activeBot ? (
        <div className="bg-gradient-to-r from-sky-900/40 via-slate-900 to-slate-900 border border-sky-500/30 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-sky-500/20">
                <Bot className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-100">{activeBot.first_name}</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active Bot
                  </span>
                </div>
                <p className="text-sky-300 font-mono text-sm">@{activeBot.username}</p>
                <p className="text-slate-400 text-xs mt-1">Bot ID: <code className="bg-slate-800 px-1.5 py-0.5 rounded">{activeBot.id}</code></p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center space-x-1">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Group Support: {activeBot.can_join_groups ? 'Allowed' : 'Disabled'}</span>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                <span>Privacy Mode: {activeBot.can_read_all_group_messages ? 'Reads All Msgs' : 'Filtered'}</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-amber-200 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-300">Bot Token Not Verified or Disconnected</p>
            <p className="text-amber-200/80 mt-1">
              Please enter your Telegram Bot API Token below (obtained from <span className="font-semibold text-amber-200">@BotFather</span> on Telegram) to activate auto-forwarding to your channels.
            </p>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-200 space-y-6 shadow-lg">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
            <Key className="w-4 h-4 text-sky-400" />
            <span>Telegram Bot Credentials</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Create a bot using @BotFather on Telegram, paste the API token below, and test the connection.
          </p>
        </div>

        {/* Token Input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Telegram Bot API Token
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={config?.botTokenMasked || 'e.g. 123456789:ABCdefGhIJKlmnoPQRsTUVwxyZ'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleTestToken}
              disabled={testing}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-medium text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Token'}</span>
            </button>
          </div>
          {testError && (
            <p className="text-xs text-rose-400 flex items-center space-x-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{testError}</span>
            </p>
          )}
        </div>

        {/* Real-time Listening Mode */}
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h4 className="text-sm font-semibold text-slate-200">Real-time Listening & Reception Mode</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start space-x-3 ${
              isPollingActive ? 'bg-sky-500/10 border-sky-500/50 text-sky-200' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <input
                type="radio"
                name="listenMode"
                checked={isPollingActive}
                onChange={() => {
                  setIsPollingActive(true);
                  setIsWebhookActive(false);
                }}
                className="mt-1 accent-sky-500"
              />
              <div>
                <span className="font-semibold text-xs text-slate-100 block">Long Polling Mode (Recommended)</span>
                <span className="text-[11px] opacity-80 block mt-1">
                  Server continuously queries Telegram API for new forwards/posts. Works seamlessly out of the box.
                </span>
              </div>
            </label>

            <label className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start space-x-3 ${
              isWebhookActive ? 'bg-sky-500/10 border-sky-500/50 text-sky-200' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}>
              <input
                type="radio"
                name="listenMode"
                checked={isWebhookActive}
                onChange={() => {
                  setIsWebhookActive(true);
                  setIsPollingActive(false);
                }}
                className="mt-1 accent-sky-500"
              />
              <div>
                <span className="font-semibold text-xs text-slate-100 block">Telegram Webhook Mode</span>
                <span className="text-[11px] opacity-80 block mt-1">
                  Telegram pushes updates directly to this server URL webhook endpoint.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Access Control & Authentication */}
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                {requireAuth ? <Lock className="w-4 h-4 text-emerald-400" /> : <Unlock className="w-4 h-4 text-amber-400" />}
                <span>Authorized Admin Users</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Restrict who can post or forward messages to the bot to trigger auto-forwarding.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={requireAuth}
                onChange={(e) => setRequireAuth(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {requireAuth && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Allowed Telegram Usernames (comma separated, e.g. @john, @admin_user)
              </label>
              <input
                type="text"
                value={allowedUsersInput}
                onChange={(e) => setAllowedUsersInput(e.target.value)}
                placeholder="@username1, @username2"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Global Footer & Header Appends */}
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <h4 className="text-sm font-semibold text-slate-200">Global Message Signatures</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Global Header (Prepended to all clean copies)
              </label>
              <input
                type="text"
                value={globalHeader}
                onChange={(e) => setGlobalHeader(e.target.value)}
                placeholder="e.g. ⚡ BROADCAST ALERT"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Global Footer (Appended to all clean copies)
              </label>
              <input
                type="text"
                value={globalFooter}
                onChange={(e) => setGlobalFooter(e.target.value)}
                placeholder="e.g. 📢 Forwarded via Bot | t.me/mychannel"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{saving ? 'Saving Settings...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
