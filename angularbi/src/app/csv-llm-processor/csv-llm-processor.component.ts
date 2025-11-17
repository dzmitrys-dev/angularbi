import { CommonModule } from '@angular/common';
import { Component, inject, signal, model, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as Papa from 'papaparse';
import { LlmService, type EngineProgress } from '../llm.service';

interface CsvRow {
  [key: string]: string;
}

@Component({
  selector: 'app-csv-llm-processor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './csv-llm-processor.component.html',
  styleUrl: './csv-llm-processor.component.css'
})
export class CsvLlmProcessorComponent {
  private llmService = inject(LlmService);

  promptTemplate = model('');
  globalPrompt = model('');
  csvFile = signal<File | null>(null);
  csvData = signal<CsvRow[]>([]);
  headers = signal<string[]>([]);
  results = signal<Map<number, string>>(new Map());
  globalResult = signal<string>('');
  isProcessing = signal(false);
  processingProgress = signal(0);
  error = signal<string | null>(null);

  // Computed
  hasData = computed(() => this.csvData().length > 0);
  isReady = computed(() => this.llmService.isEngineReady());
  loadingProgress = this.llmService.loadingProgress;

  constructor() {
    effect(() => {
      if (this.isProcessing()) {
        this.processCsv();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.csvFile.set(input.files[0]);
      this.parseCsv(input.files[0]);
    }
  }

  private parseCsv(file: File): void {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<CsvRow>) => {
        this.headers.set(Object.keys(results.data[0] || {}));
        this.csvData.set(results.data);
        this.results.set(new Map());
        this.error.set(null);
      },
      error: (error: Error) => {
        this.error.set(error.message);
      }
    });
  }

  async processCsv(): Promise<void> {
    if (!this.hasData() || !this.promptTemplate()) return;

    this.isProcessing.set(true);
    this.processingProgress.set(0);
    this.error.set(null);

    const data = this.csvData();
    const resultsMap = new Map<number, string>();

    try {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const line = Object.values(row).join(' | ');
        const fullPrompt = this.promptTemplate().replace(/\{line\}/g, line);

        const result = await this.llmService.generate(fullPrompt);
        resultsMap.set(i, result);

        this.processingProgress.set(((i + 1) / data.length) * 100);
      }
      this.results.set(resultsMap);
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async processGlobalPrompt(): Promise<void> {
    if (!this.hasData() || !this.globalPrompt()) return;

    this.isProcessing.set(true);
    this.error.set(null);
    
    try {
      // Summarize data structure for LLM analysis to prevent context overflow
      const headersList = this.headers().join(', ');
      const sampleRows = this.csvData().slice(0, 5).map(row => Object.values(row).join(' | '));
      const rowCount = this.csvData().length;
      
      const allData = `CSV Structure: Headers: ${headersList}\nTotal rows: ${rowCount}\n\nSample rows (first 5):\n${sampleRows.join('\n')}${rowCount > 5 ? '\n\n... and ' + (rowCount - 5) + ' more rows' : ''}`;
      
      const fullPrompt = this.globalPrompt().replace(/\{data\}/g, allData);
      
      const result = await this.llmService.generate(fullPrompt);
      this.globalResult.set(result);
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.isProcessing.set(false);
    }
  }

  clearData(): void {
    this.csvFile.set(null);
    this.csvData.set([]);
    this.headers.set([]);
    this.results.set(new Map());
    this.globalResult.set('');
    this.processingProgress.set(0);
    this.error.set(null);
  }

  getResult(rowIndex: number): string {
    return this.results().get(rowIndex) || '';
  }
}