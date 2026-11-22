import { ReactNode, useState } from 'react';
import {
  AlertOctagon,
  ArrowLeftRight,
  LogIn,
  LogOut,
  Menu,
  Plus,
  ScanLine,
  ShieldCheck,
  TableProperties,
  User,
  X,
} from 'lucide-react';
import { ScreenRoute } from '../types/verification';
import { UserProfile } from '../lib/firebase';

interface NavigationShellProps {
  activeScreen: ScreenRoute;
  onNavigate: (route: ScreenRoute) => void;
  disputedCount: number;
  pendingCount: number;
  currentUser: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

interface NavItem {
  id: ScreenRoute;
  label: string;
  mobileLabel: string;
  Icon: typeof TableProperties;
  badgeCount?: number;
}

export function NavigationShell({
  activeScreen,
  onNavigate,
  disputedCount,
  pendingCount,
  currentUser,
  onSignIn,
  onSignOut,
  children,
}: NavigationShellProps) {
  const [tabletMenuOpen, setTabletMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      id: 'verify',
      label: 'Instant Verify',
      mobileLabel: 'Verify',
      Icon: ScanLine,
    },
    {
      id: 'ledger',
      label: 'Vouch Ledger',
      mobileLabel: 'Ledger',
      Icon: TableProperties,
      badgeCount: pendingCount,
    },
    {
      id: 'disputes',
      label: 'Dispute Queue',
      mobileLabel: 'Disputes',
      Icon: AlertOctagon,
      badgeCount: disputedCount,
    },
    {
      id: 'reconciliation',
      label: 'Reconciliation',
      mobileLabel: 'Reconcile',
      Icon: ArrowLeftRight,
    },
  ];

  const activeNav = navItems.find((item) => item.id === activeScreen) ?? navItems[0];

  const handleSelect = (route: ScreenRoute) => {
    onNavigate(route);
    setTabletMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F8FAFC] flex flex-col lg:flex-row antialiased selection:bg-[#397BFF]/30 selection:text-white">
      {/* Desktop Fixed Left Sidebar (268px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[268px] lg:fixed lg:inset-y-0 lg:left-0 bg-[#0d1322] border-r border-[#233554] z-30">
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#1E293B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#397BFF] flex items-center justify-center shadow-[0_0_16px_rgba(57,123,255,0.3)] shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              VouchPay
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/20">
            v2.0
          </span>
        </div>

        <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto" aria-label="Primary Navigation">
          {navItems.map(({ id, label, Icon, badgeCount }) => {
            const isActive = activeScreen === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1C2A44] text-white border border-[#397BFF]/40 shadow-[0_0_16px_rgba(57,123,255,0.12)]'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#151F32] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#397BFF]' : 'text-[#64748B]'
                    }`}
                  />
                  <span className="truncate">{label}</span>
                </span>
                {typeof badgeCount === 'number' && badgeCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold tabular-nums shrink-0 ${
                      id === 'disputes'
                        ? 'bg-[#EF4444]/15 text-[#EF4444]'
                        : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account / Google Sign-In Footer */}
        <div className="p-4 border-t border-[#1E293B] shrink-0">
          {currentUser ? (
            <div className="p-3 rounded-xl bg-[#151F32] border border-[#233554] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border border-[#233554] shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#397BFF]/20 border border-[#397BFF]/40 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#397BFF]" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentUser.displayName || 'User'}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] font-mono truncate">
                    {currentUser.email || 'Cloud Firestore'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                title="Sign Out"
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#1C2A44] transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#151F32] hover:bg-[#1C2A44] border border-[#233554] hover:border-[#397BFF]/50 text-white text-xs font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-[#397BFF]" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </aside>

      {/* Tablet Slide-Over Drawer (md to lg) */}
      {tabletMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B1120]/80 backdrop-blur-[6px]"
            onClick={() => setTabletMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] bg-[#0d1322] border-r border-[#233554] flex flex-col h-full">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#397BFF] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="font-display text-base font-bold text-white whitespace-nowrap">
                  VouchPay
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTabletMenuOpen(false)}
                aria-label="Close navigation menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {navItems.map(({ id, label, Icon, badgeCount }) => {
                const isActive = activeScreen === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelect(id)}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#1C2A44] text-white border border-[#397BFF]/40'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#151F32]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#397BFF]' : 'text-[#64748B]'}`} />
                      <span>{label}</span>
                    </span>
                    {typeof badgeCount === 'number' && badgeCount > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold tabular-nums ${
                          id === 'disputes'
                            ? 'bg-[#EF4444]/15 text-[#EF4444]'
                            : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#1E293B]">
              {currentUser ? (
                <div className="p-3 rounded-xl bg-[#151F32] border border-[#233554] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#397BFF]/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[#397BFF]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {currentUser.displayName || 'User'}
                      </p>
                      <p className="text-[10px] text-[#94A3B8] truncate">
                        {currentUser.email || 'Cloud Sync'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#1C2A44]"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#151F32] border border-[#233554] text-white text-xs font-medium flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-[#397BFF]" />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[268px] flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Sticky Top Header Bar (Glassmorphic, compact on mobile) */}
        <header className="sticky top-0 z-20 h-14 md:h-16 bg-[#0B1120]/85 backdrop-blur-md border-b border-[#1E293B] px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Tablet drawer trigger */}
            <button
              type="button"
              onClick={() => setTabletMenuOpen(true)}
              aria-label="Open navigation menu"
              className="hidden md:flex lg:hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#233554] bg-[#151F32] text-[#F8FAFC] hover:border-[#397BFF] transition-colors shrink-0 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile compact brand mark */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#397BFF] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex items-center gap-2">
              <h1 className="font-display text-base md:text-lg font-semibold text-white tracking-tight truncate">
                {activeNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Mobile / Tablet Google Sign-in indicator */}
            <div className="flex lg:hidden items-center">
              {currentUser ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  title={`Signed in as ${currentUser.displayName || currentUser.email}. Tap to sign out.`}
                  className="flex items-center gap-2 p-1 rounded-full bg-[#151F32] border border-[#233554] hover:border-[#397BFF]/50 transition-colors"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-7 h-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#397BFF]/20 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-[#397BFF]" />
                    </div>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-2.5 py-1.5 rounded-lg bg-[#151F32] border border-[#233554] text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#397BFF]" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>

            {activeScreen !== 'verify' && (
              <button
                type="button"
                onClick={() => handleSelect('verify')}
                className="min-h-[36px] md:min-h-[40px] px-3 md:px-4 rounded-lg bg-[#397BFF] hover:bg-[#2B69EE] text-white text-xs md:text-sm font-semibold inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(57,123,255,0.3)] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Verify Payment</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-5 md:py-7">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0B1120]/95 backdrop-blur-md border-t border-[#233554] pb-safe"
      >
        <div className="grid grid-cols-4 h-14 items-center">
          {navItems.map(({ id, mobileLabel, Icon, badgeCount }) => {
            const isActive = activeScreen === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  isActive ? 'text-[#397BFF]' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#397BFF]"
                    aria-hidden="true"
                  />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {typeof badgeCount === 'number' && badgeCount > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center ${
                        id === 'disputes'
                          ? 'bg-[#EF4444] text-white'
                          : 'bg-[#F59E0B] text-[#0B1120]'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                  {mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
