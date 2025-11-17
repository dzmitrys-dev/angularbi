import { Component, signal, afterNextRender } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('angularbi');
  protected readonly webGPUSupported = signal<boolean|null>(null);

  constructor() {
    afterNextRender(() => {
      this.checkWebGPUSupport();
    });
  }

  private async checkWebGPUSupport() {
    try {
      const gpu = (navigator as any).gpu;
      if (!gpu) {
        this.webGPUSupported.set(false);
        return;
      }

      const adapter = await gpu.requestAdapter();
      if (!adapter) {
        this.webGPUSupported.set(false);
        return;
      }

      // Check for required features - WebGPU features.values() returns iterator
      const features = Array.from(adapter.features.values());
      const requiredFeatures = ['texture-compression-astc'];
      const missingFeatures = requiredFeatures.filter(f => !features.includes(f));
      
      if (missingFeatures.length > 0) {
        console.warn('Missing GPU features:', missingFeatures);
        this.webGPUSupported.set(false);
        return;
      }

      // Test basic device capabilities
      const device = await adapter.requestDevice();
      await device.queue.onSubmittedWorkDone();
      
      this.webGPUSupported.set(true);
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      this.webGPUSupported.set(false);
    }
  }
}
