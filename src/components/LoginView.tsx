import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AdminProfile } from '../types/retail';
import { apiFetch, setStoredToken } from '../utils/api';
import { InteractiveBackdrop } from './InteractiveBackdrop';

interface LoginViewProps {
  onSuccess: (admin: AdminProfile) => void;
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('admin@ateliermetrics.com');
  const [password, setPassword] = useState('FashionML@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; admin: AdminProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(res.token);
      onSuccess(res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAEAE6] flex flex-col lg:flex-row">
      {/* Left Streetwear Architectural Typographic Column */}
      <div className="lg:w-1/2 relative min-h-[380px] lg:min-h-screen bg-[#111111] text-white overflow-hidden flex flex-col justify-between p-8 lg:p-14">
        {/* Pointer-reactive architectural grid & pattern vectors */}
        <InteractiveBackdrop variant="dark" containerScoped />

        <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-6">
          <div className="font-display text-2xl font-bold tracking-tight uppercase text-white">
            AtelierMetrics
          </div>
          <span className="text-xs tracking-[0.16em] uppercase text-[#FF6B4A] font-mono">
            AW26 · DROP 04
          </span>
        </div>

        <div className="relative z-10 my-10">
          <div className="text-xs font-mono uppercase tracking-[0.16em] text-[#A3A39E]">
            Streetwear Retail Operations
          </div>
          <h1 className="mt-4 font-display text-5xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-white leading-[0.92]">
            Streetwear
            <br />
            Demand
            <br />
            Systems.
          </h1>
          <p className="mt-6 text-sm text-[#BDBDB8] leading-relaxed max-w-md">
            Technical outerwear, heavyweight fleece, and footwear inventory intelligence powered by Random Forest demand forecasting and dynamic markdown optimization.
          </p>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/15 grid grid-cols-3 gap-6">
          <div>
            <div className="font-mono text-base text-white tabular-nums">12 SKUs</div>
            <div className="mt-0.5 text-xs text-[#8E8E88]">Archive &amp; Core</div>
          </div>
          <div>
            <div className="font-mono text-base text-white tabular-nums">14 Mos</div>
            <div className="mt-0.5 text-xs text-[#8E8E88]">Sell-Through</div>
          </div>
          <div>
            <div className="font-mono text-base text-[#FF6B4A] tabular-nums">40 Trees</div>
            <div className="mt-0.5 text-xs text-[#8E8E88]">Random Forest</div>
          </div>
        </div>
      </div>

      {/* Right Concrete Spec Login Plane */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 sm:p-14 bg-[#F5F5F2] border-l border-[#D4D4CE]">
        <div className="w-full max-w-sm">
          <div className="text-xs font-mono tracking-[0.14em] uppercase text-[#666664]">
            Store Operations · Portal
          </div>
          <h2 className="mt-2 font-display text-4xl font-semibold uppercase text-[#111111]">
            Admin Sign In
          </h2>
          <p className="mt-2 text-sm text-[#555552]">
            Authenticate to manage capsule inventory, markdown elasticity, and ML drop forecasts.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-xs font-mono uppercase tracking-wider text-[#111111]">
                Admin Email
              </label>
              <div className="mt-1.5 relative">
                <Mail className="w-4 h-4 text-[#777774] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#C8C8C2] rounded-none text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  placeholder="admin@ateliermetrics.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-mono uppercase tracking-wider text-[#111111]">
                Password
              </label>
              <div className="mt-1.5 relative">
                <Lock className="w-4 h-4 text-[#777774] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#C8C8C2] rounded-none text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-none bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-[#111111] hover:bg-[#E53E1D] disabled:opacity-60 text-white text-xs font-mono tracking-[0.14em] uppercase font-medium rounded-none transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Console'}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#D4D4CE] flex items-center justify-between gap-4 text-xs text-[#666664]">
            <div>
              <span className="font-mono text-[#111111]">admin@ateliermetrics.com</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@ateliermetrics.com');
                setPassword('FashionML@2026');
              }}
              className="text-[#E53E1D] underline underline-offset-4 hover:text-[#111111] font-medium whitespace-nowrap cursor-pointer"
            >
              Fill Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
