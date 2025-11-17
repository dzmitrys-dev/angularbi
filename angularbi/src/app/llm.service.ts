import { Injectable, signal } from '@angular/core';
import { CreateMLCEngine } from '@mlc-ai/web-llm';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface EngineProgress {
  progress: number;
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  public loadingProgress = signal<EngineProgress | null>(null);
  public isEngineReady = signal(false);
  private enginePromise = signal<Promise<any> | null>(null);
  private engineRef: any = null;

  async getEngine(modelId: string = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'): Promise<any> {
    if (this.engineRef) {
      return this.engineRef;
    }

    if (this.enginePromise()) {
      await this.enginePromise()!;
      return this.engineRef!;
    }

    const promise = CreateMLCEngine(modelId, {
      initProgressCallback: (report: EngineProgress) => {
        this.loadingProgress.set(report);
      },
    }).then((engine: any) => {
      this.engineRef = engine;
      this.isEngineReady.set(true);
      this.loadingProgress.set(null);
      return engine;
    }).catch((error: any) => {
      console.error('Failed to initialize engine:', error);
      this.loadingProgress.set(null);
      throw error;
    });

    this.enginePromise.set(promise);
    return promise;
  }

  async generate(prompt: string): Promise<string> {
    // WebGPU check - navigator.gpu is experimental
    if (typeof (navigator as any).gpu === 'undefined') {
      throw new Error('WebGPU not supported. Please use Chrome/Edge with WebGPU enabled.');
    }

    const engine = await this.getEngine();
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 512,
      stream: false,
    });

    return response.choices[0].message.content || '';
  }

  async resetChat(): Promise<void> {
    if (this.engineRef) {
      await this.engineRef.resetChat();
    }
  }
}