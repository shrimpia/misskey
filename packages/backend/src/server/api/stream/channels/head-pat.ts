/*
 * SPDX-FileCopyrightText: Ebise Lutica and GitHub Contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// #region shrimpia なでなで機能（他人のなでなでをリアルタイム配信するストリーム）
import { Inject, Injectable, Scope } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { isJsonObject } from '@/misc/json-value.js';
import type { GlobalEvents } from '@/core/GlobalEventService.js';
import type { JsonObject, JsonValue } from '@/misc/json-value.js';
import Channel, { type ChannelRequest } from '../channel.js';
import { REQUEST } from '@nestjs/core';

// スパム抑止: 1接続あたり、直近 RATE_WINDOW_MS の間に RATE_LIMIT 回までしか配信を受け付けない
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 1000;

@Injectable({ scope: Scope.TRANSIENT })
export class HeadPatChannel extends Channel {
	public readonly chName = 'headPat';
	public static shouldShare = true;
	public static requireCredential = false as const;

	private patTimestamps: number[] = [];

	constructor(
		private globalEventService: GlobalEventService,

		@Inject(REQUEST)
		request: ChannelRequest,
	) {
		super(request);
	}

	@bindThis
	public async init(params: JsonObject) {
		this.subscriber.on('headPatStream', this.onEvent);
	}

	@bindThis
	private onEvent(data: GlobalEvents['headPat']['payload']) {
		this.send(data);
	}

	@bindThis
	public onMessage(type: string, body: JsonValue) {
		switch (type) {
			case 'pat': {
				if (!isJsonObject(body)) return;
				const { noteId, clientId } = body;
				if (typeof noteId !== 'string' || typeof clientId !== 'string') return;

				// レート制限
				const now = Date.now();
				this.patTimestamps = this.patTimestamps.filter(t => now - t < RATE_WINDOW_MS);
				if (this.patTimestamps.length >= RATE_LIMIT) return;
				this.patTimestamps.push(now);

				this.globalEventService.publishHeadPatStream(noteId, clientId);
				break;
			}
		}
	}

	@bindThis
	public dispose() {
		this.subscriber.off('headPatStream', this.onEvent);
	}
}
// #endregion
