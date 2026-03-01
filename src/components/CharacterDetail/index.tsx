import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../../store';
import { fetchCharacterDialogues, generateCharacterSummary } from '../../api';
import type { CharacterDialogue } from '../../api';

const PRESET_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
];

interface Property {
  key: string;
  value: string;
}

export default function CharacterDetail() {
  const {
    selectedCharacterId,
    selectedWorkId,
    characters,
    relations,
    updateCharacter,
    createRelation,
    deleteRelation,
  } = useStore();

  const workChars = selectedWorkId ? (characters[selectedWorkId] || []) : [];
  const char = workChars.find((c) => c.id === selectedCharacterId);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [properties, setProperties] = useState<Property[]>([]);
  const [newRelTarget, setNewRelTarget] = useState<number | ''>('');
  const [newRelName, setNewRelName] = useState('');
  const [memo, setMemo] = useState('');
  const [image, setImage] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogues, setDialogues] = useState<CharacterDialogue[]>([]);
  const [dialoguesLoading, setDialoguesLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [llmContext, setLlmContext] = useState('');
  const [llmContextOpen, setLlmContextOpen] = useState(false);

  useEffect(() => {
    if (!char) return;
    setName(char.name);
    setColor(char.color);
    setMemo(char.memo || '');
    setImage(char.image || '');
    setAiSummary(char.ai_summary || '');
    try {
      const parsed = JSON.parse(char.properties);
      setProperties(Object.entries(parsed).map(([key, value]) => ({ key, value: value as string })));
    } catch {
      setProperties([]);
    }
    setIsDirty(false);
  }, [char?.id]);

  const refreshDialogues = () => {
    if (!char) return;
    setDialogues([]);
    setDialoguesLoading(true);
    fetchCharacterDialogues(char.id)
      .then(setDialogues)
      .catch(() => setDialogues([]))
      .finally(() => setDialoguesLoading(false));
  };

  useEffect(() => {
    refreshDialogues();
  }, [char?.id]);

  if (!char) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">👤</div>
          <p>등장인물을 선택하세요</p>
        </div>
      </div>
    );
  }

  const outgoingRelations = relations.filter((r) => r.from_character_id === char.id);
  const incomingRelations = relations.filter((r) => r.to_character_id === char.id);

  const handleSave = async () => {
    const propsObj = Object.fromEntries(properties.filter((p) => p.key).map((p) => [p.key, p.value]));
    await updateCharacter(char.id, name, color, JSON.stringify(propsObj), memo, image, aiSummary);
    setIsDirty(false);
  };

  const handleGenerateSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const res = await generateCharacterSummary(char.id, aiSummary);
      setAiSummary(res.summary);
      setLlmContext(res.context ?? '');
      // 생성 즉시 자동 저장
      const propsObj = Object.fromEntries(properties.filter((p) => p.key).map((p) => [p.key, p.value]));
      await updateCharacter(char.id, name, color, JSON.stringify(propsObj), memo, image, res.summary);
      setIsDirty(false);
    } catch (err) {
      alert('AI 요약 생성에 실패했습니다. 백엔드가 실행 중인지 확인하세요.');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const addProperty = () => {
    setProperties((ps) => [...ps, { key: '', value: '' }]);
    setIsDirty(true);
  };

  const updateProperty = (idx: number, field: 'key' | 'value', val: string) => {
    setProperties((ps) => ps.map((p, i) => i === idx ? { ...p, [field]: val } : p));
    setIsDirty(true);
  };

  const removeProperty = (idx: number) => {
    setProperties((ps) => ps.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const handleImageFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAddRelation = async () => {
    if (!newRelTarget || !newRelName.trim()) return;
    const target = newRelTarget as number;
    const name = newRelName.trim();
    setNewRelTarget('');
    setNewRelName('');
    await createRelation(char.id, target, name);
  };

  return (
    <div className="h-full overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleImageFile}
      />
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: char.color }} />
        <span className="text-sm font-semibold text-gray-800">{char.name}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">이름</label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
            className="w-full bg-white text-gray-800 rounded px-3 py-1.5 text-sm outline-none border border-gray-200"
          />
        </div>

        {/* Color */}
        <div>
          <label className="text-xs text-gray-500 mb-2 block">색상</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setIsDirty(true); }}
                className="w-6 h-6 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? 'white' : 'transparent',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
            <label
              className="w-6 h-6 rounded-full border-2 transition-transform relative overflow-hidden flex-shrink-0 cursor-pointer"
              style={{
                borderColor: !PRESET_COLORS.includes(color) ? 'white' : 'transparent',
                transform: !PRESET_COLORS.includes(color) ? 'scale(1.2)' : 'scale(1)',
                background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              }}
              title="직접 선택"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); setIsDirty(true); }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>

        {/* Properties */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500">특성</label>
            <button onClick={addProperty} className="text-xs text-indigo-400 hover:text-indigo-300">+ 항목 추가</button>
          </div>
          <div className="space-y-1.5">
            {properties.map((prop, idx) => (
              <div key={idx} className="flex gap-1.5">
                <input
                  value={prop.key}
                  onChange={(e) => updateProperty(idx, 'key', e.target.value)}
                  placeholder="특성 (예: 부유함)"
                  className="w-1/3 bg-white text-gray-700 rounded px-2 py-1 text-xs outline-none border border-gray-200"
                />
                <input
                  value={prop.value}
                  onChange={(e) => updateProperty(idx, 'value', e.target.value)}
                  placeholder="설명"
                  className="flex-1 bg-white text-gray-700 rounded px-2 py-1 text-xs outline-none border border-gray-200"
                />
                <button
                  onClick={() => removeProperty(idx)}
                  className="text-gray-600 hover:text-red-400 text-xs px-1"
                >✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Memo */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">메모</label>
          <textarea
            value={memo}
            onChange={(e) => { setMemo(e.target.value); setIsDirty(true); }}
            placeholder="인물에 대한 메모를 자유롭게 적어보세요"
            rows={4}
            className="w-full bg-white text-gray-700 rounded px-2 py-1.5 text-xs outline-none border border-gray-200 resize-none"
          />
        </div>

        {/* Image */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-500">사진</label>
            <span className="text-[10px] text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">이미지 동기화 준비 중</span>
          </div>
          {image ? (
            <div className="flex items-center gap-3">
              <img
                src={image}
                alt="character"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}` }}
              />
              <div className="flex flex-col gap-1">
                <button onClick={handleImageUpload} className="text-xs text-indigo-500 hover:text-indigo-700">변경</button>
                <button onClick={() => { setImage(''); setIsDirty(true); }} className="text-xs text-red-400 hover:text-red-600">삭제</button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleImageUpload}
              className="text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded px-3 py-2 w-full"
            >
              📷 사진 추가
            </button>
          )}
        </div>

        {/* Save button */}
        {isDirty && (
          <button
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded py-1.5 transition-colors"
          >
            저장
          </button>
        )}

        {/* Relations */}
        <div>
          <label className="text-xs text-gray-500 mb-2 block">관계</label>

          {/* Outgoing relations */}
          {outgoingRelations.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {outgoingRelations.map((rel) => {
                const toChar = workChars.find((c) => c.id === rel.to_character_id);
                return (
                  <div key={rel.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: char.color }} />
                    <span className="text-xs text-gray-700 flex-shrink-0 font-medium">{char.name}</span>
                    <span className="text-xs text-indigo-500 font-medium">→ {rel.relation_name}</span>
                    <span className="text-xs text-gray-500 flex-1">{rel.to_name || toChar?.name}</span>
                    <button onClick={() => deleteRelation(rel.id)} className="text-gray-400 hover:text-red-400 text-xs">✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Incoming relations */}
          {incomingRelations.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {incomingRelations.map((rel) => {
                const fromChar = workChars.find((c) => c.id === rel.from_character_id);
                return (
                  <div key={rel.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded px-2 py-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: fromChar?.color || '#6b7280' }} />
                    <span className="text-xs text-gray-500 flex-shrink-0">{fromChar?.name}</span>
                    <span className="text-xs text-indigo-400 font-medium">→ {rel.relation_name}</span>
                    <span className="text-xs text-gray-700 font-medium flex-1">{char.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {outgoingRelations.length === 0 && incomingRelations.length === 0 && (
            <div className="mb-3" />
          )}

          {/* Add relation */}
          <div className="space-y-1.5">
            <select
              value={newRelTarget}
              onChange={(e) => setNewRelTarget(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-white text-gray-700 rounded px-2 py-1.5 text-xs outline-none border border-gray-200"
            >
              <option value="">인물 선택...</option>
              {workChars
                .filter((c) => c.id !== char.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <div className="flex gap-1.5">
              <input
                value={newRelName}
                onChange={(e) => setNewRelName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRelation(); }}
                placeholder="관계명 (예: 사랑함, 증오함)"
                className="flex-1 bg-white text-gray-700 rounded px-2 py-1 text-xs outline-none border border-gray-200"
              />
              <button
                onClick={handleAddRelation}
                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded"
              >추가</button>
            </div>
          </div>
        </div>

        {/* Dialogues */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500">대사</label>
            <button onClick={refreshDialogues} disabled={dialoguesLoading} className="text-xs text-indigo-400 hover:text-indigo-600 disabled:text-gray-300">↻ 새로고침</button>
          </div>
          {dialoguesLoading ? (
            <p className="text-xs text-gray-400">불러오는 중...</p>
          ) : dialogues.length === 0 ? (
            <p className="text-xs text-gray-400">아직 대사가 없습니다</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {dialogues.map((d, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">
                    {d.episode_title} &gt; {d.plot_title}
                  </p>
                  <p className="text-xs text-gray-700">{d.dialogue_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Summary */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500">AI 인물 요약</label>
            <div className="flex items-center gap-1.5">
              {aiSummary && (
                <button
                  onClick={() => navigator.clipboard.writeText(aiSummary)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded border border-gray-200"
                  title="클립보드에 복사"
                >복사</button>
              )}
              <button
                onClick={handleGenerateSummary}
                disabled={aiSummaryLoading}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-2 py-1 rounded transition-colors"
              >
                {aiSummaryLoading ? '생성 중...' : '요약 생성'}
              </button>
            </div>
          </div>
          {aiSummary ? (
            <textarea
              value={aiSummary}
              onChange={(e) => { setAiSummary(e.target.value); setIsDirty(true); }}
              rows={5}
              className="w-full bg-white text-gray-700 rounded px-2 py-1.5 text-xs outline-none border border-gray-200 resize-none"
            />
          ) : (
            <div className="w-full bg-gray-50 border border-dashed border-gray-200 rounded px-2 py-4 text-center text-xs text-gray-400">
              {aiSummaryLoading ? '생성 중...' : "'요약 생성' 버튼을 눌러 AI가 인물을 분석하게 하세요"}
            </div>
          )}
        </div>

        {/* DEV: LLM context preview */}
        {llmContext && (
          <div className="border border-dashed border-amber-300 rounded">
            <button
              onClick={() => setLlmContextOpen((v) => !v)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] text-amber-600 bg-amber-50 rounded hover:bg-amber-100"
            >
              <span>[DEV] LLM 컨텍스트</span>
              <span>{llmContextOpen ? '▲' : '▼'}</span>
            </button>
            {llmContextOpen && (
              <pre className="px-2 py-2 text-[10px] text-gray-600 whitespace-pre-wrap break-words bg-white rounded-b overflow-y-auto max-h-64">
                {llmContext}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
