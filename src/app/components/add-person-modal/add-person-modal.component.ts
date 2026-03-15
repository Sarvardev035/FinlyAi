import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-person-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h3>+ Add Person</h3>
          <button class="modal__close" (click)="cancel.emit()">✕</button>
        </div>

        <div class="modal__body">
          <label class="field">
            <span class="field__label">Person Name</span>
            <input
              class="field__input"
              [(ngModel)]="name"
              maxlength="40"
              placeholder="e.g. My Son, Wife"
            />
          </label>

          <div class="field">
            <span class="field__label">Choose Avatar</span>
            <div class="avatar-grid">
              @for (emoji of avatars; track emoji) {
                <button
                  class="avatar-btn"
                  [class.avatar-btn--active]="selectedAvatar() === emoji"
                  (click)="selectedAvatar.set(emoji)"
                >
                  {{ emoji }}
                </button>
              }
            </div>
          </div>

          <div class="actions">
            <button class="btn btn--secondary" (click)="cancel.emit()">Cancel</button>
            <button class="btn btn--accent" [disabled]="!canCreate()" (click)="onCreate()">
              Create Person
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
    }
    .modal {
      width: min(92vw, 420px);
      border-radius: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: var(--bg, #0a1020);
      overflow: hidden;
    }
    .modal__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal__header h3 {
      margin: 0;
      color: #fff;
      font-size: 1.05rem;
    }
    .modal__close {
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.65);
      font-size: 1.2rem;
      cursor: pointer;
    }
    .modal__body {
      padding: 1rem 1.25rem 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .field__label {
      color: rgba(255, 255, 255, 0.58);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.76rem;
      font-weight: 600;
    }
    .field__input {
      border-radius: 0.7rem;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      padding: 0.72rem 0.78rem;
      outline: none;
      font-size: 0.95rem;
    }
    .field__input:focus {
      border-color: var(--accent, #6366f1);
    }
    .avatar-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .avatar-btn {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 0.6rem;
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      font-size: 1.3rem;
      padding: 0.45rem 0;
      cursor: pointer;
    }
    .avatar-btn--active {
      border-color: var(--accent, #6366f1);
      background: rgba(99, 102, 241, 0.2);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 0.2rem;
    }
    .btn {
      border: none;
      border-radius: 0.7rem;
      padding: 0.62rem 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn--secondary {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }
    .btn--accent {
      color: #fff;
      background: var(--accent, #6366f1);
    }
  `],
})
export class AddPersonModalComponent {
  @Output() cancel = new EventEmitter<void>();
  @Output() create = new EventEmitter<{ name: string; avatar: string }>();

  name = '';
  readonly avatars = ['👦', '👧', '👨', '👩', '👴', '👵', '👶'];
  readonly selectedAvatar = signal('👦');

  canCreate(): boolean {
    return this.name.trim().length > 0;
  }

  onCreate(): void {
    if (!this.canCreate()) return;
    this.create.emit({
      name: this.name.trim(),
      avatar: this.selectedAvatar(),
    });
  }
}
