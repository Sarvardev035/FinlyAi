import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type * as THREE from 'three';

@Component({
  selector: 'app-currency-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas class="currency-scene" aria-hidden="true"></canvas>`,
  styles: [`
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
      border-radius: inherit;
    }

    .currency-scene {
      width: 100%;
      height: 100%;
      display: block;
      opacity: 0.9;
      filter: saturate(1.1) contrast(1.05);
    }
  `],
})
export class CurrencySceneComponent implements AfterViewInit, OnDestroy {
  readonly density = input<number>(48);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);

  private three?: typeof import('three');
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private points?: THREE.Points;
  private pointVelocities: number[] = [];
  private rafId = 0;
  private tickTime = 0;
  private isRunning = false;
  private isVisible = true;
  private resizeObserver?: ResizeObserver;
  private visibilityHandler = () => this.onVisibilityChange();
  private intersectionObserver?: IntersectionObserver;

  async ngAfterViewInit(): Promise<void> {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.three = await import('three');

    this.zone.runOutsideAngular(() => {
      this.initScene();
      this.bindVisibility();
      this.bindResize();
      this.startLoop();
    });
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.points?.geometry.dispose();

    const material = this.points?.material;
    if (this.three && material instanceof this.three.Material) {
      material.dispose();
    }

    this.renderer?.dispose();
  }

  private initScene(): void {
    if (!this.three) return;

    const canvas = this.canvasRef().nativeElement;
    const host = canvas.parentElement;
    if (!host) return;

    const width = Math.max(host.clientWidth, 320);
    const height = Math.max(host.clientHeight, 240);
    const isSmallScreen = width < 820;

    this.scene = new this.three.Scene();

    this.camera = new this.three.PerspectiveCamera(55, width / height, 0.1, 100);
    this.camera.position.z = 5.5;

    this.renderer = new this.three.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !isSmallScreen,
      powerPreference: 'high-performance',
    });
    const pixelRatioCap = isSmallScreen ? 1.2 : 1.6;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    this.renderer.setSize(width, height, false);

    const rawCount = Math.max(18, Math.round(this.density()));
    const count = isSmallScreen ? Math.round(rawCount * 0.65) : rawCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.pointVelocities = new Array(count).fill(0);

    const palette = [
      new this.three.Color('#00d68f'),
      new this.three.Color('#6c5ce7'),
      new this.three.Color('#ffa94d'),
      new this.three.Color('#0984e3'),
    ];

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 8.5;
      positions[idx + 1] = (Math.random() - 0.5) * 5.8;
      positions[idx + 2] = (Math.random() - 0.5) * 2.6;
      this.pointVelocities[i] = 0.0025 + Math.random() * 0.006;

      const color = palette[i % palette.length];
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    }

    const geometry = new this.three.BufferGeometry();
    geometry.setAttribute('position', new this.three.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new this.three.BufferAttribute(colors, 3));

    const material = new this.three.PointsMaterial({
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      blending: this.three.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new this.three.Points(geometry, material);
    this.scene.add(this.points);
  }

  private startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = () => {
      if (!this.isRunning) return;
      this.rafId = requestAnimationFrame(tick);
      if (!this.scene || !this.camera || !this.renderer || !this.points) return;

      this.tickTime += 0.0065;
      const t = this.tickTime;
      const positions = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = positions.count;

      for (let i = 0; i < count; i++) {
        const x = positions.getX(i);
        let y = positions.getY(i);
        const z = positions.getZ(i);

        y += this.pointVelocities[i];
        if (y > 3.1) {
          y = -3.1;
        }

        const drift = Math.sin((i * 0.7) + t) * 0.0017;
        positions.setXYZ(i, x + drift, y, z + Math.cos(t + i * 0.2) * 0.0009);
      }

      positions.needsUpdate = true;
      this.points.rotation.z = Math.sin(t * 0.42) * 0.06;
      this.points.rotation.y = Math.cos(t * 0.32) * 0.08;

      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }

  private stopLoop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private bindVisibility(): void {
    const canvas = this.canvasRef().nativeElement;
    const host = canvas.parentElement;
    if (!host) return;

    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.isVisible = !!entries[0]?.isIntersecting;
        this.updateLoopState();
      },
      { threshold: 0.02 },
    );

    this.intersectionObserver.observe(host);
  }

  private onVisibilityChange(): void {
    this.updateLoopState();
  }

  private updateLoopState(): void {
    const shouldRun = !document.hidden && this.isVisible;
    if (shouldRun) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  private bindResize(): void {
    const canvas = this.canvasRef().nativeElement;
    const host = canvas.parentElement;
    if (!host) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.renderer || !this.camera) return;
      const width = Math.max(host.clientWidth, 320);
      const height = Math.max(host.clientHeight, 240);

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    });

    this.resizeObserver.observe(host);
  }
}
