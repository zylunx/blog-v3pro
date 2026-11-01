<script setup lang="ts">
withDefaults(defineProps<{
	tag?: string
}>(), {
	tag: 'div',
})
const appConfig = useAppConfig()
const colorMode = useColorMode()
// 跟随站点实际主题切换 Logo：浅色用橙焰+深环，深色用橙焰+白环
const logoSrc = computed(() =>
	colorMode.value === 'dark' ? appConfig.header.logoDark : appConfig.header.logo,
)
</script>

<template>
<UtilLink class="blog-header">
	<div v-if="appConfig.header.emojiTail" class="emoji-tail">
		<span
			v-for="(emoji, emojiIndex) in appConfig.header.emojiTail"
			:key="emojiIndex"
			class="split-char"
			:style="getFixedDelay(emojiIndex * .6 - 3)"
			v-text="emoji"
		/>
	</div>

	<!-- 用原生 img 直出：站内相对路径若走 IPX 会生成构建期无法预热的 /_ipx 路由（静态部署 404） -->
	<img
		:src="logoSrc"
		class="blog-logo round-cobblestone"
		:class="{ circle: appConfig.header.showTitle }"
		:alt="appConfig.title"
		decoding="async"
	/>

	<div v-if="appConfig.header.showTitle" class="blog-text">
		<component :is="tag" class="header-title">
			<span
				v-for="(char, charIndex) in appConfig.title"
				:key="charIndex"
				class="split-char"
				:style="getFixedDelay((charIndex + 1) * .1)"
				v-text="char"
			/>
		</component>

		<div class="header-subtitle">
			{{ appConfig.header.subtitle }}
		</div>
	</div>
</UtilLink>
</template>

<style scoped>
.blog-header {
	contain: layout;
	display: flex;
	align-items: center;
	gap: 0.5em;
	position: relative;
	margin: clamp(1rem, 2rem, 5vh) 1rem min(1rem, 5vh);
	line-height: 1.4;
	color: var(--c-text);
	user-select: none;
}

.blog-logo {
	height: 3em;

	&.circle {
		width: 3em;
		border-radius: 50%;
		box-shadow: var(--box-shadow-1), var(--box-shadow-3);
	}
}

@font-face {
	font-family: AlimamaFangYuanTi;
	src: url("/fonts/AlimamaFangYuanTi.woff2");
}

.header-title {
	font-family: AlimamaFangYuanTi, "Noto Sans SC", sans-serif;
	font-size: 1.5em;
	font-synthesis: none;
	font-variation-settings: "wght" 600, "BEVL" 100;

	> .split-char {
		animation: 3.14s infinite alternate vf-weight, 2.72s infinite alternate vf-bevel;
		animation-delay: var(--delay);
		animation-play-state: paused;
	}
}

.header-subtitle {
	opacity: 0.5;
	font-size: 0.75em;
}

@keyframes vf-weight {
	0% { font-weight: 600; }
	38.2% { font-weight: 300; }
	100% { font-weight: 900; }
}

@keyframes vf-bevel {
	from { font-variation-settings: "BEVL" 100; }
	to { font-variation-settings: "BEVL" 1; }
}

.emoji-tail {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
	align-content: center;
	justify-items: center;
	position: absolute;
	opacity: 0.2;
	inset: 0;
	font-size: 4rem;
	transition: opacity 1s;
	filter: blur(2px);
	pointer-events: none;
	z-index: -2;

	> .split-char {
		animation: 5s infinite alternate emoji-floating;
		animation-delay: var(--delay);
		animation-play-state: paused;
	}
}

.blog-header:hover {
	.emoji-tail {
		opacity: 0.5;
	}

	.split-char {
		animation-play-state: running;
	}
}

@keyframes emoji-floating {
	50% {
		transform: translate(-12px, -4px) scale(1.2);
		filter: blur(4px);
	}

	100% {
		transform: translate(-4px, -12px) scale(0.9);
		filter: blur(1px);
	}
}
</style>
