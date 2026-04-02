import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class BlogRepository {
  constructor(
    private _blogPost: PrismaRepository<'blogPost'>,
    private _blogSettings: PrismaRepository<'blogSettings'>
  ) {}

  getPosts(orgId: string, status?: string) {
    return this._blogPost.model.blogPost.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getPostById(orgId: string, id: string) {
    return this._blogPost.model.blogPost.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
  }

  getPostBySlug(orgId: string, slug: string) {
    return this._blogPost.model.blogPost.findFirst({
      where: { organizationId: orgId, slug, deletedAt: null },
    });
  }

  createPost(data: any) {
    return this._blogPost.model.blogPost.create({ data });
  }

  updatePost(orgId: string, id: string, data: any) {
    return this._blogPost.model.blogPost.updateMany({
      where: { id, organizationId: orgId, deletedAt: null },
      data,
    });
  }

  softDeletePost(orgId: string, id: string) {
    return this._blogPost.model.blogPost.updateMany({
      where: { id, organizationId: orgId },
      data: { deletedAt: new Date() },
    });
  }

  getSettings(orgId: string) {
    return this._blogSettings.model.blogSettings.findUnique({
      where: { organizationId: orgId },
    });
  }

  upsertSettings(orgId: string, data: any) {
    return this._blogSettings.model.blogSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...data },
      update: data,
    });
  }
}
