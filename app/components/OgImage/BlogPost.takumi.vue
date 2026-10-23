<script setup lang="ts">
/**
 * 文章分享卡片：深色底 + 分类色点缀，风格对齐站点 `Ember` 主题。
 * Takumi 渲染器不支持 Tailwind，所有样式必须是内联。
 */
withDefaults(defineProps<{
	title?: string
	description?: string
	category?: string
	author?: string
	date?: string
	accent?: string
	site?: string
}>(), {
	title: '未命名文章',
	category: '未分类',
	author: '',
	date: '',
	accent: '#3B82F6',
	site: 'Ember',
})
</script>

<template>
	<div
		style="display: flex; flex-direction: column; justify-content: space-between; width: 1200px; height: 600px; padding: 64px 72px; background-color: #0B0B0F; position: relative; overflow: hidden; font-family: 'Inter', 'Noto Serif SC', sans-serif;"
	>
		<!-- 右上角分类色光晕 -->
		<div
			:style="{
				position: 'absolute',
				top: '-160px',
				right: '-120px',
				width: '520px',
				height: '520px',
				borderRadius: '50%',
				backgroundColor: accent,
				opacity: 0.22,
				filter: 'blur(8px)',
			}"
		/>

		<!-- 顶栏：分类标签 + 站点名 -->
		<div style="display: flex; align-items: center; justify-content: space-between;">
			<div
				:style="{
					display: 'flex',
					alignItems: 'center',
					padding: '10px 26px',
					borderRadius: '999px',
					backgroundColor: accent,
					color: '#FFFFFF',
					fontSize: '26px',
					fontWeight: 600,
					letterSpacing: '0.02em',
				}"
			>
				{{ category }}
			</div>
			<div style="display: flex; alignItems: center; gap: 12px; color: #9CA3AF; fontSize: 26px; font-weight: 500;">
				<span style="display: flex; alignItems: center;">{{ site }}</span>
			</div>
		</div>

		<!-- 主标题 -->
		<div style="display: flex; flex-direction: column; gap: 24px; padding-right: 80px;">
			<div
				:style="{
					fontSize: title.length > 28 ? '60px' : '74px',
					fontWeight: 800,
					lineHeight: 1.18,
					letterSpacing: '-0.02em',
					color: '#F9FAFB',
					display: 'flex',
				}"
			>
				{{ title }}
			</div>
			<div
				v-if="description"
				:style="{
					fontSize: '28px',
					lineHeight: 1.5,
					color: '#9CA3AF',
					display: 'flex',
					overflow: 'hidden',
					maxHeight: '84px',
				}"
			>
				{{ description }}
			</div>
		</div>

		<!-- 底栏：作者 + 日期 + 品牌线 -->
		<div style="display: flex; align-items: center; justify-content: space-between;">
			<div style="display: flex; align-items: center; gap: 18px; color: #D1D5DB; font-size: 26px;">
				<span style="display: flex; align-items: center; font-weight: 600; color: #F3F4F6;">{{ author }}</span>
				<span v-if="date" style="display: flex; align-items: center; color: #6B7280;">{{ date }}</span>
			</div>
			<div
				:style="{
					width: '96px',
					height: '6px',
					borderRadius: '999px',
					backgroundColor: accent,
				}"
			/>
		</div>
	</div>
</template>
