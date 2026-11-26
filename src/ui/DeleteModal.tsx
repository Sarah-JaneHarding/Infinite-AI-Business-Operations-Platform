import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, X } from 'lucide-react';
import { useOps } from './store';

interface DeleteModalProps {
  isOpen: boolean;
  itemTitle: string;
  itemType: string;
  defaultSigner?: string;
  onClose: () => void;
  onConfirm: (reason: string, signature: string) => Promise<void>;
}

export function DeleteModal({ isOpen, itemTitle, itemType, defaultSigner, onClose, onConfirm }: DeleteModalProps) {
  let opsActorName = 'Operator';
  try {
    // Allow use both inside and outside OpsProvider (e.g. standalone legacy wrappers)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ops = useOps();
    if (ops?.actor?.name) opsActorName = ops.actor.name;
  } catch {
    opsActorName = 'Operator';
  }

  const resolvedSigner = defaultSigner || opsActorName || 'Operator';
  const [reason, setReason] = useState('');
  const [signature, setSignature] = useState(resolvedSigner);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setSignature(resolvedSigner);
    }
  }, [isOpen, resolvedSigner]);

  if (!isOpen) return null;

  const handleDeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A deletion reason is required under platform governance.');
      return;
    }
    if (!signature.trim()) {
      setError('A statutory signature is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim(), signature.trim());
      setReason('');
      setBusy(false);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#070b19] p-6 shadow-2xl text-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sign &amp; Authorise Deletion</h2>
              <p className="text-[11px] text-slate-400 font-mono">Statutory Governance Gate · Law 02</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs bg-rose-950/20 border border-rose-500/20 rounded-xl p-3">
          <p className="text-slate-300">
            You are about to delete <strong className="text-white">{itemType}</strong>: <span className="text-rose-300 font-semibold">"{itemTitle}"</span>.
          </p>
          <p className="text-slate-400 text-[11px]">
            This action requires an explicit audit reason and statutory signature recorded in the append-only audit ledger.
          </p>
        </div>

        <form onSubmit={handleDeed} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
              Deletion Reason / Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              className="textarea w-full text-xs bg-[#05070f] border-slate-700 text-slate-200 focus:border-rose-500"
              rows={3}
              placeholder="State the operational or compliance reason for deletion..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
              Authorised Signature (Name / ID) <span className="text-rose-400">*</span>
            </label>
            <input
              className="input w-full text-xs font-mono bg-[#05070f] border-slate-700 text-cyan-300 focus:border-rose-500"
              type="text"
              placeholder="e.g. Sarah-Jane Harding (CEO)"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              required
            />
          </div>

          {error && (
            <div role="alert" className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="btn text-xs px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !reason.trim() || !signature.trim()}
              className="btn danger text-xs px-4 py-2 flex items-center gap-1.5 font-bold bg-rose-700 hover:bg-rose-600 text-white disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{busy ? 'Signing & Deleting…' : 'Sign & Delete'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
