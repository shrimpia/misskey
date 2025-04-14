import type { Directive } from 'vue';
import { prefer } from '@/preferences.js';

const onInput = (arg: Event | HTMLTextAreaElement) => {
	const el = 'target' in arg ? (arg.target as HTMLTextAreaElement) : arg;
	// 先にautoをしておかないと、縮まってくれない
	el.style.height = 'auto';
	el.style.height = `${el.scrollHeight}px`;
};

export default {
	mounted(el: HTMLTextAreaElement) {
		if (!prefer.s['ebisskey.useTextAreaAutoSize']) return;
		onInput(el);
		el.addEventListener('input', onInput);
		el.style.resize = 'none';
		el.style.overflow = 'hidden';
	},
	unmounted(el: HTMLTextAreaElement) {
		el.removeEventListener('input', onInput);
	},
} as Directive;
