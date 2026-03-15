import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ChatRole = 'system' | 'assistant' | 'user';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly http = inject(HttpClient);
  private readonly groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

  sendMessage(userMessage: string, chatHistory: ChatMessage[]): Observable<GroqResponse> {
    const apiKey = environment.groqApiKey?.trim();
    if (!apiKey) {
      throw new Error('Missing Groq API key. Set groqApiKey in runtime config or environment.');
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    });

    const systemPrompt = [
      'You are FinEco AI Assistant, built into the FinEco banking app.',
      'Help users with app navigation, personal finance advice, budgeting, debt management, and expense tracking.',
      'App routes include /dashboard, /wallets, /debts, /income, /budget, /analytics.',
      'Explain features clearly: adding wallets/cards, recording expense/income, transfer, budgets, debts, add person for separate tracking.',
      'Keep responses concise, practical, and friendly. Use occasional emojis when helpful.',
      'Always reply in the same language as the user message.',
    ].join(' ');

    const body = {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    };

    return this.http.post<GroqResponse>(this.groqUrl, body, { headers });
  }
}
