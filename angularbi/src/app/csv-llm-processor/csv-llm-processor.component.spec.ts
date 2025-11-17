import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CsvLlmProcessorComponent } from './csv-llm-processor.component';
import { LlmService } from '../llm.service';

describe('CsvLlmProcessorComponent', () => {
  let component: CsvLlmProcessorComponent;
  let fixture: ComponentFixture<CsvLlmProcessorComponent>;
  let mockLlmService: jasmine.SpyObj<LlmService>;

  beforeEach(async () => {
    mockLlmService = jasmine.createSpyObj('LlmService', ['generate'], {
      isEngineReady: false,
      loadingProgress: null
    });

    await TestBed.configureTestingModule({
      imports: [CsvLlmProcessorComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: LlmService, useValue: mockLlmService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CsvLlmProcessorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse CSV file', () => {
    const testCsv = new File(['name,age\nJohn,30\nJane,25'], 'test.csv', { type: 'text/csv' });
    
    const event = { target: { files: [testCsv] } } as any;
    component.onFileSelected(event);

    expect(component.csvData().length).toBeGreaterThan(0);
    expect(component.headers().length).toBeGreaterThan(0);
  });

  it('should disable process button when no data or prompt', () => {
    // Default state - no data, no prompt
    expect(component.hasData()).toBeFalse();
    
    component.promptTemplate.set('test prompt');
    expect(component.hasData()).toBeFalse(); // still no data
    
    component.csvData.set([{ name: 'test', age: '30' }]);
    expect(component.hasData()).toBeTrue();
  });

  it('should clear all data', () => {
    component.csvData.set([{ name: 'test' }]);
    component.promptTemplate.set('test');
    
    component.clearData();
    
    expect(component.csvData().length).toBe(0);
    expect(component.promptTemplate()).toBe('');
    expect(component.results().size).toBe(0);
  });

  it('should show engine loading progress', () => {
    (mockLlmService.loadingProgress as any).set({ progress: 0.5, text: 'Loading model...' });
    fixture.detectChanges();
    
    const progressElement = fixture.nativeElement.querySelector('.progress-section');
    expect(progressElement).toBeTruthy();
  });
});