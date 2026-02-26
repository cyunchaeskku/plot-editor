import React, { useEffect, useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import PlotPanel from './components/PlotPanel';
import Editor from './components/Editor';
import CharacterDetail from './components/CharacterDetail';
import GraphView from './components/GraphView';
import PlanningDoc from './components/PlanningDoc';
import ExportButton from './components/Export';
import { useStore } from './store';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const {
    rightPanelMode,
    setRightPanelMode,
    selectedWorkId,
    selectedEpisodeId,
    episodes,
  } = useStore();

  const episodeList = selectedWorkId ? (episodes[selectedWorkId] || []) : [];
  const currentEpisode = selectedEpisodeId
    ? episodeList.find((e) => e.id === selectedEpisodeId)
    : null;

  return (
    <div className="flex h-screen bg-[#f4f5f7] dark:bg-[#0f0f1a] text-gray-800 dark:text-gray-200 overflow-hidden">
      {/* Left Sidebar */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-8'} flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-all duration-200`}>
        <Sidebar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      </div>

      {/* Middle Panel */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <PlotPanel />
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Right panel header with tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] flex-shrink-0">
          <button
            onClick={() => setRightPanelMode('editor')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'editor' ? 'bg-indigo-700 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            ✍️ 에디터
          </button>
          <button
            onClick={() => setRightPanelMode('character')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'character' ? 'bg-indigo-700 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            👤 인물 상세
          </button>
          <button
            onClick={() => setRightPanelMode('graph')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'graph' ? 'bg-indigo-700 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            🕸️ 관계도
          </button>
          <button
            onClick={() => setRightPanelMode('planning')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'planning' ? 'bg-indigo-700 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            📝 기획서
          </button>
          <div className="flex-1" />
          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode((v) => !v)}
            className="px-2 py-1 text-xs rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2"
            title={darkMode ? '라이트 모드' : '다크 모드'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          {currentEpisode && (
            <ExportButton episodeTitle={currentEpisode.title} />
          )}
        </div>

        {/* Right panel content */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-[#12121f]">
          {rightPanelMode === 'editor' && <Editor />}
          {rightPanelMode === 'character' && <CharacterDetail />}
          {rightPanelMode === 'graph' && <GraphView />}
          {rightPanelMode === 'planning' && <PlanningDoc />}
        </div>
      </div>
    </div>
  );
}
