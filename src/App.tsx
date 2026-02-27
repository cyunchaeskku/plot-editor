import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import ContinuousNovelEditor from './components/NovelEditor/ContinuousNovelEditor';
import ContinuousPlotEditor from './components/Editor/ContinuousPlotEditor';
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
  const [novelViewMode, setNovelViewMode] = useState<'single' | 'continuous'>('single');
  const [scrollTargetEpisodeId, setScrollTargetEpisodeId] = useState<number | null>(null);
  const [plotViewMode, setPlotViewMode] = useState<'single' | 'continuous'>('single');
  const [scrollTargetPlotId, setScrollTargetPlotId] = useState<number | null>(null);

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
    // Reset plot continuous scroll when episode changes
    setScrollTargetPlotId(null);
  }, [selectedEpisodeId, plots, workType]);

  // Reset when work changes
  useEffect(() => {
    setNovelChapterPlotId(null);
    setNovelViewMode('single');
    setScrollTargetEpisodeId(null);
    setPlotViewMode('single');
    setScrollTargetPlotId(null);
  }, [selectedWorkId]);

  // Preload all chapter plots when switching to continuous mode
  useEffect(() => {
    if (novelViewMode !== 'continuous' || !selectedWorkId) return;
    episodeList.forEach(async (ep) => {
      await loadPlots(ep.id);
      const epPlots = useStore.getState().plots[ep.id] || [];
      if (epPlots.length === 0) {
        await createPlot(ep.id, '본문');
      }
    });
  }, [novelViewMode, selectedWorkId, episodeList.length]);

  // Map episodeId → first plotId for continuous view
  const chapterPlotIds = useMemo(() => {
    return Object.fromEntries(
      episodeList.map((ep) => [ep.id, (plots[ep.id]?.[0]?.id) ?? 0])
    );
  }, [episodeList, plots]);

  const handleContinuousScrollTo = useCallback((episodeId: number) => {
    setScrollTargetEpisodeId(episodeId);
  }, []);

  return (
    <div className="flex h-screen bg-[#faf8f5] text-gray-800 overflow-hidden">
      {/* Left Sidebar */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-8'} flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col transition-all duration-200`}>
        <Sidebar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      </div>

      {/* Middle Panel */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col">
        {workType === 'novel' ? (
          <ChapterList
            activeChapterEpisodeId={novelViewMode === 'single' ? selectedEpisodeId : null}
            onSelectChapter={novelViewMode === 'single' ? handleSelectChapter : handleContinuousScrollTo}
            viewMode={novelViewMode}
            onViewModeChange={setNovelViewMode}
          />
        ) : (
          <PlotPanel
            viewMode={plotViewMode}
            onViewModeChange={setPlotViewMode}
            onScrollTo={(plotId) => setScrollTargetPlotId(plotId)}
          />
        )}
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Right panel header with tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => setRightPanelMode('editor')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'editor' ? 'bg-[#AD1B02] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {workType === 'novel' ? '📖 에디터' : '✍️ 에디터'}
          </button>
          <button
            onClick={() => setRightPanelMode('character')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'character' ? 'bg-[#AD1B02] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👤 인물 상세
          </button>
          <button
            onClick={() => setRightPanelMode('graph')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'graph' ? 'bg-[#AD1B02] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🕸️ 관계도
          </button>
          <button
            onClick={() => setRightPanelMode('planning')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              rightPanelMode === 'planning' ? 'bg-[#AD1B02] text-white' : 'text-gray-500 hover:text-gray-700'
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
          {rightPanelMode === 'editor' && workType === 'plot' && plotViewMode === 'single' && <Editor />}
          {rightPanelMode === 'editor' && workType === 'plot' && plotViewMode === 'continuous' && selectedEpisodeId && (
            <ContinuousPlotEditor
              episodeId={selectedEpisodeId}
              scrollTargetPlotId={scrollTargetPlotId}
              onScrolled={() => setScrollTargetPlotId(null)}
            />
          )}
          {rightPanelMode === 'editor' && workType === 'plot' && plotViewMode === 'continuous' && !selectedEpisodeId && (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              <div className="text-center">
                <div className="text-4xl mb-3">📋</div>
                <p>좌측에서 에피소드를 선택하세요</p>
              </div>
            </div>
          )}
          {rightPanelMode === 'editor' && workType === 'novel' && novelViewMode === 'single' && (
            <NovelEditor chapterPlotId={novelChapterPlotId} />
          )}
          {rightPanelMode === 'editor' && workType === 'novel' && novelViewMode === 'continuous' && (
            <ContinuousNovelEditor
              chapterList={episodeList}
              chapterPlotIds={chapterPlotIds}
              scrollTargetEpisodeId={scrollTargetEpisodeId}
              onScrolled={() => setScrollTargetEpisodeId(null)}
            />
          )}
          {rightPanelMode === 'character' && <CharacterDetail />}
          {rightPanelMode === 'graph' && <GraphView />}
          {rightPanelMode === 'planning' && <PlanningDoc />}
        </div>
      </div>
    </div>
  );
}
