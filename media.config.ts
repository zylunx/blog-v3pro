import type { MediaSyncConfig } from './app/types/media'

/**
 * 媒体库数据源同步配置（scripts/sync-media.ts 使用）
 * app.config.ts 经 media.sources 引用；此处均为非敏感项，可安全提交
 */
export default {
	bangumi: {
		/** Bangumi 用户名；收藏需设为公开，否则脚本只能读到公开条目 */
		username: '627079',
		/** API 地址，国内网络不通时可更换为可用镜像 */
		apiBase: 'https://api.bgm.tv',
		/**
		 * Bangumi subject_type → media.types 注册表 key 映射
		 * 1=书籍 2=动画 3=音乐 4=游戏 6=真人影视（电视剧/电影）
		 */
		typeMap: { 1: 'novel', 2: 'anime', 6: 'tv' },
		/**
		 * Bangumi 收藏状态 → media.categories 注册表 key 映射
		 * 1=想看 2=看过 3=在看（4=搁置 / 5=抛弃 默认丢弃，不入库）
		 */
		statusMap: { 1: 'wish', 2: 'done', 3: 'doing' },
		/** 请求间隔 ms，Bangumi 未公布限流值，保守节流 */
		throttleMs: 1200,
	},
} satisfies MediaSyncConfig
