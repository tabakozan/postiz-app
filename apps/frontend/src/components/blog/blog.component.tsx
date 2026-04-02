'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useRouter } from 'next/navigation';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  category?: string;
  wordCount: number;
  createdAt: string;
  publishedAt?: string;
  excerpt?: string;
  tags: string[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-yellow-500/20 text-yellow-400',
  REVIEW: 'bg-blue-500/20 text-blue-400',
  PUBLISHED: 'bg-green-500/20 text-green-400',
  ARCHIVED: 'bg-gray-500/20 text-gray-400',
};

export const BlogComponent: FC = () => {
  const fetch = useFetch();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/blog/posts${filter ? `?status=${filter}` : ''}`);
    const data = await res.json();
    setPosts(data);
    setLoading(false);
  }, [fetch, filter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setGenerationProgress('Starting...');

    try {
      const res = await fetch('/blog/generate', {
        method: 'POST',
        body: JSON.stringify({ topic, generateImage: true }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter((l) => l.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'progress') {
                const nodeNames: Record<string, string> = {
                  research: 'Researching topic...',
                  'execute-research': 'Gathering sources...',
                  'save-research': 'Processing research...',
                  'generate-outline': 'Creating outline...',
                  'generate-content': 'Writing content...',
                  'generate-seo': 'Optimizing SEO...',
                  'generate-image': 'Generating featured image...',
                  'save-draft': 'Saving draft...',
                };
                setGenerationProgress(
                  nodeNames[parsed.node] || parsed.node
                );
              }
            } catch {}
          }
        }
      }

      setTopic('');
      setShowGenerator(false);
      setGenerationProgress('');
      loadPosts();
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [fetch, topic, loadPosts]);

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/blog/posts/${id}`, { method: 'DELETE' });
      loadPosts();
    },
    [fetch, loadPosts]
  );

  const handlePublish = useCallback(
    async (id: string) => {
      const res = await fetch(`/blog/publish/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`Published to: ${data.path}`);
        loadPosts();
      }
    },
    [fetch, loadPosts]
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <div className="flex gap-3">
          <a
            href="/blog/settings"
            className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-800 transition text-sm"
          >
            Settings
          </a>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition text-sm text-white font-medium"
          >
            AI Generate
          </button>
        </div>
      </div>

      {showGenerator && (
        <div className="border border-gray-700 rounded-xl p-5 bg-gray-900/50">
          <h3 className="font-semibold mb-3">Generate Blog Post with AI</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic (e.g., 'How AI is transforming hiring in 2026')"
              className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={generating}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition text-sm text-white font-medium"
            >
              {generating ? generationProgress : 'Generate'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Uses your master prompt template + SEO/GEO optimization. Configure
            in Settings.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {['', 'DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === s
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-gray-400 text-center py-12">
          <p className="text-lg">No blog posts yet</p>
          <p className="text-sm mt-2">
            Click &quot;AI Generate&quot; to create your first post
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border border-gray-700 rounded-xl p-5 bg-gray-900/30 hover:bg-gray-900/50 transition cursor-pointer"
              onClick={() => router.push(`/blog/${post.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[post.status]}`}
                    >
                      {post.status}
                    </span>
                  </div>
                  {post.excerpt && (
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{post.wordCount} words</span>
                    {post.category && <span>{post.category}</span>}
                    <span>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    {post.tags?.length > 0 && (
                      <span>{post.tags.slice(0, 3).join(', ')}</span>
                    )}
                  </div>
                </div>
                <div
                  className="flex gap-2 ml-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePublish(post.id)}
                      className="px-3 py-1 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs font-medium transition"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="px-3 py-1 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
