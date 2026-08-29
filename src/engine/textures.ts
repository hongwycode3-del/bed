import * as THREE from 'three';
import { BlockType } from '../types/game';

// Cache generated canvas textures
const textureCache = new Map<string, THREE.CanvasTexture>();

function createPixelCanvas(size = 16): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

// Generate procedurally styled textures with NearestFilter
export function getBlockTexture(type: BlockType): THREE.CanvasTexture {
  if (textureCache.has(type)) {
    return textureCache.get(type)!;
  }

  const [canvas, ctx] = createPixelCanvas(16);

  switch (type) {
    case 'wool_red':
    case 'wool_blue':
    case 'wool_green':
    case 'wool_yellow': {
      const baseColors: Record<string, string> = {
        wool_red: '#d32f2f',
        wool_blue: '#1976d2',
        wool_green: '#388e3c',
        wool_yellow: '#fbc02d',
      };
      const highlightColors: Record<string, string> = {
        wool_red: '#ef5350',
        wool_blue: '#42a5f5',
        wool_green: '#66bb6a',
        wool_yellow: '#ffeb3b',
      };
      const darkColors: Record<string, string> = {
        wool_red: '#b71c1c',
        wool_blue: '#0d47a1',
        wool_green: '#1b5e20',
        wool_yellow: '#f57f17',
      };

      const base = baseColors[type] || '#ffffff';
      const high = highlightColors[type] || '#f0f0f0';
      const dark = darkColors[type] || '#999999';

      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 16, 16);

      // Wool knitted noise pattern
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const rand = Math.random();
          if (rand > 0.65) {
            ctx.fillStyle = high;
            ctx.fillRect(x, y, 1, 1);
          } else if (rand < 0.35) {
            ctx.fillStyle = dark;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;
    }

    case 'wood': {
      // Oak wood planks
      ctx.fillStyle = '#b8860b';
      ctx.fillRect(0, 0, 16, 16);

      // Plank horizontal borders
      const plankColors = ['#a07409', '#cfa11a', '#8a6206', '#9c6f08'];
      for (let p = 0; p < 4; p++) {
        ctx.fillStyle = plankColors[p % plankColors.length];
        ctx.fillRect(0, p * 4, 16, 4);

        // Plank border line
        ctx.fillStyle = '#5c4004';
        ctx.fillRect(0, p * 4 + 3, 16, 1);

        // Planks vertical joints
        const jointX = (p % 2 === 0) ? 7 : 12;
        ctx.fillRect(jointX, p * 4, 1, 4);

        // Wood grain spots
        for (let gx = 0; gx < 16; gx++) {
          if (Math.random() > 0.6) {
            ctx.fillStyle = '#8a6206';
            ctx.fillRect(gx, p * 4 + (gx % 3), 1, 1);
          }
        }
      }
      break;
    }

    case 'endstone': {
      // End stone pale yellow craggy pattern
      ctx.fillStyle = '#e4e3a4';
      ctx.fillRect(0, 0, 16, 16);

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.random();
          if (r > 0.8) {
            ctx.fillStyle = '#f6f5be';
            ctx.fillRect(x, y, 1, 1);
          } else if (r < 0.3) {
            ctx.fillStyle = '#b6b579';
            ctx.fillRect(x, y, 1, 1);
          } else if (r < 0.1) {
            ctx.fillStyle = '#8d8c55';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;
    }

    case 'obsidian': {
      // Deep obsidian with purple streaks
      ctx.fillStyle = '#100c1e';
      ctx.fillRect(0, 0, 16, 16);

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.random();
          if (r > 0.85) {
            ctx.fillStyle = '#3c2b5e';
            ctx.fillRect(x, y, 1, 1);
          } else if (r > 0.7) {
            ctx.fillStyle = '#261b40';
            ctx.fillRect(x, y, 1, 1);
          } else if (r < 0.1) {
            ctx.fillStyle = '#623f99';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;
    }

    case 'glass': {
      // Blast proof glass
      ctx.fillStyle = 'rgba(210, 240, 255, 0.4)';
      ctx.fillRect(0, 0, 16, 16);

      // Glass border
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      ctx.fillRect(0, 0, 1, 16);
      ctx.fillRect(15, 0, 1, 16);

      // Glass diagonal shine
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 2, 2);
      ctx.fillRect(6, 6, 2, 2);
      ctx.fillRect(11, 4, 1, 1);
      break;
    }

    case 'tnt': {
      // TNT block side
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(0, 0, 16, 16);

      // White label band
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 5, 16, 6);

      // TNT text in black pixels
      ctx.fillStyle = '#111111';
      // T
      ctx.fillRect(2, 6, 3, 1);
      ctx.fillRect(3, 7, 1, 3);
      // N
      ctx.fillRect(6, 6, 1, 4);
      ctx.fillRect(7, 7, 1, 1);
      ctx.fillRect(8, 8, 1, 1);
      ctx.fillRect(9, 6, 1, 4);
      // T
      ctx.fillRect(11, 6, 3, 1);
      ctx.fillRect(12, 7, 1, 3);

      // Fuse details top/bottom
      ctx.fillStyle = '#8d1b1b';
      ctx.fillRect(0, 0, 16, 1);
      ctx.fillRect(0, 15, 16, 1);
      break;
    }

    case 'stone': {
      // Stone bricks
      ctx.fillStyle = '#787878';
      ctx.fillRect(0, 0, 16, 16);
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.random();
          if (r > 0.7) {
            ctx.fillStyle = '#909090';
            ctx.fillRect(x, y, 1, 1);
          } else if (r < 0.3) {
            ctx.fillStyle = '#5c5c5c';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      // Brick mortar lines
      ctx.fillStyle = '#404040';
      ctx.fillRect(0, 7, 16, 1);
      ctx.fillRect(7, 0, 1, 7);
      ctx.fillRect(11, 8, 1, 8);
      break;
    }

    case 'bedrock': {
      ctx.fillStyle = '#222222';
      ctx.fillRect(0, 0, 16, 16);
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.random();
          if (r > 0.7) {
            ctx.fillStyle = '#444444';
            ctx.fillRect(x, y, 1, 1);
          } else if (r < 0.2) {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      break;
    }

    case 'diamond_block': {
      ctx.fillStyle = '#26c6da';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#80deea';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#e0f7fa';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#00838f';
      ctx.strokeRect(0.5, 0.5, 15, 15);
      break;
    }

    case 'emerald_block': {
      ctx.fillStyle = '#00c853';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#69f0ae';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#b9f6ca';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#1b5e20';
      ctx.strokeRect(0.5, 0.5, 15, 15);
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  textureCache.set(type, texture);
  return texture;
}

// Special Break Progress Textures (Cracks 0 to 5)
export function getBreakOverlayTexture(stage: number): THREE.CanvasTexture {
  const key = `break_${stage}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const [canvas, ctx] = createPixelCanvas(16);
  ctx.clearRect(0, 0, 16, 16);

  if (stage > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    // Draw crack branching based on stage
    const lines = Math.min(10, stage * 2);
    for (let i = 0; i < lines; i++) {
      ctx.fillRect(2 + (i * 3) % 12, 2 + (i * 5) % 12, 2, 1);
      ctx.fillRect(3 + (i * 4) % 12, 3 + (i * 2) % 12, 1, 2);
    }
    if (stage >= 3) {
      ctx.fillRect(6, 6, 4, 4);
    }
    if (stage >= 5) {
      ctx.fillRect(4, 4, 8, 8);
      ctx.clearRect(6, 6, 4, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  textureCache.set(key, texture);
  return texture;
}
