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
  private gridMesh?: THREE.LineSegments;
  private basePositions?: Float32Array; // original x,y of grid points for wave offset
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

    const pointMat = this.points?.material;
    if (this.three && pointMat instanceof this.three.Material) {
      pointMat.dispose();
    }

    this.gridMesh?.geometry.dispose();
    const gridMat = this.gridMesh?.material;
    if (this.three && gridMat instanceof this.three.Material) {
      gridMat.dispose();
    }

    this.renderer?.dispose();
  }

  private initScene(): void {
    if (!this.three) return;

    const canvas = this.canvasRef().nativeElement;
    const host = canvas.parentElement;
    if (!host) return;

    const width  = Math.max(host.clientWidth,  320);
    const height = Math.max(host.clientHeight, 240);
    const isSmallScreen = width < 820;

    this.scene  = new this.three.Scene();
    this.camera = new this.three.PerspectiveCamera(52, width / height, 0.1, 100);
    this.camera.position.z = 5.8;

    this.renderer = new this.three.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !isSmallScreen,
      powerPreference: 'high-performance',
    });
    const pixelRatioCap = isSmallScreen ? 1.2 : 1.6;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    this.renderer.setSize(width, height, false);

    // ── 1. Subtle grid overlay (LineSegments) ──────────────────────────────
    const cols = 14, rows = 9;
    const gW = 9.0, gH = 5.8;
    const linePositions: number[] = [];

    for (let r = 0; r <= rows; r++) {
      const y = -gH / 2 + (r / rows) * gH;
      linePositions.push(-gW / 2, y, 0,  gW / 2, y, 0);
    }
    for (let c = 0; c <= cols; c++) {
      const x = -gW / 2 + (c / cols) * gW;
      linePositions.push(x, -gH / 2, 0,  x, gH / 2, 0);
    }

    const lineGeo = new this.three.BufferGeometry();
    lineGeo.setAttribute('position', new this.three.BufferAttribute(new Float32Array(linePositions), 3));
    const lineMat = new this.three.LineBasicMaterial({
      color: 0x1a3a5c,
      transparent: true,
      opacity: 0.28,
    });
    this.gridMesh = new this.three.LineSegments(lineGeo, lineMat);
    this.scene.add(this.gridMesh);

    // ── 2. Grid intersection points (wavy highlight nodes) ─────────────────
    const nodeCount = (cols + 1) * (rows + 1);
    const nodePos   = new Float32Array(nodeCount * 3);
    const nodeColor = new Float32Array(nodeCount * 3);
    this.basePositions = new Float32Array(nodeCount * 2); // store x,y base

    // Professional fintech palette: deep teal + accent cyan + soft indigo
    const palette = [
      new this.three.Color('#0098a8'),
      new this.three.Color('#00b4d8'),
      new this.three.Color('#2d6a9f'),
      new this.three.Color('#1e88e5'),
    ];

    let ni = 0;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = -gW / 2 + (c / cols) * gW;
        const y = -gH / 2 + (r / rows) * gH;
        nodePos[ni * 3]     = x;
        nodePos[ni * 3 + 1] = y;
        nodePos[ni * 3 + 2] = 0;
        this.basePositions[ni * 2]     = x;
        this.basePositions[ni * 2 + 1] = y;
        const col = palette[(r + c) % palette.length];
        nodeColor[ni * 3]     = col.r;
        nodeColor[ni * 3 + 1] = col.g;
        nodeColor[ni * 3 + 2] = col.b;
        ni++;
      }
    }

    const nodeGeo = new this.three.BufferGeometry();
    nodeGeo.setAttribute('position', new this.three.BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute('color',    new this.three.BufferAttribute(nodeColor, 3));

    const nodeMat = new this.three.PointsMaterial({
      size: 0.055,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      vertexColors: true,
      blending: this.three.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new this.three.Points(nodeGeo, nodeMat);
    this.scene.add(this.points);
  }

  private startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = () => {
      if (!this.isRunning) return;
      this.rafId = requestAnimationFrame(tick);
      if (!this.scene || !this.camera || !this.renderer || !this.points || !this.basePositions) return;

      this.tickTime += 0.007;
      const t = this.tickTime;

      // Wave each grid node in Z — creates a rippling data-surface effect
      const positions = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = positions.count;
      for (let i = 0; i < count; i++) {
        const bx = this.basePositions[i * 2];
        const by = this.basePositions[i * 2 + 1];
        const z  = Math.sin(bx * 0.75 + t * 0.65) * 0.22
                 + Math.cos(by * 0.9  + t * 0.5)  * 0.15;
        positions.setZ(i, z);
      }
      positions.needsUpdate = true;

      // Gently tilt the grid mesh to add depth — no full rotation
      if (this.gridMesh) {
        this.gridMesh.rotation.x = Math.sin(t * 0.18) * 0.06;
        this.gridMesh.rotation.y = Math.cos(t * 0.13) * 0.04;
      }
      this.points.rotation.x = this.gridMesh?.rotation.x ?? 0;
      this.points.rotation.y = this.gridMesh?.rotation.y ?? 0;

      // Pulse opacity of the node layer
      const mat = this.points.material as THREE.PointsMaterial;
      mat.opacity = 0.38 + Math.sin(t * 0.55) * 0.18;

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
