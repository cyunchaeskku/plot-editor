import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';

export default function RootLayout() {
  const { sidebarOpen, setSidebarOpen, loadUserInfo, loadWorks } = useStore();

  // On mount: load user info and works (token was already extracted in main.tsx)
  useEffect(() => {
    loadUserInfo();
    loadWorks();
  }, []);

  return (
    <div className="flex h-screen bg-[#faf8f5] text-gray-800 overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={`${sidebarOpen ? 'w-56' : 'w-8'} flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col transition-all duration-200`}
      >
        <Sidebar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Page content (EditorPage or ThreadBoard) */}
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
