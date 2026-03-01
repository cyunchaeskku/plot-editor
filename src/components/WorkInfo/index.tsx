import React, { useState } from 'react';
import { useStore } from '../../store';
import { summarizeWork } from '../../api';

export default function WorkInfo() {
  const { works, selectedWorkId, episodes, plots, setWorkSummary } = useStore();

  const work = works.find((w) => w.id === selectedWorkId);
  const workEpisodes = selectedWorkId ? (episodes[selectedWorkId] || []) : [];

  const [loading, setLoading] = useState(false);
  const [workSummary, setLocalWorkSummary] = useState(work?.work_summary || '');

  // Sync when work changes
  React.useEffect(() => {
    setLocalWorkSummary(work?.work_summary || '');
  }, [work?.id, work?.work_summary]);

  if (!work) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">📚</div>
          <p>작품을 선택하세요</p>
        </div>
      </div>
    );
  }

  const isNovel = work.type === 'novel';

  // Novel: chapter summary status
  const chaptersWithSummary = workEpisodes.filter((e) => e.chapter_summary?.trim());
  const totalChapters = workEpisodes.length;

  // Plot: plot summary status (all plots across all episodes, already loaded)
  const sortedEpisodes = workEpisodes.slice().sort((a, b) => a.order_index - b.order_index);
  const allPlots = sortedEpisodes.flatMap((ep) =>
    (plots[ep.id] || [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((p) => ({ ...p, episodeTitle: ep.title }))
  );
  const plotsWithSummary = allPlots.filter((p) => p.plot_summary?.trim());
  const totalPlots = allPlots.length;

  const canGenerate = isNovel ? chaptersWithSummary.length > 0 : plotsWithSummary.length > 0;
  const generateTitle = isNovel
    ? (chaptersWithSummary.length === 0 ? '챕터 요약을 먼저 생성해주세요' : '')
    : (plotsWithSummary.length === 0 ? '플롯 요약을 먼저 생성해주세요' : '');

  const handleGenerate = async () => {
    if (!selectedWorkId) return;
    setLoading(true);
    try {
      const res = await summarizeWork(selectedWorkId, workSummary);
      setLocalWorkSummary(res.summary);
      setWorkSummary(selectedWorkId, res.summary);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('챕터 요약이 없습니다') || msg.includes('플롯 요약이 없습니다')) {
        alert(isNovel
          ? '먼저 각 챕터에서 AI 챕터 요약을 생성해주세요.'
          : '먼저 각 플롯에서 AI 플롯 요약을 생성해주세요.');
      } else {
        alert('작품 요약 생성에 실패했습니다. 백엔드가 실행 중인지 확인하세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{work.title}</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {work.type === 'novel' ? '소설' : '영상'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {isNovel ? (
          /* Novel: chapter summary status */
          <div>
            <label className="text-xs text-gray-500 mb-2 block">챕터별 요약 현황</label>
            {totalChapters === 0 ? (
              <p className="text-xs text-gray-400">챕터가 없습니다</p>
            ) : (
              <div className="space-y-1">
                {workEpisodes
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((ep) => (
                    <div key={ep.id} className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          ep.chapter_summary?.trim() ? 'bg-green-400' : 'bg-gray-200'
                        }`}
                      />
                      <span className="text-gray-700 flex-1 truncate">{ep.title || '제목 없음'}</span>
                      <span className={ep.chapter_summary?.trim() ? 'text-green-500' : 'text-gray-300'}>
                        {ep.chapter_summary?.trim() ? '요약 완료' : '미완료'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
            {totalChapters > 0 && (
              <p className="text-[10px] text-gray-400 mt-2">
                {chaptersWithSummary.length} / {totalChapters} 챕터 요약 완료
              </p>
            )}
          </div>
        ) : (
          /* Plot: plot summary status */
          <div>
            <label className="text-xs text-gray-500 mb-2 block">플롯별 요약 현황</label>
            {totalPlots === 0 ? (
              <p className="text-xs text-gray-400">
                {workEpisodes.length === 0
                  ? '에피소드가 없습니다'
                  : '플롯이 없거나 아직 로드되지 않았습니다'}
              </p>
            ) : (
              <div className="space-y-1">
                {allPlots.map((plot, idx) => (
                  <div key={plot.id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        plot.plot_summary?.trim() ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                    />
                    <span className="text-gray-400 flex-shrink-0">P{idx + 1}</span>
                    <span className="text-gray-700 flex-1 truncate">{plot.title || '제목 없음'}</span>
                    <span className={plot.plot_summary?.trim() ? 'text-green-500' : 'text-gray-300'}>
                      {plot.plot_summary?.trim() ? '요약 완료' : '미완료'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {totalPlots > 0 && (
              <p className="text-[10px] text-gray-400 mt-2">
                {plotsWithSummary.length} / {totalPlots} 플롯 요약 완료
              </p>
            )}
          </div>
        )}

        {/* Work summary */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500">AI 작품 전체 요약</label>
            <div className="flex items-center gap-1.5">
              {workSummary && (
                <button
                  onClick={() => navigator.clipboard.writeText(workSummary)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded border border-gray-200"
                >
                  복사
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={loading || !canGenerate}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-2 py-1 rounded transition-colors"
                title={generateTitle}
              >
                {loading ? '생성 중...' : '요약 생성'}
              </button>
            </div>
          </div>

          {workSummary ? (
            <textarea
              value={workSummary}
              onChange={(e) => setLocalWorkSummary(e.target.value)}
              rows={10}
              className="w-full bg-white text-gray-700 rounded px-2 py-1.5 text-xs outline-none border border-gray-200 resize-none"
            />
          ) : (
            <div className="w-full bg-gray-50 border border-dashed border-gray-200 rounded px-2 py-6 text-center text-xs text-gray-400">
              {loading
                ? '생성 중...'
                : !canGenerate
                ? isNovel
                  ? '에디터에서 각 챕터를 AI로 먼저 요약해주세요'
                  : '에디터에서 각 플롯을 AI로 먼저 요약해주세요'
                : "'요약 생성' 버튼을 눌러 작품 전체를 요약하세요"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
