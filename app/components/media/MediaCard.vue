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
<article
	class="media-card"
	:data-list-key="entry.title"
	:style="{ '--media-color': typeConfig?.color }"
>
	<component
		:is="entry.link ? 'a' : 'div'"
		class="media-cover"
		:href="entry.link || undefined"
		:target="entry.link ? '_blank' : undefined"
		:rel="entry.link ? 'noopener' : undefined"
	>
		<img
			v-if="entry.cover && display.showCover"
			class="media-cover-img"
			:src="entry.cover"
			:alt="entry.title"
			loading="lazy"
		>
		<span v-else class="media-cover-fallback">
			<Icon :name="typeConfig?.icon || 'tabler:photo'" />
		</span>
		<span v-if="entry.score && display.showRating" class="media-score">
			<Icon name="tabler:star-filled" />{{ entry.score }}
		</span>
		<span v-if="entry.progress && display.showProgress" class="media-ep">
			{{ entry.progress }}
		</span>
	</component>

	<h3 class="media-title" :title="entry.original || undefined">
		{{ entry.title }}
	</h3>

	<p class="media-meta">
		<span v-if="statusConfig" class="media-status">
			<Icon :name="statusConfig.icon" />{{ statusConfig.name }}
		</span>
		<span v-if="entry.year">{{ entry.year }}</span>
	</p>
</article>
</template>

<style scoped>
.media-card {
	display: flex;
	flex-direction: column;
	gap: 0.4em;
	min-width: 0;
}

.media-cover {
	display: block;
	position: relative;
	overflow: hidden;
	aspect-ratio: 3 / 4;
	border-radius: 0.5em;
	background-color: var(--c-bg-2);
	transition: transform 0.2s;

	&:hover {
		transform: translateY(-2px);
	}
}

.media-cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.media-cover-fallback {
	display: grid;
	place-items: center;
	width: 100%;
	height: 100%;
	font-size: 2em;
	color: var(--c-text-3);
}

.media-score {
	display: inline-flex;
	align-items: center;
	gap: 0.2em;
	position: absolute;
	inset-block-start: 0.3em;
	inset-inline-end: 0.3em;
	padding: 0.1em 0.4em;
	border-radius: 1em;
	background-color: var(--ld-bg-blur);
	backdrop-filter: blur(0.5rem);
	font-size: 0.8em;
	color: var(--media-color, var(--c-primary));
	font-variant-numeric: tabular-nums;
}

.media-ep {
	position: absolute;
	inset-block-end: 0.3em;
	inset-inline-start: 0.3em;
	padding: 0.1em 0.4em;
	border-radius: 1em;
	background-color: var(--ld-bg-blur);
	backdrop-filter: blur(0.5rem);
	font-size: 0.75em;
	color: var(--c-text-2);
	font-variant-numeric: tabular-nums;
}

.media-title {
	display: -webkit-box;
	overflow: hidden;
	font-size: 0.95em;
	font-weight: 500;
	-webkit-line-clamp: 2;
	line-height: 1.4;
	-webkit-box-orient: vertical;
}

.media-meta {
	display: flex;
	align-items: center;
	gap: 0.5em;
	font-size: 0.8em;
	color: var(--c-text-2);
}

.media-status {
	display: inline-flex;
	align-items: center;
	gap: 0.2em;
	color: var(--media-color, var(--c-primary));
}
</style>
