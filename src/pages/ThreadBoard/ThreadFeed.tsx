import React, { useState } from 'react';
import PostCard from './PostCard';
import { DUMMY_POSTS } from './dummyData';
import type { Post } from './dummyData';

type FeedTab = '광장' | '내 글' | '알림';

interface ThreadFeedProps {
  selectedPostId: number | null;
  onSelectPost: (post: Post) => void;
}

export default function ThreadFeed({ selectedPostId, onSelectPost }: ThreadFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('광장');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: FeedTab[] = ['광장', '내 글', '알림'];

  const filteredPosts = DUMMY_POSTS.filter((p) => {
    if (activeTab === '내 글') return p.author_name === '김소연'; // 더미: 내 글 필터
    if (activeTab === '알림') return false; // 알림은 별도 처리
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.post_title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-3 pt-3 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`thread-tab${activeTab === tab ? ' thread-tab--active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search + new post */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색..."
            className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:border-gray-400"
          />
        </div>
        <button className="flex-shrink-0 px-2 py-1.5 text-xs bg-[#AD1B02] text-white rounded hover:bg-[#8a1500] transition-colors whitespace-nowrap">
          + 새로운 글 쓰기
        </button>
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {activeTab === '알림' ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-2">
            <div className="text-2xl">🔔</div>
            <p>새로운 알림이 없습니다</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-2">
            <div className="text-2xl">📭</div>
            <p>게시글이 없습니다</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              selected={selectedPostId === post.id}
              onClick={() => onSelectPost(post)}
            />
          ))
        )}
      </div>
    </div>
  );
}
