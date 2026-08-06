import React, { useState } from 'react';
import { Play, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Send, ArrowRight } from 'lucide-react';

interface InteractiveSimulatorProps {
  onSimulateMessage: (payload: {
    text: string;
    senderName: string;
    senderUsername: string;
    isForwarded: boolean;
    forwardSourceTitle: string;
    messageType: 'text' | 'photo' | 'video' | 'document';
  }) => Promise<{ success: boolean; message: string }>;
  onRefreshLogs: () => void;
}

export const InteractiveSimulator: React.FC<InteractiveSimulatorProps> = ({
  onSimulateMessage,
  onRefreshLogs,
}) => {
  const [text, setText] = useState('🔥 Breaking Tech News: AI Studio launches instant auto-forwarder bot engine for Telegram! Check out https://ai.studio');
  const [senderName, setSenderName] = useState('John Doe');
  const [senderUsername, setSenderUsername] = useState('@johndoe');
  const [isForwarded, setIsForwarded] = useState(true);
  const [forwardSourceTitle, setForwardSourceTitle] = useState('Source Tech Channel');
  const [messageType, setMessageType] = useState<'text' | 'photo' | 'video' | 'document'>('text');

  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimResult(null);
    setSimError(null);

    try {
      const res = await onSimulateMessage({
        text,
        senderName,
        senderUsername,
        isForwarded,
        forwardSourceTitle,
        messageType,
      });

      setSimResult('Simulated message processed! Check Activity Logs tab to inspect auto-forwarding results.');
      onRefreshLogs();
    } catch (err: any) {
      setSimError(err.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-slate-100">Interactive Bot Event Simulator</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Test your forwarding rules, headers/footers, and keyword filters by simulating an incoming message or channel forward.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-md space-y-6">
        <form onSubmit={handleSimulate} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Simulated Sender Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Simulated Username</label>
              <input
                type="text"
                value={senderUsername}
                onChange={(e) => setSenderUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Message Type</label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
              >
                <option value="text">Text Message</option>
                <option value="photo">Photo Post</option>
                <option value="video">Video Post</option>
                <option value="document">Document Attachment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Is Forwarded Message?</label>
              <select
                value={isForwarded ? 'yes' : 'no'}
                onChange={(e) => setIsForwarded(e.target.value === 'yes')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
              >
                <option value="yes">Yes (Forwarded from Channel/Group)</option>
                <option value="no">No (Direct Message posted to Bot)</option>
              </select>
            </div>
          </div>

          {isForwarded && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Source Channel / Group Title</label>
              <input
                type="text"
                value={forwardSourceTitle}
                onChange={(e) => setForwardSourceTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Message Text / Caption</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
            />
          </div>

          {simResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{simResult}</span>
            </div>
          )}

          {simError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{simError}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={simulating}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{simulating ? 'Processing Event...' : 'Simulate Incoming Post'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
