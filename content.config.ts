import type { ReadTimeResults } from 'reading-time'
import { defineCollection } from '@nuxt/content'
import { defineSitemapSchema } from '@nuxtjs/sitemap/content'
import { z } from 'zod'
import blogConfig from './blog.config'

type ArticleType = keyof typeof blogConfig.article.types
// 文章类型已在 blog.config 中定义，此处使用 any 类型绕过 zod 类型验证
const articleTypes = Object.keys(blogConfig.article.types) as any

export interface ArticleSchema {
	title?: string
	description?: string
	date?: string
	updated?: string
	published?: string
	categories?: string[]
	tags?: string[]
	type?: ArticleType

	image?: string
	recommend?: number
	references?: { title?: string, link?: string }[]
	/** TODO */
	draft?: boolean
	permalink?: string
	/** 是否加密（由构建期加密模块写入，不可在 frontmatter 中手动设置） */
	locked?: boolean
	/** 密文文件名（由构建期加密模块写入） */
	lockId?: string

	readingTime?: ReadTimeResults
}

const articleSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	date: z.string().optional(),
	updated: z.string().optional(),
	published: z.string().optional(),
	categories: z.array(z.string()).default([blogConfig.defaultCategory]),
	tags: z.array(z.string()).default([]),
	type: z.enum(articleTypes).optional().default(articleTypes[0]),

	image: z.string().optional(),
	recommend: z.number().optional(),
	references: z.array(z.object({
		title: z.string().optional(),
		link: z.string().optional(),
	})).optional(),
	draft: z.boolean().default(false),
	permalink: z.string().optional(),
	// password 由构建期加密模块读取后立即丢弃，不声明即可被 schema 剥离，避免密码进入内容库与 payload
	locked: z.boolean().default(false),
	lockId: z.string().optional(),

	readingTime: z.object({
		text: z.string(),
		minutes: z.number(),
		time: z.number(),
		words: z.number(),
	}),
}) satisfies z.ZodType<ArticleSchema>

export const collections = {
	content: defineCollection({
		source: '**',
		type: 'page',
		schema: articleSchema.extend({
			sitemap: defineSitemapSchema({
				name: 'content',
				// 草稿不应出现在站点地图中，等发布后再移除 frontmatter 的 draft 字段
				// 加密文章同理：标题与路径也不应进索引
				filter: entry => !entry.draft && !entry.locked,
				onUrl: (url, entry) => {
					const lastmod = (entry.updated || entry.published || entry.date) as string | undefined
					if (lastmod)
						url.lastmod = new Date(lastmod).toLocaleDateString('sv')
				},
				z,
			}),
		}),
	}),
}
