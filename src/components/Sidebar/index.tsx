import React, { useState } from 'react';
import sidebarCollapseIcon from '../../assets/sidebar_collapse_icon.svg';
import { useStore } from '../../store';
import { clearToken } from '../../api';
import type { WorkType } from '../../db';

const PRESET_COLORS = [
  '#AD1B02', '#D85604', '#E88D14', '#F3BE26',
  '#E669A2', '#8B1A00', '#B8621A', '#C4A000',
];

export default function Sidebar({ sidebarOpen, onToggle }: { sidebarOpen: boolean; onToggle: () => void }) {
  const {
    works, episodes, plots, characters,
    selectedWorkId, selectedEpisodeId, selectedPlotIds,
    expandedWorkIds, expandedEpisodeIds,
    isLoggedIn, userEmail, isDirty,
    createWork, updateWork, updateWorkType, deleteWork,
    createEpisode, updateEpisode, deleteEpisode,
    createPlot, deletePlot,
    createCharacter, deleteCharacter,
    selectWork, selectEpisode, selectPlot,
    selectCharacter, selectedCharacterId,
    toggleWorkExpand, toggleEpisodeExpand,
  } = useStore();

  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newWorkInput, setNewWorkInput] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkType, setNewWorkType] = useState<WorkType>('plot');
  const [typeMenuWorkId, setTypeMenuWorkId] = useState<number | null>(null);
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
    await createWork(title, newWorkType);
    setNewWorkType('plot');
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
    <div className="relative flex flex-col h-full bg-[#120806] text-sm select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a1208]">
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-300 flex-shrink-0 flex items-center justify-center"
          title={sidebarOpen ? '접기' : '펼치기'}
          style={{ transform: sidebarOpen ? 'none' : 'scaleX(-1)' }}
        >
          <img src={sidebarCollapseIcon} alt="사이드바 접기" style={{ width: 16, height: 16, filter: 'invert(0.6)' }} />
        </button>
        {sidebarOpen && (
          <>
            <span className="font-semibold text-gray-300 flex-1 ml-2">작품 목록</span>
            <button
              onClick={() => { if (!isLoggedIn) { setShowLoginAlert(true); return; } setNewWorkInput(true); }}
              className="text-gray-500 hover:text-[#E88D14] text-lg leading-none"
              title="새 작품"
            >+</button>
          </>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto ${sidebarOpen ? '' : 'hidden'}`}>
        {/* New work input */}
        {newWorkInput && (
          <div className="px-3 py-2 space-y-1.5">
            <div className="flex gap-1">
              <input
                autoFocus
                value={newWorkTitle}
                onChange={(e) => setNewWorkTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWork();
                  if (e.key === 'Escape') { setNewWorkInput(false); setNewWorkTitle(''); }
                }}
                placeholder="작품 제목"
                className="flex-1 bg-[#1e0e08] text-[#f0ddd0] rounded px-2 py-1 text-xs outline-none border border-[#3a1a0a]"
              />
              <button onClick={handleCreateWork} className="text-[#E88D14] hover:text-[#F3BE26] text-xs">✓</button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setNewWorkType('plot')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${newWorkType === 'plot' ? 'bg-[#AD1B02] text-white' : 'bg-[#1e0e08] text-[#c0a090] hover:bg-[#2a1208]'}`}
              >플롯 에디터</button>
              <button
                onClick={() => setNewWorkType('novel')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${newWorkType === 'novel' ? 'bg-[#E669A2] text-white' : 'bg-[#1e0e08] text-[#c0a090] hover:bg-[#2a1208]'}`}
              >소설 에디터</button>
            </div>
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
                className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-[#1e0e08] group ${isSelected ? 'bg-[#1e0e08]' : ''}`}
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
                    className="flex-1 bg-[#2a1208] text-[#f0ddd0] rounded px-1 py-0.5 text-xs outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 text-[#f0ddd0] font-medium truncate flex items-center gap-1"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(`work-${work.id}`, work.title); }}
                  >
                    <span className={`inline-block px-1 py-0 text-[9px] rounded font-bold flex-shrink-0 ${work.type === 'novel' ? 'bg-[#8a1060] text-[#F3BE26]' : 'bg-[#7a1200] text-[#F3BE26]'}`}>
                      {work.type === 'novel' ? 'N' : 'P'}
                    </span>
                    <span className="truncate">{work.title}</span>
                  </span>
                )}

                <div className="hidden group-hover:flex items-center gap-1 relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setTypeMenuWorkId(typeMenuWorkId === work.id ? null : work.id); }}
                    className="text-gray-500 hover:text-[#F3BE26] text-xs"
                    title="타입 변경"
                  >⇄</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setNewEpisodeWorkId(work.id); toggleWorkExpand(work.id); }}
                    className="text-gray-500 hover:text-[#E88D14] text-xs"
                    title="에피소드 추가"
                  >+</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`"${work.title}" 작품을 삭제하시겠습니까?`)) deleteWork(work.id); }}
                    className="text-gray-500 hover:text-red-400 text-xs"
                    title="삭제"
                  >✕</button>
                  {typeMenuWorkId === work.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-[#1e0e08] border border-[#3a1a0a] rounded shadow-lg min-w-[120px]">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateWorkType(work.id, 'plot'); setTypeMenuWorkId(null); }}
                        className={`w-full px-3 py-1.5 text-xs text-left hover:bg-[#2a1208] ${work.type === 'plot' ? 'text-[#E88D14] font-bold' : 'text-[#e8d0c0]'}`}
                      >플롯 에디터</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateWorkType(work.id, 'novel'); setTypeMenuWorkId(null); }}
                        className={`w-full px-3 py-1.5 text-xs text-left hover:bg-[#2a1208] ${work.type === 'novel' ? 'text-[#E669A2] font-bold' : 'text-[#e8d0c0]'}`}
                      >소설 에디터</button>
                    </div>
                  )}
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
                          className={`flex items-center gap-1 pl-6 pr-2 py-1.5 cursor-pointer hover:bg-[#1e0e08] group ${isEpSelected ? 'bg-[#1e0e08]' : ''}`}
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
                              className="flex-1 bg-[#2a1208] text-[#f0ddd0] rounded px-1 py-0.5 text-xs outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className="flex-1 text-[#e8d0c0] truncate"
                              onDoubleClick={(e) => { e.stopPropagation(); startEdit(`episode-${ep.id}`, ep.title); }}
                            >
                              {ep.title}
                            </span>
                          )}

                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setNewPlotEpisodeId(ep.id); toggleEpisodeExpand(ep.id); }}
                              className="text-gray-500 hover:text-[#E88D14] text-xs"
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
                                  className={`flex items-center gap-1 pl-12 pr-2 py-1 cursor-pointer hover:bg-[#1e0e08] group ${isPlotSelected ? 'bg-[#AD1B02]/20 text-[#F3BE26]' : 'text-[#c0a090]'}`}
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
                                  className="flex-1 bg-[#1e0e08] text-[#f0ddd0] rounded px-2 py-0.5 text-xs outline-none border border-[#3a1a0a]"
                                />
                                <button onClick={handleCreatePlot} className="text-[#E88D14] text-xs">✓</button>
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
                        className="flex-1 bg-[#1e0e08] text-[#f0ddd0] rounded px-2 py-0.5 text-xs outline-none border border-[#3a1a0a]"
                      />
                      <button onClick={handleCreateEpisode} className="text-[#E88D14] text-xs">✓</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Characters section */}
        {selectedWorkId && (
          <div className="mt-4 border-t border-[#2a1208]">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-semibold text-gray-300">등장인물</span>
              <button
                onClick={() => { setNewCharColor(pickDefaultCharColor()); setShowNewChar(true); }}
                className="text-gray-500 hover:text-[#E88D14] text-lg leading-none"
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
                  className="w-full bg-[#1e0e08] text-[#f0ddd0] rounded px-2 py-1 text-xs outline-none border border-[#3a1a0a]"
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
                  <button onClick={handleCreateCharacter} className="text-xs bg-[#AD1B02] text-white px-2 py-1 rounded">추가</button>
                  <button onClick={() => setShowNewChar(false)} className="text-xs text-gray-500">취소</button>
                </div>
              </div>
            )}

            {/* Character list */}
            {(characters[selectedWorkId] || []).map((char) => (
              <div
                key={char.id}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#1e0e08] group ${selectedCharacterId === char.id ? 'bg-[#1e0e08]' : ''}`}
                onClick={() => selectCharacter(char.id)}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: char.color }}
                />
                <span className="flex-1 text-[#e8d0c0] text-xs truncate">{char.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }}
                  className="hidden group-hover:block text-gray-600 hover:text-red-400 text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login required alert */}
      {showLoginAlert && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowLoginAlert(false)}>
          <div className="bg-[#1e0e08] border border-[#3a1a0a] rounded-lg px-5 py-4 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[#f0ddd0] text-sm mb-3">로그인을 먼저 해주세요</p>
            <button
              onClick={() => setShowLoginAlert(false)}
              className="text-xs bg-[#AD1B02] text-white px-4 py-1.5 rounded hover:bg-[#c22202] transition-colors"
            >확인</button>
          </div>
        </div>
      )}

      {/* Login / user info */}
      {sidebarOpen && (
        <div className="border-t border-[#2a1208] p-3">
          {isLoggedIn && userEmail ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-xs text-[#c0a090] truncate flex-1" title={userEmail}>{userEmail}</span>
              <button
                onClick={() => {
                  if (isDirty && !window.confirm('저장되지 않은 변경사항이 있습니다. 로그아웃하면 사라집니다. 계속하시겠습니까?')) return;
                  clearToken();
                  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/logout`;
                }}
                className="text-xs text-gray-600 hover:text-red-400 flex-shrink-0 transition-colors"
                title="로그아웃"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => { window.location.href = `${import.meta.env.VITE_API_BASE_URL}/login`; }}
              className="w-full text-sm text-[#c0a090] hover:text-[#E88D14] py-1 text-left"
            >
              로그인
            </button>
          )}
        </div>
      )}
    </div>
  );
}
