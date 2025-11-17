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
  shouldStop = signal(false);
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
      console.log(`🚀 Starting CSV processing: ${data.length} rows`);
      console.table(this.headers());
      this.shouldStop.set(false);

      for (let i = 0; i < data.length; i++) {
        // Check if stop was requested
        if (this.shouldStop()) {
          console.log(`⛔ Processing stopped by user at row ${i + 1}/${data.length}`);
          this.error.set('Processing stopped by user');
          break;
        }
        
        const row = data[i];
        
        // Log current row being processed
        console.log(`\n📊 Processing row ${i + 1}/${data.length}:`);
        console.table([row]);
        
        // Create enhanced prompt with column context
        const headersContext = `CSV Columns: ${this.headers().join(', ')}`;
        const line = Object.values(row).join(' | ');
        const fullPrompt = `${headersContext}\n\nRow data: ${line}\n\n${this.promptTemplate().replace(/\{line\}/g, line)}`;
        
        console.log('🤖 Generated prompt:', fullPrompt);
        console.log('📏 Prompt length:', fullPrompt.length);
        
        // Update UI immediately with "processing" state
        this.results.update(map => new Map(map).set(i, '⏳ Processing...'));
        console.log(`🔄 Updated UI for row ${i + 1} to processing state`);
        
        try {
          console.log(`⏱️  Starting LLM generation for row ${i + 1}...`);
          const result = await this.llmService.generate(fullPrompt, 120000);
          console.log(`✅ LLM returned for row ${i + 1}`);
          
          // Update result immediately
          resultsMap.set(i, result);
          this.results.update(map => new Map(map).set(i, result));
          console.log(`✅ UI updated with result for row ${i + 1}`);
          
          console.log(`✅ Row ${i + 1} completed:`, result.substring(0, 200) + (result.length > 200 ? '...' : ''));
          
          this.processingProgress.set(((i + 1) / data.length) * 100);
          console.log(`📈 Progress: ${((i + 1) / data.length) * 100}%`);
        } catch (rowError: any) {
          console.error(`❌ Error processing row ${i + 1}:`, rowError);
          const errorMsg = `Error: ${rowError.message || 'Unknown error'}`;
          this.results.update(map => new Map(map).set(i, errorMsg));
          // Continue processing instead of stopping on error
          console.log(`⚠️ Continuing with next row despite error on row ${i + 1}`);
          continue;
        }
      }
      
      console.log('🎉 CSV processing completed successfully!');
      console.log('📋 Final results:', Array.from(resultsMap.entries()));
    } catch (err: any) {
      console.error('❌ Processing error:', err);
      this.error.set(err.message || 'Unknown error');
    } finally {
      console.log('🏁 Processing finished');
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
      
      console.log('🌐 Processing global prompt with 120 second timeout');
      const result = await this.llmService.generate(fullPrompt, 120000);
      this.globalResult.set(result);
    } catch (err: any) {
      console.error('❌ Global prompt error:', err);
      this.error.set(err.message || 'Error processing global prompt');
    } finally {
      this.isProcessing.set(false);
    }
  }

  stopProcessing(): void {
    console.log('🛑 Stop processing requested by user');
    this.shouldStop.set(true);
  }

  clearData(): void {
    this.csvFile.set(null);
    this.csvData.set([]);
    this.headers.set([]);
    this.results.set(new Map());
    this.globalResult.set('');
    this.processingProgress.set(0);
    this.shouldStop.set(false);
    this.error.set(null);
  }

  getResult(rowIndex: number): string {
    return this.results().get(rowIndex) || '';
  }
}