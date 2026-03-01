import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
import { setToken } from '../api';

export default function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { loadUserInfo, loadWorks } = useStore();

  // On mount: extract JWT token from URL hash (after OAuth callback), then load user info
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      setToken(hash.slice(7));
      window.history.replaceState(null, '', window.location.pathname);
    }
    loadUserInfo();
    loadWorks();
  }, []);

  return (
    <div className="flex h-screen bg-[#faf8f5] text-gray-800 overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={`${sidebarOpen ? 'w-56' : 'w-8'} flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col transition-all duration-200`}
      >
        <Sidebar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      </div>

      {/* Page content (EditorPage or ThreadBoard) */}
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
