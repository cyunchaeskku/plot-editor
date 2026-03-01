import React, { useState } from 'react';
import ThreadFeed from './ThreadFeed';
import ThreadDetail from './ThreadDetail';
import type { Post } from './dummyData';

export default function ThreadBoard() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  return (
    <>
      {/* Middle panel: feed */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col bg-[#faf8f5]">
        <ThreadFeed
          selectedPostId={selectedPost?.id ?? null}
          onSelectPost={setSelectedPost}
        />
      </div>

      {/* Right panel: detail */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <ThreadDetail post={selectedPost} />
      </div>
    </>
  );
}
