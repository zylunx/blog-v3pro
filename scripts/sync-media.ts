#!/usr/bin/env node

/**
 * 媒体库同步脚本：从 Bangumi 公开收藏生成仓库根的 media.yaml
 *
 * 用法：
 *   pnpm sync:media                        # 按 media.config.ts 配置同步
 *   pnpm sync:media -- --username sai      # 临时指定用户名
 *   pnpm sync:media -- --dry-run           # 只试算，不写 media.yaml 与缓存
 *   pnpm sync:media -- --offline           # 仅使用本地缓存，不联网
 *   pnpm sync:media -- --prune             # 清理已不在 Bangumi 收藏中的条目（谨慎）
 *
 * 设计要点：
 *   - 公开收藏匿名可读，无需密钥；抓取失败时回退本地缓存兜底，不会写坏数据
 *   - 本地手工维护的 score / comment 等字段在同步时保留
 *   - 未配置映射的 type / status（搁置、抛弃等）默认丢弃，不计入
 */

import type { MediaEntry } from '../app/types/media'
import fs from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import mediaSources from '../media.config'

const ROOT = join(import.meta.dirname, '..')
const YAML_PATH = join(ROOT, 'media.yaml')
const CACHE_DIR = join(ROOT, '.data', 'media-sync')
const USER_AGENT = 'clarity-media-sync/1.0 (+https://github.com/zylunx/blog-v3pro)'
/** 每页条数，Bangumi 未公布上限，保守取 100 */
const PAGE_SIZE = 100
/** 网络失败重试次数（指数退避） */
const MAX_RETRIES = 3

/** Bangumi v0 collections 接口的收藏条目（宽松字段，防御性读取） */
interface BgmCollection {
	subject_id: number
	subject_type: number
	/** 收藏状态：1=想做 2=做过 3=在做 4=搁置 5=抛弃 */
	type: number
	/** 个人评分 0-10，0 为未评分 */
	rate?: number
	comment?: string | null
	ep_status?: number
	vol_status?: number
	updated_at?: string
	subject?: {
		name?: string
		name_cn?: string
		date?: string | null
		images?: Record<string, string>
		eps?: number
		total_episodes?: number
		volumes?: number
		/** 站点评分 */
		score?: number
		rating?: { score?: number }
	}
}

interface CliArgs {
	username?: string
	dryRun: boolean
	prune: boolean
	offline: boolean
	help: boolean
}

interface SyncStats {
	added: number
	updated: number
	unchanged: number
	manual: number
	pruned: number
	skipped: number
}

/** media.yaml 字段顺序，同时用于序列化与变更比对 */
const FIELD_ORDER: (keyof MediaEntry)[] = [
	'title',
	'original',
	'type',
	'status',
	'cover',
	'year',
	'score',
	'siteScore',
	'progress',
	'link',
	'comment',
	'date',
]

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

// #region CLI
function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = { dryRun: false, prune: false, offline: false, help: false }
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === '--username' || arg === '-u')
			args.username = argv[++i]
		else if (arg?.startsWith('--username='))
			args.username = arg.slice('--username='.length)
		else if (arg === '--dry-run')
			args.dryRun = true
		else if (arg === '--prune')
			args.prune = true
		else if (arg === '--offline')
			args.offline = true
		else if (arg === '--help' || arg === '-h')
			args.help = true
		else
			throw new Error(`未知参数：${arg}（--help 查看用法）`)
	}
	return args
}

function printHelp(): void {
	console.log(`媒体库同步脚本（Bangumi → media.yaml）

用法：pnpm sync:media [-- 参数]

参数：
  -u, --username <name>   Bangumi 用户名（优先于 media.config.ts 与 $BANGUMI_USERNAME）
      --dry-run           只试算并打印摘要，不写 media.yaml 与缓存
      --offline           仅使用本地缓存，不发起网络请求
      --prune             删除本地存在、但已不在 Bangumi 收藏中的条目（谨慎使用）
  -h, --help              显示本帮助

数据源配置见仓库根 media.config.ts；Bangumi 收藏需设为公开。`)
}
// #endregion

// #region YAML 序列化（零依赖，仅覆盖本项目的扁平条目结构）
function scalar(value: unknown): string {
	if (typeof value === 'number' || typeof value === 'boolean')
		return String(value)
	// 统一单引号包裹：天然规避英文冒号等 YAML 语法冲突
	return `'${String(value).replaceAll('\'', '\'\'')}'`
}

function stringifyEntry(entry: MediaEntry): string {
	return FIELD_ORDER
		.map(key => [key, entry[key]] as const)
		.filter(([, value]) => value !== undefined && value !== null && value !== '')
		.map(([key, value], index) => `${index === 0 ? '- ' : '  '}${key}: ${scalar(value)}`)
		.join('\n')
}

function stringifyMediaYaml(entries: MediaEntry[]): string {
	const header = [
		'# 个人媒体库数据',
		'# 由 scripts/sync-media.ts 生成，也可手工维护；type / status 需命中 app.config.ts 中 media 注册表',
		'# 手工维护的 score / comment 等字段在同步时会保留；数据源配置见 media.config.ts',
		'',
		'',
	].join('\n')
	return `${header}${entries.map(stringifyEntry).join('\n\n')}\n`
}

/** 解析 media.yaml 现有内容（顶层条目数组，值为标量） */
function parseMediaYaml(text: string): MediaEntry[] {
	const entries: Record<string, unknown>[] = []
	let current: Record<string, unknown> | undefined
	for (const rawLine of text.split('\n')) {
		const line = rawLine.trim()
		if (!line || line.startsWith('#'))
			continue
		let body = line
		if (line.startsWith('- ')) {
			current = {}
			entries.push(current)
			body = line.slice(2)
		}
		else if (line === '-') {
			current = {}
			entries.push(current)
			body = ''
		}
		if (!current)
			continue
		const idx = body.indexOf(':')
		if (idx === -1)
			continue
		const key = body.slice(0, idx).trim()
		let value: unknown = body.slice(idx + 1).trim()
		if (typeof value === 'string') {
			if ((value.startsWith('\'') && value.endsWith('\'')) || (value.startsWith('"') && value.endsWith('"')))
				value = value.slice(1, -1).replaceAll('\'\'', '\'')
			else if (value !== '' && !Number.isNaN(Number(value)))
				value = Number(value)
		}
		current[key] = value === '' ? undefined : value
	}
	return entries.filter(entry => Object.keys(entry).length > 0) as MediaEntry[]
}
// #endregion

// #region Bangumi 抓取
/** 带指数退避的 JSON 请求；404 不重试（用户不存在或收藏未公开） */
async function fetchJson(url: string): Promise<unknown> {
	let lastError: unknown
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
			if (response.status === 404)
				throw new Error('HTTP 404（用户不存在，或收藏未设为公开）')
			if (!response.ok)
				throw new Error(`HTTP ${response.status} ${response.statusText}`)
			return await response.json()
		}
		catch (error) {
			lastError = error
			if (error instanceof Error && error.message.startsWith('HTTP 404'))
				throw error
			await sleep(1000 * 2 ** attempt + Math.random() * 500)
		}
	}
	throw lastError
}

/** 分页抓取某一 subject_type 的全部收藏 */
async function fetchCollections(
	username: string,
	subjectType: number,
	apiBase: string,
	throttleMs: number,
): Promise<BgmCollection[]> {
	const all: BgmCollection[] = []
	for (let offset = 0; ; offset += PAGE_SIZE) {
		const url = `${apiBase}/v0/users/${encodeURIComponent(username)}/collections?subject_type=${subjectType}&limit=${PAGE_SIZE}&offset=${offset}`
		const json = await fetchJson(url) as { data?: BgmCollection[], total?: number } | BgmCollection[]
		// 兼容两种响应形态：裸数组（早期/镜像）与 { data, total } 分页包装（现行）
		const page = Array.isArray(json) ? json : json.data
		const total = Array.isArray(json) ? Number.POSITIVE_INFINITY : json.total ?? Number.POSITIVE_INFINITY
		if (!Array.isArray(page))
			throw new Error('响应格式异常（既非数组，也无 data 数组）')
		all.push(...page)
		if (page.length < PAGE_SIZE || all.length >= total)
			break
		await sleep(throttleMs)
	}
	return all
}

function cachePath(subjectType: number): string {
	return join(CACHE_DIR, `bangumi-${subjectType}.json`)
}

function readCache(subjectType: number): BgmCollection[] | undefined {
	const file = cachePath(subjectType)
	if (!fs.existsSync(file))
		return undefined
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8')) as BgmCollection[]
	}
	catch {
		return undefined
	}
}

function writeCache(subjectType: number, data: BgmCollection[]): void {
	fs.mkdirSync(CACHE_DIR, { recursive: true })
	fs.writeFileSync(cachePath(subjectType), `${JSON.stringify(data, null, 2)}\n`)
}

function parseYear(date: string | null | undefined): number | undefined {
	const year = Number.parseInt((date ?? '').slice(0, 4), 10)
	return Number.isNaN(year) ? undefined : year
}

/** Bangumi 收藏 → MediaEntry；本地手工字段（score / comment 等）作兜底保留 */
function mapCollection(
	collection: BgmCollection,
	typeMap: Record<string, string>,
	statusMap: Record<string, string>,
	local: MediaEntry | undefined,
): MediaEntry | null {
	const type = typeMap[String(collection.subject_type)]
	const status = statusMap[String(collection.type)]
	if (!type || !status)
		return null

	const subject = collection.subject ?? {}
	const totalEps = subject.eps ?? subject.total_episodes
	const progress = collection.ep_status && totalEps
		? `${collection.ep_status}/${totalEps}`
		: collection.ep_status
			? `${collection.ep_status}`
			: collection.vol_status && subject.volumes
				? `${collection.vol_status}/${subject.volumes}`
				: collection.vol_status
					? `${collection.vol_status}`
					: local?.progress

	return {
		title: subject.name_cn || subject.name || `(条目 ${collection.subject_id})`,
		original: subject.name_cn && subject.name && subject.name_cn !== subject.name ? subject.name : undefined,
		type,
		status,
		cover: subject.images?.large ?? subject.images?.common ?? local?.cover,
		year: parseYear(subject.date),
		score: collection.rate && collection.rate > 0 ? collection.rate : local?.score,
		siteScore: (subject.score ?? subject.rating?.score) || local?.siteScore,
		progress,
		link: `https://bgm.tv/subject/${collection.subject_id}`,
		comment: local?.comment ?? (collection.comment?.trim() || undefined),
		date: collection.updated_at?.slice(0, 10) ?? local?.date,
	}
}
// #endregion

// #region 合并
/** 远程（Bangumi）条目与本地条目合并：远程字段优先，本地 score / comment 等兜底 */
function mergeEntries(local: MediaEntry[], remote: MediaEntry[], prune: boolean, skipped: number) {
	const localByLink = new Map(local.filter(entry => entry.link).map(entry => [entry.link!, entry]))
	const remoteLinks = new Set(remote.map(entry => entry.link!))
	const stats: SyncStats = { added: 0, updated: 0, unchanged: 0, manual: 0, pruned: 0, skipped }
	const entries: MediaEntry[] = []

	for (const entry of remote) {
		const localEntry = localByLink.get(entry.link!)
		if (!localEntry)
			stats.added++
		else if (stringifyEntry(entry) === stringifyEntry(localEntry))
			stats.unchanged++
		else
			stats.updated++
		entries.push(entry)
	}

	for (const entry of local) {
		if (entry.link && remoteLinks.has(entry.link))
			continue
		// --prune：清理 link 指向 Bangumi、但已不在收藏中的条目；纯手工条目永不删除
		if (prune && entry.link?.includes('bgm.tv')) {
			stats.pruned++
			continue
		}
		stats.manual++
		entries.push(entry)
	}

	entries.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
	return { entries, stats }
}
// #endregion

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2))
	if (args.help) {
		printHelp()
		return
	}

	const { bangumi: cfg } = mediaSources
	const username = args.username || process.env.BANGUMI_USERNAME || cfg.username
	if (!username) {
		console.error('未指定 Bangumi 用户名：请编辑 media.config.ts 的 sources.bangumi.username，或使用 --username / 环境变量 BANGUMI_USERNAME')
		process.exit(1)
	}

	const local = fs.existsSync(YAML_PATH) ? parseMediaYaml(fs.readFileSync(YAML_PATH, 'utf8')) : []
	const localByLink = new Map(local.filter(entry => entry.link).map(entry => [entry.link!, entry]))

	const typeKeys = Object.keys(cfg.typeMap)
	const remote: MediaEntry[] = []
	const cachedTypes: number[] = []
	let skipped = 0

	for (const [index, key] of typeKeys.entries()) {
		const subjectType = Number(key)
		let collections: BgmCollection[] | undefined

		if (!args.offline) {
			try {
				collections = await fetchCollections(username, subjectType, cfg.apiBase, cfg.throttleMs)
				if (!args.dryRun)
					writeCache(subjectType, collections)
				console.log(`✓ subject_type=${subjectType} 抓取 ${collections.length} 条`)
			}
			catch (error) {
				console.warn(`⚠ subject_type=${subjectType} 抓取失败（${error instanceof Error ? error.message : error}），回退本地缓存`)
			}
		}

		if (!collections) {
			collections = readCache(subjectType)
			if (!collections) {
				console.error(`✗ subject_type=${subjectType} 无本地缓存可用（首次使用请先联网同步一次）`)
				process.exit(1)
			}
			cachedTypes.push(subjectType)
			console.log(`↺ subject_type=${subjectType} 使用本地缓存 ${collections.length} 条`)
		}

		for (const collection of collections) {
			const entry = mapCollection(collection, cfg.typeMap, cfg.statusMap, localByLink.get(`https://bgm.tv/subject/${collection.subject_id}`))
			if (entry)
				remote.push(entry)
			else
				skipped++
		}

		// 类型间节流，最后一次无需等待
		if (index < typeKeys.length - 1)
			await sleep(cfg.throttleMs)
	}

	const { entries, stats } = mergeEntries(local, remote, args.prune, skipped)

	if (args.dryRun) {
		console.log('\n--dry-run 试算结果（未写入任何文件）：')
	}
	else {
		fs.writeFileSync(YAML_PATH, stringifyMediaYaml(entries))
		console.log('\nmedia.yaml 已更新')
	}
	console.log(`  新增 ${stats.added} · 更新 ${stats.updated} · 未变 ${stats.unchanged} · 跳过 ${stats.skipped} · 手工保留 ${stats.manual}${stats.pruned ? ` · 清理 ${stats.pruned}` : ''}`)
	console.log(`  共 ${entries.length} 条`)
	if (cachedTypes.length)
		console.log(`  注意：subject_type ${cachedTypes.join(' / ')} 本次为缓存兜底，数据可能非最新`)
	if (skipped)
		console.log('  跳过原因：type / status 未配置于 media.config.ts 的 typeMap / statusMap（如搁置、抛弃默认丢弃）')
}

main().catch((error) => {
	console.error(`同步失败：${error instanceof Error ? error.message : error}`)
	process.exit(1)
})
