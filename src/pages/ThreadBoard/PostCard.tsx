import React from 'react';
import type { Post } from './dummyData';

interface PostCardProps {
  post: Post;
  selected: boolean;
  onClick: () => void;
  onExpand: () => void;
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.charAt(0);
  return (
    <div className="post-avatar" style={{ backgroundColor: color }}>
      {initials}
    </div>
  );
}

export default function PostCard({ post, selected, onClick, onExpand }: PostCardProps) {
  return (
    <div
      className={`post-card${selected ? ' post-card--selected' : ''}`}
      onClick={onClick}
    >
      {/* Header: avatar + title + menu */}
      <div className="flex items-start gap-2">
        <Avatar name={post.author_name} color={post.author_color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-[#1a0a06] text-sm leading-tight truncate">{post.post_title}</div>
            <span className="text-gray-400 text-xs flex-shrink-0">···</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{post.description}</div>
        </div>
      </div>

      {/* Content preview */}
      <div className="scene-preview mt-2">
        <div className="scene-preview__heading">
          {post.content_preview.scene_heading}
        </div>
        <div className="scene-preview__meta">
          <span>📍 {post.content_preview.scene_location}</span>
          <span>⏱ {post.content_preview.scene_time}</span>
        </div>
        <div className="scene-preview__dialogues">
          {post.content_preview.dialogues.slice(0, 2).map((d, i) => (
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
      <div className="flex flex-wrap gap-1 mt-2">
        {post.tags.map((tag) => (
          <span key={tag} className="post-tag">#{tag}</span>
        ))}
      </div>

      {/* Footer: stats + detail button */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>👁 {post.view_count}</span>
          <span>❤ {post.like_count}</span>
          <span>💬 {post.comment_count}</span>
        </div>
        <button
          className="text-xs text-[#AD1B02] hover:underline font-medium"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
        >
          자세히 보기 ↗
        </button>
      </div>
    </div>
  );
}
