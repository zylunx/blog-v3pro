<script setup lang="ts">
import type { MinimarkTree } from '@nuxt/content'
import type { LockedPayload } from '~~/modules/locked-content'

const props = defineProps<{
	lockId: string
}>()

const emit = defineEmits<{
	unlocked: [body: MinimarkTree]
}>()

const password = ref('')
const revealed = ref(false)
const loading = ref(false)
const error = ref('')
const inputEl = useTemplateRef<HTMLInputElement>('input')

/** 本次会话内记住密码，刷新页面无需重新输入 */
const storageKey = computed(() => `locked:${props.lockId}`)

function base64ToBytes(value: string) {
	return Uint8Array.from(atob(value), char => char.charCodeAt(0))
}

/**
 * 用密码派生密钥解开正文。密码本身不参与任何网络请求，
 * 解密失败（GCM 认证标签不匹配）即视为密码错误。
 */
async function decrypt(secret: string) {
	if (!globalThis.crypto?.subtle)
		throw new Error('unsupported')

	let payload: LockedPayload
	try {
		const response = await fetch(`/_locked/${props.lockId}.json`)
		if (!response.ok)
			throw new Error('missing')
		payload = await response.json()
	}
	catch {
		throw new Error('missing')
	}

	const baseKey = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		'PBKDF2',
		false,
		['deriveKey'],
	)
	const key = await crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: base64ToBytes(payload.salt), iterations: payload.iter, hash: 'SHA-256' },
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['decrypt'],
	)

	try {
		const plain = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
			key,
			base64ToBytes(payload.data),
		)
		return JSON.parse(new TextDecoder().decode(plain)) as MinimarkTree
	}
	catch {
		throw new Error('wrong-password')
	}
}

async function submit(secret = password.value) {
	if (!secret || loading.value)
		return

	loading.value = true
	error.value = ''
	try {
		const body = await decrypt(secret)
		sessionStorage.setItem(storageKey.value, secret)
		emit('unlocked', body)
	}
	catch (e) {
		const reason = (e as Error).message
		if (reason === 'missing')
			error.value = '未找到密文文件，请确认文章已重新构建。'
		else if (reason === 'unsupported')
			error.value = '当前环境不支持本地解密，请使用 HTTPS 或 localhost 访问。'
		else
			error.value = '密码不正确，请重试。'
		password.value = ''
		inputEl.value?.focus()
	}
	finally {
		loading.value = false
	}
}

onMounted(() => {
	const cached = sessionStorage.getItem(storageKey.value)
	if (cached)
		submit(cached)
	else
		inputEl.value?.focus()
})
</script>

<template>
<section class="post-locked">
	<Icon class="lock-icon" name="tabler:lock-square-rounded" />
	<h2 class="lock-title">
		本文已加密
	</h2>
	<p class="lock-desc">
		内容在构建时已加密，仅在此浏览器内用密码解开，密码不会被发送到任何服务器。
	</p>

	<form class="lock-form" @submit.prevent="submit()">
		<label class="lock-field">
			<Icon name="tabler:key" />
			<input
				ref="input"
				v-model="password"
				:type="revealed ? 'text' : 'password'"
				placeholder="请输入文章密码"
				autocomplete="current-password"
				:disabled="loading"
			>
			<button
				type="button"
				class="lock-reveal"
				:aria-label="revealed ? '隐藏密码' : '显示密码'"
				@click="revealed = !revealed"
			>
				<Icon :name="revealed ? 'tabler:eye-off' : 'tabler:eye'" />
			</button>
		</label>

		<button class="lock-submit" type="submit" :disabled="loading || !password">
			<Icon :name="loading ? 'tabler:loader-2' : 'tabler:lock-open'" :class="{ spinning: loading }" />
			{{ loading ? '解密中' : '解锁' }}
		</button>
	</form>

	<p v-if="error" class="lock-error">
		<Icon name="tabler:alert-circle" />
		{{ error }}
	</p>
</section>
</template>

<style scoped>
.post-locked {
	margin: 2rem 0;
	padding: 2.5rem 1.5rem;
	border: 1px dashed var(--c-border);
	border-radius: 0.8em;
	background-color: var(--c-bg-1);
	text-align: center;

	.lock-icon {
		font-size: 2.5rem;
		color: var(--c-text-3);
	}

	.lock-title {
		margin: 0.5em 0 0.3em;
		font-size: 1.15em;
	}

	.lock-desc {
		max-width: 26em;
		margin: 0 auto;
		font-size: 0.85em;
		line-height: 1.7;
		color: var(--c-text-2);
	}

	.lock-form {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5em;
		margin-top: 1.5em;
	}

	.lock-field {
		display: flex;
		align-items: center;
		gap: 0.4em;
		padding: 0 0.6em;
		border: 1px solid var(--c-border);
		border-radius: 0.5em;
		background-color: var(--c-bg);
		transition: border-color 0.2s;

		&:focus-within {
			border-color: var(--c-primary);
		}

		> :deep(svg) {
			color: var(--c-text-3);
		}

		input {
			width: 12em;
			padding: 0.55em 0;
			border: none;
			outline: none;
			background: transparent;
			font-family: inherit;
			color: var(--c-text);
		}

		.lock-reveal {
			display: flex;
			padding: 0;
			border: none;
			background: none;
			color: var(--c-text-3);
			cursor: pointer;

			&:hover {
				color: var(--c-text-1);
			}
		}
	}

	.lock-submit {
		display: flex;
		align-items: center;
		gap: 0.3em;
		padding: 0.55em 1.1em;
		border: none;
		border-radius: 0.5em;
		background-color: var(--c-primary);
		font-family: inherit;
		color: #FFF;
		transition: opacity 0.2s;
		cursor: pointer;

		&:disabled {
			opacity: 0.55;
			cursor: not-allowed;
		}
	}

	.lock-error {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3em;
		margin: 1em 0 0;
		font-size: 0.85em;
		color: var(--c-error);
	}

	.spinning {
		animation: spin 1s linear infinite;
	}
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
