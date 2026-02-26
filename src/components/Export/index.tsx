import React, { useState } from 'react';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TabStopType,
  LeaderType,
} from 'docx';
import { useStore } from '../../store';
import type { Plot } from '../../db';

function extractText(node: any): string {
  if (node.type === 'text') return node.text || '';
  if (node.content) return node.content.map(extractText).join('');
  return '';
}

async function exportDocx(plotGroups: { title: string; plots: Plot[] }[]) {
  const children: Paragraph[] = [];

  let maxNameLen = 0;
  for (const group of plotGroups) {
    for (const plot of group.plots) {
      try {
        const content = JSON.parse(plot.content);
        if (!content.content) continue;
        for (const node of content.content) {
          if (node.type === 'dialogue') {
            const name: string = node.attrs?.characterName || '';
            if (name.length > maxNameLen) maxNameLen = name.length;
          }
        }
      } catch {}
    }
  }
  const TAB_POSITION = Math.max(900, maxNameLen * 120 + 200);

  for (const group of plotGroups) {
    children.push(
      new Paragraph({
        text: group.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      })
    );

    for (let i = 0; i < group.plots.length; i++) {
      const plot = group.plots[i];
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `P${i + 1} - ${plot.title}`, bold: true })],
          spacing: { before: 400, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '6366f1' } },
        })
      );

      try {
        const content = JSON.parse(plot.content);
        if (!content.content) continue;

        const processNode = (node: any): Paragraph[] => {
          const paras: Paragraph[] = [];
          switch (node.type) {
            case 'sceneHeading': {
              const location = (node.attrs?.location as string) || '';
              const time = (node.attrs?.time as string) || '';
              const locationTime = [location, time].filter(Boolean).join(' · ');
              const sceneChildren: TextRun[] = [
                new TextRun({ text: extractText(node), bold: true, allCaps: true, color: 'a78bfa' }),
              ];
              if (locationTime) {
                sceneChildren.push(
                  new TextRun({ text: '\t' }),
                  new TextRun({ text: locationTime, color: 'a78bfa', italics: true }),
                );
              }
              paras.push(new Paragraph({
                children: sceneChildren,
                tabStops: [{ type: TabStopType.RIGHT, position: 8640, leader: LeaderType.NONE }],
                spacing: { before: 240, after: 120 },
              }));
              break;
            }
            case 'dialogue':
              paras.push(new Paragraph({
                children: [
                  new TextRun({ text: `${node.attrs?.characterName || ''}\t`, bold: true }),
                  new TextRun({ text: `: ${extractText(node)}` }),
                ],
                tabStops: [{ type: TabStopType.LEFT, position: TAB_POSITION }],
                spacing: { after: 120 },
              }));
              break;
            case 'narration':
              paras.push(new Paragraph({
                children: [new TextRun({ text: extractText(node), italics: true, color: '9ca3af' })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
              }));
              break;
            case 'stageDirection':
              paras.push(new Paragraph({
                children: [new TextRun({ text: extractText(node), italics: true, color: '6b7280' })],
                indent: { left: 360 },
                spacing: { after: 60 },
              }));
              break;
            case 'paragraph':
            default:
              paras.push(new Paragraph({
                children: [new TextRun({ text: extractText(node) })],
                spacing: { after: 60 },
              }));
          }
          return paras;
        };

        for (const node of content.content) {
          children.push(...processNode(node));
        }
      } catch {}
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

interface ExportButtonProps {
  episodeTitle: string;
}

export default function ExportButton({ episodeTitle }: ExportButtonProps) {
  const { selectedEpisodeId, selectedWorkId, works, episodes, plots } = useStore();
  const [exporting, setExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const episodePlots = selectedEpisodeId ? (plots[selectedEpisodeId] || []) : [];

  const doExport = async (mode: 'current' | 'all') => {
    setShowModal(false);
    setExporting(true);
    try {
      let plotGroups: { title: string; plots: Plot[] }[];
      let filename: string;

      if (mode === 'current' && selectedEpisodeId) {
        plotGroups = [{ title: episodeTitle, plots: episodePlots }];
        filename = episodeTitle;
      } else if (mode === 'all' && selectedWorkId) {
        const work = works.find((w) => w.id === selectedWorkId);
        const workEpisodes = episodes[selectedWorkId] || [];
        plotGroups = workEpisodes.map((ep) => ({
          title: ep.title,
          plots: plots[ep.id] || [],
        }));
        filename = work?.title || '전체';
      } else {
        return;
      }

      const blob = await exportDocx(plotGroups);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowModal(true)}
        disabled={exporting || episodePlots.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
      >
        {exporting ? '내보내는 중...' : '📄 .docx 내보내기'}
      </button>

      {showModal && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded shadow-lg min-w-[180px]">
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">내보내기 범위 선택</div>
          <button
            onClick={() => doExport('current')}
            className="w-full px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 text-left"
          >현재 에피소드만</button>
          <button
            onClick={() => doExport('all')}
            className="w-full px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 text-left"
          >전체 작품 (모든 에피소드)</button>
          <button
            onClick={() => setShowModal(false)}
            className="w-full px-3 py-2 text-xs text-gray-500 hover:bg-gray-700 text-left border-t border-gray-700"
          >취소</button>
        </div>
      )}
    </div>
  );
}
