<script setup lang="ts">
import type { MediaCategoryConfig, MediaEntry, MediaTypeConfig } from '~/types/media'

const props = defineProps<{
	entry: MediaEntry
}>()

const appConfig = useAppConfig()
const { display } = appConfig.media

const typeConfig = computed(() => (appConfig.media.types as Record<string, MediaTypeConfig>)[props.entry.type])
const statusConfig = computed(() => (appConfig.media.categories as Record<string, MediaCategoryConfig>)[props.entry.status])
</script>

<template>
<component
	:is="entry.link ? 'a' : 'div'"
	class="media-row"
	:data-list-key="entry.title"
	:style="{ '--media-color': typeConfig?.color }"
	:href="entry.link || undefined"
	:target="entry.link ? '_blank' : undefined"
	:rel="entry.link ? 'noopener' : undefined"
	:title="entry.comment || undefined"
>
	<span class="media-row-cover">
		<img
			v-if="entry.cover && display.showCover"
			:src="entry.cover"
			:alt="entry.title"
			loading="lazy"
		>
		<Icon v-else :name="typeConfig?.icon || 'tabler:photo'" />
	</span>

	<span class="media-row-main">
		<span class="media-row-title">{{ entry.title }}</span>
		<span class="media-row-meta">
			<span v-if="statusConfig" class="media-row-status">
				<Icon :name="statusConfig.icon" />{{ statusConfig.name }}
			</span>
			<span v-if="entry.original">{{ entry.original }}</span>
			<span v-if="entry.year">{{ entry.year }}</span>
			<span v-if="entry.progress && display.showProgress">{{ entry.progress }}</span>
		</span>
	</span>

	<span v-if="entry.score && display.showRating" class="media-row-score">
		<Icon name="tabler:star-filled" />{{ entry.score }}
	</span>

	<Icon v-if="entry.link" class="external-tip" name="tabler:arrow-up-right" />
</component>
</template>

<style scoped>
.media-row {
	display: flex;
	align-items: center;
	gap: 0.8em;
	padding: 0.5em 0.8em;
	border-radius: 0.8em;
	background-color: var(--c-bg-2);
	color: var(--c-text-2);
	transition: all 0.2s;

	&:hover {
		background-color: var(--c-bg-soft);
		color: var(--c-text);
	}
}

.media-row-cover {
	display: grid;
	flex-shrink: 0;
	place-items: center;
	overflow: hidden;
	width: 2.5em;
	height: 2.5em;
	border-radius: 0.5em;
	background-color: var(--c-bg-soft);
	font-size: 1.2em;
	color: var(--media-color, var(--c-primary));

	> img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.media-row-main {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	gap: 0.2em;
	min-width: 0;
}

.media-row-title {
	overflow: hidden;
	font-size: 0.95em;
	font-weight: 500;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text);
}

.media-row-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.2em 0.8em;
	font-size: 0.8em;
}

.media-row-status {
	display: inline-flex;
	align-items: center;
	gap: 0.2em;
	color: var(--media-color, var(--c-primary));
}

.media-row-score {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: 0.2em;
	font-variant-numeric: tabular-nums;
}

.external-tip {
	flex-shrink: 0;
	opacity: 0.5;
	font-size: 1em;
}
</style>
