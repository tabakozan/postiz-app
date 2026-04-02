export const dynamic = 'force-dynamic';
import { BlogSettingsComponent } from '@gitroom/frontend/components/blog/blog.settings';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog Settings',
  description: '',
};

export default async function BlogSettingsPage() {
  return <BlogSettingsComponent />;
}
