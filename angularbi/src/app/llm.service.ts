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

  async getEngine(modelId: string = 'Llama-3.2-1B-Instruct-q4f32_1-MLC'): Promise<any> {
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

  async generate(prompt: string, timeoutMs: number = 120000): Promise<string> {
    console.log('🔥 LLM.generate called with prompt length:', prompt.length);
    console.log('📝 Full prompt:', prompt);
    
    // WebGPU check - navigator.gpu is experimental
    if (typeof (navigator as any).gpu === 'undefined') {
      throw new Error('WebGPU not supported. Please use Chrome/Edge with WebGPU enabled.');
    }
  
    try {
      console.log('📦 Getting engine...');
      const engine = await this.getEngine();
      console.log('✅ Engine acquired:', engine ? 'ready' : 'null');
      
      const messages: ChatMessage[] = [
        { role: 'user', content: prompt }
      ];
    
      console.log('⚙️ Sending to engine with config:', { temperature: 0.7, max_tokens: 512, stream: true });
      console.log('📨 Messages to send:', messages);

      console.log('⏳ Calling engine.chat.completions.create with streaming...');
      const startTime = performance.now();
      
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort(new Error(`LLM generation timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      const stream = await engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 512,
        stream: true,
        signal: abortController.signal,
      });
      
      let fullResult = '';
      try {
        for await (const chunk of stream) {
          console.log('📥 Received stream chunk:', chunk);
          const content = chunk.choices?.[0]?.delta?.content || '';
          fullResult += content;
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error(`LLM generation aborted: ${error.message}`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
      
      const endTime = performance.now();
      console.log(`✅ Response received in ${(endTime - startTime).toFixed(2)}ms`);
      console.log('🎯 Extracted content:', fullResult.substring(0, 200) + (fullResult.length > 200 ? '...' : ''));
      console.log('✅ LLM.generate completed successfully');
      
      return fullResult;
    } catch (error: any) {
      console.error('❌ Error in generate():', error);
      console.error('📍 Stack:', error.stack);
      throw error;
    }
  }

  async resetChat(): Promise<void> {
    if (this.engineRef) {
      await this.engineRef.resetChat();
    }
  }
}