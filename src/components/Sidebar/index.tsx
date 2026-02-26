import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';

const PRESET_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
];

export default function Sidebar({ sidebarOpen, onToggle }: { sidebarOpen: boolean; onToggle: () => void }) {
  const {
    works, episodes, plots, characters,
    selectedWorkId, selectedEpisodeId, selectedPlotIds,
    expandedWorkIds, expandedEpisodeIds,
    loadWorks,
    createWork, updateWork, deleteWork,
    createEpisode, updateEpisode, deleteEpisode,
    createPlot, deletePlot,
    createCharacter, deleteCharacter,
    selectWork, selectEpisode, selectPlot,
    selectCharacter, selectedCharacterId,
    toggleWorkExpand, toggleEpisodeExpand,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newWorkInput, setNewWorkInput] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newEpisodeWorkId, setNewEpisodeWorkId] = useState<number | null>(null);
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('');
  const [newPlotEpisodeId, setNewPlotEpisodeId] = useState<number | null>(null);
  const [newPlotTitle, setNewPlotTitle] = useState('');
  const [newCharName, setNewCharName] = useState('');
  const [newCharColor, setNewCharColor] = useState(PRESET_COLORS[0]);
  const [showNewChar, setShowNewChar] = useState(false);

  const pickDefaultCharColor = () => {
    const usedColors = new Set((characters[selectedWorkId ?? -1] || []).map((c) => c.color));
    const unused = PRESET_COLORS.filter((c) => !usedColors.has(c));
    const pool = unused.length > 0 ? unused : PRESET_COLORS;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  useEffect(() => {
    loadWorks();
  }, []);

  const startEdit = (key: string, value: string) => {
    setEditingId(key);
    setEditingValue(value);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const [type, id] = editingId.split('-');
    const numId = parseInt(id);
    if (type === 'work') await updateWork(numId, editingValue);
    else if (type === 'episode') await updateEpisode(numId, editingValue);
    setEditingId(null);
  };

  const handleCreateWork = async () => {
    const title = newWorkTitle.trim();
    if (!title) return;
    setNewWorkTitle('');
    setNewWorkInput(false);
    await createWork(title);
  };

  const handleCreateEpisode = async () => {
    const workId = newEpisodeWorkId;
    const title = newEpisodeTitle.trim();
    if (!workId || !title) return;
    setNewEpisodeTitle('');
    setNewEpisodeWorkId(null);
    await createEpisode(workId, title);
  };

  const handleCreatePlot = async () => {
    const episodeId = newPlotEpisodeId;
    const title = newPlotTitle.trim();
    if (!episodeId || !title) return;
    setNewPlotTitle('');
    setNewPlotEpisodeId(null);
    await createPlot(episodeId, title);
  };

  const handleCreateCharacter = async () => {
    const workId = selectedWorkId;
    const name = newCharName.trim();
    if (!workId || !name) return;
    setNewCharName('');
    setShowNewChar(false);
    await createCharacter(workId, name, newCharColor);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f23] text-sm select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-300 text-xs w-4 text-center flex-shrink-0"
          title={sidebarOpen ? '접기' : '펼치기'}
        >{sidebarOpen ? '◀' : '▶'}</button>
        {sidebarOpen && (
          <>
            <span className="font-semibold text-gray-300 flex-1 ml-2">작품 목록</span>
            <button
              onClick={() => setNewWorkInput(true)}
              className="text-gray-500 hover:text-indigo-400 text-lg leading-none"
              title="새 작품"
            >+</button>
          </>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto ${sidebarOpen ? '' : 'hidden'}`}>
        {/* New work input */}
        {newWorkInput && (
          <div className="px-3 py-2 flex gap-1">
            <input
              autoFocus
              value={newWorkTitle}
              onChange={(e) => setNewWorkTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateWork();
                if (e.key === 'Escape') { setNewWorkInput(false); setNewWorkTitle(''); }
              }}
              placeholder="작품 제목"
              className="flex-1 bg-gray-800 text-gray-200 rounded px-2 py-1 text-xs outline-none border border-gray-600"
            />
            <button onClick={handleCreateWork} className="text-indigo-400 hover:text-indigo-300 text-xs">✓</button>
          </div>
        )}

        {/* Works */}
        {works.map((work) => {
          const isExpanded = expandedWorkIds.has(work.id);
          const workEpisodes = episodes[work.id] || [];
          const isSelected = selectedWorkId === work.id;

          return (
            <div key={work.id}>
              {/* Work row */}
              <div
                className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-gray-800 group ${isSelected ? 'bg-gray-800' : ''}`}
                onClick={() => {
                  selectWork(work.id);
                  if (!isExpanded) toggleWorkExpand(work.id);
                }}
              >
                <span
                  className="text-gray-500 w-4 text-center text-xs"
                  onClick={(e) => { e.stopPropagation(); toggleWorkExpand(work.id); }}
                >
                  {isExpanded ? '▼' : '▶'}
                </span>

                {editingId === `work-${work.id}` ? (
                  <input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 bg-gray-700 text-gray-200 rounded px-1 py-0.5 text-xs outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 text-gray-200 font-medium truncate"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(`work-${work.id}`, work.title); }}
                  >
                    {work.title}
                  </span>
                )}

                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setNewEpisodeWorkId(work.id); toggleWorkExpand(work.id); }}
                    className="text-gray-500 hover:text-indigo-400 text-xs"
                    title="에피소드 추가"
                  >+</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`"${work.title}" 작품을 삭제하시겠습니까?`)) deleteWork(work.id); }}
                    className="text-gray-500 hover:text-red-400 text-xs"
                    title="삭제"
                  >✕</button>
                </div>
              </div>

              {/* Episodes */}
              {isExpanded && (
                <div>
                  {workEpisodes.map((ep) => {
                    const isEpExpanded = expandedEpisodeIds.has(ep.id);
                    const epPlots = plots[ep.id] || [];
                    const isEpSelected = selectedEpisodeId === ep.id;

                    return (
                      <div key={ep.id}>
                        {/* Episode row */}
                        <div
                          className={`flex items-center gap-1 pl-6 pr-2 py-1.5 cursor-pointer hover:bg-gray-800 group ${isEpSelected ? 'bg-gray-800' : ''}`}
                          onClick={() => {
                            selectEpisode(ep.id);
                            if (!isEpExpanded) toggleEpisodeExpand(ep.id);
                          }}
                        >
                          <span
                            className="text-gray-500 w-4 text-center text-xs"
                            onClick={(e) => { e.stopPropagation(); toggleEpisodeExpand(ep.id); }}
                          >
                            {isEpExpanded ? '▼' : '▶'}
                          </span>

                          {editingId === `episode-${ep.id}` ? (
                            <input
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                              className="flex-1 bg-gray-700 text-gray-200 rounded px-1 py-0.5 text-xs outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className="flex-1 text-gray-300 truncate"
                              onDoubleClick={(e) => { e.stopPropagation(); startEdit(`episode-${ep.id}`, ep.title); }}
                            >
                              {ep.title}
                            </span>
                          )}

                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setNewPlotEpisodeId(ep.id); toggleEpisodeExpand(ep.id); }}
                              className="text-gray-500 hover:text-indigo-400 text-xs"
                              title="플롯 추가"
                            >+</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (confirm(`"${ep.title}" 에피소드를 삭제하시겠습니까?`)) deleteEpisode(ep.id); }}
                              className="text-gray-500 hover:text-red-400 text-xs"
                            >✕</button>
                          </div>
                        </div>

                        {/* New episode input */}
                        {newEpisodeWorkId === work.id && isEpExpanded === false && (
                          <></>
                        )}

                        {/* Plots */}
                        {isEpExpanded && (
                          <div>
                            {epPlots.map((plot, idx) => {
                              const isPlotSelected = selectedPlotIds.includes(plot.id);
                              return (
                                <div
                                  key={plot.id}
                                  className={`flex items-center gap-1 pl-12 pr-2 py-1 cursor-pointer hover:bg-gray-800 group ${isPlotSelected ? 'bg-indigo-900/30 text-indigo-300' : 'text-gray-400'}`}
                                  onClick={(e) => selectPlot(plot.id, e.metaKey || e.ctrlKey)}
                                >
                                  <span className="text-gray-600 text-xs w-5">P{idx + 1}</span>
                                  <span className="flex-1 truncate text-xs">{plot.title || '(제목 없음)'}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (confirm('플롯을 삭제하시겠습니까?')) deletePlot(plot.id); }}
                                    className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs"
                                  >✕</button>
                                </div>
                              );
                            })}

                            {/* New plot input */}
                            {newPlotEpisodeId === ep.id && (
                              <div className="pl-12 pr-2 py-1 flex gap-1">
                                <input
                                  autoFocus
                                  value={newPlotTitle}
                                  onChange={(e) => setNewPlotTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreatePlot();
                                    if (e.key === 'Escape') { setNewPlotEpisodeId(null); setNewPlotTitle(''); }
                                  }}
                                  placeholder="플롯 제목"
                                  className="flex-1 bg-gray-800 text-gray-200 rounded px-2 py-0.5 text-xs outline-none border border-gray-600"
                                />
                                <button onClick={handleCreatePlot} className="text-indigo-400 text-xs">✓</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* New episode input */}
                  {newEpisodeWorkId === work.id && (
                    <div className="pl-6 pr-2 py-1 flex gap-1">
                      <input
                        autoFocus
                        value={newEpisodeTitle}
                        onChange={(e) => setNewEpisodeTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateEpisode();
                          if (e.key === 'Escape') { setNewEpisodeWorkId(null); setNewEpisodeTitle(''); }
                        }}
                        placeholder="에피소드 제목"
                        className="flex-1 bg-gray-800 text-gray-200 rounded px-2 py-0.5 text-xs outline-none border border-gray-600"
                      />
                      <button onClick={handleCreateEpisode} className="text-indigo-400 text-xs">✓</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Characters section */}
        {selectedWorkId && (
          <div className="mt-4 border-t border-gray-800">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-semibold text-gray-300">등장인물</span>
              <button
                onClick={() => { setNewCharColor(pickDefaultCharColor()); setShowNewChar(true); }}
                className="text-gray-500 hover:text-indigo-400 text-lg leading-none"
              >+</button>
            </div>

            {/* New character input */}
            {showNewChar && (
              <div className="px-3 py-2 space-y-2">
                <input
                  autoFocus
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCharacter();
                    if (e.key === 'Escape') setShowNewChar(false);
                  }}
                  placeholder="이름"
                  className="w-full bg-gray-800 text-gray-200 rounded px-2 py-1 text-xs outline-none border border-gray-600"
                />
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewCharColor(c)}
                      className="w-5 h-5 rounded-full border-2 transition-transform"
                      style={{
                        backgroundColor: c,
                        borderColor: newCharColor === c ? 'white' : 'transparent',
                        transform: newCharColor === c ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                  <label
                    className="w-5 h-5 rounded-full border-2 transition-transform relative overflow-hidden flex-shrink-0 cursor-pointer"
                    style={{
                      borderColor: !PRESET_COLORS.includes(newCharColor) ? 'white' : 'transparent',
                      transform: !PRESET_COLORS.includes(newCharColor) ? 'scale(1.2)' : 'scale(1)',
                      background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                    }}
                    title="직접 선택"
                  >
                    <input
                      type="color"
                      value={newCharColor}
                      onChange={(e) => setNewCharColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateCharacter} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">추가</button>
                  <button onClick={() => setShowNewChar(false)} className="text-xs text-gray-500">취소</button>
                </div>
              </div>
            )}

            {/* Character list */}
            {(characters[selectedWorkId] || []).map((char) => (
              <div
                key={char.id}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-800 group ${selectedCharacterId === char.id ? 'bg-gray-800' : ''}`}
                onClick={() => selectCharacter(char.id)}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: char.color }}
                />
                <span className="flex-1 text-gray-300 text-xs truncate">{char.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }}
                  className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
