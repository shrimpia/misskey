/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { HttpResponse, http } from 'msw';
import { action } from 'storybook/actions';
import { file } from '../../.storybook/fakes.js';
import { commonHandlers } from '../../.storybook/mocks.js';
import ShDrawingDialog from './ShDrawingDialog.vue';
import type { StoryObj } from '@storybook/vue3';
export const Default = {
	render(args) {
		return {
			components: {
				ShDrawingDialog,
			},
			setup() {
				return {
					args,
				};
			},
			computed: {
				props() {
					return {
						...this.args,
					};
				},
				events() {
					return {
						'saved': action('saved'),
						'closed': action('closed'),
					};
				},
			},
			template: '<ShDrawingDialog v-bind="props" v-on="events" />',
		};
	},
	args: {
		folderId: null,
	},
	parameters: {
		layout: 'centered',
		msw: {
			handlers: [
				...commonHandlers,
				http.post('/api/drive/files/create', async ({ request }) => {
					action('POST /api/drive/files/create')(await request.formData());
					return HttpResponse.json(file());
				}),
			],
		},
	},
} satisfies StoryObj<typeof ShDrawingDialog>;
