<script setup lang="ts">
import { queryArticleIndex } from '~/utils/article'

const MAX_VISIBLE = 10

const { data: list } = await useAsyncData('tags:cloud', () => queryArticleIndex(), { default: () => [] })

const sorted = computed(() => {
	const counts = new Map<string, number>()
	for (const item of list.value)
		for (const t of item.tags ?? [])
			counts.set(t, (counts.get(t) ?? 0) + 1)

	return [...counts.entries()]
		.sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
})

const max = computed(() => Math.max(1, ...sorted.value.map(([, count]) => count)))

const expanded = ref(false)
const visibleTags = computed(() => expanded.value ? sorted.value : sorted.value.slice(0, MAX_VISIBLE))
const hiddenCount = computed(() => Math.max(0, sorted.value.length - MAX_VISIBLE))

function fontSize(count: number) {
	return `clamp(0.78rem, ${(0.78 + (count / max.value) * 0.5).toFixed(3)}rem, 1.3rem)`
}
</script>

<template>
<BlogWidget card title="标签汇总">
	<div v-if="sorted.length" class="tag-cloud">
		<UtilLink
			v-for="[name, count] in visibleTags"
			:key="name"
			:to="`/?tag=${encodeURIComponent(name)}`"
			class="tag"
			:style="{ fontSize: fontSize(count) }"
			:title="`${count} 篇文章`"
		>
			{{ name }}<sup>{{ count }}</sup>
		</UtilLink>
	</div>
	<button v-if="hiddenCount" class="toggle" type="button" @click="expanded = !expanded">
		{{ expanded ? '收起' : `更多 ${hiddenCount} 个` }}
		<Icon :name="expanded ? 'tabler:chevron-up' : 'tabler:chevron-down'" />
	</button>
	<p v-else-if="!sorted.length" class="no-tag">
		暂无标签
	</p>
</BlogWidget>
</template>

<style scoped>
.tag-cloud {
	display: flex;
	flex-wrap: wrap;
	gap: 0.35em 0.45em;
	align-items: baseline;
	padding: 0.3rem 0.2rem;
}

.tag {
	line-height: 1.4;
	color: var(--c-text-2);
	transition: color 0.2s;

	&:hover {
		color: var(--c-primary);
	}

	> sup {
		font-size: 0.55em;
		opacity: 0.6;
		margin-inline-start: 0.1em;
	}
}

.no-tag {
	padding: 1em;
	text-align: center;
	color: var(--c-text-3);
}

.toggle {
	display: inline-flex;
	align-items: center;
	gap: 0.2em;
	margin-top: 0.5rem;
	padding: 0.25em 0.6em;
	font-size: 0.82em;
	color: var(--c-text-2);
	background-color: transparent;
	border: 1px solid var(--c-bg-soft);
	border-radius: 0.6rem;
	cursor: pointer;
	transition: color 0.2s, border-color 0.2s, background-color 0.2s;

	&:hover {
		color: var(--c-primary);
		border-color: var(--c-primary);
		background-color: var(--c-bg-soft);
	}

	> :deep(.iconify) {
		font-size: 1em;
	}
}
</style>
