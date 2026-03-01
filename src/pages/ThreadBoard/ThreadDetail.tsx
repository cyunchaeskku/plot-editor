import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { CommunityPost, CommunityComment, PlotBlock, PlotFullContent, NovelFullContent } from '../../db';
import { fetchComments, apiCreateComment, fetchPostContent } from '../../api';
import { useStore } from '../../store';

type SortOrder = '최신순' | '인기순';

interface ThreadDetailProps {
  post: CommunityPost | null;
}

function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <div
      className={`post-avatar${size === 'sm' ? ' post-avatar--sm' : ''}`}
      style={{ backgroundColor: color }}
    >
      {name.charAt(0)}
    </div>
  );
}

// ── Plot reader block ─────────────────────────────────────────────────────────

function PlotBlockItem({ block }: { block: PlotBlock }) {
  if (block.type === 'dialogue') {
    return (
      <div className="reader-dialogue" style={{ borderLeftColor: block.character_color }}>
        <span className="reader-dialogue__name">{block.character_name}</span>
        <span className="reader-dialogue__text">{block.text}</span>
      </div>
    );
  }
  if (block.type === 'narration') {
    return <div className="reader-narration">{block.text}</div>;
  }
  return <div className="reader-stage-direction">{block.text}</div>;
}

// ── Reader mode content ───────────────────────────────────────────────────────

function ReaderContent({ content }: { content: PlotFullContent | NovelFullContent }) {
  if (content.type === 'plot') {
    return (
      <div className="reader-plot">
        {content.scenes.map((scene, si) => (
          <div key={si} className="reader-scene">
            <div className="reader-scene__heading">{scene.scene_heading}</div>
            <div className="reader-scene__meta">
              <span>📍 {scene.scene_location}</span>
              <span>⏱ {scene.scene_time}</span>
            </div>
            <div className="reader-scene__blocks">
              {scene.blocks.map((block, bi) => (
                <PlotBlockItem key={bi} block={block} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="reader-novel">
      <h3 className="reader-novel__chapter">{content.chapter_title}</h3>
      {content.paragraphs.map((para, i) => (
        <p key={i} className="reader-novel__paragraph">{para}</p>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ThreadDetail({ post }: ThreadDetailProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('최신순');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [readerContent, setReaderContent] = useState<PlotFullContent | NovelFullContent | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isLoggedIn } = useStore();

  // Load comments when post changes
  useEffect(() => {
    if (!post) { setComments([]); return; }
    setCommentsLoading(true);
    setIsReaderMode(false);
    setReaderContent(null);
    fetchComments(post.id)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [post?.id]);

  if (!post) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
          <span className="text-xs text-gray-400">게시글을 선택하세요</span>
          <Link
            to="/"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#AD1B02] transition-colors"
          >
            ← 에디터로 돌아가기
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
          <div className="text-4xl">📝</div>
          <p className="text-sm">게시글을 선택하면 내용이 표시됩니다</p>
        </div>
      </div>
    );
  }

  const sortedComments = [...comments].sort((a, b) =>
    sortOrder === '인기순'
      ? b.like_count - a.like_count
      : b.created_at.localeCompare(a.created_at)
  );

  const handleSubmitComment = async () => {
    const text = newComment.trim();
    if (!text || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiCreateComment(post.id, text);
      setNewComment('');
      // Refresh comments
      const updated = await fetchComments(post.id);
      setComments(updated);
    } catch {
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReader = async () => {
    setReaderLoading(true);
    try {
      const raw = await fetchPostContent(post.id);
      setReaderContent(raw);
      setIsReaderMode(true);
    } catch {
      alert('내용을 불러오지 못했습니다.');
    } finally {
      setReaderLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isReaderMode ? (
            <button
              onClick={() => { setIsReaderMode(false); setReaderContent(null); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#AD1B02] transition-colors flex-shrink-0"
            >
              ← 닫기
            </button>
          ) : (
            <span className="text-sm font-semibold text-[#1a0a06] truncate">{post.episode_title}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isReaderMode && (
            <>
              {(['최신순', '인기순'] as SortOrder[]).map((order) => (
                <button
                  key={order}
                  onClick={() => setSortOrder(order)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    sortOrder === order
                      ? 'bg-[#AD1B02] text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {order}
                </button>
              ))}
            </>
          )}
          <Link
            to="/"
            className="px-2 py-0.5 text-xs text-gray-500 hover:text-[#AD1B02] transition-colors"
          >
            ← 에디터
          </Link>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isReaderMode && readerContent ? (
          /* ── Reader mode ─────────────────────────────────────────── */
          <div>
            <div className="mb-5">
              <div className="text-xs text-gray-400 mb-1">{post.work_title} · {post.episode_title}</div>
              <h2 className="text-base font-bold text-[#1a0a06]">{post.post_title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Avatar name={post.author_name} color={post.author_color} size="sm" />
                <span className="text-xs text-gray-600">{post.author_name}</span>
                <span className="text-xs text-gray-400">· {post.created_at}</span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <ReaderContent content={readerContent} />
            </div>
          </div>
        ) : (
          /* ── Normal detail view ──────────────────────────────────── */
          <>
            {/* Author info */}
            <div className="flex items-start gap-2 mb-3">
              <Avatar name={post.author_name} color={post.author_color} />
              <div>
                <div className="font-semibold text-sm text-[#1a0a06]">{post.author_name}</div>
                <div className="text-xs text-gray-500">
                  {post.post_title} · {post.created_at}
                </div>
              </div>
            </div>

            {/* Content preview + "자세히 보기" button */}
            {post.work_type === 'plot' ? (
              <div className="scene-preview mb-1">
                <div className="scene-preview__heading">{post.content_preview.scene_heading}</div>
                <div className="scene-preview__meta">
                  <span>📍 {post.content_preview.scene_location}</span>
                  <span>⏱ {post.content_preview.scene_time}</span>
                </div>
                <div className="scene-preview__dialogues">
                  {post.content_preview.dialogues.map((d, i) => (
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
              </div>
            ) : (
              <div className="novel-preview mb-1">
                <div className="novel-preview__chapter">{post.content_preview.chapter_title}</div>
                <div className="novel-preview__excerpt">{post.content_preview.excerpt}</div>
              </div>
            )}

            {/* 자세히 보기 button */}
            <div className="flex justify-end mb-3">
              <button
                onClick={handleOpenReader}
                disabled={readerLoading}
                className="text-xs text-[#AD1B02] hover:underline font-medium disabled:opacity-50"
              >
                {readerLoading ? '불러오는 중...' : '자세히 보기 ↗'}
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {post.tags.map((tag) => (
                <span key={tag} className="post-tag">#{tag}</span>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100">
              <span>👁 {post.view_count}</span>
              <span>❤ {post.like_count}</span>
              <span>💬 {post.comment_count}</span>
            </div>

            {/* Comments section */}
            <div className="text-xs font-semibold text-gray-700 mb-2">
              댓글 {commentsLoading ? '...' : sortedComments.length}개
            </div>

            <div className="flex flex-col gap-3 mb-4">
              {commentsLoading ? (
                <p className="text-xs text-gray-400">댓글을 불러오는 중...</p>
              ) : sortedComments.length === 0 ? (
                <p className="text-xs text-gray-400">첫 댓글을 남겨보세요!</p>
              ) : (
                sortedComments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2">
                    <Avatar name={comment.author_name} color={comment.author_color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-[#1a0a06]">{comment.author_name}</span>
                        <span className="text-xs text-gray-400">{comment.created_at}</span>
                      </div>
                      <p className="text-xs text-[#1a0a06] mt-0.5 leading-relaxed">{comment.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button className="text-xs text-gray-400 hover:text-[#AD1B02] transition-colors">
                          👍 {comment.like_count}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Comment input — hidden in reader mode, requires login */}
      {!isReaderMode && isLoggedIn && (
        <div className="border-t border-gray-200 px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(); }}
              placeholder="댓글을 입력하세요..."
              className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={handleSubmitComment}
              disabled={isSubmitting}
              className="px-2 py-1.5 text-xs bg-[#AD1B02] text-white rounded hover:bg-[#8a1500] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '...' : '등록'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
