import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { BlogService } from '@gitroom/nestjs-libraries/database/prisma/blog/blog.service';
import { BlogGraphService } from '@gitroom/nestjs-libraries/agent/blog.graph.service';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  GenerateBlogPostDto,
  BlogSettingsDto,
} from '@gitroom/nestjs-libraries/dtos/blog/blog.dto';
import { Response } from 'express';

@ApiTags('Blog')
@Controller('/blog')
export class BlogController {
  constructor(
    private _blogService: BlogService,
    private _blogGraphService: BlogGraphService
  ) {}

  @Get('/posts')
  getPosts(
    @GetOrgFromRequest() org: Organization,
    @Query('status') status?: string
  ) {
    return this._blogService.getPosts(org.id, status);
  }

  @Get('/posts/:id')
  getPost(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._blogService.getPostById(org.id, id);
  }

  @Post('/posts')
  createPost(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateBlogPostDto
  ) {
    return this._blogService.createPost(org.id, body);
  }

  @Put('/posts/:id')
  updatePost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateBlogPostDto
  ) {
    return this._blogService.updatePost(org.id, id, body);
  }

  @Delete('/posts/:id')
  deletePost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._blogService.deletePost(org.id, id);
  }

  @Post('/generate')
  async generatePost(
    @GetOrgFromRequest() org: Organization,
    @Body() body: GenerateBlogPostDto,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this._blogGraphService.generate(org.id, body);

    for await (const event of stream) {
      if (event.event === 'on_chain_end' && event.name === 'save-draft') {
        res.write(
          `data: ${JSON.stringify({ type: 'complete', node: 'save-draft' })}\n\n`
        );
      } else if (event.event === 'on_chain_start') {
        res.write(
          `data: ${JSON.stringify({ type: 'progress', node: event.name })}\n\n`
        );
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }

  @Post('/publish/:id')
  async publishPost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    const post = await this._blogService.getPostById(org.id, id);
    if (!post) {
      return { error: 'Post not found' };
    }

    const settings = await this._blogService.getSettings(org.id);
    if (!settings?.githubRepo || !settings?.githubToken) {
      return {
        error: 'GitHub settings not configured. Set repo, token in blog settings.',
      };
    }

    // Build MDX content
    const mdxContent = buildMdxContent(post, settings);

    // Push to GitHub
    const fileName = `${post.slug}.mdx`;
    const filePath = `${settings.githubPath || 'app/blog/posts'}/${fileName}`;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${settings.githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${settings.githubToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: `blog: add "${post.title}"`,
            content: Buffer.from(mdxContent).toString('base64'),
            branch: settings.githubBranch || 'main',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return { error: `GitHub API error: ${error.message}` };
      }

      const result = await response.json();
      const publishedUrl = result.content?.html_url;

      // Mark as published
      await this._blogService.updatePost(org.id, id, {
        status: 'PUBLISHED' as any,
        title: post.title,
        content: post.content,
      });

      return { success: true, url: publishedUrl, path: filePath };
    } catch (err: any) {
      return { error: `Failed to publish: ${err.message}` };
    }
  }

  @Get('/settings')
  getSettings(@GetOrgFromRequest() org: Organization) {
    return this._blogService.getSettings(org.id);
  }

  @Put('/settings')
  updateSettings(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BlogSettingsDto
  ) {
    return this._blogService.upsertSettings(org.id, body);
  }
}

function buildMdxContent(post: any, settings: any): string {
  const frontmatter = [
    '---',
    `title: "${post.title.replace(/"/g, '\\"')}"`,
    `slug: "${post.slug}"`,
    `description: "${(post.seoDescription || post.excerpt || '').replace(/"/g, '\\"')}"`,
    `date: "${new Date().toISOString()}"`,
    post.authorName
      ? `author: "${post.authorName}"`
      : settings.authorName
        ? `author: "${settings.authorName}"`
        : '',
    post.authorTitle
      ? `authorTitle: "${post.authorTitle}"`
      : '',
    post.featuredImage ? `image: "${post.featuredImage}"` : '',
    post.category ? `category: "${post.category}"` : '',
    post.tags?.length ? `tags: [${post.tags.map((t: string) => `"${t}"`).join(', ')}]` : '',
    post.seoKeywords?.length
      ? `keywords: [${post.seoKeywords.map((k: string) => `"${k}"`).join(', ')}]`
      : '',
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const jsonLdScript = post.jsonLd
    ? `\n<script type="application/ld+json">\n${post.jsonLd}\n</script>\n`
    : '';

  return `${frontmatter}\n${jsonLdScript}\n${post.content}\n`;
}
