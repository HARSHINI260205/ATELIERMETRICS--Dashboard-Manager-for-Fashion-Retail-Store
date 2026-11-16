import { Download, RotateCcw, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AdminProfile } from '../types/retail';
import { apiFetch } from '../utils/api';

interface AdminSettingsViewProps {
  admin: AdminProfile;
  onExportFullReport: () => void;
  onDataReset: () => void;
}

export function AdminSettingsView({
  admin,
  onExportFullReport,
  onDataReset,
}: AdminSettingsViewProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sysMessage, setSysMessage] = useState<string | null>(null);

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    setSavingPw(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwMessage({ type: 'ok', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to update password.',
      });
    } finally {
      setSavingPw(false);
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    setSysMessage(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/admin/reset-data', {
        method: 'POST',
      });
      setSysMessage(res.message);
      setResetConfirm(false);
      onDataReset();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Admin Profile Card */}
      <div className="bg-white border border-[#D4D4CE] rounded-none p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            aria-label={admin.name}
            className="w-14 h-14 bg-[#111111] text-white flex items-center justify-center font-mono text-base font-medium tracking-wider shrink-0"
          >
            {admin.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">{admin.name}</h2>
            <div className="text-sm text-[#666664]">{admin.role}</div>
            <div className="text-xs font-mono text-[#666664] mt-0.5">{admin.email}</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-medium text-[#166534]">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Authenticated Administrator</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Password Security */}
        <div className="bg-white border border-[#D4D4CE] rounded-none p-6">
          <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">Update Admin Password</h3>
          <p className="text-xs text-[#666664] mt-0.5">
            Passwords are hashed using per-user scrypt salts on the server
          </p>

          <form onSubmit={handlePasswordChange} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs uppercase tracking-wide font-medium text-[#3A3A38]">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide font-medium text-[#3A3A38]">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm bg-[#FAFAFA] border border-[#D4D4D0] rounded-none"
              />
            </div>

            {pwMessage && (
              <div
                className={`p-3 rounded-none text-xs border ${
                  pwMessage.type === 'ok'
                    ? 'bg-[#F0F7F2] border-[#B8D8C2] text-[#166534]'
                    : 'bg-[#FDF2F2] border-[#E5B8B8] text-[#B91C1C]'
                }`}
              >
                {pwMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={savingPw}
              className="px-4 py-2 text-xs font-medium text-white bg-[#111111] rounded-none hover:bg-[#222222] disabled:opacity-60 cursor-pointer"
            >
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* System Operations */}
        <div className="bg-white border border-[#D4D4CE] rounded-none p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold uppercase tracking-tight text-[#111111]">System Data &amp; Exports</h3>
            <p className="text-xs text-[#666664] mt-0.5">
              Download executive ML forecast reports or restore initial seasonal catalog data
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={onExportFullReport}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-[#111111] bg-[#FAFAFA] border border-[#D4D4CE] rounded-none hover:bg-[#EAEAE6] cursor-pointer"
              >
                <span>Download Full ML Forecast &amp; Stock CSV</span>
                <Download className="w-4 h-4 text-[#666664]" aria-hidden="true" />
              </button>

              {!resetConfirm ? (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-[#B91C1C] bg-[#FDF2F2]/60 border border-[#E5B8B8] rounded-none hover:bg-[#FDF2F2] cursor-pointer"
                >
                  <span>Reset Retail Database to Seed Dataset</span>
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <div className="p-3 border border-[#E5B8B8] bg-[#FDF2F2] rounded-none space-y-2">
                  <div className="text-xs text-[#B91C1C] font-medium">
                    Confirm resetting products, sales history, and ML weights to default seed?
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={resetting}
                      onClick={handleResetDemo}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#B91C1C] rounded-none hover:bg-[#6E1A1A] cursor-pointer"
                    >
                      {resetting ? 'Resetting...' : 'Confirm Reset'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetConfirm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-[#111111] bg-white border border-[#D4D4D0] rounded-none cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {sysMessage && (
            <div className="mt-4 p-3 rounded-none bg-[#F0F7F2] border border-[#B8D8C2] text-xs text-[#166534]">
              {sysMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
