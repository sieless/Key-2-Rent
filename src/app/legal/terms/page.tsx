import fs from 'fs/promises';
import path from 'path';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type FrontMatter = Record<string, string>;

const MARKDOWN_SOURCE = path.join(process.cwd(), 'docs', 'terms-and-policies.md');

export const metadata: Metadata = {
  title: 'Timelaine Terms & Policies',
  description:
    'Review Timelaine\'s terms of use, privacy summary, acceptable use rules, payment policy, and other public agreements.',
};

async function loadMarkdown(): Promise<string> {
  return fs.readFile(MARKDOWN_SOURCE, 'utf8');
}

function extractFrontMatter(markdown: string): { meta: FrontMatter; content: string } {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n?/;
  const match = markdown.match(frontMatterRegex);

  if (!match) {
    return { meta: {}, content: markdown };
  }

  const rawMeta = match[1];
  const meta: FrontMatter = {};

  rawMeta.split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      const value = rest.join(':').trim().replace(/^"|"$/g, '');
      meta[key.trim()] = value;
    }
  });

  const content = markdown.slice(match[0].length).trimStart();
  return { meta, content };
}

function stripInlineFormatting(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.split('\n');
  const elements: ReactNode[] = [];
  let listBuffer: string[] = [];
  let keyIndex = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((item, idx) => (
      <li key={`li-${keyIndex}-${idx}`} className="ml-4">
        {stripInlineFormatting(item)}
      </li>
    ));
    elements.push(
      <ul key={`list-${keyIndex++}`} className="list-disc space-y-2 pl-4 text-base leading-relaxed">
        {items}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushList();
      return;
    }

    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2).trim());
      return;
    }

    flushList();

    const headingMatch = line.match(/^(#+)\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = stripInlineFormatting(headingMatch[2]);
      const headingLevel = Math.min(level, 4);
      const HeadingTag = (`h${headingLevel}`) as keyof JSX.IntrinsicElements;
      const className =
        headingLevel === 1
          ? 'text-3xl font-semibold'
          : headingLevel === 2
          ? 'text-2xl font-semibold'
          : headingLevel === 3
          ? 'text-xl font-semibold'
          : 'text-lg font-semibold';

      elements.push(
        <HeadingTag key={`heading-${keyIndex++}`} className={`${className} mt-8`}>
          {text}
        </HeadingTag>
      );
      return;
    }

    elements.push(
      <p key={`paragraph-${keyIndex++}`} className="text-base leading-relaxed">
        {stripInlineFormatting(line)}
      </p>
    );
  });

  flushList();

  return elements;
}

function formatLastUpdated(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default async function TermsPage() {
  const markdown = await loadMarkdown();
  const { meta, content } = extractFrontMatter(markdown);
  const rendered = renderMarkdown(content);
  const formattedLastUpdated = formatLastUpdated(meta.last_updated);

  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{meta.title ?? 'Timelaine Terms & Policies'}</h1>
          {formattedLastUpdated ? (
            <p className="mt-2 text-sm text-muted-foreground">Last updated {formattedLastUpdated}</p>
          ) : null}
        </div>
        <article className="space-y-4 text-foreground">{rendered}</article>
      </div>
    </div>
  );
}
