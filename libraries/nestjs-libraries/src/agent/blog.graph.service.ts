import { Injectable } from '@nestjs/common';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  createLangChainModel,
  generateImage,
} from '@gitroom/nestjs-libraries/openrouter/openrouter.config';
import { BlogService } from '@gitroom/nestjs-libraries/database/prisma/blog/blog.service';
import { GenerateBlogPostDto } from '@gitroom/nestjs-libraries/dtos/blog/blog.dto';

const tools = !process.env.TAVILY_API_KEY
  ? []
  : [new TavilySearchResults({ maxResults: 5 })];
const toolNode = new ToolNode(tools);

const complexModel = createLangChainModel('complex');
const lightModel = createLangChainModel('light');

// ── SEO/GEO rules injected into every generation prompt ──────────────────────

const SEO_GEO_RULES = `
## SEO/GEO Content Rules (MANDATORY)

### Structure
- Single H1 (the title). Use H2 for major sections, H3 for subsections. Never skip heading levels.
- Start each H2 section with a clear topic sentence that summarizes the section (AI systems extract these).
- Break content into independently extractable chunks — each H2 section should stand alone.
- Use bullet lists for features/benefits, numbered lists for steps, tables for comparisons.
- Bold the 3-5 most important terms in each section.

### E-E-A-T Signals
- Include specific numbers, statistics, and verifiable claims. Cite sources inline.
- Reference real companies, people, products, and tools by name (proper nouns increase entity density).
- Demonstrate firsthand experience: use phrases like "In our experience...", "We've found that...", "Based on our analysis of..."
- Use specific dates and timeframes rather than "recently" or "nowadays".
- Include at least 3 authoritative external references per 1,500 words.

### AI Citability (GEO)
- Write definition-first paragraphs: put the clear answer in the first 1-2 sentences of each section.
- Include citation-worthy statements with specific percentages, named features, and measurable comparisons.
- Use consistent terminology throughout — don't alternate between synonyms for the same concept.
- Maximize named entity frequency: always use proper nouns over pronouns where possible.
- Use semantic HTML structure: proper headings, lists, tables — not narrative walls of text.

### Content Quality
- Write 1,500-3,000 words unless the user's master prompt specifies otherwise.
- Use simple, clear language. Avoid jargon unless defined on first use.
- Include a call-to-action at the end.
- No keyword stuffing. Keywords should appear naturally.
- Every major claim must be supported by evidence, experience, or reasoning.
- Avoid superlatives ("best", "most advanced") — use specific, measurable claims instead.

### Technical SEO
- Generate a meta description: 150-160 characters, compelling, includes primary keyword.
- Generate 3-5 SEO keywords relevant to the topic.
- Generate an excerpt: 2-3 sentences summarizing the post for listings and social sharing.
- Suggest a clean URL slug: lowercase, hyphens, under 75 chars, includes primary keyword.
`;

// ── Zod schemas for structured output ────────────────────────────────────────

const outlineSchema = z.object({
  title: z.string().describe('SEO-optimized blog post title, 50-60 chars'),
  slug: z.string().describe('URL slug: lowercase, hyphens, under 75 chars'),
  sections: z
    .array(
      z.object({
        heading: z.string().describe('H2 section heading'),
        keyPoints: z
          .array(z.string())
          .describe('Key points to cover in this section'),
      })
    )
    .min(3)
    .max(8)
    .describe('Blog post outline sections'),
  seoKeywords: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('Primary SEO keywords'),
});

const contentSchema = z.object({
  content: z
    .string()
    .describe(
      'Full blog post content in Markdown format with proper H2/H3 headings, lists, bold text, and inline links'
    ),
});

const seoSchema = z.object({
  seoDescription: z
    .string()
    .max(160)
    .describe('Meta description, 150-160 chars, compelling'),
  excerpt: z
    .string()
    .describe('2-3 sentence excerpt for listings and social sharing'),
  ogTitle: z
    .string()
    .describe('Open Graph title: post title + brand name, under 70 chars'),
  ogDescription: z
    .string()
    .max(160)
    .describe('Open Graph description, 150-160 chars'),
  jsonLd: z.string().describe('BlogPosting JSON-LD structured data as a JSON string'),
  imagePrompt: z
    .string()
    .describe(
      'Descriptive prompt for generating a featured image: editorial style, no text in image, captures the essence of the topic'
    ),
});

// ── Workflow state ───────────────────────────────────────────────────────────

interface BlogWorkflowState {
  messages: BaseMessage[];
  orgId: string;
  topic: string;
  masterPrompt: string;
  tone: string;
  targetLength: string;
  additionalContext?: string;
  generateImageFlag: boolean;
  authorName?: string;
  authorTitle?: string;
  research?: string;
  outline?: z.infer<typeof outlineSchema>;
  content?: string;
  seo?: z.infer<typeof seoSchema>;
  featuredImage?: string;
  title?: string;
  slug?: string;
  seoKeywords?: string[];
}

@Injectable()
export class BlogGraphService {
  constructor(private _blogService: BlogService) {}

  static state = () =>
    new StateGraph<BlogWorkflowState>({
      channels: {
        messages: {
          reducer: (currentState, updateValue) =>
            currentState.concat(updateValue),
          default: () => [],
        },
        orgId: null,
        topic: null,
        masterPrompt: null,
        tone: null,
        targetLength: null,
        additionalContext: null,
        generateImageFlag: null,
        authorName: null,
        authorTitle: null,
        research: null,
        outline: null,
        content: null,
        seo: null,
        featuredImage: null,
        title: null,
        slug: null,
        seoKeywords: null,
      },
    });

  // ── Node 1: Research ─────────────────────────────────────────────────────

  async research(state: BlogWorkflowState) {
    if (tools.length === 0) {
      return { research: state.additionalContext || state.topic };
    }

    const runTools = complexModel.bindTools(tools);
    const response = await ChatPromptTemplate.fromTemplate(
      `Today is ${dayjs().format('YYYY-MM-DD')}. You are a research assistant preparing material for a blog post.

Research the following topic thoroughly. Find recent data, statistics, expert opinions, and real-world examples.
Focus on finding specific, citable facts — not generic overviews.

Topic: {topic}
${state.additionalContext ? `Additional context: ${state.additionalContext}` : ''}
`
    )
      .pipe(runTools)
      .invoke({ topic: state.topic });

    return { messages: [response] };
  }

  async executeResearch(state: BlogWorkflowState) {
    // ToolNode auto-executes the Tavily search calls
    return {};
  }

  async saveResearch(state: BlogWorkflowState) {
    const toolMessages = state.messages
      .filter((m: any) => m.constructor?.name === 'ToolMessage')
      .map((m) => m.content)
      .join('\n\n');

    return {
      research: toolMessages || state.additionalContext || state.topic,
    };
  }

  // ── Node 2: Generate Outline ─────────────────────────────────────────────

  async generateOutline(state: BlogWorkflowState) {
    const structuredOutput = complexModel.withStructuredOutput(outlineSchema);
    const outline = await ChatPromptTemplate.fromTemplate(
      `You are a senior content strategist creating a blog post outline.

## User's Master Prompt (follow this for style, tone, and format):
{masterPrompt}

## Topic
{topic}

## Research Material
{research}

## Requirements
- Tone: {tone}
- Target length: {targetLength} words
- Create 3-8 H2 sections with key points for each
- Title must be SEO-optimized: 50-60 chars, include primary keyword naturally
- Generate a clean URL slug from the title
- Identify 3-5 primary SEO keywords

${SEO_GEO_RULES}
`
    )
      .pipe(structuredOutput)
      .invoke({
        masterPrompt: state.masterPrompt,
        topic: state.topic,
        research: state.research,
        tone: state.tone,
        targetLength: state.targetLength,
      });

    return {
      outline,
      title: outline.title,
      slug: outline.slug,
      seoKeywords: outline.seoKeywords,
    };
  }

  // ── Node 3: Generate Full Content ────────────────────────────────────────

  async generateContent(state: BlogWorkflowState) {
    const structuredOutput = complexModel.withStructuredOutput(contentSchema);
    const { content } = await ChatPromptTemplate.fromTemplate(
      `You are an expert blog writer. Write the full blog post following the outline below.

## User's Master Prompt (FOLLOW THIS — it defines your writing style, voice, and format):
{masterPrompt}

## Post Title
{title}

## Outline
{outline}

## Research Material
{research}

## Requirements
- Tone: {tone}
- Target length: {targetLength} words
- Author: {authorName}${state.authorTitle ? `, ${state.authorTitle}` : ''}
- Write in Markdown format
- Do NOT include the H1 title — it will be added separately
- Start directly with the first H2 section

${SEO_GEO_RULES}

## Additional Rules from Master Prompt
The user's master prompt above is the PRIMARY guide for style, length, and format.
If the master prompt conflicts with the default rules above, follow the master prompt.
`
    )
      .pipe(structuredOutput)
      .invoke({
        masterPrompt: state.masterPrompt,
        title: state.title,
        outline: JSON.stringify(state.outline?.sections, null, 2),
        research: state.research,
        tone: state.tone,
        targetLength: state.targetLength,
        authorName: state.authorName || 'Editorial Team',
      });

    return { content };
  }

  // ── Node 4: Generate SEO Metadata ────────────────────────────────────────

  async generateSeo(state: BlogWorkflowState) {
    const structuredOutput = lightModel.withStructuredOutput(seoSchema);
    const seo = await ChatPromptTemplate.fromTemplate(
      `You are an SEO specialist. Generate metadata for a blog post.

## Post Title
{title}

## Post Content (first 500 words)
{contentPreview}

## SEO Keywords
{keywords}

## Author
Name: {authorName}
Title: {authorTitle}

## Requirements
1. Meta description: 150-160 chars, compelling, includes primary keyword
2. Excerpt: 2-3 sentences for listings and social sharing
3. OG title: "[Post Title] — [Brand Name]" format, under 70 chars
4. OG description: 150-160 chars
5. BlogPosting JSON-LD with: headline, description, datePublished (today: ${dayjs().format('YYYY-MM-DD')}T09:00:00Z), author (name + title), wordCount, keywords array. Output as a valid JSON string.
6. Image generation prompt: editorial-style photograph or illustration that captures the topic. No text in image. Descriptive style cues for AI image generation.
`
    )
      .pipe(structuredOutput)
      .invoke({
        title: state.title,
        contentPreview: (state.content || '').slice(0, 2000),
        keywords: (state.seoKeywords || []).join(', '),
        authorName: state.authorName || 'Editorial Team',
        authorTitle: state.authorTitle || '',
      });

    return { seo };
  }

  // ── Node 5: Generate Featured Image ──────────────────────────────────────

  async generateFeaturedImage(state: BlogWorkflowState) {
    if (!state.generateImageFlag || !state.seo?.imagePrompt) {
      return {};
    }

    try {
      const image = await generateImage(
        `Blog header image, editorial style, 2:1 aspect ratio, professional photography or illustration: ${state.seo.imagePrompt}`
      );
      return { featuredImage: image };
    } catch (err) {
      console.error('Blog image generation failed:', err);
      return {};
    }
  }

  // ── Node 6: Save Draft ───────────────────────────────────────────────────

  async saveDraft(state: BlogWorkflowState) {
    await this._blogService.createPost(state.orgId, {
      title: state.title!,
      content: state.content!,
      excerpt: state.seo?.excerpt,
      seoDescription: state.seo?.seoDescription,
      seoKeywords: state.seoKeywords,
      featuredImage: state.featuredImage,
      category: state.outline?.sections?.[0]?.heading,
      tags: state.seoKeywords,
      authorName: state.authorName,
      authorTitle: state.authorTitle,
      ogTitle: state.seo?.ogTitle,
      ogDescription: state.seo?.ogDescription,
      ogImage: state.featuredImage,
      jsonLd: state.seo?.jsonLd,
    });

    return {};
  }

  // ── Conditional: should generate image? ──────────────────────────────────

  shouldGenerateImage(state: BlogWorkflowState) {
    return state.generateImageFlag ? 'generate-image' : 'save-draft';
  }

  // ── Entry point ──────────────────────────────────────────────────────────

  async generate(orgId: string, body: GenerateBlogPostDto) {
    // Load settings
    const settings = await this._blogService.getSettings(orgId);

    const masterPrompt =
      settings?.masterPrompt ||
      'Write professional, well-researched blog posts. Use clear headings, bullet points, and a conversational but authoritative tone. Target 2,000 words.';

    const graph = BlogGraphService.state();
    const workflow = graph
      .addNode('research', this.research.bind(this))
      .addNode('execute-research', toolNode)
      .addNode('save-research', this.saveResearch.bind(this))
      .addNode('generate-outline', this.generateOutline.bind(this))
      .addNode('generate-content', this.generateContent.bind(this))
      .addNode('generate-seo', this.generateSeo.bind(this))
      .addNode('generate-image', this.generateFeaturedImage.bind(this))
      .addNode('save-draft', this.saveDraft.bind(this))
      .addEdge(START, 'research')
      .addEdge('research', 'execute-research')
      .addEdge('execute-research', 'save-research')
      .addEdge('save-research', 'generate-outline')
      .addEdge('generate-outline', 'generate-content')
      .addEdge('generate-content', 'generate-seo')
      .addConditionalEdges(
        'generate-seo',
        this.shouldGenerateImage.bind(this)
      )
      .addEdge('generate-image', 'save-draft')
      .addEdge('save-draft', END);

    const app = workflow.compile();

    return app.streamEvents(
      {
        messages: [new HumanMessage(body.topic)],
        orgId,
        topic: body.topic,
        masterPrompt,
        tone: body.tone || settings?.defaultTone || 'professional',
        targetLength: body.targetLength || settings?.defaultLength || '1500-3000',
        additionalContext: body.additionalContext,
        generateImageFlag: body.generateImage ?? true,
        authorName: settings?.authorName,
        authorTitle: settings?.authorTitle,
      },
      {
        streamMode: 'values',
        version: 'v2',
      }
    );
  }
}
