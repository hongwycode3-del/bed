import * as THREE from 'three';
import { BlockType, GameMode, ResourceType, TeamId } from '../types/game';
import { getBlockTexture } from './textures';

export interface VoxelBlock {
  type: BlockType;
  mesh: THREE.Mesh;
  unbreakable?: boolean;
}

export interface ResourceDrop {
  id: string;
  type: ResourceType;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  spawnTime: number;
  amount: number;
}

export interface Spawner {
  id: string;
  type: ResourceType | 'base'; // 'base' spawns both iron & gold
  position: THREE.Vector3;
  interval: number; // in seconds
  lastSpawnTime: number;
  team?: TeamId;
  level: number;
  name: string;
}

export interface BedLocation {
  team: TeamId;
  headPos: THREE.Vector3;
  footPos: THREE.Vector3;
  group: THREE.Group;
  alive: boolean;
}

export interface NPCLocation {
  type: 'item_shop' | 'upgrade_shop';
  team: TeamId;
  position: THREE.Vector3;
  rotationY: number;
  group: THREE.Group;
}

export class WorldManager {
  public scene: THREE.Scene;
  public blocks: Map<string, VoxelBlock> = new Map();
  public spawners: Spawner[] = [];
  public resourceDrops: ResourceDrop[] = [];
  public beds: Map<TeamId, BedLocation> = new Map();
  public npcs: NPCLocation[] = [];
  public gameMode: GameMode = 'classic_4teams';
  public diamondTier: number = 1;
  public emeraldTier: number = 1;

  // Instanced or shared geometries and materials
  private boxGeometry: THREE.BoxGeometry;
  private materialCache: Map<BlockType, THREE.MeshStandardMaterial> = new Map();
  private dropGeometries: Record<ResourceType, THREE.BufferGeometry>;
  private dropMaterials: Record<ResourceType, THREE.MeshStandardMaterial>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);

    // Shared geometries for spinning item drops
    this.dropGeometries = {
      iron: new THREE.BoxGeometry(0.3, 0.15, 0.5),
      gold: new THREE.BoxGeometry(0.3, 0.15, 0.5),
      diamond: new THREE.OctahedronGeometry(0.25, 0),
      emerald: new THREE.OctahedronGeometry(0.25, 0),
    };

    this.dropMaterials = {
      iron: new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2, emissive: 0x443300 }),
      diamond: new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.4, roughness: 0.1, emissive: 0x003344 }),
      emerald: new THREE.MeshStandardMaterial({ color: 0x00e676, metalness: 0.3, roughness: 0.1, emissive: 0x004411 }),
    };
  }

  public getMaterial(type: BlockType): THREE.MeshStandardMaterial {
    if (this.materialCache.has(type)) {
      return this.materialCache.get(type)!;
    }
    const texture = getBlockTexture(type);
    const isGlass = type === 'glass';
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: type === 'obsidian' || type === 'diamond_block' || type === 'emerald_block' ? 0.3 : 0.85,
      metalness: type === 'diamond_block' || type === 'emerald_block' ? 0.2 : 0.05,
      transparent: isGlass,
      opacity: isGlass ? 0.65 : 1.0,
      depthWrite: !isGlass,
    });
    this.materialCache.set(type, mat);
    return mat;
  }

  public getCoordKey(x: number, y: number, z: number): string {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  public addBlock(x: number, y: number, z: number, type: BlockType, unbreakable = false): VoxelBlock | null {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const gz = Math.floor(z);
    const key = this.getCoordKey(gx, gy, gz);

    if (this.blocks.has(key)) {
      return null;
    }

    const material = this.getMaterial(type);
    const mesh = new THREE.Mesh(this.boxGeometry, material);
    mesh.position.set(gx + 0.5, gy + 0.5, gz + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { isBlock: true, coordKey: key, blockType: type, unbreakable };

    this.scene.add(mesh);
    const block: VoxelBlock = { type, mesh, unbreakable };
    this.blocks.set(key, block);
    return block;
  }

  public removeBlock(x: number, y: number, z: number, force = false): VoxelBlock | null {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const gz = Math.floor(z);
    const key = this.getCoordKey(gx, gy, gz);

    const block = this.blocks.get(key);
    if (!block) return null;
    if (block.unbreakable && !force) return null;

    this.scene.remove(block.mesh);
    this.blocks.delete(key);
    return block;
  }

  public getBlock(x: number, y: number, z: number): VoxelBlock | undefined {
    return this.blocks.get(this.getCoordKey(x, y, z));
  }

  public isSolid(x: number, y: number, z: number): boolean {
    return this.blocks.has(this.getCoordKey(x, y, z));
  }

  // Check AABB collision for entities
  public checkAABBCollision(box: THREE.Box3): boolean {
    const minX = Math.floor(box.min.x);
    const maxX = Math.floor(box.max.x);
    const minY = Math.floor(box.min.y);
    const maxY = Math.floor(box.max.y);
    const minZ = Math.floor(box.min.z);
    const maxZ = Math.floor(box.max.z);

    const blockBox = new THREE.Box3();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolid(x, y, z)) {
            blockBox.min.set(x, y, z);
            blockBox.max.set(x + 1, y + 1, z + 1);
            if (box.intersectsBox(blockBox)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Return spawn center for team
  public getTeamSpawnPosition(team: TeamId): THREE.Vector3 {
    if (this.gameMode === 'duel_1v1') {
      const dist = 24;
      if (team === 'red') return new THREE.Vector3(-dist, 11.5, 0);
      if (team === 'blue') return new THREE.Vector3(dist, 11.5, 0);
      return new THREE.Vector3(0, 11.5, 0);
    }

    const dist = 42;
    const basePositions: Record<TeamId, THREE.Vector3> = {
      red: new THREE.Vector3(-dist, 11.5, 0),
      blue: new THREE.Vector3(dist, 11.5, 0),
      green: new THREE.Vector3(0, 11.5, -dist),
      yellow: new THREE.Vector3(0, 11.5, dist),
    };
    return basePositions[team] || new THREE.Vector3(0, 15, 0);
  }

  // Set generator tiers dynamically
  public setGeneratorTier(type: 'diamond' | 'emerald', tier: number) {
    if (type === 'diamond') this.diamondTier = tier;
    if (type === 'emerald') this.emeraldTier = tier;

    this.spawners.forEach(s => {
      if (s.type === 'diamond') {
        s.level = this.diamondTier;
        // Tier 1: 30s, Tier 2: 20s, Tier 3: 12s
        const intervals = [30, 30, 20, 12];
        s.interval = intervals[Math.min(3, this.diamondTier)];
      } else if (s.type === 'emerald') {
        s.level = this.emeraldTier;
        // Tier 1: 55s, Tier 2: 35s, Tier 3: 20s
        const intervals = [55, 55, 35, 20];
        s.interval = intervals[Math.min(3, this.emeraldTier)];
      }
    });
  }

  // Generate complete BedWars map (Supports Classic 4-Teams and 1v1 Duels)
  public generateMap(mapType: 'classic' | 'floating_islands' | 'sakura' = 'classic', mode: GameMode = 'classic_4teams') {
    this.gameMode = mode;
    this.diamondTier = 1;
    this.emeraldTier = 1;

    // Clear previous objects
    this.blocks.forEach(b => this.scene.remove(b.mesh));
    this.blocks.clear();
    this.resourceDrops.forEach(d => this.scene.remove(d.mesh));
    this.resourceDrops = [];
    this.spawners = [];
    this.beds.clear();
    this.npcs.forEach(n => this.scene.remove(n.group));
    this.npcs = [];

    if (mode === 'duel_1v1') {
      // 1v1 DUEL MAP: 2 close bases (Red vs Blue at distance 24), 2 Diamond Outposts, 1 Center Arena
      const duelDist = 24;
      const baseConfigs: Array<{ team: TeamId; center: THREE.Vector3; woolType: BlockType }> = [
        { team: 'red', center: new THREE.Vector3(-duelDist, 10, 0), woolType: 'wool_red' },
        { team: 'blue', center: new THREE.Vector3(duelDist, 10, 0), woolType: 'wool_blue' },
      ];

      baseConfigs.forEach(base => {
        this.generateTeamIsland(base.team, base.center, base.woolType, true);
      });

      // 2 Diamond Generators for Duels
      this.generateDiamondIsland(new THREE.Vector3(0, 10, -14), 'dia_duel_n');
      this.generateDiamondIsland(new THREE.Vector3(0, 10, 14), 'dia_duel_s');

      // Center Duel Colosseum Island with Emerald Generator
      this.generateDuelCenterIsland(new THREE.Vector3(0, 10, 0));
    } else {
      // CLASSIC 4-TEAMS MAP (Red, Blue, Green, Yellow at distance 42)
      const baseDistance = 42;
      const baseConfigs: Array<{ team: TeamId; center: THREE.Vector3; woolType: BlockType; name: string }> = [
        { team: 'red', center: new THREE.Vector3(-baseDistance, 10, 0), woolType: 'wool_red', name: 'Red' },
        { team: 'blue', center: new THREE.Vector3(baseDistance, 10, 0), woolType: 'wool_blue', name: 'Blue' },
        { team: 'green', center: new THREE.Vector3(0, 10, -baseDistance), woolType: 'wool_green', name: 'Green' },
        { team: 'yellow', center: new THREE.Vector3(0, 10, baseDistance), woolType: 'wool_yellow', name: 'Yellow' },
      ];

      baseConfigs.forEach(base => {
        this.generateTeamIsland(base.team, base.center, base.woolType);
      });

      // 4 Diamond Generator Islands placed at diagonals (dist ~ 28)
      const diaDist = 28;
      const diamondIslands = [
        { pos: new THREE.Vector3(-diaDist, 10, -diaDist), id: 'dia_nw' },
        { pos: new THREE.Vector3(diaDist, 10, -diaDist), id: 'dia_ne' },
        { pos: new THREE.Vector3(-diaDist, 10, diaDist), id: 'dia_sw' },
        { pos: new THREE.Vector3(diaDist, 10, diaDist), id: 'dia_se' },
      ];

      diamondIslands.forEach(dia => {
        this.generateDiamondIsland(dia.pos, dia.id);
      });

      // Center Island with Emerald Generators
      this.generateCenterIsland(new THREE.Vector3(0, 10, 0));
    }

    // Add surrounding ambient decorative floating cloud voxels
    this.generateSkyClouds();
  }

  // 1. Generate Team Island
  private generateTeamIsland(team: TeamId, center: THREE.Vector3, woolType: BlockType, isDuel = false) {
    const cx = Math.floor(center.x);
    const cy = Math.floor(center.y);
    const cz = Math.floor(center.z);

    const radius = isDuel ? 5 : 6;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= radius + 0.3) {
          // Top layer (Grass / Wool accent)
          const isAccent = dist > radius - 1.2;
          const topType = isAccent ? woolType : 'stone';
          this.addBlock(cx + x, cy, cz + z, topType, true);

          // Sub layers tapering down
          const depth = Math.floor((radius - dist) * 0.9) + 1;
          for (let d = 1; d <= depth; d++) {
            this.addBlock(cx + x, cy - d, cz + z, d === depth ? 'bedrock' : 'stone', true);
          }
        }
      }
    }

    // Base Spawner at center-back
    const dirToCenter = new THREE.Vector3(0, 0, 0).sub(center).normalize();
    const backOffset = dirToCenter.clone().multiplyScalar(isDuel ? -3.0 : -3.5);
    const spawnerPos = new THREE.Vector3(cx + Math.round(backOffset.x), cy + 1, cz + Math.round(backOffset.z));

    // Spawner pedestal
    this.addBlock(spawnerPos.x, cy, spawnerPos.z, 'stone', true);
    this.spawners.push({
      id: `spawner_${team}`,
      type: 'base',
      position: new THREE.Vector3(spawnerPos.x + 0.5, cy + 1.2, spawnerPos.z + 0.5),
      interval: isDuel ? 0.75 : 1.0,
      lastSpawnTime: 0,
      team,
      level: 0,
      name: `${team.toUpperCase()} Forge`,
    });

    // Create Team Bed
    const bedOffset = dirToCenter.clone().multiplyScalar(isDuel ? 2.5 : 3.0);
    const bedX = cx + Math.round(bedOffset.x);
    const bedZ = cz + Math.round(bedOffset.z);
    this.createBed(team, new THREE.Vector3(bedX, cy + 1, bedZ), woolType);

    // Create NPC Shopkeepers (Left: Item Shop, Right: Upgrade Shop)
    const perp = new THREE.Vector3(-dirToCenter.z, 0, dirToCenter.x).normalize();
    const shopPos = new THREE.Vector3(cx, cy + 1, cz).add(perp.clone().multiplyScalar(3.5));
    const upgPos = new THREE.Vector3(cx, cy + 1, cz).add(perp.clone().multiplyScalar(-3.5));

    this.createNPC('item_shop', team, shopPos, Math.atan2(-perp.x, -perp.z));
    this.createNPC('upgrade_shop', team, upgPos, Math.atan2(perp.x, perp.z));

    // Small protective arch over spawner
    this.addBlock(spawnerPos.x - 1, cy + 1, spawnerPos.z, 'wood', true);
    this.addBlock(spawnerPos.x + 1, cy + 1, spawnerPos.z, 'wood', true);
    this.addBlock(spawnerPos.x - 1, cy + 2, spawnerPos.z, 'wood', true);
    this.addBlock(spawnerPos.x + 1, cy + 2, spawnerPos.z, 'wood', true);
    this.addBlock(spawnerPos.x, cy + 3, spawnerPos.z, woolType, true);
  }

  // 2. Generate Diamond Island
  private generateDiamondIsland(center: THREE.Vector3, id: string) {
    const cx = Math.floor(center.x);
    const cy = Math.floor(center.y);
    const cz = Math.floor(center.z);

    const radius = 4;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= radius) {
          this.addBlock(cx + x, cy, cz + z, 'stone', true);
          const depth = Math.floor((radius - dist) * 0.8) + 1;
          for (let d = 1; d <= depth; d++) {
            this.addBlock(cx + x, cy - d, cz + z, 'bedrock', true);
          }
        }
      }
    }

    // Center Diamond Pillar
    this.addBlock(cx, cy + 1, cz, 'diamond_block', true);
    this.addBlock(cx, cy + 2, cz, 'endstone', true);

    this.spawners.push({
      id: `spawner_${id}`,
      type: 'diamond',
      position: new THREE.Vector3(cx + 0.5, cy + 3.2, cz + 0.5),
      interval: 30, // 30s base interval (Tier 1)
      lastSpawnTime: 0,
      level: 1,
      name: 'Diamond Generator',
    });
  }

  // 3. Generate Center Island (Emeralds - 4 Teams)
  private generateCenterIsland(center: THREE.Vector3) {
    const cx = Math.floor(center.x);
    const cy = Math.floor(center.y);
    const cz = Math.floor(center.z);

    const radius = 10;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= radius) {
          this.addBlock(cx + x, cy, cz + z, 'stone', true);
          const depth = Math.floor((radius - dist) * 0.7) + 1;
          for (let d = 1; d <= depth; d++) {
            this.addBlock(cx + x, cy - d, cz + z, 'bedrock', true);
          }
        }
      }
    }

    // Raised center monument with 4 Emerald Spawners
    const emPositions = [
      new THREE.Vector3(cx - 4, cy + 1, cz),
      new THREE.Vector3(cx + 4, cy + 1, cz),
      new THREE.Vector3(cx, cy + 1, cz - 4),
      new THREE.Vector3(cx, cy + 1, cz + 4),
    ];

    emPositions.forEach((pos, idx) => {
      this.addBlock(pos.x, pos.y, pos.z, 'emerald_block', true);
      this.addBlock(pos.x, pos.y + 1, pos.z, 'endstone', true);

      this.spawners.push({
        id: `spawner_em_${idx}`,
        type: 'emerald',
        position: new THREE.Vector3(pos.x + 0.5, pos.y + 2.2, pos.z + 0.5),
        interval: 55, // 55s base interval (Tier 1)
        lastSpawnTime: 0,
        level: 1,
        name: 'Emerald Generator',
      });
    });

    // Center tower structure
    for (let h = 1; h <= 4; h++) {
      this.addBlock(cx - 1, cy + h, cz - 1, 'obsidian', true);
      this.addBlock(cx + 1, cy + h, cz - 1, 'obsidian', true);
      this.addBlock(cx - 1, cy + h, cz + 1, 'obsidian', true);
      this.addBlock(cx + 1, cy + h, cz + 1, 'obsidian', true);
    }
    this.addBlock(cx, cy + 5, cz, 'emerald_block', true);
  }

  // 3-B. Generate Duel Center Arena (1v1 Mode)
  private generateDuelCenterIsland(center: THREE.Vector3) {
    const cx = Math.floor(center.x);
    const cy = Math.floor(center.y);
    const cz = Math.floor(center.z);

    const radius = 7;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= radius) {
          this.addBlock(cx + x, cy, cz + z, dist > radius - 1.2 ? 'wood' : 'stone', true);
          const depth = Math.floor((radius - dist) * 0.7) + 1;
          for (let d = 1; d <= depth; d++) {
            this.addBlock(cx + x, cy - d, cz + z, 'bedrock', true);
          }
        }
      }
    }

    // Central Emerald Spawner
    this.addBlock(cx, cy + 1, cz, 'emerald_block', true);
    this.addBlock(cx, cy + 2, cz, 'endstone', true);

    this.spawners.push({
      id: 'spawner_duel_em',
      type: 'emerald',
      position: new THREE.Vector3(cx + 0.5, cy + 3.2, cz + 0.5),
      interval: 45, // Fast emerald in 1v1 duel
      lastSpawnTime: 0,
      level: 1,
      name: 'Duel Emerald Generator',
    });
  }

  // 4. Create Voxel Bed
  private createBed(team: TeamId, pos: THREE.Vector3, woolType: BlockType) {
    const group = new THREE.Group();
    const bedMat = this.getMaterial(woolType);
    const whiteMat = this.getMaterial('wood');

    // Pillow (white part)
    const pillowGeo = new THREE.BoxGeometry(0.9, 0.45, 0.6);
    const pillowMesh = new THREE.Mesh(pillowGeo, whiteMat);
    pillowMesh.position.set(0, 0.225, -0.45);
    pillowMesh.castShadow = true;
    group.add(pillowMesh);

    // Blanket (Team colored part)
    const blanketGeo = new THREE.BoxGeometry(0.9, 0.45, 1.2);
    const blanketMesh = new THREE.Mesh(blanketGeo, bedMat);
    blanketMesh.position.set(0, 0.225, 0.35);
    blanketMesh.castShadow = true;
    group.add(blanketMesh);

    // 4 Oak legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.3, 0.18);
    const legMat = this.getMaterial('wood');
    [[-0.38, -0.85], [0.38, -0.85], [-0.38, 0.85], [0.38, 0.85]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, -0.1, lz);
      group.add(leg);
    });

    group.position.set(pos.x + 0.5, pos.y, pos.z + 0.5);
    this.scene.add(group);

    // We also register blocks into voxel grid so enemies can hit / mine the bed!
    this.addBlock(pos.x, pos.y, pos.z, woolType, false);
    this.addBlock(pos.x, pos.y, pos.z + 1, woolType, false);

    this.beds.set(team, {
      team,
      headPos: new THREE.Vector3(pos.x, pos.y, pos.z),
      footPos: new THREE.Vector3(pos.x, pos.y, pos.z + 1),
      group,
      alive: true,
    });
  }

  // 5. Create Voxel NPC Shopkeeper
  private createNPC(type: 'item_shop' | 'upgrade_shop', team: TeamId, pos: THREE.Vector3, rotationY: number) {
    const group = new THREE.Group();

    // Body & Head (Voxel Villager style)
    const bodyMat = new THREE.MeshStandardMaterial({ color: type === 'item_shop' ? 0x8d6e63 : 0x3f51b5 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });

    // Legs
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.4), bodyMat);
    legs.position.set(0, 0.35, 0);
    group.add(legs);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), bodyMat);
    body.position.set(0, 1.1, 0);
    group.add(body);

    // Crossed arms
    const arms = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.4), type === 'item_shop' ? bodyMat : greenMat);
    arms.position.set(0, 0.95, 0.25);
    group.add(arms);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), headMat);
    head.position.set(0, 1.75, 0);
    group.add(head);

    // Big Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.25, 0.18), headMat);
    nose.position.set(0, 1.65, 0.34);
    group.add(nose);

    // Floating text plate
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = type === 'item_shop' ? '#ffd54f' : '#80d8ff';
    ctx.fillText(type === 'item_shop' ? 'ITEM SHOP (E)' : 'UPGRADES (E)', 128, 40);

    const textTexture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: textTexture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 2.5, 0);
    sprite.scale.set(2.0, 0.5, 1);
    group.add(sprite);

    group.position.copy(pos);
    group.rotation.y = rotationY;
    this.scene.add(group);

    this.npcs.push({ type, team, position: pos, rotationY, group });
  }

  // 6. Sky clouds
  private generateSkyClouds() {
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    const cloudGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let c = 0; c < 12; c++) {
      const cx = (Math.random() - 0.5) * 160;
      const cz = (Math.random() - 0.5) * 160;
      const cy = 2 + Math.random() * 4;

      const w = 6 + Math.floor(Math.random() * 8);
      const l = 6 + Math.floor(Math.random() * 8);

      for (let x = 0; x < w; x++) {
        for (let z = 0; z < l; z++) {
          if (Math.random() > 0.3) {
            const mesh = new THREE.Mesh(cloudGeo, cloudMat);
            mesh.position.set(cx + x, cy, cz + z);
            this.scene.add(mesh);
          }
        }
      }
    }
  }

  // Update Spawners and Item Drops
  public update(deltaTime: number, currentTime: number) {
    // 1. Check spawners
    this.spawners.forEach(spawner => {
      let interval = spawner.interval;
      if (spawner.type === 'base') {
        // Interval boosted by forge level (level 0: 1.0s, level 1: 0.75s, level 2: 0.5s, level 3: 0.4s, level 4: 0.25s)
        const speeds = [1.0, 0.75, 0.5, 0.4, 0.25];
        interval = speeds[Math.min(speeds.length - 1, spawner.level)];
        if (this.gameMode === 'duel_1v1') interval *= 0.75; // 25% faster for duels
      }

      if (currentTime - spawner.lastSpawnTime >= interval) {
        spawner.lastSpawnTime = currentTime;

        if (spawner.type === 'base') {
          // Iron drop
          this.spawnResourceDrop('iron', spawner.position, 1, 30);
          // Gold drop chance (every ~4-6 iron)
          if (Math.random() < 0.25 + spawner.level * 0.1) {
            this.spawnResourceDrop('gold', spawner.position, 1, 15);
          }
          // Level 3+ Emerald forge
          if (spawner.level >= 3 && Math.random() < 0.1) {
            this.spawnResourceDrop('emerald', spawner.position, 1, 8);
          }
        } else if (spawner.type === 'diamond') {
          this.spawnResourceDrop('diamond', spawner.position, 1, 10);
        } else if (spawner.type === 'emerald') {
          this.spawnResourceDrop('emerald', spawner.position, 1, 8);
        }
      }
    });

    // 2. Animate resource drops (bobbing & spinning)
    for (let i = this.resourceDrops.length - 1; i >= 0; i--) {
      const drop = this.resourceDrops[i];
      drop.mesh.rotation.y += deltaTime * 2.5;
      const elapsed = currentTime - drop.spawnTime;
      drop.mesh.position.y = drop.position.y + Math.sin(elapsed * 4) * 0.15;

      // Despawn after 90 seconds if untouched to prevent memory bloat
      if (elapsed > 90) {
        this.scene.remove(drop.mesh);
        this.resourceDrops.splice(i, 1);
      }
    }
  }

  // Spawn Resource Drop In-Game with local stack cap to prevent lag
  public spawnResourceDrop(type: ResourceType, pos: THREE.Vector3, amount = 1, localCap = 30) {
    // Check nearby drops count to avoid excessive items piling up in one generator
    let nearbyCount = 0;
    for (const drop of this.resourceDrops) {
      if (drop.type === type && drop.position.distanceTo(pos) < 3.5) {
        nearbyCount += drop.amount;
      }
    }

    if (nearbyCount >= localCap) {
      // Local spawner cap reached! Skip spawning new drop to prevent lag
      return;
    }

    // Limit global ground drops to 90
    if (this.resourceDrops.length > 90) {
      const oldest = this.resourceDrops.shift()!;
      this.scene.remove(oldest.mesh);
    }

    const geo = this.dropGeometries[type];
    const mat = this.dropMaterials[type];
    const mesh = new THREE.Mesh(geo, mat);

    // Random small scatter around spawner
    const offsetX = (Math.random() - 0.5) * 0.6;
    const offsetZ = (Math.random() - 0.5) * 0.6;
    mesh.position.set(pos.x + offsetX, pos.y, pos.z + offsetZ);
    mesh.castShadow = true;

    this.scene.add(mesh);
    this.resourceDrops.push({
      id: Math.random().toString(36).substring(2, 9),
      type,
      position: mesh.position.clone(),
      mesh,
      spawnTime: performance.now() / 1000,
      amount,
    });
  }

  // TNT / Fireball Explosion (destroys non-blast-resistant blocks & blast physics)
  public createExplosion(center: THREE.Vector3, radius: number, isFireball = false): Array<{ key: string; type: BlockType }> {
    const destroyed: Array<{ key: string; type: BlockType }> = [];
    const minX = Math.floor(center.x - radius);
    const maxX = Math.floor(center.x + radius);
    const minY = Math.floor(center.y - radius);
    const maxY = Math.floor(center.y + radius);
    const minZ = Math.floor(center.z - radius);
    const maxZ = Math.floor(center.z + radius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const dist = center.distanceTo(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
          if (dist <= radius) {
            const block = this.getBlock(x, y, z);
            if (block && !block.unbreakable) {
              // Glass and Obsidian are immune to explosions
              if (block.type === 'glass' || block.type === 'obsidian') {
                continue;
              }
              // Wood has high resistance to Fireball
              if (isFireball && block.type === 'wood' && Math.random() > 0.3) {
                continue;
              }

              this.removeBlock(x, y, z, false);
              destroyed.push({ key: `${x},${y},${z}`, type: block.type });
            }
          }
        }
      }
    }

    return destroyed;
  }
}

