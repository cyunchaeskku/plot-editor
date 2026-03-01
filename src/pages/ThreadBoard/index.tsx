import React, { useState } from 'react';
import ThreadFeed from './ThreadFeed';
import ThreadDetail from './ThreadDetail';
import type { Post } from './dummyData';

export default function ThreadBoard() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelectPost = (post: Post) => {
    setSelectedPost(post);
    setIsExpanded(false);
  };

  const handleExpand = (post: Post) => {
    setSelectedPost(post);
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  return (
    <>
      {/* Middle panel: feed — hidden when a post is expanded */}
      {!isExpanded && (
        <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col bg-[#faf8f5]">
          <ThreadFeed
            selectedPostId={selectedPost?.id ?? null}
            onSelectPost={handleSelectPost}
            onExpandPost={handleExpand}
          />
        </div>
      )}

      {/* Right panel: detail — takes full width when expanded */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <ThreadDetail
          post={selectedPost}
          expanded={isExpanded}
          onExpand={handleExpand}
          onCollapse={handleCollapse}
        />
      </div>
    </>
  );
}
