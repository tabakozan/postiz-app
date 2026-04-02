import { Injectable } from '@nestjs/common';
import { BlogRepository } from '@gitroom/nestjs-libraries/database/prisma/blog/blog.repository';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  BlogSettingsDto,
} from '@gitroom/nestjs-libraries/dtos/blog/blog.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function countWords(text: string): number {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`~\[\]()>|-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

@Injectable()
export class BlogService {
  constructor(private _blogRepository: BlogRepository) {}

  getPosts(orgId: string, status?: string) {
    return this._blogRepository.getPosts(orgId, status);
  }

  getPostById(orgId: string, id: string) {
    return this._blogRepository.getPostById(orgId, id);
  }

  async createPost(orgId: string, dto: CreateBlogPostDto) {
    let slug = slugify(dto.title);

    // Ensure unique slug within org
    const existing = await this._blogRepository.getPostBySlug(orgId, slug);
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    return this._blogRepository.createPost({
      organizationId: orgId,
      title: dto.title,
      slug,
      content: dto.content,
      excerpt: dto.excerpt,
      seoDescription: dto.seoDescription,
      seoKeywords: dto.seoKeywords || [],
      featuredImage: dto.featuredImage,
      category: dto.category,
      tags: dto.tags || [],
      wordCount: countWords(dto.content),
      authorName: dto.authorName,
      authorTitle: dto.authorTitle,
      ogTitle: dto.ogTitle,
      ogDescription: dto.ogDescription,
      ogImage: dto.ogImage,
      jsonLd: dto.jsonLd,
    });
  }

  async updatePost(orgId: string, id: string, dto: UpdateBlogPostDto) {
    const data: any = { ...dto };

    if (dto.content) {
      data.wordCount = countWords(dto.content);
    }

    if (dto.title) {
      data.slug = slugify(dto.title);
    }

    if (dto.status === 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    // Remove undefined values
    Object.keys(data).forEach(
      (key) => data[key] === undefined && delete data[key]
    );

    await this._blogRepository.updatePost(orgId, id, data);
    return this._blogRepository.getPostById(orgId, id);
  }

  deletePost(orgId: string, id: string) {
    return this._blogRepository.softDeletePost(orgId, id);
  }

  getSettings(orgId: string) {
    return this._blogRepository.getSettings(orgId);
  }

  upsertSettings(orgId: string, dto: BlogSettingsDto) {
    return this._blogRepository.upsertSettings(orgId, dto);
  }
}
