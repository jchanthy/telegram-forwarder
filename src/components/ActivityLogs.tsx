import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Trash2, Search, RefreshCw, Send, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { ForwardLog } from '../types';

interface ActivityLogsProps {
  logs: ForwardLog[];
  onClearLogs: () => Promise<void>;
  onRefreshLogs: () => void;
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs, onClearLogs, onRefreshLogs }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (statusFilter === 'success' && log.overallStatus !== 'success') return false;
    if (statusFilter === 'failed' && log.overallStatus === 'success') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchSnippet = log.messageSnippet?.toLowerCase().includes(term);
      const matchSource = log.sourceChatTitle?.toLowerCase().includes(term) || log.sourceSenderName?.toLowerCase().includes(term);
      if (!matchSnippet && !matchSource) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-slate-100">Live Activity & Delivery Logs</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit log of auto-forwarded posts, filter decisions, and Telegram API delivery statuses.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshLogs}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by text or sender..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center">
          {[
            { id: 'all', label: `All (${logs.length})` },
            { id: 'success', label: `Success (${logs.filter(l => l.overallStatus === 'success').length})` },
            { id: 'failed', label: `Errors (${logs.filter(l => l.overallStatus !== 'success').length})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === f.id
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Clock className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="font-semibold text-slate-200 text-sm">No Activity Logs Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Logs will automatically appear here when messages or forwards are posted to your bot.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isSuccess = log.overallStatus === 'success';

            return (
              <div
                key={log.id}
                className={`bg-slate-900 border rounded-2xl p-4 text-slate-200 transition-all ${
                  isSuccess ? 'border-slate-800' : 'border-rose-500/30'
                }`}
              >
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start space-x-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>

                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-100">{log.sourceChatTitle || log.sourceSenderName}</span>
                        {log.sourceSenderUsername && (
                          <span className="text-[11px] text-sky-400 font-mono">{log.sourceSenderUsername}</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                          {log.messageType}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 font-sans">
                        "{log.messageSnippet}"
                      </p>

                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      isSuccess
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : log.overallStatus === 'partial'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {log.overallStatus.toUpperCase()}
                    </span>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>

                {/* Expanded Target Details */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs animate-in fade-in duration-150">
                    <span className="font-semibold text-slate-400 block text-[11px]">Destination Delivery Breakdown:</span>
                    {log.targetResults.length === 0 ? (
                      <p className="text-slate-500 italic text-[11px]">No active target destinations match or were configured at the time.</p>
                    ) : (
                      log.targetResults.map((tr, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                          <div className="flex items-center space-x-2">
                            {tr.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-200">{tr.targetName}</span>
                            <span className="font-mono text-slate-500">({tr.chatId})</span>
                          </div>

                          <div className="text-[11px] font-mono text-right">
                            {tr.success ? (
                              <span className="text-emerald-400">Delivered (Msg ID: {tr.messageId})</span>
                            ) : (
                              <span className="text-rose-400 font-sans">{tr.errorDetails}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
