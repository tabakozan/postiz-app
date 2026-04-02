export const dynamic = 'force-dynamic';
import { BlogComponent } from '@gitroom/frontend/components/blog/blog.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Postiz Blog Manager',
  description: 'AI-powered blog content management',
};

export default async function BlogPage() {
  return <BlogComponent />;
}
