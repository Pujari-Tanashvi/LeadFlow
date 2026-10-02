import React from 'react';
import { Brokerage, UserRole, WorkspaceTab } from '../types';
import { soundManager } from '../utils/audio';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Kanban, 
  FileCheck2, 
  BarChart3, 
  Cpu, 
  UserCircle,
  Building2,
  Plus,
  Download,
  LogOut
} from 'lucide-react';

interface NavigationProps {
  currentTab: 'showcase' | 'pipeline' | 'documents' | 'analytics' | 'automations' | 'client_portal';
  setCurrentTab: (tab: 'showcase' | 'pipeline' | 'documents' | 'analytics' | 'automations' | 'client_portal') => void;
  activeRole: UserRole;
  setActiveRole?: (role: UserRole) => void;
  activeBrokerage: Brokerage;
  setActiveBrokerage?: (b: Brokerage) => void;
  brokerages: Brokerage[];
  onOpenIngestModal: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  liveSyncActive: boolean;
  setLiveSyncActive: (val: boolean) => void;
  /** Tabs the signed-in role is allowed to open. */
  availableTabs?: WorkspaceTab[];
  /** Signed-in identity, shown next to the role badge. */
  accountLabel?: string;
  onSignOut?: () => void;
}

const ALL_TABS: WorkspaceTab[] = [
  'showcase',
  'pipeline',
  'documents',
  'analytics',
  'automations',
  'client_portal',
];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  activeRole,
  setActiveRole,
  activeBrokerage,
  setActiveBrokerage,
  brokerages,
  onOpenIngestModal,
  soundEnabled,
  setSoundEnabled,
  liveSyncActive,
  setLiveSyncActive,
  availableTabs,
  accountLabel,
  onSignOut,
}) => {
  const visibleTabs = availableTabs ?? ALL_TABS;
  const isVisible = (tab: WorkspaceTab) => visibleTabs.includes(tab);

  const handleTabChange = (tab: typeof currentTab) => {
    soundManager.playClick();
    setCurrentTab(tab);
  };

  const handleBrokerageChange = (brokerageId: string) => {
    if (!setActiveBrokerage) return;
    const found = brokerages.find(b => b.id === brokerageId);
    if (found) {
      soundManager.playClick();
      setActiveBrokerage(found);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark (Single text element in clean display face) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center text-white font-bold text-sm shadow-md ring-1 ring-white/50">
            LF
          </div>
          <button 
            onClick={() => handleTabChange('showcase')}
            className="text-left group cursor-pointer"
          >
            <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors">
              LeadFlow
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single-line, 4-6 links) */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-200/50 backdrop-blur-md rounded-xl border border-white/60">
          {isVisible('showcase') && (
          <button
            onClick={() => handleTabChange('showcase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              currentTab === 'showcase'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Dashboard</span>
          </button>
          )}

          {isVisible('pipeline') && (
          <button
            onClick={() => handleTabChange('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              currentTab === 'pipeline'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 text-blue-500" />
            <span>Leads & Pipeline</span>
          </button>
          )}

          {isVisible('documents') && (
          <button
            onClick={() => handleTabChange('documents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              currentTab === 'documents'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Documents</span>
          </button>
          )}

          {isVisible('analytics') && (
          <button
            onClick={() => handleTabChange('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              currentTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Analytics</span>
          </button>
          )}

          {isVisible('automations') && (
          <button
            onClick={() => handleTabChange('automations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              currentTab === 'automations'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-500" />
            <span>Automations</span>
          </button>
          )}

          {isVisible('client_portal') && (
          <button
            onClick={() => handleTabChange('client_portal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              currentTab === 'client_portal'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <UserCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Client Portal</span>
          </button>
          )}
        </nav>

        {/* Zone 3: Actions (Multi-Tenant Selector, Role Switcher, Lead Simulator, Sound) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Tenant Switcher (Requirement 1: Multi-tenant isolation) */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              aria-label="Active Brokerage Tenant"
              value={activeBrokerage.id}
              onChange={(e) => handleBrokerageChange(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer text-xs"
            >
              {brokerages.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name.length > 20 ? b.name.substring(0, 20) + '...' : b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role: resolved from the signed-in account, never chosen in the UI */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs">
            <span className="text-[11px] font-medium text-slate-600 hidden sm:inline">Role:</span>
            <select
              aria-label="User Role"
              value={activeRole}
              disabled
              title="Your role comes from your LeadFlow account"
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-not-allowed text-xs disabled:opacity-100 disabled:cursor-not-allowed"
            >
              <option value="advisor">Advisor</option>
              <option value="brokerage_admin">Brokerage Admin</option>
              <option value="platform_admin">Platform Admin</option>
              <option value="client">Expat Client</option>
            </select>
          </div>

          {/* Signed-in identity + sign out */}
          {accountLabel && (
            <span
              className="hidden xl:inline text-[11px] font-medium text-slate-500 truncate max-w-[160px]"
              title={accountLabel}
            >
              {accountLabel}
            </span>
          )}

          {onSignOut && (
            <button
              onClick={() => {
                soundManager.playClick();
                onSignOut();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              title="Sign out of LeadFlow"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}

          {/* Download Source Code ZIP */}
          <a
            href="/leadflow-source-code.zip"
            download="leadflow-source-code.zip"
            onClick={() => soundManager.playSuccess()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            title="Download full project source code as a ZIP archive"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Download ZIP</span>
          </a>

          {/* Live Webhook Lead Ingestion Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenIngestModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            title="Simulate inbound webhook lead from Typeform or Meta"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulate Lead</span>
          </button>

          {/* Live Sync / WebSocket Simulation Toggle */}
          <button
            onClick={() => {
              soundManager.playClick();
              setLiveSyncActive(!liveSyncActive);
            }}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              liveSyncActive 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
            title={liveSyncActive ? 'Live WebSocket Sync: Connected' : 'Live WebSocket Sync: Paused'}
            aria-label="Toggle WebSocket live sync"
          >
            <span className="flex h-2 w-2 relative">
              {liveSyncActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${liveSyncActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            </span>
          </button>

          {/* Audio Click Feedback Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundManager.setSoundEnabled(next);
              if (next) soundManager.playClick();
            }}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute subtle haptics' : 'Enable subtle haptics'}
            aria-label="Toggle audio feedback"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>

      </div>
    </header>
  );
};
