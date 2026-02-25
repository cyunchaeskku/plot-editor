import React, { useCallback, useRef, useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { useStore } from '../../store';

export default function PlanningDoc() {
  const { selectedWorkId, planningDoc, savePlanningDoc } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leftPct, setLeftPct] = useState(50);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback((value?: string) => {
    if (!selectedWorkId) return;
    const content = value ?? '';
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      savePlanningDoc(selectedWorkId, content);
    }, 500);
    useStore.setState({ planningDoc: content });
  }, [selectedWorkId, savePlanningDoc]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(80, Math.max(20, pct)));
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  if (!selectedWorkId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">📝</div>
          <p>작품을 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex overflow-hidden" data-color-mode="light">
      <div style={{ width: previewCollapsed ? '100%' : `${leftPct}%`, overflow: 'hidden' }}>
        <MDEditor
          value={planningDoc}
          onChange={handleChange}
          height="100%"
          preview="edit"
        />
      </div>
      {/* Divider + collapse toggle */}
      <div
        style={{
          width: 20,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#e5e7eb',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        {!previewCollapsed && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              cursor: 'col-resize',
            }}
            onMouseDown={() => { dragging.current = true; }}
          />
        )}
        <button
          onClick={() => setPreviewCollapsed((v) => !v)}
          title={previewCollapsed ? '프리뷰 열기' : '프리뷰 닫기'}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            background: '#d1d5db',
            border: 'none',
            borderRadius: 4,
            width: 16,
            height: 40,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: '#6b7280',
            padding: 0,
          }}
        >
          {previewCollapsed ? '›' : '‹'}
        </button>
      </div>
      {!previewCollapsed && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#fff' }}>
          <MDEditor.Markdown source={planningDoc} />
        </div>
      )}
    </div>
  );
}
