import React, { useState, useEffect } from 'react';
import { Zap, Send, CheckCircle2, AlertCircle, RefreshCw, Layers, Sparkles, Wand2 } from 'lucide-react';
import type { AppConfig, TargetDestination, TargetResult } from '../types';

interface BroadcastTesterProps {
  config?: AppConfig | null;
  targets: TargetDestination[];
  onSendBroadcast: (payload: {
    text: string;
    targetIds: string[];
    customHeader?: string;
    customFooter?: string;
  }) => Promise<{ success: boolean; results: TargetResult[]; successCount: number; total: number }>;
  onGenerateAiContent?: (payload: { topic: string; style?: string; language?: string; provider?: string }) => Promise<string>;
}

export const BroadcastTester: React.FC<BroadcastTesterProps> = ({ config, targets, onSendBroadcast, onGenerateAiContent }) => {
  const [text, setText] = useState('');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [customHeader, setCustomHeader] = useState(config?.globalHeader || '');
  const [customFooter, setCustomFooter] = useState(config?.globalFooter || '');

  useEffect(() => {
    if (config) {
      if (config.globalHeader && !customHeader) setCustomHeader(config.globalHeader);
      if (config.globalFooter && !customFooter) setCustomFooter(config.globalFooter);
    }
  }, [config]);

  // AI Generator State
  const [aiEngine, setAiEngine] = useState<'gemini' | 'openai' | 'deepseek'>('gemini');
  const [aiTopic, setAiTopic] = useState('');
  const [aiLanguage, setAiLanguage] = useState('English');
  const [aiStyle, setAiStyle] = useState('Engaging & Professional');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ successCount: number; total: number; list: TargetResult[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeTargets = targets.filter(t => t.isActive);

  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a topic or prompt for AI.');
      return;
    }
    if (!onGenerateAiContent) {
      setAiError('AI generation handler not available.');
      return;
    }

    setGeneratingAi(true);
    setAiError(null);
    try {
      const generated = await onGenerateAiContent({
        topic: aiTopic.trim(),
        style: aiStyle,
        language: aiLanguage,
        provider: aiEngine,
      });
      setText(generated);
    } catch (err: any) {
      setAiError(err.message || 'AI generation failed');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleToggleTarget = (id: string) => {
    if (selectedTargetIds.includes(id)) {
      setSelectedTargetIds(selectedTargetIds.filter(tId => tId !== id));
    } else {
      setSelectedTargetIds([...selectedTargetIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTargetIds.length === activeTargets.length) {
      setSelectedTargetIds([]);
    } else {
      setSelectedTargetIds(activeTargets.map(t => t.id));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErrorMsg('Please enter message text to post.');
      return;
    }

    setSending(true);
    setErrorMsg(null);
    setResults(null);

    try {
      const res = await onSendBroadcast({
        text,
        targetIds: selectedTargetIds.length > 0 ? selectedTargetIds : activeTargets.map(t => t.id),
        customHeader: customHeader.trim() || undefined,
        customFooter: customFooter.trim() || undefined,
      });

      setResults({
        successCount: res.successCount,
        total: res.total,
        list: res.results,
      });

      if (res.successCount > 0) {
        setText('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-slate-100">Manual Broadcast Studio & Live Tester</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Instantly draft and dispatch custom messages, news updates, or test posts directly to your active Telegram channels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Content Assistant Panel */}
          <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/30 rounded-2xl p-5 text-slate-100 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-sm text-slate-100">AI Post & Topic Generator</h3>
              </div>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-medium border border-sky-500/30">
                Gemini / DeepSeek / OpenAI
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Enter topic or prompt (e.g. 5 Tech Trends for 2026, Daily Crypto Market Analysis, New Product Launch)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">AI Engine</label>
                  <select
                    value={aiEngine}
                    onChange={(e) => setAiEngine(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="deepseek">DeepSeek AI</option>
                    <option value="openai">OpenAI (ChatGPT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Tone & Style</label>
                  <select
                    value={aiStyle}
                    onChange={(e) => setAiStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="Engaging & Professional">Engaging & Professional</option>
                    <option value="Casual & Friendly">Casual & Friendly</option>
                    <option value="Urgent & Promotional">Urgent & Promotional</option>
                    <option value="Educational & Detailed">Educational & Detailed</option>
                    <option value="Short & Punchy Announcement">Short & Punchy Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Language</label>
                  <select
                    value={aiLanguage}
                    onChange={(e) => setAiLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="English">English</option>
                    <option value="Khmer">Khmer (ភាសាខ្មែរ)</option>
                    <option value="French">French (Français)</option>
                    <option value="Chinese">Chinese (中文)</option>
                    <option value="Spanish">Spanish (Español)</option>
                  </select>
                </div>
              </div>

              {aiError && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{aiError}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={generatingAi || !aiTopic.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Wand2 className={`w-3.5 h-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
                  <span>{generatingAi ? 'Generating Post...' : 'Generate Telegram Post'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-md space-y-5">
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Message Content (HTML formatting supported)
                </label>
              <textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your broadcast message here... You can use HTML tags like <b>bold</b>, <i>italic</i>, <a href='...'>links</a>"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {/* Optional Headers & Footers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Optional Header Override</label>
                <input
                  type="text"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  placeholder="e.g. 🚨 SPECIAL ANNOUNCEMENT"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Optional Footer Override</label>
                <input
                  type="text"
                  value={customFooter}
                  onChange={(e) => setCustomFooter(e.target.value)}
                  placeholder="e.g. 📢 t.me/mychannel"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Results Feedback */}
            {results && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Broadcast Results Summary</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                    results.successCount === results.total ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {results.successCount} / {results.total} Succeeded
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {results.list.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
                      <div className="flex items-center space-x-2">
                        {r.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                        <span className="font-medium text-slate-200">{r.targetName}</span>
                        <span className="font-mono text-slate-500">({r.chatId})</span>
                      </div>
                      <span className={`text-[10px] ${r.success ? 'text-emerald-400' : 'text-rose-400 font-mono'}`}>
                        {r.success ? `Msg ID: ${r.messageId}` : r.errorDetails}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={sending || activeTargets.length === 0}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sending ? 'Dispatching...' : 'Send Broadcast Post'}</span>
              </button>
            </div>
          </form>
        </div>
        </div>

        {/* Target Selector Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-200">Select Destinations</h3>
              <p className="text-[11px] text-slate-400">Default sends to all active channels</p>
            </div>
            <button
              onClick={handleSelectAll}
              className="text-[11px] text-sky-400 hover:underline font-medium"
            >
              {selectedTargetIds.length === activeTargets.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {activeTargets.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No active targets available. Please add or activate target channels first.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {activeTargets.map((target) => {
                const isSelected = selectedTargetIds.includes(target.id) || selectedTargetIds.length === 0;
                return (
                  <label
                    key={target.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'bg-sky-500/10 border-sky-500/40 text-slate-100' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={selectedTargetIds.includes(target.id)}
                        onChange={() => handleToggleTarget(target.id)}
                        className="rounded border-slate-800 bg-slate-900 text-sky-500"
                      />
                      <div className="truncate">
                        <span className="font-semibold text-xs block truncate">{target.name}</span>
                        <span className="font-mono text-[10px] text-sky-400 block truncate">{target.chatId}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
