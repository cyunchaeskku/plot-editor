import React, { useState } from 'react';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { useStore } from '../../store';

async function exportDocx(episodeId: number, plots: any[], episodeTitle: string) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: episodeTitle,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    })
  );

  for (let i = 0; i < plots.length; i++) {
    const plot = plots[i];
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
          case 'sceneHeading':
            paras.push(new Paragraph({
              children: [new TextRun({
                text: extractText(node),
                bold: true,
                allCaps: true,
                color: 'a78bfa',
              })],
              spacing: { before: 240, after: 120 },
            }));
            break;
          case 'dialogue':
            paras.push(new Paragraph({
              children: [
                new TextRun({ text: `${node.attrs?.characterName || ''} : `, bold: true }),
                new TextRun({ text: extractText(node) }),
              ],
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

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

function extractText(node: any): string {
  if (node.type === 'text') return node.text || '';
  if (node.content) return node.content.map(extractText).join('');
  return '';
}

interface ExportButtonProps {
  episodeTitle: string;
}

export default function ExportButton({ episodeTitle }: ExportButtonProps) {
  const { selectedEpisodeId, plots } = useStore();
  const [exporting, setExporting] = useState(false);

  const episodePlots = selectedEpisodeId ? (plots[selectedEpisodeId] || []) : [];

  const handleExportDocx = async () => {
    if (!selectedEpisodeId || episodePlots.length === 0) return;
    setExporting(true);
    try {
      const blob = await exportDocx(selectedEpisodeId, episodePlots, episodeTitle);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${episodeTitle}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportDocx}
      disabled={exporting || episodePlots.length === 0}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
    >
      {exporting ? '내보내는 중...' : '📄 .docx 내보내기'}
    </button>
  );
}
