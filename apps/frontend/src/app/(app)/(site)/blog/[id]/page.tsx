export const dynamic = 'force-dynamic';
import { BlogPostEditor } from '@gitroom/frontend/components/blog/blog.post.editor';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Blog Post',
  description: '',
};

export default async function BlogPostPage() {
  return <BlogPostEditor />;
}
