import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post, Comment } from './dummyData';
import { DUMMY_COMMENTS, DUMMY_POSTS } from './dummyData';

type SortOrder = '최신순' | '인기순';

interface ThreadDetailProps {
  post: Post | null;
  expanded: boolean;
  onExpand: (post: Post) => void;
  onCollapse: () => void;
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

export default function ThreadDetail({ post, expanded, onExpand, onCollapse }: ThreadDetailProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('최신순');
  const [newComment, setNewComment] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>(DUMMY_COMMENTS);

  if (!post) {
    return (
      <div className="flex flex-col h-full">
        {/* Header with editor link when no post selected */}
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

  const postComments = localComments
    .filter((c) => c.post_id === post.id)
    .sort((a, b) =>
      sortOrder === '인기순' ? b.like_count - a.like_count : b.id - a.id
    );

  const handleSubmitComment = () => {
    const text = newComment.trim();
    if (!text) return;
    const comment: Comment = {
      id: Date.now(),
      post_id: post.id,
      author_name: '나',
      author_color: '#AD1B02',
      text,
      created_at: '방금 전',
      like_count: 0,
    };
    setLocalComments((prev) => [...prev, comment]);
    setNewComment('');
  };

  // Expanded mode: centered max-width content for comfortable reading
  const contentClass = expanded
    ? 'flex-1 overflow-y-auto py-6 px-6'
    : 'flex-1 overflow-y-auto px-4 py-3';
  const innerClass = expanded ? 'max-w-2xl mx-auto' : '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <button
              onClick={onCollapse}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#AD1B02] transition-colors flex-shrink-0"
            >
              ← 목록으로
            </button>
          ) : (
            <span className="text-sm font-semibold text-[#1a0a06] truncate">{post.episode_title}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Sort buttons */}
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
          {/* Expand button (only in normal mode) */}
          {!expanded && (
            <button
              onClick={() => onExpand(post)}
              className="px-2 py-0.5 text-xs text-gray-500 hover:text-[#AD1B02] transition-colors border border-gray-200 rounded"
              title="넓게 보기"
            >
              ⤢ 넓게
            </button>
          )}
          {/* Editor link */}
          <Link
            to="/"
            className="px-2 py-0.5 text-xs text-gray-500 hover:text-[#AD1B02] transition-colors"
          >
            ← 에디터
          </Link>
        </div>
      </div>

      {/* Scrollable content */}
      <div className={contentClass}>
        <div className={innerClass}>
          {/* Post title (expanded only) */}
          {expanded && (
            <h2 className="text-lg font-bold text-[#1a0a06] mb-1">{post.post_title}</h2>
          )}

          {/* Post body */}
          <div className="flex items-start gap-2 mb-3">
            <Avatar name={post.author_name} color={post.author_color} />
            <div>
              <div className="font-semibold text-sm text-[#1a0a06]">{post.author_name}</div>
              <div className="text-xs text-gray-500">
                {expanded ? post.episode_title : post.post_title} · {post.created_at}
              </div>
            </div>
          </div>

          {/* Full content preview */}
          <div className="scene-preview mb-4">
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
          <div className="text-xs font-semibold text-gray-700 mb-2">댓글 {postComments.length}개</div>

          <div className="flex flex-col gap-3 mb-4">
            {postComments.length === 0 ? (
              <p className="text-xs text-gray-400">첫 댓글을 남겨보세요!</p>
            ) : (
              postComments.map((comment) => (
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
                      <button className="text-xs text-gray-400 hover:text-[#AD1B02] transition-colors">
                        💬 답달
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Comment input */}
      <div className="border-t border-gray-200 px-4 py-2 flex-shrink-0">
        <div className={`flex items-center gap-2 ${expanded ? 'max-w-2xl mx-auto' : ''}`}>
          <Avatar name="나" color="#AD1B02" size="sm" />
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
            className="px-2 py-1.5 text-xs bg-[#AD1B02] text-white rounded hover:bg-[#8a1500] transition-colors"
          >
            등록
          </button>
        </div>
      </div>

      {/* Footer stats */}
      <div className="border-t border-gray-100 px-4 py-2 text-center flex-shrink-0">
        <span className="text-xs text-gray-400">{DUMMY_POSTS.length}건의 게시글 · 6명의 온라인 작가</span>
      </div>
    </div>
  );
}
