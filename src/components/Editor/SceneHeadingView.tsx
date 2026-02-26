import React from 'react';
import { NodeViewWrapper, NodeViewContent, ReactNodeViewProps } from '@tiptap/react';

export default function SceneHeadingView({ node, updateAttributes }: ReactNodeViewProps) {
  const sceneNumber = node.attrs.sceneNumber as number;
  const location = (node.attrs.location as string) || '';
  const time = (node.attrs.time as string) || '';

  return (
    <NodeViewWrapper className="scene-heading" data-type="scene-heading">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 700, flexShrink: 0 }}>S#{sceneNumber}</span>
        <NodeViewContent
          style={{ flex: 1, minWidth: 40, outline: 'none', display: 'inline-block' }}
        />
      </div>
      <div
        contentEditable={false}
        style={{ display: 'flex', gap: 8, marginTop: 2, paddingLeft: 28 }}
      >
        <span style={{ fontSize: 10, opacity: 0.7 }}>📍</span>
        <input
          value={location}
          onChange={(e) => updateAttributes({ location: e.target.value })}
          placeholder="장소"
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(139,92,246,0.3)',
            color: 'inherit',
            fontSize: 10,
            outline: 'none',
            minWidth: 60,
            width: Math.max(60, (location.length + 2) * 7) + 'px',
          }}
        />
        <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 8 }}>⏱</span>
        <input
          value={time}
          onChange={(e) => updateAttributes({ time: e.target.value })}
          placeholder="시간"
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(139,92,246,0.3)',
            color: 'inherit',
            fontSize: 10,
            outline: 'none',
            minWidth: 60,
            width: Math.max(60, (time.length + 2) * 7) + 'px',
          }}
        />
      </div>
    </NodeViewWrapper>
  );
}
