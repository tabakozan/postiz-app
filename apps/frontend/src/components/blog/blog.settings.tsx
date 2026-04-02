'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useRouter } from 'next/navigation';

interface Settings {
  masterPrompt: string;
  defaultTone: string;
  defaultLength: string;
  defaultLanguage: string;
  authorName: string;
  authorTitle: string;
  githubRepo: string;
  githubBranch: string;
  githubPath: string;
  githubToken: string;
}

const defaultMasterPrompt = `You are a professional blog writer creating SEO-optimized content for a tech company.

## Style Guidelines
- Write in a conversational but authoritative tone
- Use short paragraphs (2-3 sentences max)
- Include practical examples and actionable insights
- Use bullet points and numbered lists for scanability
- Bold key terms and important phrases

## Format
- Target 2,000 words
- Start with a compelling introduction that states the problem
- Include 4-6 main sections with H2 headings
- End with a conclusion and clear call-to-action
- Include relevant statistics and cite sources

## Voice
- First person plural ("we", "our") when discussing the company
- Second person ("you", "your") when addressing the reader
- Avoid buzzwords and marketing speak
- Be specific rather than generic`;

export const BlogSettingsComponent: FC = () => {
  const fetch = useFetch();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    masterPrompt: defaultMasterPrompt,
    defaultTone: 'professional',
    defaultLength: '1500-3000',
    defaultLanguage: 'en',
    authorName: '',
    authorTitle: '',
    githubRepo: '',
    githubBranch: 'main',
    githubPath: 'app/blog/posts',
    githubToken: '',
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/blog/settings');
      const data = await res.json();
      if (data && data.masterPrompt) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
      setLoaded(true);
    })();
  }, [fetch]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await fetch('/blog/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    setSaving(false);
  }, [fetch, settings]);

  if (!loaded) {
    return <div className="p-6 text-gray-400">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/blog')}
            className="text-gray-400 hover:text-white text-sm mb-2"
          >
            &larr; Back to Blog
          </button>
          <h1 className="text-2xl font-bold">Blog Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition text-sm text-white font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <section className="border border-gray-700 rounded-xl p-5 bg-gray-900/30">
        <h2 className="font-semibold text-lg mb-1">Master Prompt Template</h2>
        <p className="text-xs text-gray-400 mb-4">
          This prompt is sent to the AI model for every blog post generation. It
          defines the style, format, tone, and length of all generated content.
          The specific topic will be added automatically.
        </p>
        <textarea
          value={settings.masterPrompt}
          onChange={(e) =>
            setSettings({ ...settings, masterPrompt: e.target.value })
          }
          rows={18}
          className="w-full p-4 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Enter your master prompt template..."
        />
      </section>

      <section className="border border-gray-700 rounded-xl p-5 bg-gray-900/30">
        <h2 className="font-semibold text-lg mb-4">Defaults</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tone</label>
            <select
              value={settings.defaultTone}
              onChange={(e) =>
                setSettings({ ...settings, defaultTone: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="professional">Professional</option>
              <option value="conversational">Conversational</option>
              <option value="academic">Academic</option>
              <option value="casual">Casual</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Target Length (words)
            </label>
            <select
              value={settings.defaultLength}
              onChange={(e) =>
                setSettings({ ...settings, defaultLength: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="500-1000">Short (500-1,000)</option>
              <option value="1500-3000">Medium (1,500-3,000)</option>
              <option value="3000-5000">Long (3,000-5,000)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Language
            </label>
            <input
              type="text"
              value={settings.defaultLanguage}
              onChange={(e) =>
                setSettings({ ...settings, defaultLanguage: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="en"
            />
          </div>
        </div>
      </section>

      <section className="border border-gray-700 rounded-xl p-5 bg-gray-900/30">
        <h2 className="font-semibold text-lg mb-4">Author</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Default Author Name
            </label>
            <input
              type="text"
              value={settings.authorName}
              onChange={(e) =>
                setSettings({ ...settings, authorName: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Default Author Title
            </label>
            <input
              type="text"
              value={settings.authorTitle}
              onChange={(e) =>
                setSettings({ ...settings, authorTitle: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Senior Content Strategist"
            />
          </div>
        </div>
      </section>

      <section className="border border-gray-700 rounded-xl p-5 bg-gray-900/30">
        <h2 className="font-semibold text-lg mb-1">GitHub Publishing</h2>
        <p className="text-xs text-gray-400 mb-4">
          Configure GitHub integration to publish blog posts as MDX files
          directly to your repository.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">
              Repository (owner/repo)
            </label>
            <input
              type="text"
              value={settings.githubRepo}
              onChange={(e) =>
                setSettings({ ...settings, githubRepo: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="tabakozan/hirechat"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Branch</label>
            <input
              type="text"
              value={settings.githubBranch}
              onChange={(e) =>
                setSettings({ ...settings, githubBranch: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="main"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              MDX Path
            </label>
            <input
              type="text"
              value={settings.githubPath}
              onChange={(e) =>
                setSettings({ ...settings, githubPath: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="app/blog/posts"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">
              GitHub Token (PAT with repo write access)
            </label>
            <input
              type="password"
              value={settings.githubToken}
              onChange={(e) =>
                setSettings({ ...settings, githubToken: e.target.value })
              }
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="ghp_..."
            />
          </div>
        </div>
      </section>
    </div>
  );
};
