import type {
	StatusLevel,
	UptimeHeartbeat,
	UptimeHeartbeatResponse,
	UptimeStatusPageData,
	UptimeStatusPageMonitor,
} from '~/types/status'
import { clamp } from 'es-toolkit/math'

/** 心跳条数上限，避免 100 条心跳挤成噪点 */
const MAX_BEATS = 60

/** Uptime Kuma 的状态码映射 */
const LEVEL_BY_STATUS: Record<number, StatusLevel> = {
	0: 'down',
	1: 'up',
	2: 'pending',
	3: 'maintenance',
}

/** 各状态等级的文案与图标，配色交由 CSS 变量控制 */
export const statusLevelMeta: Record<StatusLevel, { label: string, icon: string }> = {
	up: { label: '正常', icon: 'tabler:circle-check' },
	down: { label: '故障', icon: 'tabler:alert-triangle' },
	maintenance: { label: '维护中', icon: 'tabler:tool' },
	pending: { label: '等待中', icon: 'tabler:clock' },
	unknown: { label: '未知', icon: 'tabler:help-circle' },
}

/** 监控类型对应的图标 */
const MONITOR_TYPE_ICON: Record<string, string> = {
	docker: 'tabler:brand-docker',
	grpc: 'tabler:bolt',
	group: 'tabler:folder',
	http: 'tabler:world-www',
	keyword: 'tabler:search',
	ping: 'tabler:ping',
	port: 'tabler:plug',
	push: 'tabler:send',
	realbrowser: 'tabler:browser',
}

export interface StatusBeat {
	status: number
	level: StatusLevel
	/** 仅保留时间部分，避开服务端时区差异 */
	clock: string
	ping: number | null
	msg: string
	/** 悬浮提示文案 */
	tip: string
}

export interface StatusMonitorView {
	id: number
	name: string
	type: string
	icon: string
	level: StatusLevel
	label: string
	/** 24 小时可用率（0~1） */
	uptime: number | null
	/** 24 小时可用率格式化文案 */
	uptimeText: string
	/** 最近一次心跳的延迟，毫秒 */
	ping: number | null
	/** 证书剩余天数 */
	certDays: number | null
	beats: StatusBeat[]
}

export interface StatusGroupView {
	id: number
	name: string
	monitors: StatusMonitorView[]
	upCount: number
}

export interface StatusOverall {
	level: StatusLevel
	label: string
	detail: string
}

/** 构建期抓取的快照，随页面一起预渲染，作为实时接口不可达时的兜底 */
interface StatusSnapshot {
	page: UptimeStatusPageData
	heartbeat: UptimeHeartbeatResponse
	at: number
}

function toLevel(status: number | undefined): StatusLevel {
	return LEVEL_BY_STATUS[status ?? -1] ?? 'unknown'
}

/** 兼容 0~1 与 0~100 两种可用率口径 */
function normalizeUptime(value: number | undefined | null): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value))
		return null
	return Math.min(value > 1 ? value / 100 : value, 1)
}

/** 可用率格式化 */
export function formatUptime(value: number | null): string {
	if (value === null)
		return '—'
	const percent = value * 100
	return percent >= 99.995 ? '100%' : `${percent.toFixed(2)}%`
}

/** 心跳对象转视图模型 */
function toBeat(beat: UptimeHeartbeat): StatusBeat {
	const level = toLevel(beat.status)
	const clock = beat.time.slice(11, 19) || beat.time
	const ping = typeof beat.ping === 'number' && beat.ping > 0 ? Math.round(beat.ping) : null
	const msg = beat.msg?.trim() ?? ''
	const tip = [clock, statusLevelMeta[level].label, ping === null ? '' : `${ping} ms`, msg]
		.filter(Boolean)
		.join(' · ')
	return { status: beat.status, level, clock, ping, msg, tip }
}

/** 只保留最近的心跳，控制快照体积 */
function slimHeartbeat(heartbeat: UptimeHeartbeatResponse): UptimeHeartbeatResponse {
	const heartbeatList = Object.fromEntries(
		Object.entries(heartbeat.heartbeatList ?? {}).map(([id, beats]) => [id, beats.slice(-MAX_BEATS)]),
	)
	return { heartbeatList, uptimeList: heartbeat.uptimeList ?? {} }
}

/**
 * 状态页数据、心跳与可用率组合成页面视图模型。
 * 数据有两条来源：构建期快照（随 SSG 预渲染）与浏览器实时请求，
 * 后者需要状态页接口开放跨域，失败时回退到快照。
 */
export function useStatus() {
	const appConfig = useAppConfig()
	const config = appConfig.status

	const refreshing = ref(false)
	/** 最近一次实时请求是否成功 */
	const live = ref(false)
	/** 首次实时请求是否已结束（无论成败），用于区分骨架屏与失败兜底 */
	const settled = ref(false)
	/** 客户端实时抓取到的数据，优先于构建期快照 */
	const liveSnapshot = ref<StatusSnapshot>()

	const baseURL = computed(() => config.baseURL.replace(/\/+$/, ''))
	const statusPageURL = computed(() => `${baseURL.value}/status/${config.slug}`)

	async function request<T>(path: string, timeout = 10_000): Promise<T> {
		return await $fetch<T>(`${baseURL.value}${path}`, { retry: 0, timeout })
	}

	async function fetchAll(timeout?: number): Promise<StatusSnapshot> {
		const [page, beats] = await Promise.all([
			request<UptimeStatusPageData>(`/api/status-page/${config.slug}`, timeout),
			request<UptimeHeartbeatResponse>(`/api/status-page/heartbeat/${config.slug}`, timeout),
		])
		return { page, heartbeat: slimHeartbeat(beats), at: Date.now() }
	}

	/** 构建期抓取一次，网络抖动时重试一次，仍失败则返回 null 而不中断构建 */
	const { data: snapshot } = useAsyncData<StatusSnapshot | null>('status:snapshot', async () => {
		for (let attempt = 0; attempt < 2; attempt++) {
			try {
				return await fetchAll(12_000)
			}
			catch {
				// 落到下一次尝试
			}
		}
		return null
	})

	/** 实时数据优先，缺失时使用快照 */
	const data = computed(() => liveSnapshot.value?.page ?? snapshot.value?.page)
	const heartbeat = computed(() => liveSnapshot.value?.heartbeat ?? snapshot.value?.heartbeat)
	/** 数据时间戳：快照时间 */
	const snapshotAt = computed(() => snapshot.value?.at ?? 0)
	/** 数据时间戳：实时数据时间 */
	const updatedAt = computed(() => liveSnapshot.value?.at ?? 0)
	const pending = computed(() => !data.value && !settled.value)

	/** 监控项视图：合并心跳、可用率与证书信息 */
	const groups = computed<StatusGroupView[]>(() => {
		const list = data.value?.publicGroupList ?? []
		return [...list]
			.sort((a, b) => a.weight - b.weight)
			.map((group) => {
				const monitors = group.monitorList.map((monitor: UptimeStatusPageMonitor): StatusMonitorView => {
					const beats = (heartbeat.value?.heartbeatList?.[monitor.id] ?? [])
						.slice(-MAX_BEATS)
						.map(toBeat)
					const latest = beats.at(-1)
					const level = latest?.level ?? 'unknown'
					const uptime = normalizeUptime(heartbeat.value?.uptimeList?.[`${monitor.id}_24`])
					return {
						id: monitor.id,
						name: monitor.name,
						type: monitor.type,
						icon: MONITOR_TYPE_ICON[monitor.type] ?? 'tabler:activity',
						level,
						label: latest?.msg && level !== 'up' ? latest.msg : statusLevelMeta[level].label,
						uptime,
						uptimeText: formatUptime(uptime),
						ping: latest?.ping ?? null,
						certDays: monitor.certExpiryDaysRemaining ?? null,
						beats,
					}
				})
				return {
					id: group.id,
					name: group.name,
					monitors,
					upCount: monitors.filter(monitor => monitor.level === 'up').length,
				}
			})
	})

	const allMonitors = computed(() => groups.value.flatMap(group => group.monitors))

	/** 页面顶部总览状态 */
	const overall = computed<StatusOverall>(() => {
		const monitors = allMonitors.value
		if (!monitors.length) {
			return pending.value
				? { level: 'pending', label: '正在连接监控接口', detail: '正在获取 Uptime Kuma 状态数据…' }
				: { level: 'unknown', label: '数据暂不可用', detail: '状态页接口无响应，可稍后重试。' }
		}
		const down = monitors.filter(monitor => monitor.level === 'down')
		const maintenance = monitors.filter(monitor => monitor.level === 'maintenance')
		if (down.length)
			return { level: 'down', label: '服务异常', detail: `${down.map(monitor => monitor.name).join('、')} 不可用` }
		if (maintenance.length)
			return { level: 'maintenance', label: '维护中', detail: maintenance.map(monitor => monitor.name).join('、') }
		return { level: 'up', label: '所有服务运行正常', detail: `${monitors.length} 个监控项全部在线` }
	})

	/** 顶部指标卡 */
	const metrics = computed(() => {
		const monitors = allMonitors.value
		const uptimes = monitors
			.map(monitor => monitor.uptime)
			.filter((value): value is number => value !== null)
		const pings = monitors
			.map(monitor => monitor.ping)
			.filter((value): value is number => value !== null)
		const average = (values: number[]) =>
			values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
		const avgUptime = average(uptimes)
		const avgPing = average(pings)
		return [
			{
				label: '监控项',
				value: monitors.length ? String(monitors.length) : '—',
				tip: '状态页公开的监控项总数',
			},
			{
				label: '在线',
				value: monitors.length ? `${monitors.filter(monitor => monitor.level === 'up').length}/${monitors.length}` : '—',
				tip: '当前心跳状态为正常的监控项',
			},
			{
				label: '24h 可用率',
				value: formatUptime(avgUptime),
				tip: '所有监控项 24 小时可用率的平均值',
			},
			{
				label: '平均延迟',
				value: avgPing === null ? '—' : `${Math.round(avgPing)} ms`,
				tip: '最近一次心跳的平均响应耗时',
			},
		]
	})

	/** 自动刷新间隔：跟随状态页设置，限制在 30 秒 ~ 10 分钟 */
	const refreshInterval = computed(() => clamp((data.value?.config?.autoRefreshInterval || 60) * 1000, 30_000, 600_000))
	const refreshIntervalLabel = computed(() => {
		const seconds = Math.round(refreshInterval.value / 1000)
		return seconds >= 60 ? `${Math.round(seconds / 6) / 10} 分钟` : `${seconds} 秒`
	})

	const lastUpdatedText = computed(() => formatClock(updatedAt.value))
	const snapshotText = computed(() => formatMoment(snapshotAt.value))

	async function refresh() {
		if (refreshing.value)
			return
		refreshing.value = true
		try {
			liveSnapshot.value = await fetchAll()
			live.value = true
		}
		catch {
			// 常见原因是状态页接口未开放跨域，保留已有数据，由页面提示当前为快照
			live.value = false
		}
		finally {
			settled.value = true
			refreshing.value = false
		}
	}

	const { pause, resume } = useIntervalFn(refresh, refreshInterval, { immediate: false })
	const visibility = useDocumentVisibility()

	onMounted(() => {
		refresh()
		resume()
	})

	watch(visibility, (value) => {
		if (value === 'visible') {
			refresh()
			resume()
		}
		else {
			pause()
		}
	})

	onBeforeUnmount(pause)

	return {
		config,
		data,
		groups,
		metrics,
		overall,
		pending,
		refreshing,
		live,
		snapshotAt,
		lastUpdatedText,
		snapshotText,
		refreshIntervalLabel,
		statusPageURL,
		refresh,
	}
}

/** 时间戳转本地时分秒 */
function formatClock(timestamp: number): string {
	if (!timestamp)
		return '—'
	return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

/** 非当日快照需要带上日期，避免误读成今天的数据 */
function formatMoment(timestamp: number): string {
	if (!timestamp)
		return '—'
	const date = new Date(timestamp)
	const time = formatClock(timestamp)
	return date.toDateString() === new Date().toDateString()
		? time
		: `${date.getMonth() + 1}-${date.getDate()} ${time}`
}
