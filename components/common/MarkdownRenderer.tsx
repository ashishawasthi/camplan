import React from 'react';
import { GroundingSource } from '../../types';

interface MarkdownRendererProps {
  content: string;
  sources?: GroundingSource[];
}

// Recursive parser for inline markdown (bold, citations)
const parseInlineMarkdown = (text: string, sources?: GroundingSource[]): React.ReactNode => {
    // Base case: empty string
    if (!text) {
        return null;
    }

    // Bold: **text**
    const boldRegex = /\*\*(.*?)\*\*/;
    const boldMatch = text.match(boldRegex);
    if (boldMatch && boldMatch.index !== undefined) {
        const before = text.substring(0, boldMatch.index);
        const boldContent = boldMatch[1];
        const after = text.substring(boldMatch.index + boldMatch[0].length);
        return (
            <>
                {parseInlineMarkdown(before, sources)}
                <strong>{parseInlineMarkdown(boldContent, sources)}</strong>
                {parseInlineMarkdown(after, sources)}
            </>
        );
    }

    // Citations: [1] or [1, 2]
    if (sources && sources.length > 0) {
        const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/;
        const citationMatch = text.match(citationRegex);
        if (citationMatch && citationMatch.index !== undefined) {
            const before = text.substring(0, citationMatch.index);
            const citationContent = citationMatch[1];
            const after = text.substring(citationMatch.index + citationMatch[0].length);
            const indices = citationContent.split(',').map(s => parseInt(s.trim(), 10));

            return (
                <>
                    {parseInlineMarkdown(before, sources)}
                    {indices.map((idx, j) => {
                        const sourceIndex = idx - 1;
                        if (sources[sourceIndex]) {
                            return (
                                <sup key={`${idx}-${j}`} className="mx-0.5 text-xs font-bold">
                                    <a href={sources[sourceIndex].uri} target="_blank" rel="noopener noreferrer" className="inline-block px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors" title={sources[sourceIndex].title}>
                                        {idx}
                                    </a>
                                </sup>
                            );
                        }
                        return `[${idx}]`;
                    })}
                    {parseInlineMarkdown(after, sources)}
                </>
            );
        }
    }
    
    // If no markdown found, return the plain text
    return text;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, sources }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    // Headings
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h5 key={index} className="font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1">{parseInlineMarkdown(line.substring(4), sources)}</h5>);
      return;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h4 key={index} className="font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1 text-lg">{parseInlineMarkdown(line.substring(3), sources)}</h4>);
      return;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(<h3 key={index} className="font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2 text-xl">{parseInlineMarkdown(line.substring(2), sources)}</h3>);
      return;
    }
    
    // Unordered list items (matches * or -)
    const listItemMatch = line.trim().match(/^(\*|-)\s(.*)/);
    if (listItemMatch) {
        const itemContent = listItemMatch[2];
        currentList.push(<li key={index}>{parseInlineMarkdown(itemContent, sources)}</li>);
        return;
    }

    // Paragraphs
    flushList();
    if (line.trim() !== '') {
      elements.push(<p key={index} className="my-1">{parseInlineMarkdown(line, sources)}</p>);
    } else {
      // Allow empty lines to create space between paragraphs if needed, or handle differently
    }
  });

  flushList(); // Add any remaining list to the elements

  return <>{elements}</>;
};

export default MarkdownRenderer;
