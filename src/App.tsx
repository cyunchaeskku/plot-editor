import React, { useState } from 'react';
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
    <div className="flex h-screen bg-[#f4f5f7] text-gray-800 overflow-hidden">
      {/* Left Sidebar */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-8'} flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col transition-all duration-200`}>
        <Sidebar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      </div>

      {/* Middle Panel */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col">
        <PlotPanel />
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Right panel header with tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => setRightPanelMode('editor')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'editor' ? 'bg-indigo-700 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✍️ 에디터
          </button>
          <button
            onClick={() => setRightPanelMode('character')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'character' ? 'bg-indigo-700 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👤 인물 상세
          </button>
          <button
            onClick={() => setRightPanelMode('graph')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'graph' ? 'bg-indigo-700 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🕸️ 관계도
          </button>
          <button
            onClick={() => setRightPanelMode('planning')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'planning' ? 'bg-indigo-700 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 기획서
          </button>
          <div className="flex-1" />
          {currentEpisode && (
            <ExportButton episodeTitle={currentEpisode.title} />
          )}
        </div>

        {/* Right panel content */}
        <div className="flex-1 overflow-hidden bg-white">
          {rightPanelMode === 'editor' && <Editor />}
          {rightPanelMode === 'character' && <CharacterDetail />}
          {rightPanelMode === 'graph' && <GraphView />}
          {rightPanelMode === 'planning' && <PlanningDoc />}
        </div>
      </div>
    </div>
  );
}
