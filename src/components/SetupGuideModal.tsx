import React, { useEffect } from 'react';
import { BookOpen, CheckCircle2, Copy, ExternalLink, Bot, ShieldCheck, Send, ArrowRight, Sparkles } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col text-slate-100 shadow-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 shrink-0 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">Telegram Bot Setup Guide</h2>
              <p className="text-xs text-slate-400">How to setup auto-forwarding to your Telegram Channels & Groups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar flex-1 text-xs text-slate-300">
          
          {/* Flow Diagram */}
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 text-xs space-y-3">
            <div className="font-bold text-sky-300 text-sm flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>How Your Forwarding Workflow Works</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-sky-400">Step 1</span>
                <p className="font-bold text-slate-200 text-xs">You Send or Forward</p>
                <p className="text-[11px] text-slate-400">Post any message, photo, or link to your Telegram Bot in private chat.</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-400">Step 2</span>
                <p className="font-bold text-slate-200 text-xs">Bot Receives & Filters</p>
                <p className="text-[11px] text-slate-400">This engine processes rules, replaces text, adds headers & footers.</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-400">Step 3</span>
                <p className="font-bold text-slate-200 text-xs">Auto-Forwards to Channels</p>
                <p className="text-[11px] text-slate-400">Bot posts to your target Groups & Channels (where bot is Admin).</p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            
            {/* Step 1 */}
            <div className="flex items-start space-x-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-7 h-7 rounded-xl bg-sky-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                  <span>Create Telegram Bot & Get API Token</span>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline flex items-center space-x-1 text-xs"
                  >
                    <span>Open @BotFather</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Open Telegram and search for <strong className="text-slate-200">@BotFather</strong>. Send command <code className="bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded font-mono">/newbot</code>, follow prompts to choose a bot name & username, then copy the generated HTTP API Token.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start space-x-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-7 h-7 rounded-xl bg-sky-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-sm text-slate-100">Add Bot as Channel / Group Administrator</h3>
                <p className="text-slate-400 leading-relaxed">
                  Open your target Telegram Channel or Group → Settings → <strong className="text-slate-200">Administrators</strong> → <strong className="text-slate-200">Add Administrator</strong> → Search your bot's username (e.g. <code className="bg-slate-800 text-sky-300 px-1 py-0.5 rounded font-mono">@my_forwarder_bot</code>) and enable <strong className="text-sky-400 font-semibold">Post Messages</strong> rights.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start space-x-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-7 h-7 rounded-xl bg-sky-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-sm text-slate-100">Obtain Channel / Group Chat ID</h3>
                <p className="text-slate-400 leading-relaxed">
                  • For <strong className="text-slate-200">Public Channels</strong>: Simply use the handle e.g. <code className="bg-slate-800 text-sky-300 px-1 py-0.5 rounded font-mono">@my_channel</code>.<br />
                  • For <strong className="text-slate-200">Private Channels or Groups</strong>: Forward a post from the channel to <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">@userinfobot</code> or <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">@raw_data_bot</code> to reveal the Chat ID (e.g. <code className="bg-slate-800 text-sky-300 px-1 py-0.5 rounded font-mono">-1001234567890</code>).
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start space-x-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-7 h-7 rounded-xl bg-sky-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                4
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-sm text-slate-100">Paste & Forward</h3>
                <p className="text-slate-400 leading-relaxed">
                  Paste your Bot Token in the <strong className="text-slate-200">Bot Credentials</strong> tab and add your Chat ID in <strong className="text-slate-200">Targets & Destinations</strong> tab. Now send or forward any post to your Telegram Bot and it will automatically broadcast to all configured channels!
                </p>
              </div>
            </div>

          </div>

          {/* FAQ & Troubleshooting section */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-amber-400 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Troubleshooting Group & Admin Permissions</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-100">❓ "I am Admin in my Group, but I cannot add my Bot to that Group!"</h4>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  If Telegram fails or prevents adding your bot:
                </p>
                <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1 pl-1">
                  <li><strong className="text-amber-300">Check @BotFather Group Privacy</strong>: Open <code className="bg-slate-800 text-sky-300 px-1 rounded">@BotFather</code> → send <code className="bg-slate-800 text-sky-300 px-1 rounded">/setjoingroups</code> → select your bot → set to <strong className="text-emerald-400">Enable</strong>. (If disabled, Telegram blocks the bot from joining groups).</li>
                  <li><strong className="text-amber-300">Add Directly as Administrator</strong>: Don't add as regular member. Go to Group Info → Edit → Administrators → Add Administrator → Search <code className="bg-slate-800 text-sky-300 px-1 rounded">@your_bot_username</code>.</li>
                  <li><strong className="text-amber-300">Group Permission Settings</strong>: Check Group Settings → Permissions → ensure "Add Members" is permitted, or that your Admin role has "Add New Admins" permission.</li>
                </ul>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-100">❓ "Why MUST my Bot be an Admin instead of a Normal User?"</h4>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Telegram API enforcement rules:
                </p>
                <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1 pl-1">
                  <li><strong className="text-sky-300">Channel Posting</strong>: Telegram completely blocks normal users and normal non-admin bots from posting in Channels. Bots MUST be added as Administrators with <strong className="text-emerald-400 font-semibold">"Post Messages"</strong> rights.</li>
                  <li><strong className="text-sky-300">Group Posting</strong>: Giving the bot Admin rights bypasses group slow-modes, media restrictions, link filters, and ensures automated messages forward 24/7 without being blocked.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Pinned Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end shrink-0 bg-slate-900 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-colors shadow-md shadow-sky-500/20"
          >
            Got it, Let's Setup!
          </button>
        </div>

      </div>
    </div>
  );
};
