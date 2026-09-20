'use client';

import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Flag, Ban, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAnonymousId: string;
  targetAlias: string;
  messageId?: string;
  mode: 'report' | 'block';
}

export const SafetyModal: React.FC<SafetyModalProps> = ({
  isOpen,
  onClose,
  targetAnonymousId,
  targetAlias,
  messageId,
  mode,
}) => {
  const { removeUserFromNearby, removeMessageFromView } = useSocket();
  const [reason, setReason] = useState<string>('spam');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ApiService.reportUser(targetAnonymousId, reason, details, messageId);
      setSuccessMessage('Report submitted. Thank you for keeping AnymChat safe.');
      if (messageId) {
        removeMessageFromView(messageId);
      }
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    setIsSubmitting(true);
    try {
      await ApiService.blockUser(targetAnonymousId);
      removeUserFromNearby(targetAnonymousId);
      setSuccessMessage(`${targetAlias} has been blocked.`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl glass-panel p-6 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {mode === 'report' ? (
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Flag className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <Ban className="w-5 h-5" />
              </div>
            )}
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {mode === 'report' ? `Report ${targetAlias}` : `Block ${targetAlias}?`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Message Banner */}
        {successMessage ? (
          <div className="my-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        ) : mode === 'report' ? (
          /* Report Form */
          <form onSubmit={handleReport} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason for reporting
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="spam">Spam or unwanted advertising</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="hate_speech">Hate speech or discrimination</option>
                <option value="inappropriate">Inappropriate or NSFW content</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Help us understand the situation..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        ) : (
          /* Block Confirmation */
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Blocking <strong>{targetAlias}</strong> will immediately hide all their messages from your 10 KM feed and prevent them from sending you direct messages.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlock}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all"
              >
                {isSubmitting ? 'Blocking...' : 'Yes, Block User'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
