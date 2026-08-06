import React, { useState, useEffect } from 'react';
import { Plus, Send, Radio, Settings, Trash2, CheckCircle2, AlertCircle, ShieldCheck, Copy, Link as LinkIcon, UserX, ExternalLink, HelpCircle } from 'lucide-react';
import type { TargetDestination, ForwardMode } from '../types';

interface TargetDestinationsProps {
  targets: TargetDestination[];
  onAddTarget: (targetData: Partial<TargetDestination>) => Promise<void>;
  onUpdateTarget: (id: string, updated: Partial<TargetDestination>) => Promise<void>;
  onDeleteTarget: (id: string) => Promise<void>;
  onCheckPermissions: (chatId: string) => Promise<{ success: boolean; chat?: any; isMemberOrAdmin?: boolean; error?: string }>;
}

export const TargetDestinations: React.FC<TargetDestinationsProps> = ({
  targets,
  onAddTarget,
  onUpdateTarget,
  onDeleteTarget,
  onCheckPermissions,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [chatId, setChatId] = useState('');
  const [isChannel, setIsChannel] = useState(true);
  const [forwardMode, setForwardMode] = useState<ForwardMode>('copy');
  const [customHeader, setCustomHeader] = useState('');
  const [customFooter, setCustomFooter] = useState('');
  const [removeLinks, setRemoveLinks] = useState(false);
  const [removeUsernames, setRemoveUsernames] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [permChecking, setPermChecking] = useState<string | null>(null);
  const [permResult, setPermResult] = useState<{ id: string; msg: string; isOk: boolean } | null>(null);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setChatId('');
    setIsChannel(true);
    setForwardMode('copy');
    setCustomHeader('');
    setCustomFooter('');
    setRemoveLinks(false);
    setRemoveUsernames(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (target: TargetDestination) => {
    setEditingId(target.id);
    setName(target.name);
    setChatId(target.chatId);
    setIsChannel(target.isChannel);
    setForwardMode(target.forwardMode);
    setCustomHeader(target.customHeader || '');
    setCustomFooter(target.customFooter || '');
    setRemoveLinks(target.removeLinks || false);
    setRemoveUsernames(target.removeUsernames || false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) {
      setFormError('Chat ID or Channel Username is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name: name.trim() || chatId.trim(),
        chatId: chatId.trim(),
        isChannel,
        forwardMode,
        customHeader: customHeader.trim(),
        customFooter: customFooter.trim(),
        removeLinks,
        removeUsernames,
      };

      if (editingId) {
        await onUpdateTarget(editingId, payload);
      } else {
        await onAddTarget(payload);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save destination');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestChatPermission = async (target: TargetDestination) => {
    setPermChecking(target.id);
    setPermResult(null);
    try {
      const res = await onCheckPermissions(target.chatId);
      if (res.success) {
        setPermResult({
          id: target.id,
          msg: `Verified! Bot is registered in ${res.chat?.title || target.name} (${res.chat?.type || 'chat'})`,
          isOk: true,
        });
      } else {
        setPermResult({
          id: target.id,
          msg: res.error || 'Bot cannot reach this chat ID. Make sure bot is added as Admin!',
          isOk: false,
        });
      }
    } catch (err: any) {
      setPermResult({
        id: target.id,
        msg: err.message || 'Verification failed.',
        isOk: false,
      });
    } finally {
      setPermChecking(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-slate-100">Target Channels & Groups</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Specify Telegram channels or groups where received messages should be automatically forwarded.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Target Destination</span>
        </button>
      </div>

      {/* Target Destinations Grid */}
      {targets.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Send className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="font-semibold text-slate-200 text-sm">No Target Destinations Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Add a Telegram channel (@mychannel or -1001234567890) or group to start auto-forwarding incoming posts.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-sky-500 text-white font-medium text-xs hover:bg-sky-400 transition-colors"
          >
            Add First Target
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targets.map((target) => (
            <div
              key={target.id}
              className={`bg-slate-900 border rounded-2xl p-5 text-slate-200 transition-all shadow-md relative flex flex-col justify-between ${
                target.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'
              }`}
            >
              <div>
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      target.isChannel ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {target.isChannel ? '📢' : '💬'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-slate-100">{target.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          target.isChannel ? 'bg-sky-500/10 text-sky-300' : 'bg-emerald-500/10 text-emerald-300'
                        }`}>
                          {target.isChannel ? 'Channel' : 'Group'}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-sky-400 mt-0.5">{target.chatId}</p>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={target.isActive}
                      onChange={(e) => onUpdateTarget(target.id, { isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* Badges & Mode Info */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 font-medium flex items-center space-x-1">
                    <Copy className="w-3 h-3 text-sky-400" />
                    <span>Mode: {target.forwardMode === 'copy' ? 'Clean Copy (No Header)' : 'Native Forward'}</span>
                  </span>

                  {target.customHeader && (
                    <span className="px-2 py-1 rounded-md bg-slate-800/80 text-amber-300 border border-amber-500/20">
                      Header Set
                    </span>
                  )}
                  {target.customFooter && (
                    <span className="px-2 py-1 rounded-md bg-slate-800/80 text-emerald-300 border border-emerald-500/20">
                      Footer Set
                    </span>
                  )}
                  {target.removeLinks && (
                    <span className="px-2 py-1 rounded-md bg-slate-800/80 text-rose-300">
                      Strip Links
                    </span>
                  )}
                </div>

                {/* Permission Check Result if triggered */}
                {permResult && permResult.id === target.id && (
                  <div className={`mt-3 p-2.5 rounded-xl text-xs flex items-start space-x-2 ${
                    permResult.isOk ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}>
                    {permResult.isOk ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{permResult.msg}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => handleTestChatPermission(target)}
                  disabled={permChecking === target.id}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1 transition-colors disabled:opacity-50"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${permChecking === target.id ? 'animate-spin' : ''}`} />
                  <span>{permChecking === target.id ? 'Checking...' : 'Check Permission'}</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(target)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Edit Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTarget(target.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Destination"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick How to Find Chat ID Helper Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-slate-300 text-xs space-y-2">
        <h4 className="font-semibold text-slate-200 flex items-center space-x-1.5 text-sm">
          <HelpCircle className="w-4 h-4 text-sky-400" />
          <span>How to find Telegram Channel/Group Chat IDs</span>
        </h4>
        <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed">
          <li>For <strong className="text-slate-200">Public Channels</strong>: Use the public username directly starting with <code className="bg-slate-800 text-sky-300 px-1 rounded">@mychannelname</code>.</li>
          <li>For <strong className="text-slate-200">Private Channels/Supergroups</strong>: Add <code className="bg-slate-800 text-slate-200 px-1 rounded">@userinfobot</code> or <code className="bg-slate-800 text-slate-200 px-1 rounded">@raw_data_bot</code> to the channel, or forward a message from the channel to them to get the Chat ID (starts with <code className="bg-slate-800 text-sky-300 px-1 rounded">-100...</code>).</li>
          <li><strong className="text-slate-200">Critical Requirement</strong>: You MUST add your bot as an <strong className="text-sky-400">Administrator</strong> in the channel/group with <strong className="text-sky-400 font-semibold">Post Messages</strong> permission enabled!</li>
        </ul>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <h3 className="font-bold text-base text-slate-100">
                {editingId ? 'Edit Destination Settings' : 'Add Target Destination'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Name / Label</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Official Tech Broadcast Channel"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Chat ID or Channel Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. @mychannel or -1001987654321"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Destination Type & Forwarding Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Destination Type</label>
                    <select
                      value={isChannel ? 'channel' : 'group'}
                      onChange={(e) => setIsChannel(e.target.value === 'channel')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                    >
                      <option value="channel">Telegram Channel</option>
                      <option value="group">Telegram Group / Supergroup</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Forwarding Mode</label>
                    <select
                      value={forwardMode}
                      onChange={(e) => setForwardMode(e.target.value as ForwardMode)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                    >
                      <option value="copy">Clean Copy (copyMessage)</option>
                      <option value="forward">Native Forward (forwardMessage)</option>
                    </select>
                  </div>
                </div>

                {/* Clean Copy Customizations */}
                {forwardMode === 'copy' && (
                  <div className="space-y-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                    <span className="font-semibold text-sky-400 text-[11px] block">Copy Mode Text Customization</span>
                    
                    <div>
                      <label className="block text-slate-400 mb-1">Target Custom Header (Prepended)</label>
                      <input
                        type="text"
                        value={customHeader}
                        onChange={(e) => setCustomHeader(e.target.value)}
                        placeholder="e.g. 📢 [CHANNEL ANNOUNCEMENT]"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Target Custom Footer (Appended)</label>
                      <input
                        type="text"
                        value={customFooter}
                        onChange={(e) => setCustomFooter(e.target.value)}
                        placeholder="e.g. 🔗 Subscribe to @mychannel"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                      <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={removeLinks}
                          onChange={(e) => setRemoveLinks(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-900 text-sky-500"
                        />
                        <span>Strip External Web Links</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={removeUsernames}
                          onChange={(e) => setRemoveUsernames(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-900 text-sky-500"
                        />
                        <span>Strip @usernames</span>
                      </label>
                    </div>
                  </div>
                )}

                {formError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                    {formError}
                  </div>
                )}
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className="px-5 py-3.5 border-t border-slate-800/80 flex items-center justify-end space-x-2 shrink-0 bg-slate-900/90 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-400 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Target' : 'Add Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
