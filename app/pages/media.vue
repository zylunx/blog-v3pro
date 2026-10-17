<script setup lang="ts">
const appConfig = useAppConfig()
const { entries, types, categories, typeCounts, statusCounts } = useMedia()

useSeoMeta({
	title: '娱乐',
	description: `${appConfig.title}的个人媒体库，记录看过的动漫、电影、剧集与读过的小说。`,
})

/** 筛选条件与显示方式均绑定 URL 查询，水合时沿用服务端结果 */
const type = useHydratedQuery('type', useRouteQuery('type', undefined))
const status = useHydratedQuery('status', useRouteQuery('status', undefined))
const mode = useHydratedQuery('mode', useRouteQuery('mode', appConfig.media.display.mode))

const listFiltered = computed(() => entries.value.filter(
	entry => (!type.value || entry.type === type.value)
		&& (!status.value || entry.status === status.value),
))

const { page, totalPages, listPaged } = usePagination(listFiltered, {
	bindQuery: 'page',
	perPage: appConfig.media.display.perPage,
})

const stats = computed(() => [
	{ label: '收录', value: entries.value.length },
	...Object.entries(categories).map(([key, config]) => ({
		label: config.name,
		value: statusCounts.value[key] ?? 0,
	})),
])
</script>

<template>
<div class="media-page proper-height">
	<header class="media-header">
		<h1>娱乐</h1>
		<p class="media-desc">
			记录看过的动漫、电影、剧集与读过的小说，数据由 media.yaml 驱动。
		</p>
		<ZDlGroup size="small" :items="stats" />
	</header>

	<div class="media-toolbar">
		<div class="media-filter">
			<button :class="{ active: !type }" @click="type = undefined">
				全部
			</button>
			<button
				v-for="config, key in types"
				:key="key"
				:class="{ active: type === key }"
				:style="{ '--media-color': config.color }"
				@click="type = key"
			>
				<Icon :name="config.icon" />
				{{ config.name }}
				<span class="filter-count">{{ typeCounts[key] ?? 0 }}</span>
			</button>
		</div>

		<div class="media-filter">
			<button :class="{ active: !status }" @click="status = undefined">
				全部
			</button>
			<button
				v-for="config, key in categories"
				:key="key"
				:class="{ active: status === key }"
				@click="status = key"
			>
				<Icon :name="config.icon" />
				{{ config.name }}
				<span class="filter-count">{{ statusCounts[key] ?? 0 }}</span>
			</button>
		</div>

		<ZRadioGroup
			v-model="mode"
			:items="[
				{ label: '海报墙', value: 'poster' },
				{ label: '列表', value: 'list' },
			]"
		/>
	</div>

	<UtilListTransition v-slot="{ items }" :items="listPaged" :state="`${type}-${status}-${mode}`">
		<p v-if="!items.length" class="media-empty">
			该筛选条件下暂无内容
		</p>
		<div v-else-if="mode === 'list'" class="media-grid is-list">
			<MediaListRow v-for="entry in items" :key="entry.title" :entry />
		</div>
		<div v-else class="media-grid is-poster">
			<MediaCard v-for="entry in items" :key="entry.title" :entry />
		</div>
	</UtilListTransition>

	<ZPagination v-model="page" sticky avoid :total-pages="totalPages" />
</div>
</template>

<style scoped>
.media-page {
	padding: 1rem;
}

.media-header {
	margin-bottom: 1.5rem;

	> h1 {
		font-size: 1.5em;
		font-weight: 500;
	}

	> .media-desc {
		margin: 0.3em 0 0.8em;
		font-size: 0.9em;
		color: var(--c-text-2);
	}
}

.media-toolbar {
	display: flex;
	flex-direction: column;
	gap: 0.8em;
	margin-bottom: 1.5rem;
}

.media-filter {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.4em;

	> button {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		padding: 0.25em 0.7em;
		border-radius: 1em;
		background-color: var(--c-bg-2);
		font-size: 0.85em;
		color: var(--c-text-2);
		transition: all 0.2s;

		&:hover {
			background-color: var(--c-bg-soft);
			color: var(--c-text);
		}

		&.active {
			box-shadow: var(--box-shadow-1);
			background-color: var(--ld-bg-card);
			color: var(--media-color, var(--c-primary));
		}

		> .filter-count {
			opacity: 0.6;
			font-size: 0.9em;
			font-variant-numeric: tabular-nums;
		}
	}
}

.media-grid.is-poster {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 1rem;
}

.media-grid.is-list {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.media-empty {
	padding: 3em 0;
	text-align: center;
	color: var(--c-text-3);
}
</style>
