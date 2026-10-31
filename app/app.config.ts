import type { MediaConfig } from '~/types/media'
import type { Nav, NavItem } from '~/types/nav'
import type { StatusConfig } from '~/types/status'
import { pascalCase } from 'es-toolkit/string'
import { Temporal } from 'temporal-polyfill'
import blogConfig from '~~/blog.config'
import mediaSources from '~~/media.config'
import { name, version } from '~~/package.json'

// 图标查询：https://yesicon.app/tabler
// 图标插件：https://marketplace.visualstudio.com/items?itemName=antfu.iconify

// @keep-sorted
export default defineAppConfig({
	// 将 blog.config 中的配置项复制到 appConfig，方便调用
	...blogConfig,

	component: {
		alert: {
			/** 默认使用卡片风格还是扁平风格 */
			defaultStyle: 'card' as 'card' | 'flat',
		},

		codeblock: {
			/** 代码块触发折叠的行数 */
			triggerRows: 32,
			/** 代码块折叠后的行数 */
			collapsedRows: 16,
			/** 启用代码块缩进导航会关闭空格渲染 */
			enableIndentGuide: true,
			/** 代码块缩进导航(Indent Guige)竖线匹配空格数 */
			indent: 4,
			/** tab渲染宽度 */
			tabSize: 3,
		},

		/** 文章开头摘要 */
		excerpt: {
			animation: true,
			caret: '_',
		},

		/** 精选文章 Slide */
		slide: {
			/** 适合封面图无字时启用 */
			showTitle: true,
		},

		stats: {
			/** 归档页面每年标题对应的年龄，设为 0 则隐藏年龄 */
			birthYear: 0,
			/** blog-stats widget 的预置文本，留空则由接口实时统计 */
			wordCount: '',
		},
	},

	// @keep-sorted
	footer: {
		/** 页脚版权信息，支持 <br> 换行等 HTML 标签 */
		copyright: `© ${Temporal.Now.plainDateISO().year.toString()} ${blogConfig.author.name}`,
		/** 侧边栏底部图标导航 */
		iconNav: [
			{ icon: 'tabler:home', text: '个人主页', url: blogConfig.author.homepage },
			// { icon: 'ri:qq-line', text: '交流群: 169994096', url: 'https://jq.qq.com/?_wv=1027&k=lQfNSeEd' },
			// { icon: 'tabler:brand-github', text: 'GitHub: L33Z22L11', url: 'https://github.com/L33Z22L11' },
			{ icon: 'tabler:rss', text: '订阅', url: '/feed' },
			{ icon: 'ri:subway-line', text: '开往 - 博客下一站', url: 'https://www.travellings.cn/go.html' },
		] satisfies NavItem[],
		/** 页脚站点地图 */
		nav: [
			{
				title: '探索',
				items: [
					{ icon: 'tabler:rss', text: '订阅', url: '/feed' },
					{ icon: 'tabler:activity-heartbeat', text: '服务状态', url: '/status' },
					{ icon: 'tabler:history', text: '更新日志', url: '/changelog' },
					{ icon: 'ri:subway-line', text: '开往', url: 'https://www.travellings.cn/go.html' },
				],
			},
			{
				title: '社交',
				items: [
					// { icon: 'tabler:brand-github', text: 'L33Z22L11', url: 'https://github.com/L33Z22L11' },
					// { icon: 'ri:qq-line', text: '群: 169994096', url: 'https://jq.qq.com/?_wv=1027&k=lQfNSeEd' },
					{ icon: 'tabler:mail', text: blogConfig.author.email, url: `mailto:${blogConfig.author.email}` },
				],
			},
			{
				title: '信息',
				items: [
					{ icon: 'simple-icons:nuxt', text: `主题: ${pascalCase(name)} ${version}`, url: 'https://github.com/zylunx/blog-v3pro' },
					{ icon: 'tabler:color-swatch', text: '主题和组件文档', url: 'https://blog.zhilu.site/theme' },
					{ icon: 'tabler:certificate', text: '萌20230413号', url: 'https://icp.gov.moe/?keyword=20230413' },
				],
			},
		] satisfies Nav,
	},

	/** 左侧栏顶部 Logo */
	header: {
		logo: blogConfig.author.avatar,
		/** 展示标题文本，否则展示纯 Logo */
		showTitle: true,
		subtitle: blogConfig.subtitle,
		emojiTail: ['🔮', '✨', '🌱'],
	},

	/** 友链页面 */
	link: {
		/** 无订阅源展示静音图标 */
		remindNoFeed: true,
		/** 友链分组内随机排序 */
		randomInGroup: true,
	},

	/** 个人媒体库（左栏「娱乐」入口 → /media 页） */
	media: {
		enable: true,
		/** 媒体类型注册表：key 对应 media.yaml 的 type 字段，新增类型只需加一行 */
		types: {
			anime: { name: '动漫', icon: 'tabler:device-tv', color: '#ff8c00' },
			movie: { name: '电影', icon: 'tabler:movie', color: '#33aaff' },
			tv: { name: '剧集', icon: 'tabler:monitor', color: '#33bbaa' },
			novel: { name: '小说', icon: 'tabler:book', color: '#ff7777' },
		},
		/** 收藏分类注册表：key 对应 media.yaml 的 status 字段 */
		categories: {
			doing: { name: '在看', icon: 'tabler:player-play' },
			done: { name: '看过', icon: 'tabler:circle-check' },
			wish: { name: '想看', icon: 'tabler:clock' },
		},
		display: {
			/** 默认显示方式：poster=海报墙 / list=列表，访客可经 ?mode= 切换 */
			mode: 'poster' as 'poster' | 'list',
			/** 每页展示条数 */
			perPage: 24,
			showCover: true,
			showRating: true,
			showProgress: true,
		},
		/** 同步脚本数据源（pnpm sync:media 使用，配置位于仓库根 media.config.ts） */
		sources: mediaSources,
	} satisfies MediaConfig,

	/** 左侧栏导航 */
	nav: [
		{
			title: '',
			items: [
				{ icon: 'tabler:files', text: '文章', url: '/' },
				{ icon: 'tabler:link', text: '友链', url: '/link' },
				{ icon: 'tabler:archive', text: '归档', url: '/archive' },
				{ icon: 'tabler:devices', text: '娱乐', url: '/media' },
			],
		},
	] satisfies Nav,

	pagination: {
		perPage: 10,
		/** 默认排序方式，需要是 this.article.order 中的键名 */
		sortOrder: 'date' as keyof typeof blogConfig.article.order,
		/** 允许（普通/预览/归档）文章列表正序，开启后排序方式左侧图标可切换顺序 */
		allowAscending: false,
	},

	/** 服务监控页面（/status），数据来自 Uptime Kuma 状态页 */
	status: {
		/** Uptime Kuma 站点地址，末尾不带斜杠；若状态页接口未开放跨域，可改为同源反向代理路径 */
		baseURL: 'https://status.netbox.ccwu.cc',
		/** 状态页 slug，即 /status/{slug} 的最后一段 */
		slug: 'mybox',
		title: '服务状态',
		description: '本站依赖的各项服务运行状况，数据来自 Uptime Kuma，打开页面时自动刷新。',
	} satisfies StatusConfig,

	themes: {
		light: {
			icon: 'tabler:sun',
			tip: '浅色模式',
		},
		system: {
			icon: 'tabler:device-desktop',
			tip: '跟随系统',
		},
		dark: {
			icon: 'tabler:moon',
			tip: '深色模式',
		},
	},
})
