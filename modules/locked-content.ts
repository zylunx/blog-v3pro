import type { MinimarkTree } from '@nuxt/content'
import { Buffer } from 'node:buffer'
import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineNuxtModule } from 'nuxt/kit'

/**
 * 构建期文章加密。
 *
 * 站点为纯静态部署，没有服务端可以校验密码，因此「密码」只能是客户端解密用的密钥来源：
 * - 解析阶段把正文（minimark 树）用 PBKDF2 派生的 AES-256-GCM 密钥加密，密文写进 public 资源；
 * - 正文从内容库中替换为占位段落，密码字段本身不落库、不进 payload；
 * - 页面只拿到 `locked` 与 `lockId`，由浏览器解密后再交给 ContentRenderer 渲染，
 *   MDC 组件、代码高亮、KaTeX 都由构建期生成并随树携带，所以加密不会破坏排版。
 */

/** 密文输出目录，经 nitro publicAssets 暴露为 `/_locked` */
const LOCKED_DIR = '.data/locked'
/** PBKDF2 迭代次数，兼顾离线爆破成本与移动端解密耗时 */
const PBKDF2_ITERATIONS = 210_000

export interface LockedPayload {
	v: 1
	kdf: 'PBKDF2-SHA256'
	cipher: 'AES-256-GCM'
	iter: number
	salt: string
	iv: string
	data: string
}

/** 替换进内容库的占位正文，解锁前页面只会看到这一句 */
function createPlaceholder(): MinimarkTree {
	return {
		type: 'minimark',
		value: [
			{
				type: 'element',
				tag: 'p',
				props: {},
				children: ['本文已加密，输入密码后显示正文。'],
			},
		],
		toc: { title: '', depth: 0, links: [] },
	}
}

function encryptBody(plain: string, password: string): LockedPayload {
	const salt = randomBytes(16)
	const iv = randomBytes(12)
	const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256')
	const cipher = createCipheriv('aes-256-gcm', key, iv)
	// WebCrypto 的 AES-GCM 期望 `密文 || 认证标签`，与 Node 分开输出的形式不同
	const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final(), cipher.getAuthTag()])

	return {
		v: 1,
		kdf: 'PBKDF2-SHA256',
		cipher: 'AES-256-GCM',
		iter: PBKDF2_ITERATIONS,
		salt: salt.toString('base64'),
		iv: iv.toString('base64'),
		data: data.toString('base64'),
	}
}

export default defineNuxtModule({
	meta: {
		name: 'locked-content',
	},
	setup(_options, nuxt) {
		const outputDir = resolve(nuxt.options.rootDir, LOCKED_DIR)
		let prepared = false

		/**
		 * 本次构建只要重新解析过内容，就先清空旧密文，避免移除密码或删除文章后旧密文继续随产物发布。
		 * 若全部命中缓存（`beforeParse` 不触发），说明内容未变，沿用上次生成的密文才是正确的。
		 */
		nuxt.hook('content:file:beforeParse', () => {
			if (prepared)
				return
			prepared = true
			rmSync(outputDir, { recursive: true, force: true })
			mkdirSync(outputDir, { recursive: true })
		})

		nuxt.hook('content:file:afterParse', ({ content }) => {
			// 未在 schema 中声明的 frontmatter 字段会被收进 meta，密码正是其中之一
			const meta = (content.meta ?? {}) as Record<string, unknown>
			const raw = meta.password
			// 只处理显式设置了密码的文章，其余内容保持原样
			if (typeof raw !== 'string' || !raw)
				return

			// 支持 `password: env:VAR_NAME`，让仓库里只留下变量名而不留真密码
			const password = raw.startsWith('env:')
				? process.env[raw.slice(4).trim()] || ''
				: raw
			if (!password) {
				console.warn(`[locked-content] ${content.id} 的密码环境变量 ${raw} 未设置，已跳过加密`)
				return
			}

			const body = content.body as MinimarkTree | undefined
			if (!body)
				return

			const lockId = createHash('sha256').update(String(content.id)).digest('hex').slice(0, 16)
			mkdirSync(outputDir, { recursive: true })
			writeFileSync(
				resolve(outputDir, `${lockId}.json`),
				JSON.stringify(encryptBody(JSON.stringify(body), password)),
				'utf8',
			)

			// 正文与密码都不得留在内容库里：正文换成占位段落，密码直接丢弃
			content.body = createPlaceholder()
			content.locked = true
			content.lockId = lockId
			delete meta.password
		})

		nuxt.hook('nitro:config', (nitroConfig) => {
			nitroConfig.publicAssets ||= []
			nitroConfig.publicAssets.push({
				dir: outputDir,
				baseURL: '/_locked',
				maxAge: 60 * 60 * 24 * 90,
			})
		})
	},
})
