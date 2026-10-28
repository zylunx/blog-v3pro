/**
 * Uptime Kuma 状态页 API 类型
 * 仅声明页面用到的字段，其余字段忽略。
 * 参考：https://github.com/louislam/uptime-kuma/blob/master/server/routers/status-page-router.js
 */

/** 状态页配置 */
export interface UptimeStatusPageConfig {
	slug: string
	title: string
	description: string | null
	icon: string
	/** 状态页设置中的自动刷新间隔（秒） */
	autoRefreshInterval: number
	theme: string
	/** 是否展示证书剩余天数 */
	showCertificateExpiry: boolean
	showOnlyLastHeartbeat: boolean
}

/** 状态页中的单个监控项 */
export interface UptimeStatusPageMonitor {
	id: number
	name: string
	/** 1 表示监控项配置了推送 URL */
	sendUrl: number
	/** http / ping / port / keyword / docker / push / grpc ... */
	type: string
	/** 证书剩余天数，仅 https 监控项返回 */
	certExpiryDaysRemaining?: number | null
	validCert?: boolean | null
}

/** 监控分组 */
export interface UptimeStatusPageGroup {
	id: number
	name: string
	weight: number
	monitorList: UptimeStatusPageMonitor[]
}

/** GET /api/status-page/{slug} */
export interface UptimeStatusPageData {
	config: UptimeStatusPageConfig
	incidents: unknown[]
	publicGroupList: UptimeStatusPageGroup[]
	maintenanceList: unknown[]
}

/** 单次心跳 */
export interface UptimeHeartbeat {
	/** 0=故障 1=正常 2=等待中 3=维护中 */
	status: number
	/** 服务端本地时间字符串，形如 2026-10-28 12:07:07.190 */
	time: string
	msg: string
	ping: number | null
	important?: boolean
}

/** GET /api/status-page/heartbeat/{slug} */
export interface UptimeHeartbeatResponse {
	/** 键为监控项 ID，值为按时间升序的最多 100 条心跳 */
	heartbeatList: Record<string, UptimeHeartbeat[]>
	/** 键为 `${监控项 ID}_24`，值为 0~1 的 24 小时可用率 */
	uptimeList: Record<string, number>
}

/** 归一化后的状态等级 */
export type StatusLevel = 'up' | 'down' | 'maintenance' | 'pending' | 'unknown'

/** app.config.ts 中的 status 配置 */
export interface StatusConfig {
	/** Uptime Kuma 站点地址，末尾不要带斜杠；状态页未开放 CORS 时可改为同源反代路径 */
	baseURL: string
	/** 状态页 slug，即 /status/{slug} 中的最后一段 */
	slug: string
	/** 页面标题 */
	title: string
	/** 页面副标题 */
	description: string
}
