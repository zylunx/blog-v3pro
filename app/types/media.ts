/** 媒体类型注册表配置，key 对应 media.yaml 中条目的 type 字段 */
export interface MediaTypeConfig {
	name: string
	icon: string
	color?: string
}

/** 媒体分类（收藏状态）注册表配置，key 对应 media.yaml 中条目的 status 字段 */
export interface MediaCategoryConfig {
	name: string
	icon: string
	color?: string
}

/** 数据源同步配置，定义于仓库根 media.config.ts（脚本与 app.config 共用） */
export interface MediaSyncConfig {
	bangumi: {
		/** Bangumi 用户名，收藏需设为公开 */
		username: string
		/** API 地址，国内网络不通时可更换为可用镜像 */
		apiBase: string
		/** Bangumi subject_type → media.types 注册表 key 映射（1=书籍 2=动画 6=真人影视） */
		typeMap: Record<string, string>
		/** Bangumi 收藏状态 → media.categories 注册表 key 映射（1=想看 2=看过 3=在看） */
		statusMap: Record<string, string>
		/** 请求间隔 ms，保守节流 */
		throttleMs: number
	}
}

/** app.config.ts 中 media 段的配置结构 */
export interface MediaConfig {
	enable: boolean
	types: Record<string, MediaTypeConfig>
	categories: Record<string, MediaCategoryConfig>
	display: {
		/** 默认显示方式：poster=海报墙 / list=列表 */
		mode: 'poster' | 'list'
		/** 每页展示条数 */
		perPage: number
		showCover: boolean
		showRating: boolean
		showProgress: boolean
	}
	/** 同步脚本数据源（pnpm sync:media 使用，配置位于 media.config.ts） */
	sources: MediaSyncConfig
}

/** 单条媒体记录，type / status 需命中注册表 */
export interface MediaEntry {
	title: string
	original?: string
	type: string
	status: string
	cover?: string
	year?: number
	/** 个人评分 */
	score?: number
	/** 站点评分 */
	siteScore?: number
	progress?: string
	link?: string
	comment?: string
	/** 标记日期，用于排序 */
	date?: string
}
