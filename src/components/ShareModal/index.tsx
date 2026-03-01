import React, { useState, useEffect } from 'react';
import type { Work, Episode, Plot } from '../../db';
import { tiptapToSnapshot } from '../../utils/tiptapToSnapshot';
import { apiCreatePost } from '../../api';

interface ShareModalProps {
  work: Work;
  episode: Episode;
  plot: Plot;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ShareModal({ work, episode, plot, onClose, onSuccess }: ShareModalProps) {
  const [postTitle, setPostTitle] = useState(plot.title);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // Parse snapshot for preview
  let snapshotResult;
  try {
    const tiptapJson = JSON.parse(plot.content || '{}');
    snapshotResult = tiptapToSnapshot(tiptapJson, work.type, episode.title);
  } catch {
    snapshotResult = null;
  }

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!postTitle.trim()) return;
    if (!snapshotResult) {
      setPreviewError('플롯 내용을 파싱할 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await apiCreatePost({
        post_id: Date.now(),
        work_id: work.id,
        work_title: work.title,
        episode_title: episode.title,
        work_type: work.type,
        post_title: postTitle.trim(),
        description: description.trim(),
        tags,
        content_preview: snapshotResult.contentPreview,
        content_snapshot: snapshotResult.fullContent,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(`공유 실패: ${err.message ?? '오류가 발생했습니다.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Keyboard: Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-bold text-[#1a0a06]">커뮤니티에 공유하기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Work meta (read-only) */}
          <div className="bg-[#faf8f5] rounded px-3 py-2 text-xs text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-700">{work.title}</span>
            {' · '}
            {episode.title}
            {' · '}
            {plot.title}
          </div>

          {/* Post title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">게시글 제목</label>
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              placeholder="게시글 제목을 입력하세요"
            />
          </div>

          {/* Description / body text */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">하고 싶은 말</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400 resize-none"
              placeholder="예: 여러분 이 글 어떤가요? 댓글 남겨주세요!"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">태그 (쉼표로 구분)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              placeholder="예: 희곡, 로맨스, 단막극"
            />
          </div>

          {/* Content preview */}
          {snapshotResult ? (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">콘텐츠 미리보기</div>
              {work.type === 'plot' ? (
                <div className="scene-preview">
                  <div className="scene-preview__heading">
                    {(snapshotResult.contentPreview as any).scene_heading}
                  </div>
                  {(snapshotResult.contentPreview as any).dialogues?.slice(0, 2).map((d: any, i: number) => (
                    <div
                      key={i}
                      className="dialogue-preview"
                      style={{ borderLeftColor: d.character_color }}
                    >
                      <span className="dialogue-preview__name">{d.character_name}</span>
                      <span className="dialogue-preview__text">{d.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="novel-preview">
                  <div className="novel-preview__chapter">
                    {(snapshotResult.contentPreview as any).chapter_title}
                  </div>
                  <div className="novel-preview__excerpt">
                    {(snapshotResult.contentPreview as any).excerpt}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">{previewError || '미리보기를 생성할 수 없습니다.'}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !postTitle.trim()}
            className="px-4 py-1.5 text-xs bg-[#AD1B02] text-white rounded hover:bg-[#8a1500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '공유 중...' : '공유하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
