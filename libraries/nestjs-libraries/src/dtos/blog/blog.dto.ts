import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsDefined,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum BlogPostStatusDto {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateBlogPostDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsDefined()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seoKeywords?: string[];

  @IsOptional()
  @IsString()
  featuredImage?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsString()
  authorTitle?: string;

  @IsOptional()
  @IsString()
  ogTitle?: string;

  @IsOptional()
  @IsString()
  ogDescription?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsString()
  jsonLd?: string;
}

export class UpdateBlogPostDto extends CreateBlogPostDto {
  @IsOptional()
  @IsEnum(BlogPostStatusDto)
  status?: BlogPostStatusDto;
}

export class GenerateBlogPostDto {
  @IsDefined()
  @IsString()
  @MinLength(3)
  topic: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  targetLength?: string;

  @IsOptional()
  generateImage?: boolean;
}

export class BlogSettingsDto {
  @IsDefined()
  @IsString()
  masterPrompt: string;

  @IsOptional()
  @IsString()
  defaultTone?: string;

  @IsOptional()
  @IsString()
  defaultLength?: string;

  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsString()
  authorTitle?: string;

  @IsOptional()
  @IsString()
  githubRepo?: string;

  @IsOptional()
  @IsString()
  githubBranch?: string;

  @IsOptional()
  @IsString()
  githubPath?: string;

  @IsOptional()
  @IsString()
  githubToken?: string;
}
