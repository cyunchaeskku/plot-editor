import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PostCard from './PostCard';
import type { CommunityPost } from '../../db';
import { fetchPosts, fetchMyPosts } from '../../api';
import { useStore } from '../../store';

type FeedTab = '광장' | '내 글' | '알림';

interface ThreadFeedProps {
  selectedPostId: string | null;
  onSelectPost: (post: CommunityPost) => void;
  onNewPost?: () => void;
}

export default function ThreadFeed({ selectedPostId, onSelectPost, onNewPost }: ThreadFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('광장');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { isLoggedIn } = useStore();

  const tabs: FeedTab[] = ['광장', '내 글', '알림'];

  const loadPosts = useCallback(async () => {
    if (activeTab === '알림') return;
    setIsLoading(true);
    setError('');
    try {
      const data = activeTab === '내 글' ? await fetchMyPosts() : await fetchPosts();
      setPosts(data);
    } catch (err: any) {
      setError('게시글을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.post_title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Back to editor */}
      <div className="flex items-center px-3 pt-2 pb-1 flex-shrink-0">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#AD1B02] transition-colors"
        >
          ← 에디터로
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-3 flex-shrink-0">
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
        {isLoggedIn && (
          <button
            onClick={onNewPost}
            className="flex-shrink-0 px-2 py-1.5 text-xs bg-[#AD1B02] text-white rounded hover:bg-[#8a1500] transition-colors whitespace-nowrap"
          >
            + 공유하기
          </button>
        )}
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {activeTab === '알림' ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-2">
            <div className="text-2xl">🔔</div>
            <p>새로운 알림이 없습니다</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-2">
            <div className="text-2xl">⏳</div>
            <p>불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs gap-2">
            <div className="text-2xl">⚠️</div>
            <p>{error}</p>
            <button
              onClick={loadPosts}
              className="px-3 py-1 text-xs text-[#AD1B02] border border-[#AD1B02] rounded hover:bg-[#AD1B02] hover:text-white transition-colors"
            >
              다시 시도
            </button>
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
