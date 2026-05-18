"use client";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*.*?\*\*)/g);

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
        })
      );
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

export async function exportMarkdownToWord(
  markdown: string,
  title: string
): Promise<void> {
  const lines = markdown.split("\n");
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  let i = 0;
  let listItems: string[] = [];

  const flushList = () => {
    for (const item of listItems) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(item),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    }
    listItems = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      flushList();
      children.push(
        new Paragraph({
          text: line.replace(/^## /, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
        })
      );
    } else if (line.startsWith("### ")) {
      flushList();
      children.push(
        new Paragraph({
          text: line.replace(/^### /, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith("#### ")) {
      flushList();
      children.push(
        new Paragraph({
          text: line.replace(/^#### /, ""),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (/^[-*]\s/.test(line)) {
      listItems.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+[.、]\s/.test(line)) {
      listItems.push(line.replace(/^\d+[.、]\s+/, ""));
    } else if (line.startsWith("> ")) {
      flushList();
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.replace(/^>\s?/, "")),
          indent: { left: 360 },
          spacing: { after: 80 },
          thematicBreak: false,
        })
      );
    } else if (line.trim() === "") {
      flushList();
      children.push(new Paragraph({ spacing: { after: 80 } }));
    } else {
      flushList();
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line),
          spacing: { after: 80 },
        })
      );
    }
    i++;
  }
  flushList();

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${title}.docx`);
}

export function exportMarkdownToPDF(
  markdown: string,
  title: string
): void {
  // Convert markdown to basic HTML for printing
  const htmlLines = markdown
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) {
        return `<h2>${escapeHtml(line.replace(/^## /, ""))}</h2>`;
      }
      if (line.startsWith("### ")) {
        return `<h3>${escapeHtml(line.replace(/^### /, ""))}</h3>`;
      }
      if (line.startsWith("#### ")) {
        return `<h4>${escapeHtml(line.replace(/^#### /, ""))}</h4>`;
      }
      if (/^[-*]\s/.test(line)) {
        return `<li>${processInline(escapeHtml(line.replace(/^[-*]\s+/, "")))}</li>`;
      }
      if (line.startsWith("> ")) {
        return `<blockquote>${processInline(escapeHtml(line.replace(/^>\s?/, "")))}</blockquote>`;
      }
      if (line.trim() === "") {
        return "<br/>";
      }
      return `<p>${processInline(escapeHtml(line))}</p>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, "Microsoft YaHei", sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.8; }
  h1 { text-align: center; font-size: 22px; margin-bottom: 30px; }
  h2 { font-size: 18px; margin-top: 28px; margin-bottom: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; }
  h3 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; }
  h4 { font-size: 14px; margin-top: 16px; margin-bottom: 6px; }
  p { margin: 8px 0; font-size: 14px; }
  li { margin: 4px 0; font-size: 14px; }
  blockquote { border-left: 3px solid #d0d0d0; margin: 12px 0; padding: 4px 16px; color: #555; }
  strong { color: #000; }
  @media print { body { margin: 0; padding: 0 30px; } }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${htmlLines}
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

function processInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
