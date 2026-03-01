import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThreadFeed from './ThreadFeed';
import ThreadDetail from './ThreadDetail';
import type { CommunityPost } from '../../db';

export default function ThreadBoard() {
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const navigate = useNavigate();

  return (
    <>
      {/* Middle panel: feed */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col bg-[#faf8f5]">
        <ThreadFeed
          selectedPostId={selectedPost?.id ?? null}
          onSelectPost={setSelectedPost}
          onNewPost={() => navigate('/')}
        />
      </div>

      {/* Right panel: detail */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <ThreadDetail post={selectedPost} />
      </div>
    </>
  );
}
