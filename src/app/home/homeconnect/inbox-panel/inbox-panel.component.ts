import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { InboxMessage } from 'src/app/home/models/homeconnect.model';
import { InboxService } from '../../services/inbox.service';

@Component({
  selector: 'app-inbox-panel',
  imports: [
    RouterLink,
  ],
  templateUrl: './inbox-panel.component.html',
  styleUrls: ['./inbox-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxPanelComponent {

  private readonly inboxService = inject(InboxService);

  private readonly messages = toSignal(this.inboxService.messages$, {
    initialValue: [] as InboxMessage[],
  });

  readonly unreadCount = computed(
    () => this.messages().filter((m) => m.isUnread).length,
  );

}