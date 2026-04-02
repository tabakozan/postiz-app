'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useParams, useRouter } from 'next/navigation';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  seoDescription?: string;
  seoKeywords: string[];
  featuredImage?: string;
  status: string;
  category?: string;
  tags: string[];
  wordCount: number;
  authorName?: string;
  authorTitle?: string;
  ogTitle?: string;
  ogDescription?: string;
  jsonLd?: string;
}

export const BlogPostEditor: FC = () => {
  const fetch = useFetch();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'content' | 'seo' | 'preview'>('content');

  useEffect(() => {
    (async () => {
      const res = await fetch(`/blog/posts/${id}`);
      const data = await res.json();
      setPost(data);
    })();
  }, [fetch, id]);

  const handleSave = useCallback(async () => {
    if (!post) return;
    setSaving(true);
    await fetch(`/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        seoDescription: post.seoDescription,
        seoKeywords: post.seoKeywords,
        category: post.category,
        tags: post.tags,
        authorName: post.authorName,
        authorTitle: post.authorTitle,
        ogTitle: post.ogTitle,
        ogDescription: post.ogDescription,
        jsonLd: post.jsonLd,
      }),
    });
    setSaving(false);
  }, [fetch, id, post]);

  if (!post) {
    return <div className="p-6 text-gray-400">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/blog')}
          className="text-gray-400 hover:text-white text-sm"
        >
          &larr; Back to Blog
        </button>
        <div className="flex gap-3">
          <span className="text-xs text-gray-500">
            {post.wordCount} words
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition text-sm text-white font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={post.title}
        onChange={(e) => setPost({ ...post, title: e.target.value })}
        className="text-2xl font-bold bg-transparent border-none outline-none w-full"
        placeholder="Post title"
      />

      <div className="flex gap-1 border-b border-gray-700">
        {(['content', 'seo', 'preview'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'content' && (
        <div className="flex flex-col gap-4">
          <textarea
            value={post.content}
            onChange={(e) =>
              setPost({
                ...post,
                content: e.target.value,
                wordCount: e.target.value.split(/\s+/).filter(Boolean).length,
              })
            }
            className="w-full min-h-[600px] p-4 rounded-lg bg-gray-900 border border-gray-700 text-white font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Markdown content..."
          />
        </div>
      )}

      {tab === 'seo' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Meta Description ({(post.seoDescription || '').length}/160)
            </label>
            <textarea
              value={post.seoDescription || ''}
              onChange={(e) =>
                setPost({ ...post, seoDescription: e.target.value })
              }
              maxLength={160}
              rows={2}
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Excerpt</label>
            <textarea
              value={post.excerpt || ''}
              onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              SEO Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={(post.seoKeywords || []).join(', ')}
              onChange={(e) =>
                setPost({
                  ...post,
                  seoKeywords: e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean),
                })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Author Name
              </label>
              <input
                type="text"
                value={post.authorName || ''}
                onChange={(e) =>
                  setPost({ ...post, authorName: e.target.value })
                }
                className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Author Title
              </label>
              <input
                type="text"
                value={post.authorTitle || ''}
                onChange={(e) =>
                  setPost({ ...post, authorTitle: e.target.value })
                }
                className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Category
            </label>
            <input
              type="text"
              value={post.category || ''}
              onChange={(e) => setPost({ ...post, category: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              JSON-LD Structured Data
            </label>
            <textarea
              value={post.jsonLd || ''}
              onChange={(e) => setPost({ ...post, jsonLd: e.target.value })}
              rows={8}
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      )}

      {tab === 'preview' && (
        <div className="prose prose-invert max-w-none p-6 bg-gray-900 rounded-lg border border-gray-700">
          <h1>{post.title}</h1>
          <div
            dangerouslySetInnerHTML={{
              __html: post.content
                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^- (.*$)/gm, '<li>$1</li>')
                .replace(/\n/g, '<br/>'),
            }}
          />
        </div>
      )}
    </div>
  );
};
