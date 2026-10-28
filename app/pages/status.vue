<script setup lang="ts">
const {
	config,
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
} = useStatus()

useSeoMeta({
	title: () => config.title,
	description: () => config.description,
})
</script>

<template>
<BlogHeader class="hide-above-mobile" to="/" tag="h1" />

<div class="status-page proper-height">
	<header class="hero">
		<div class="hero-text">
			<p class="eyebrow">
				<span class="eyebrow-dot" />LIVE · UPTIME KUMA
			</p>
			<h1>{{ config.title }}</h1>
			<p class="sub">
				{{ config.description }}
			</p>
		</div>

		<div class="hero-state" :class="`level-${overall.level}`">
			<span class="state-dot" />
			<strong>{{ overall.label }}</strong>
			<span class="state-detail">{{ overall.detail }}</span>
		</div>
	</header>

	<dl v-if="groups.length" class="metrics">
		<div v-for="metric in metrics" :key="metric.label" :title="metric.tip">
			<dt>{{ metric.label }}</dt>
			<dd>{{ metric.value }}</dd>
		</div>
	</dl>

	<div class="toolbar">
		<span class="live" :class="live ? '' : snapshotAt ? 'warn' : 'off'">
			<i />{{ live ? '实时' : snapshotAt ? '快照' : '离线' }}
		</span>
		<span v-if="live" class="toolbar-text">
			最后更新 <b>{{ lastUpdatedText }}</b> · 每 {{ refreshIntervalLabel }}自动刷新
		</span>
		<span v-else-if="snapshotAt" class="toolbar-text">
			页面为构建时快照（<b>{{ snapshotText }}</b>），实时接口暂不可达
		</span>
		<span v-else class="toolbar-text">
			实时接口暂不可达，正在重试
		</span>
		<button type="button" class="refresh" :disabled="refreshing" @click="refresh">
			<Icon name="tabler:refresh" :class="{ spinning: refreshing }" />
			{{ refreshing ? '刷新中' : '刷新' }}
		</button>
	</div>

	<div v-if="pending" class="loading card">
		<div v-for="i in 4" :key="i" class="skeleton-row">
			<span class="skeleton" style="width: 28%" />
			<span class="skeleton" style="width: 100%" />
		</div>
	</div>

	<section v-else-if="!groups.length" class="fallback card">
		<Icon name="tabler:plug-connected-x" class="fallback-icon" />
		<h2>状态数据暂时无法获取</h2>
		<p>
			状态页接口没有响应。常见原因是接口未开放跨域访问，或 Uptime Kuma 正在重启。
		</p>
		<div class="fallback-actions">
			<button type="button" @click="refresh">
				重新获取
			</button>
			<a :href="statusPageURL" target="_blank" rel="noopener">
				打开状态页<Icon name="tabler:external-link" />
			</a>
		</div>
	</section>

	<template v-else>
		<section v-for="group in groups" :key="group.id" class="group card">
			<header class="group-head">
				<h2>{{ group.name }}</h2>
				<span class="group-count">
					<b>{{ group.upCount }}</b>/{{ group.monitors.length }} 正常
				</span>
			</header>

			<ul class="monitors">
				<li v-for="monitor in group.monitors" :key="monitor.id" class="monitor">
					<div class="monitor-head">
						<span class="dot" :class="`level-${monitor.level}`" />
						<Icon :name="monitor.icon" class="type-icon" />
						<span class="monitor-name">{{ monitor.name }}</span>
						<span class="monitor-state" :class="`level-${monitor.level}`">{{ monitor.label }}</span>
						<span class="monitor-stats">
							<span
								class="stat uptime"
								:class="{ warn: monitor.uptime !== null && monitor.uptime < 0.99 }"
								:title="`24 小时可用率 ${monitor.uptimeText}`"
							>
								{{ monitor.uptimeText }}
							</span>
							<span class="stat ping" title="最近一次心跳延迟">
								{{ monitor.ping === null ? '—' : `${monitor.ping} ms` }}
							</span>
							<span
								v-if="monitor.certDays !== null"
								class="stat cert"
								:class="{ warn: monitor.certDays <= 14 }"
								title="TLS 证书剩余天数"
							>
								TLS {{ Math.max(monitor.certDays, 0) }}d
							</span>
						</span>
					</div>

					<div v-if="monitor.beats.length" class="beats">
						<span
							v-for="(beat, index) in monitor.beats"
							:key="index"
							class="beat"
							:class="`level-${beat.level}`"
							:title="beat.tip"
						/>
					</div>
					<p v-else class="beats-empty">
						暂无心跳数据
					</p>
				</li>
			</ul>
		</section>
	</template>

	<p class="footnote">
		数据来自 <a href="https://uptime.kuma.pet" target="_blank" rel="noopener">Uptime Kuma</a> ·
		<a :href="statusPageURL" target="_blank" rel="noopener">原始状态页<Icon name="tabler:arrow-up-right" /></a>
	</p>
</div>
</template>

<style scoped>
/* 状态等级配色，供徽标、圆点与心跳格子共用 */
.level-up {
	--level-color: var(--c-success);
	--level-bg: var(--c-success-soft);
}

.level-down {
	--level-color: var(--c-error);
	--level-bg: var(--c-error-soft);
}

.level-maintenance {
	--level-color: var(--c-warning);
	--level-bg: var(--c-warning-soft);
}

.level-pending,
.level-unknown {
	--level-color: var(--c-text-3);
	--level-bg: var(--c-bg-2);
}

.status-page {
	max-width: 860px;
	margin: 0 auto;
	padding: 0 1rem 3rem;
	isolation: isolate;
}

/* 顶部标题区 */
.hero {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: end;
	gap: 1rem 1.5rem;
	position: relative;
	padding: clamp(1.2rem, 3vw, 2rem) 0 1rem;

	@media (max-width: 720px) {
		grid-template-columns: minmax(0, 1fr);

		> .hero-state {
			justify-self: start;
		}
	}

	/* 科技感网格底纹，仅出现在标题上方 */
	&::before {
		content: "";
		position: absolute;
		opacity: 0.5;
		inset: 0 -1rem auto;
		height: 9rem;
		background-image:
			linear-gradient(var(--c-border) 1px, transparent 1px),
			linear-gradient(90deg, var(--c-border) 1px, transparent 1px);
		background-size: 26px 26px;
		mask-image: radial-gradient(120% 100% at 12% 0%, #000 18%, transparent 72%);
		pointer-events: none;
		z-index: -1;
	}

	> .hero-text > h1 {
		font-size: clamp(1.5rem, 4vw, 1.9rem);
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--c-text);
	}

	> .hero-text > .sub {
		max-width: 40em;
		margin-top: 0.4em;
		font-size: 0.9rem;
		line-height: 1.65;
		color: var(--c-text-2);
	}
}

.eyebrow {
	display: inline-flex;
	align-items: center;
	gap: 0.5em;
	margin-bottom: 0.6em;
	font-family: var(--font-monospace);
	font-size: 0.7rem;
	letter-spacing: 0.2em;
	color: var(--c-primary);

	> .eyebrow-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-primary) 55%, transparent);
		background-color: var(--c-primary);
		animation: status-pulse 2.2s ease-out infinite;
	}
}

/* 总览状态徽标 */
.hero-state {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-self: end;
	gap: 0.45em;
	max-width: 20em;
	padding: 0.5em 0.9em;
	border: 1px solid color-mix(in srgb, var(--level-color) 45%, var(--c-border));
	border-radius: 0.7em;
	background-color: color-mix(in srgb, var(--level-color) 8%, var(--ld-bg-card));
	font-size: 0.82rem;

	> .state-dot {
		width: 0.5em;
		height: 0.5em;
		border-radius: 50%;
		box-shadow: 0 0 8px var(--level-color);
		background-color: var(--level-color);
	}

	> strong {
		font-weight: 600;
		color: var(--level-color);
	}

	> .state-detail {
		flex-basis: 100%;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--c-text-3);
	}
}

/* 指标卡 */
.metrics {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.6rem;
	margin: 0.4rem 0 1rem;

	> div {
		position: relative;
		overflow: hidden;
		padding: 0.7em 0.8em;
		border: 1px solid var(--c-border);
		border-radius: 0.6em;
		background-color: var(--c-bg-1);

		&::before {
			content: "";
			position: absolute;
			opacity: 0.55;
			inset: 0 0 auto;
			height: 1px;
			background-image: linear-gradient(90deg, var(--c-primary), transparent 70%);
		}

		> dt {
			font-size: 0.75rem;
			color: var(--c-text-3);
		}

		> dd {
			margin: 0.3em 0 0;
			font-family: var(--font-monospace);
			font-size: 1.1rem;
			font-weight: 700;
			font-variant-numeric: tabular-nums;
			color: var(--c-text);
		}
	}

	@media (max-width: 640px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

/* 刷新信息条 */
.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.6em 0.8em;
	margin-bottom: 1rem;
	padding: 0.45em 0.7em;
	border: 1px dashed var(--c-border);
	border-radius: 0.6em;
	font-size: 0.78rem;
	color: var(--c-text-3);

	> .live {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.1em 0.55em;
		border-radius: 999px;
		background-color: var(--c-success-soft);
		font-family: var(--font-monospace);
		letter-spacing: 0.08em;
		color: var(--c-success);

		> i {
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background-color: currentColor;
			animation: status-blink 1.8s ease-in-out infinite;
		}

		&.warn {
			background-color: var(--c-warning-soft);
			color: var(--c-warning);
		}

		&.off {
			background-color: var(--c-error-soft);
			color: var(--c-error);
		}
	}

	> .toolbar-text > b {
		font-family: var(--font-monospace);
		font-weight: 500;
		color: var(--c-text-2);
	}

	> .refresh {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		margin-left: auto;
		padding: 0.25em 0.7em;
		border: 1px solid var(--c-border);
		border-radius: 0.5em;
		font-size: 0.78rem;
		color: var(--c-text-2);
		transition: color 0.2s, border-color 0.2s, background-color 0.2s;

		&:hover:not(:disabled) {
			border-color: var(--c-primary);
			background-color: var(--c-primary-soft);
			color: var(--c-primary);
		}

		&:disabled {
			opacity: 0.6;
			cursor: progress;
		}

		> .spinning {
			animation: status-spin 0.9s linear infinite;
		}
	}
}

/* 监控分组 */
.group {
	margin-bottom: 1rem;
	padding: 0.9em 1em 0.5em;
	border: 1px solid var(--c-border);
	border-radius: 0.8em;
	background-color: var(--ld-bg-card);
	transition: border-color 0.2s, box-shadow 0.2s;

	&:hover {
		border-color: color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
		box-shadow: var(--box-shadow-2);
	}
}

.group-head {
	display: flex;
	align-items: center;
	gap: 0.6em;
	padding-bottom: 0.55em;
	border-bottom: 1px solid var(--c-border);

	> h2 {
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--c-text);
	}

	> .group-count {
		margin-left: auto;
		font-family: var(--font-monospace);
		font-size: 0.76rem;
		color: var(--c-text-3);

		> b {
			color: var(--c-text-2);
		}
	}
}

.monitors {
	display: flex;
	flex-direction: column;
}

.monitor {
	padding: 0.7em 0 0.5em;
	border-bottom: 1px dashed var(--c-border);

	&:last-child {
		padding-bottom: 0.3em;
		border-bottom: none;
	}
}

.monitor-head {
	display: flex;
	align-items: center;
	gap: 0.5em;
	min-width: 0;

	> .dot {
		flex: none;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		box-shadow:
			0 0 0 3px color-mix(in srgb, var(--level-color) 16%, transparent),
			0 0 8px color-mix(in srgb, var(--level-color) 45%, transparent);
		background-color: var(--level-color);
	}

	> .type-icon {
		flex: none;
		font-size: 1em;
		color: var(--c-text-3);
	}

	> .monitor-name {
		overflow: hidden;
		font-size: 0.9rem;
		font-weight: 500;
		white-space: nowrap;
		text-overflow: ellipsis;
		color: var(--c-text-1);
	}

	> .monitor-state {
		flex: none;
		padding: 0 0.5em;
		border-radius: 999px;
		background-color: var(--level-bg);
		font-size: 0.72rem;
		line-height: 1.75;
		color: var(--level-color);
	}

	> .monitor-stats {
		display: inline-flex;
		align-items: center;
		gap: 0.7em;
		margin-left: auto;
		font-family: var(--font-monospace);
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		color: var(--c-text-2);

		> .uptime {
			min-width: 4.2em;
			text-align: right;

			&.warn {
				color: var(--c-warning);
			}
		}

		> .ping {
			min-width: 4em;
			text-align: right;
			color: var(--c-text-3);
		}

		> .cert {
			color: var(--c-text-3);

			&.warn {
				color: var(--c-warning);
			}
		}
	}

	@media (max-width: 560px) {
		flex-wrap: wrap;

		> .monitor-stats {
			flex-basis: 100%;
			margin-left: 1rem;
		}
	}
}

/* 心跳格子 */
.beats {
	display: flex;
	justify-content: space-between;
	gap: 2px;
	height: 20px;
	margin-top: 0.55em;

	> .beat {
		flex: 1 1 0;
		opacity: 0.88;
		max-width: 10px;
		border-radius: 1px;
		background-color: var(--level-color);
		background-image: linear-gradient(180deg, rgb(255 255 255 / 22%), transparent);
		transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;

		&:hover {
			opacity: 1;
			box-shadow: 0 0 6px var(--level-color);
			transform: scaleY(1.15);
		}
	}
}

.beats-empty {
	margin-top: 0.55em;
	font-family: var(--font-monospace);
	font-size: 0.75rem;
	color: var(--c-text-3);
}

/* 骨架屏 */
.loading {
	display: flex;
	flex-direction: column;
	gap: 1.1rem;
	padding: 1.2em;
	border: 1px solid var(--c-border);

	> .skeleton-row {
		display: flex;
		flex-direction: column;
		gap: 0.55em;

		> .skeleton {
			display: block;
			height: 0.8em;
			border-radius: 0.3em;
			background-image: linear-gradient(90deg, var(--c-bg-2) 25%, var(--c-bg-3) 37%, var(--c-bg-2) 63%);
			background-size: 400% 100%;
			animation: status-shimmer 1.5s ease infinite;
		}
	}
}

/* 接口异常兜底 */
.fallback {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.6em;
	padding: 2.5em 1.5em;
	border: 1px solid var(--c-border);
	text-align: center;

	> .fallback-icon {
		font-size: 2rem;
		color: var(--c-text-3);
	}

	> h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--c-text);
	}

	> p {
		max-width: 32em;
		font-size: 0.85rem;
		line-height: 1.65;
		color: var(--c-text-3);
	}
}

.fallback-actions {
	display: flex;
	gap: 0.6em;
	margin-top: 0.4em;

	> button,
	> a {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		padding: 0.35em 0.9em;
		border: 1px solid var(--c-border);
		border-radius: 0.5em;
		font-size: 0.82rem;
		color: var(--c-text-2);
		transition: color 0.2s, border-color 0.2s, background-color 0.2s;
	}

	> button {
		border-color: transparent;
		background-color: var(--c-primary-soft);
		color: var(--c-primary);
	}

	> button:hover,
	> a:hover {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}
}

.footnote {
	margin-top: 1.4em;
	font-size: 0.78rem;
	text-align: center;
	color: var(--c-text-3);

	> a {
		display: inline-flex;
		align-items: center;
		gap: 0.15em;
		color: var(--c-primary);

		&:hover {
			text-decoration: underline;
		}
	}
}

@keyframes status-pulse {
	0% {
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-primary) 55%, transparent);
	}

	70% {
		box-shadow: 0 0 0 7px transparent;
	}

	100% {
		box-shadow: 0 0 0 0 transparent;
	}
}

@keyframes status-blink {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0.25;
	}
}

@keyframes status-spin {
	to {
		transform: rotate(360deg);
	}
}

@keyframes status-shimmer {
	from {
		background-position: 100% 0;
	}

	to {
		background-position: 0 0;
	}
}
</style>
