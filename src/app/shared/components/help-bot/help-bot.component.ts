import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type BotItem = { from: 'bot' | 'user'; text: string };

@Component({
  selector: 'app-help-bot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="bot-toggle" (click)="toggle()" [attr.aria-label]="open() ? 'Close help assistant' : 'Open help assistant'">
      {{ open() ? '✕' : '🤖' }}
    </button>

    @if (open()) {
      <section class="bot-panel" aria-live="polite">
        <header class="bot-header">
          <h3>FinEco Assistant</h3>
          <p>Ask how to use wallets, transfers, and budgeting.</p>
        </header>

        <div class="bot-quick-actions">
          @for (q of quickQuestions; track q) {
            <button class="quick-btn" (click)="ask(q)">{{ q }}</button>
          }
        </div>

        <div class="bot-messages">
          @for (m of messages(); track $index) {
            <div class="msg" [class.msg--user]="m.from === 'user'">{{ m.text }}</div>
          }
        </div>

        <form class="bot-input" (ngSubmit)="submit()">
          <input
            [(ngModel)]="draft"
            name="assistantQuestion"
            placeholder="Type your question..."
            autocomplete="off"
          />
          <button type="submit">Send</button>
        </form>
      </section>
    }
  `,
  styles: [`
    .bot-toggle {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 1px solid rgba(99,102,241,0.45);
      background: linear-gradient(135deg, #4f46e5 0%, #818cf8 100%);
      color: #fff;
      font-size: 1.2rem;
      cursor: pointer;
      z-index: 1200;
      box-shadow: 0 8px 24px rgba(79,70,229,0.45);
    }
    .bot-panel {
      position: fixed;
      right: 1rem;
      bottom: 4.6rem;
      width: min(360px, calc(100vw - 2rem));
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      background: rgba(13,18,35,0.96);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 1rem;
      padding: 0.9rem;
      z-index: 1200;
      box-shadow: 0 18px 40px rgba(0,0,0,0.5);
      backdrop-filter: blur(16px);
    }
    .bot-header h3 {
      margin: 0;
      color: #fff;
      font-size: 0.95rem;
    }
    .bot-header p {
      margin: 0.2rem 0 0;
      color: rgba(255,255,255,0.62);
      font-size: 0.78rem;
    }
    .bot-quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .quick-btn {
      border: 1px solid rgba(129,140,248,0.35);
      background: rgba(99,102,241,0.12);
      color: #dbe1ff;
      border-radius: 999px;
      padding: 0.28rem 0.62rem;
      font-size: 0.72rem;
      cursor: pointer;
    }
    .bot-messages {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      overflow-y: auto;
      max-height: 38vh;
      padding-right: 0.2rem;
    }
    .msg {
      align-self: flex-start;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      color: #eef1ff;
      border-radius: 0.75rem;
      padding: 0.45rem 0.6rem;
      font-size: 0.78rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .msg--user {
      align-self: flex-end;
      background: rgba(99,102,241,0.2);
      border-color: rgba(129,140,248,0.38);
    }
    .bot-input {
      display: flex;
      gap: 0.4rem;
    }
    .bot-input input {
      flex: 1;
      border-radius: 0.65rem;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.06);
      color: #fff;
      padding: 0.5rem 0.6rem;
      font-size: 0.8rem;
    }
    .bot-input button {
      border: none;
      border-radius: 0.65rem;
      background: #6366f1;
      color: #fff;
      padding: 0.5rem 0.7rem;
      font-size: 0.78rem;
      cursor: pointer;
    }
  `],
})
export class HelpBotComponent {
  readonly open = signal(false);
  readonly messages = signal<BotItem[]>([
    {
      from: 'bot',
      text: 'Hi! I can help with wallets, transfers, budgets, and login issues. Ask anything.',
    },
  ]);

  draft = '';
  readonly quickQuestions = [
    'How do I add a wallet?',
    'How do I transfer money?',
    'Why is login failing?',
    'How to track budget?',
  ];

  toggle(): void {
    this.open.update((v) => !v);
  }

  ask(question: string): void {
    this.append('user', question);
    this.append('bot', this.answer(question));
  }

  submit(): void {
    const q = this.draft.trim();
    if (!q) return;
    this.draft = '';
    this.ask(q);
  }

  private append(from: 'bot' | 'user', text: string): void {
    this.messages.update((items) => [...items, { from, text }]);
  }

  private answer(raw: string): string {
    const q = raw.toLowerCase();

    if (q.includes('add') && (q.includes('wallet') || q.includes('card'))) {
      return 'Go to Wallets > + Add Card. Fill wallet name, type, and initial balance, then save.';
    }

    if (q.includes('transfer')) {
      return 'Go to Wallets > Transfer. Pick source and destination wallets, enter amount, and confirm. If currencies differ, conversion preview appears automatically.';
    }

    if (q.includes('login') || q.includes('password') || q.includes('email')) {
      return 'Use your registered email/password. If invalid, the form highlights fields and shows inline error details. You can reset and try again.';
    }

    if (q.includes('budget')) {
      return 'Open Budget section, set monthly limits by category, then compare plan vs actual spending in analytics.';
    }

    return 'I can help with wallet setup, transfers, budgets, debts, and troubleshooting. Try asking one of the quick questions.';
  }
}
