import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Zap, ShieldCheck, User, LogOut } from 'lucide-react';

interface MobileBottomDockProps {
  activeTab: string;
  onNavigate: (tabId: any) => void;
  onOpenMockInterview: () => void;
  onOpenPortfolio: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}

export function MobileBottomDock({
  activeTab,
  onNavigate,
  onOpenMockInterview,
  onOpenPortfolio,
  onOpenProfile,
  onSignOut,
}: MobileBottomDockProps) {
  return (
    <div className="mobile-bottom-dock-wrapper" aria-label="Mobile Navigation Dock">
      <nav className="mobile-bottom-dock">
        {/* Workspace Tab */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          className={`dock-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
          aria-label="Workspace Dashboard"
        >
          <div className="dock-icon-wrap">
            <LayoutDashboard size={19} />
            {activeTab === 'dashboard' && <motion.div layoutId="dock-indicator" className="dock-active-dot" />}
          </div>
          <span className="dock-label">Workspace</span>
        </motion.button>

        {/* AI Interview Modal Launcher */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          className="dock-tab dock-highlight-ai"
          onClick={onOpenMockInterview}
          aria-label="AI Technical Mock Interview"
        >
          <div className="dock-icon-wrap">
            <Zap size={19} />
            <span className="dock-badge-pulse">AI</span>
          </div>
          <span className="dock-label">Interview</span>
        </motion.button>

        {/* Portfolio PDF Report Launcher */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          className="dock-tab dock-highlight-portfolio"
          onClick={onOpenPortfolio}
          aria-label="Executive Portfolio & 1-Click PDF Report"
        >
          <div className="dock-icon-wrap">
            <ShieldCheck size={19} />
            <span className="dock-badge-pdf">PDF</span>
          </div>
          <span className="dock-label">Portfolio</span>
        </motion.button>

        {/* User Profile */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          className={`dock-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={onOpenProfile}
          aria-label="User Profile"
        >
          <div className="dock-icon-wrap">
            <User size={19} />
          </div>
          <span className="dock-label">Profile</span>
        </motion.button>

        {/* Quick Logout */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          className="dock-tab dock-logout"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <div className="dock-icon-wrap">
            <LogOut size={18} />
          </div>
          <span className="dock-label">Logout</span>
        </motion.button>
      </nav>
    </div>
  );
}
