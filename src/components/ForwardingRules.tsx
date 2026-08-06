import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Edit3, CheckCircle2, Sliders, Filter, Sparkles, Tag, Layers } from 'lucide-react';
import type { ForwardingRule } from '../types';

interface ForwardingRulesProps {
  rules: ForwardingRule[];
  onAddRule: (rule: Partial<ForwardingRule>) => Promise<void>;
  onUpdateRule: (id: string, updated: Partial<ForwardingRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

export const ForwardingRules: React.FC<ForwardingRulesProps> = ({
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
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
  const [contentType, setContentType] = useState<'all' | 'text' | 'photo' | 'video' | 'document' | 'audio'>('all');
  const [includeKeywordsInput, setIncludeKeywordsInput] = useState('');
  const [excludeKeywordsInput, setExcludeKeywordsInput] = useState('');
  const [replacePairs, setReplacePairs] = useState<{ find: string; replaceWith: string }[]>([]);
  const [appendSignature, setAppendSignature] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setContentType('all');
    setIncludeKeywordsInput('');
    setExcludeKeywordsInput('');
    setReplacePairs([]);
    setAppendSignature('');
    setIsModalOpen(true);
  };

  const openEditModal = (rule: ForwardingRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setContentType(rule.contentType);
    setIncludeKeywordsInput((rule.includeKeywords || []).join(', '));
    setExcludeKeywordsInput((rule.excludeKeywords || []).join(', '));
    setReplacePairs(rule.replaceWords || []);
    setAppendSignature(rule.appendSignature || '');
    setIsModalOpen(true);
  };

  const handleAddReplacePair = () => {
    setReplacePairs([...replacePairs, { find: '', replaceWith: '' }]);
  };

  const handleUpdateReplacePair = (index: number, field: 'find' | 'replaceWith', value: string) => {
    const copy = [...replacePairs];
    copy[index][field] = value;
    setReplacePairs(copy);
  };

  const handleRemoveReplacePair = (index: number) => {
    setReplacePairs(replacePairs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim() || 'Forwarding Rule',
        contentType,
        includeKeywords: includeKeywordsInput.split(',').map(s => s.trim()).filter(Boolean),
        excludeKeywords: excludeKeywordsInput.split(',').map(s => s.trim()).filter(Boolean),
        replaceWords: replacePairs.filter(p => p.find.trim().length > 0),
        appendSignature: appendSignature.trim(),
        isActive: true,
      };

      if (editingId) {
        await onUpdateRule(editingId, payload);
      } else {
        await onAddRule(payload);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-slate-100">Content Filtering & Auto-Forwarding Rules</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated filters, keyword matching, media restrictions, and text transformations.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Filter Rule</span>
        </button>
      </div>

      {/* Rules Grid */}
      {rules.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Filter className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="font-semibold text-slate-200 text-sm">No Forwarding Rules Active</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            By default, all incoming messages are auto-forwarded. Create a rule to filter spam, match keywords, or replace text.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-sky-500 text-white font-medium text-xs hover:bg-sky-400 transition-colors"
          >
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-slate-900 border rounded-2xl p-5 text-slate-200 transition-all shadow-md relative flex flex-col justify-between ${
                rule.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-100">{rule.name}</h3>
                      <p className="text-[11px] text-slate-400">Type Filter: <span className="text-sky-300 font-semibold uppercase">{rule.contentType}</span></p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={(e) => onUpdateRule(rule.id, { isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2 text-xs">
                  {rule.includeKeywords && rule.includeKeywords.length > 0 && (
                    <div className="flex items-start space-x-2 text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                      <span className="font-semibold shrink-0">Must contain:</span>
                      <div className="flex flex-wrap gap-1">
                        {rule.includeKeywords.map((kw, i) => (
                          <span key={i} className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.excludeKeywords && rule.excludeKeywords.length > 0 && (
                    <div className="flex items-start space-x-2 text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                      <span className="font-semibold shrink-0">Exclude if contains:</span>
                      <div className="flex flex-wrap gap-1">
                        {rule.excludeKeywords.map((kw, i) => (
                          <span key={i} className="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded text-[10px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.replaceWords && rule.replaceWords.length > 0 && (
                    <div className="text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-300 block">Text Replacement ({rule.replaceWords.length})</span>
                      {rule.replaceWords.map((rw, i) => (
                        <div key={i} className="text-[11px] font-mono flex items-center space-x-1">
                          <span className="text-rose-300">{rw.find}</span>
                          <span>→</span>
                          <span className="text-emerald-300">{rw.replaceWith || '(remove)'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {rule.appendSignature && (
                    <p className="text-[11px] text-sky-300 bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono">
                      Signature: {rule.appendSignature}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-1">
                <button
                  onClick={() => openEditModal(rule)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Edit Rule"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteRule(rule.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete Rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Rule Modal */}
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
                {editingId ? 'Edit Filter Rule' : 'Create Forwarding Rule'}
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
                  <label className="block font-semibold text-slate-300 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Filter Spam & Append Hashtags"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Content Type Filter</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  >
                    <option value="all">All Content Types</option>
                    <option value="text">Text Messages Only</option>
                    <option value="photo">Photos Only</option>
                    <option value="video">Videos Only</option>
                    <option value="document">Documents & PDFs Only</option>
                    <option value="audio">Audio Files Only</option>
                  </select>
                </div>

                {/* Keyword Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-emerald-400 mb-1">Must Contain Keywords</label>
                    <input
                      type="text"
                      value={includeKeywordsInput}
                      onChange={(e) => setIncludeKeywordsInput(e.target.value)}
                      placeholder="e.g. #news, urgent, crypto"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Comma separated</p>
                  </div>

                  <div>
                    <label className="block font-semibold text-rose-400 mb-1">Exclude Spam Keywords</label>
                    <input
                      type="text"
                      value={excludeKeywordsInput}
                      onChange={(e) => setExcludeKeywordsInput(e.target.value)}
                      placeholder="e.g. [spam], casino, promo"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Comma separated</p>
                  </div>
                </div>

                {/* Find & Replace Words */}
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">Find & Replace Words/Links</span>
                    <button
                      type="button"
                      onClick={handleAddReplacePair}
                      className="text-[11px] text-sky-400 hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Pair</span>
                    </button>
                  </div>

                  {replacePairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={pair.find}
                        onChange={(e) => handleUpdateReplacePair(idx, 'find', e.target.value)}
                        placeholder="Find (e.g. @oldchan)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs font-mono"
                      />
                      <span className="text-slate-500">→</span>
                      <input
                        type="text"
                        value={pair.replaceWith}
                        onChange={(e) => handleUpdateReplacePair(idx, 'replaceWith', e.target.value)}
                        placeholder="Replace (@newchan)"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveReplacePair(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Append Rule Signature</label>
                  <input
                    type="text"
                    value={appendSignature}
                    onChange={(e) => setAppendSignature(e.target.value)}
                    placeholder="e.g. 🏷️ Tagged via Auto Forwarder"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Pinned Footer */}
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
                  {submitting ? 'Saving...' : editingId ? 'Update Rule' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
