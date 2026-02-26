import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import PlotPanel from './components/PlotPanel';
import Editor from './components/Editor';
import CharacterDetail from './components/CharacterDetail';
import GraphView from './components/GraphView';
import PlanningDoc from './components/PlanningDoc';
import ExportButton from './components/Export';
import NovelEditor from './components/NovelEditor';
import ChapterList from './components/NovelEditor/ChapterList';
import { useStore } from './store';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    rightPanelMode,
    setRightPanelMode,
    selectedWorkId,
    selectedEpisodeId,
    episodes,
    works,
    plots,
    selectEpisode,
    createPlot,
    loadPlots,
  } = useStore();

  const selectedWork = selectedWorkId ? works.find((w) => w.id === selectedWorkId) : null;
  const workType = selectedWork?.type ?? 'plot';

  const episodeList = selectedWorkId ? (episodes[selectedWorkId] || []) : [];
  const currentEpisode = selectedEpisodeId
    ? episodeList.find((e) => e.id === selectedEpisodeId)
    : null;

  // For novel mode: track the active chapter's plot ID
  const [novelChapterPlotId, setNovelChapterPlotId] = useState<number | null>(null);

  // When a chapter is selected in novel mode, ensure it has a plot and set novelChapterPlotId
  const handleSelectChapter = useCallback(async (episodeId: number) => {
    selectEpisode(episodeId);
    await loadPlots(episodeId);
    // Get the plots for this episode (we may need to wait for store update)
    const currentPlots = useStore.getState().plots[episodeId] || [];
    if (currentPlots.length === 0) {
      // Auto-create a single plot for this chapter
      await createPlot(episodeId, '본문');
      const updatedPlots = useStore.getState().plots[episodeId] || [];
      setNovelChapterPlotId(updatedPlots[0]?.id ?? null);
    } else {
      setNovelChapterPlotId(currentPlots[0]?.id ?? null);
    }
  }, [selectEpisode, loadPlots, createPlot]);

  // Reset novel chapter plot when episode changes externally
  useEffect(() => {
    if (workType === 'novel' && selectedEpisodeId) {
      const epPlots = plots[selectedEpisodeId] || [];
      if (epPlots.length > 0 && novelChapterPlotId !== epPlots[0].id) {
        setNovelChapterPlotId(epPlots[0].id);
      }
    }
  }, [selectedEpisodeId, plots, workType]);

  // Reset when work changes
  useEffect(() => {
    setNovelChapterPlotId(null);
  }, [selectedWorkId]);

  return (
    <div className="flex h-screen bg-[#f4f5f7] text-gray-800 overflow-hidden">
      {/* Left Sidebar */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-8'} flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col transition-all duration-200`}>
        <Sidebar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      </div>

      {/* Middle Panel */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col">
        {workType === 'novel' ? (
          <ChapterList
            activeChapterEpisodeId={selectedEpisodeId}
            onSelectChapter={handleSelectChapter}
          />
        ) : (
          <PlotPanel />
        )}
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
            {workType === 'novel' ? '📖 에디터' : '✍️ 에디터'}
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
          {workType === 'plot' && currentEpisode && (
            <ExportButton episodeTitle={currentEpisode.title} />
          )}
        </div>

        {/* Right panel content */}
        <div className="flex-1 overflow-hidden bg-white">
          {rightPanelMode === 'editor' && workType === 'plot' && <Editor />}
          {rightPanelMode === 'editor' && workType === 'novel' && (
            <NovelEditor chapterPlotId={novelChapterPlotId} />
          )}
          {rightPanelMode === 'character' && <CharacterDetail />}
          {rightPanelMode === 'graph' && <GraphView />}
          {rightPanelMode === 'planning' && <PlanningDoc />}
        </div>
      </div>
    </div>
  );
}
