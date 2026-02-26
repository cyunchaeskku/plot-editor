import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  EdgeProps,
  Position,
  MarkerType,
  Handle,
  useNodesState,
  useStore as useRFStore,
  getStraightPath,
  EdgeLabelRenderer,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../../store';

// Floating edge: draws a straight line between the two closest circle-border points
function FloatingEdge({ id, source, target, markerEnd, style, label, labelStyle, labelBgStyle, data }: EdgeProps) {
  const nodeInternals = useRFStore((s) => s.nodeInternals);
  const sourceNode = nodeInternals.get(source);
  const targetNode = nodeInternals.get(target);

  if (!sourceNode || !targetNode) return null;

  const srcRadius = (sourceNode.data?.isCenter ? 88 : 72) / 2;
  const tgtRadius = (targetNode.data?.isCenter ? 88 : 72) / 2;

  const sx = (sourceNode.positionAbsolute?.x ?? sourceNode.position.x) + srcRadius;
  const sy = (sourceNode.positionAbsolute?.y ?? sourceNode.position.y) + srcRadius;
  const tx = (targetNode.positionAbsolute?.x ?? targetNode.position.x) + tgtRadius;
  const ty = (targetNode.positionAbsolute?.y ?? targetNode.position.y) + tgtRadius;

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return null;

  const nx = dx / dist;
  const ny = dy / dist;

  // Parallel offset for bidirectional edges
  const edgeIndex: number = (data as { edgeIndex?: number })?.edgeIndex ?? 0;
  const totalEdges: number = (data as { totalEdges?: number })?.totalEdges ?? 1;
  const offset = (edgeIndex - (totalEdges - 1) / 2) * 18;
  // Use canonical direction (min→max) so both edges offset to the same side
  const canonicalFlip = Number(source) > Number(target) ? -1 : 1;
  const offsetX = -ny * offset * canonicalFlip;
  const offsetY = nx * offset * canonicalFlip;

  const startX = sx + nx * srcRadius + offsetX;
  const startY = sy + ny * srcRadius + offsetY;
  const endX = tx - nx * tgtRadius + offsetX;
  const endY = ty - ny * tgtRadius + offsetY;

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: startX,
    sourceY: startY,
    targetX: endX,
    targetY: endY,
  });

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={style}
        markerEnd={markerEnd as string}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: (labelBgStyle as React.CSSProperties)?.background ?? 'rgba(255,255,255,0.8)',
              padding: '1px 5px',
              borderRadius: 3,
              fontSize: 11,
              color: (labelStyle as React.CSSProperties)?.color ?? '#374151',
              pointerEvents: 'all',
            }}
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function CharacterNode({ data }: {
  data: {
    label: string;
    color: string;
    properties: [string, string][];
    isCenter?: boolean;
    isBouncing?: boolean;
    isConnectSource?: boolean;
    isConnectTarget?: boolean;
  };
}) {
  const visibleProps = data.properties.slice(0, 3);
  const extra = data.properties.length - 3;
  const size = data.isCenter ? 88 : 72;

  let ringStyle: React.CSSProperties = {};
  if (data.isConnectSource) {
    ringStyle = { boxShadow: `0 0 0 3px #6366f1, 0 0 12px 4px #6366f155` };
  } else if (data.isConnectTarget) {
    ringStyle = { boxShadow: `0 0 0 3px #10b981, 0 0 8px 2px #10b98133`, cursor: 'pointer' };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} className={data.isBouncing ? 'node-bounce' : ''}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: data.color + '33',
          border: `2px solid ${data.color}`,
          color: data.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'center',
          padding: '4px',
          wordBreak: 'keep-all',
          position: 'relative',
          transition: 'box-shadow 0.2s',
          ...ringStyle,
        }}
      >
        <Handle type="source" position={Position.Top}    style={{ opacity: 0 }} id="top-s" />
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="bottom-s" />
        <Handle type="source" position={Position.Left}   style={{ opacity: 0 }} id="left-s" />
        <Handle type="source" position={Position.Right}  style={{ opacity: 0 }} id="right-s" />
        <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} id="top-t" />
        <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} id="bottom-t" />
        <Handle type="target" position={Position.Left}   style={{ opacity: 0 }} id="left-t" />
        <Handle type="target" position={Position.Right}  style={{ opacity: 0 }} id="right-t" />
        {data.label}
      </div>
      {data.properties.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 4, maxWidth: 100, justifyContent: 'center' }}>
          {visibleProps.map(([key]) => (
            <span key={key} style={{ fontSize: 9, background: '#e5e7eb', color: '#6b7280', borderRadius: 3, padding: '1px 4px' }}>{key}</span>
          ))}
          {extra > 0 && (
            <span style={{ fontSize: 9, background: '#e5e7eb', color: '#6b7280', borderRadius: 3, padding: '1px 4px' }}>+{extra}</span>
          )}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { characterNode: CharacterNode };
const edgeTypes = { floating: FloatingEdge };

// ── Context menu shown on single-click ──────────────────────────────────────
interface NodeMenuState {
  nodeId: string;
  x: number;
  y: number;
}

// ── Relation name input modal ────────────────────────────────────────────────
interface RelationModalState {
  fromId: string;
  toId: string;
}

export default function GraphView() {
  const { selectedWorkId, characters, relations, selectCharacter, setRightPanelMode, createRelation, works } = useStore();
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Context menu
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);
  // "Add relation" mode: we remember the source node id
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  // Modal for naming the new relation
  const [relationModal, setRelationModal] = useState<RelationModalState | null>(null);
  const [relationName, setRelationName] = useState('');

  const handleExportPng = useCallback(async () => {
    const el = graphContainerRef.current?.querySelector('.react-flow') as HTMLElement | null;
    if (!el) return;
    const workName = works.find((w) => w.id === selectedWorkId)?.title ?? '관계도';
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: '#f4f5f7',
        pixelRatio: 2,
        filter: (node) => {
          if ((node as HTMLElement).classList?.contains('react-flow__panel')) return false;
          if ((node as HTMLElement).classList?.contains('react-flow__attribution')) return false;
          return true;
        },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${workName}_관계도.png`;
      a.click();
    } catch (e) {
      console.error('PNG export failed:', e);
    }
  }, [selectedWorkId, works]);

  const workChars = selectedWorkId ? (characters[selectedWorkId] || []) : [];

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [bouncingNodeId, setBouncingNodeId] = useState<string | null>(null);
  const nodePositions = useRef<Record<string, { x: number; y: number }>>({});
  const layoutSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GraphView 진입 시 저장된 노드 위치 불러오기
  useEffect(() => {
    if (!selectedWorkId) return;
    fetch(`http://localhost:8000/graph-layout/${selectedWorkId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((positions: Record<string, { x: number; y: number }>) => {
        nodePositions.current = positions;
      })
      .catch(() => {});
  }, [selectedWorkId]);

  const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes);
    setNodes((nds) => {
      nds.forEach((n) => { nodePositions.current[n.id] = n.position; });
      // 1초 debounce 후 클라우드 저장
      if (layoutSaveTimeout.current) clearTimeout(layoutSaveTimeout.current);
      layoutSaveTimeout.current = setTimeout(() => {
        if (!selectedWorkId) return;
        fetch(`http://localhost:8000/graph-layout/${selectedWorkId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nodePositions.current),
        }).catch(() => {});
      }, 1000);
      return nds;
    });
  }, [onNodesChange, setNodes, selectedWorkId]);

  useEffect(() => {
    const count = workChars.length;
    const centerX = 300;
    const centerY = 250;
    const radius = Math.max(180, count * 45);
    const initialNodes: Node[] = workChars.map((char, i) => {
      let properties: [string, string][] = [];
      try { properties = Object.entries(JSON.parse(char.properties)) as [string, string][]; } catch {}
      const savedPos = nodePositions.current[String(char.id)];
      if (i === 0) {
        return {
          id: String(char.id),
          type: 'characterNode',
          position: savedPos ?? { x: centerX, y: centerY },
          data: { label: char.name, color: char.color, properties, isCenter: true },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
      }
      const angle = ((i - 1) / Math.max(count - 1, 1)) * 2 * Math.PI;
      return {
        id: String(char.id),
        type: 'characterNode',
        position: savedPos ?? {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        },
        data: { label: char.name, color: char.color, properties, isCenter: false },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
    setNodes(initialNodes);
  }, [workChars]);

  // Sync connect-source / connect-target highlights
  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        isConnectSource: connectingFrom === n.id,
        isConnectTarget: connectingFrom !== null && connectingFrom !== n.id,
      },
    })));
  }, [connectingFrom]);

  useEffect(() => {
    if (!bouncingNodeId) return;
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isBouncing: n.id === bouncingNodeId } })));
    const timer = setTimeout(() => {
      setBouncingNodeId(null);
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isBouncing: false } })));
    }, 400);
    return () => clearTimeout(timer);
  }, [bouncingNodeId]);

  const handleNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    setBouncingNodeId(node.id);
    setNodeMenu(null);
  }, []);

  // Single click handler — show menu OR pick relation target
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();

    // If we're in "connect" mode, this click picks the target
    if (connectingFrom !== null) {
      if (connectingFrom === node.id) {
        // Clicked same node → cancel
        setConnectingFrom(null);
        return;
      }
      // Open naming modal
      setRelationModal({ fromId: connectingFrom, toId: node.id });
      setRelationName('');
      setConnectingFrom(null);
      return;
    }

    // Otherwise show context menu at cursor position relative to container
    const rect = graphContainerRef.current?.getBoundingClientRect();
    const x = rect ? event.clientX - rect.left : event.clientX;
    const y = rect ? event.clientY - rect.top : event.clientY;
    setNodeMenu({ nodeId: node.id, x, y });
  }, [connectingFrom]);

  // Double-click still navigates to character detail
  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setNodeMenu(null);
    selectCharacter(Number(node.id));
  }, [selectCharacter]);

  // Click on canvas background → close menu / cancel connect
  const handlePaneClick = useCallback(() => {
    setNodeMenu(null);
    setConnectingFrom(null);
  }, []);

  // Menu actions
  const handleMenuAddRelation = useCallback(() => {
    if (!nodeMenu) return;
    setConnectingFrom(nodeMenu.nodeId);
    setNodeMenu(null);
  }, [nodeMenu]);

  const handleMenuViewDetail = useCallback(() => {
    if (!nodeMenu) return;
    selectCharacter(Number(nodeMenu.nodeId));
    setRightPanelMode('character');
    setNodeMenu(null);
  }, [nodeMenu, selectCharacter, setRightPanelMode]);

  // ESC cancels connect mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectingFrom(null);
        setNodeMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Confirm relation creation
  const handleConfirmRelation = useCallback(async () => {
    if (!relationModal) return;
    const name = relationName.trim();
    await createRelation(Number(relationModal.fromId), Number(relationModal.toId), name || '관계');
    setRelationModal(null);
    setRelationName('');
  }, [relationModal, relationName, createRelation]);

  const edges: Edge[] = useMemo(() => {
    const pairCount: Record<string, number> = {};
    const pairCursor: Record<string, number> = {};
    relations.forEach((rel) => {
      const key = [rel.from_character_id, rel.to_character_id].sort().join('-');
      pairCount[key] = (pairCount[key] || 0) + 1;
    });
    return relations.map((rel) => {
      const key = [rel.from_character_id, rel.to_character_id].sort().join('-');
      pairCursor[key] = pairCursor[key] ?? 0;
      const edgeIndex = pairCursor[key]++;
      const totalEdges = pairCount[key];
      return {
        id: String(rel.id),
        source: String(rel.from_character_id),
        target: String(rel.to_character_id),
        label: rel.relation_name,
        animated: false,
        type: 'floating',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#4b5563',
        },
        style: {
          stroke: '#4b5563',
          strokeWidth: 2,
        },
        labelStyle: { fill: '#374151', fontSize: 11 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
        data: { edgeIndex, totalEdges },
      };
    });
  }, [relations]);

  if (!selectedWorkId || workChars.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">🕸️</div>
          <p>등장인물을 추가하면 관계도가 표시됩니다</p>
        </div>
      </div>
    );
  }

  const fromCharName = connectingFrom
    ? workChars.find((c) => String(c.id) === connectingFrom)?.name
    : null;
  const modalFromName = relationModal
    ? workChars.find((c) => String(c.id) === relationModal.fromId)?.name ?? ''
    : '';
  const modalToName = relationModal
    ? workChars.find((c) => String(c.id) === relationModal.toId)?.name ?? ''
    : '';

  return (
    <div ref={graphContainerRef} className="w-full h-full relative" onClick={() => setNodeMenu(null)}>
      {/* Export PNG button */}
      <button
        onClick={(e) => { e.stopPropagation(); handleExportPng(); }}
        className="absolute top-3 right-3 z-10 px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-600 rounded shadow hover:bg-gray-50 transition-colors"
        title="관계도를 PNG로 내보내기"
      >
        🖼️ PNG 내보내기
      </button>

      {/* Connect mode hint banner */}
      {connectingFrom && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-indigo-600 text-white text-xs rounded-full shadow-lg pointer-events-none select-none">
          <span className="font-semibold">{fromCharName}</span>에서 → 관계를 연결할 인물을 클릭하세요 &nbsp;·&nbsp; ESC로 취소
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        fitView
        attributionPosition="bottom-right"
        style={{ background: '#f4f5f7' }}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(n) => n.data.color}
          style={{ background: '#e2e8f0' }}
        />
      </ReactFlow>

      {/* Node context menu */}
      {nodeMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: nodeMenu.y,
            left: nodeMenu.x,
            zIndex: 50,
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]"
        >
          <button
            onClick={handleMenuAddRelation}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>🔗</span> 관계 추가
          </button>
          <button
            onClick={handleMenuViewDetail}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>👤</span> 인물 상세 정보
          </button>
        </div>
      )}

      {/* Relation name modal */}
      {relationModal && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => { setRelationModal(null); setConnectingFrom(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-800 mb-1">관계 추가</div>
            <div className="text-xs text-gray-500 mb-4">
              <span className="font-medium text-indigo-600">{modalFromName}</span>
              {' → '}
              <span className="font-medium text-emerald-600">{modalToName}</span>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="관계 이름 (예: 친구, 적, 스승)"
              value={relationName}
              onChange={(e) => setRelationName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmRelation();
                if (e.key === 'Escape') { setRelationModal(null); }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRelationModal(null)}
                className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >취소</button>
              <button
                onClick={handleConfirmRelation}
                className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
