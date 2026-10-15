// src/app/features/messagerie/pipes/replies-count.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

import { MessageReply } from '../models/user-message.model';
import { toRepliesArray } from 'src/app/home/utils/messagerie.utils';

/* ═════════════════════════════════════════════════════════════════════
   REPLIES COUNT — Compte les réponses d'un message
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'repliesCount',
  pure: true,
})
export class RepliesCountPipe implements PipeTransform {
  transform(
    replies: Record<string, MessageReply> | MessageReply[] | undefined
  ): number {
    return toRepliesArray(replies).length;
  }
}