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

function CharacterNode({ data }: { data: { label: string; color: string; properties: [string, string][]; isCenter?: boolean; isBouncing?: boolean } }) {
  const visibleProps = data.properties.slice(0, 3);
  const extra = data.properties.length - 3;
  const size = data.isCenter ? 88 : 72;
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

export default function GraphView() {
  const { selectedWorkId, characters, relations, selectCharacter, works } = useStore();
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const handleExportPng = useCallback(async () => {
    const el = graphContainerRef.current?.querySelector('.react-flow') as HTMLElement | null;
    if (!el) return;
    const workName = works.find((w) => w.id === selectedWorkId)?.title ?? '관계도';
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#f4f5f7', pixelRatio: 2 });
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

  const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes);
    setNodes((nds) => {
      nds.forEach((n) => { nodePositions.current[n.id] = n.position; });
      return nds;
    });
  }, [onNodesChange, setNodes]);

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
  }, []);

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectCharacter(Number(node.id));
  }, [selectCharacter]);

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

  return (
    <div ref={graphContainerRef} className="w-full h-full relative">
      {/* Export PNG button */}
      <button
        onClick={handleExportPng}
        className="absolute top-3 right-3 z-10 px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-600 rounded shadow hover:bg-gray-50 transition-colors"
        title="관계도를 PNG로 내보내기"
      >
        🖼️ PNG 내보내기
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={handleNodeDragStop}
        onNodeDoubleClick={handleNodeDoubleClick}
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
    </div>
  );
}
