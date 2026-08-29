import * as THREE from 'three';
import { BlockType, TeamId } from '../types/game';
import { WorldManager } from './world';
import { soundManager } from '../audio/soundManager';

export interface Projectile {
  id: string;
  type: 'arrow' | 'fireball' | 'ender_pearl' | 'bridge_egg' | 'tnt';
  ownerId: string;
  ownerTeam: TeamId;
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  spawnTime: number;
  maxAge: number;
  radius: number;
}

export class ProjectileManager {
  private scene: THREE.Scene;
  private world: WorldManager;
  public projectiles: Projectile[] = [];

  // Particle systems
  private particleGeos: THREE.BufferGeometry;
  private particleMats: THREE.PointsMaterial;
  private activeParticles: Array<{
    points: THREE.Points;
    velocities: THREE.Vector3[];
    spawnTime: number;
    lifespan: number;
  }> = [];

  constructor(scene: THREE.Scene, world: WorldManager) {
    this.scene = scene;
    this.world = world;

    this.particleGeos = new THREE.BufferGeometry();
    this.particleMats = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
  }

  // Shoot Arrow
  public shootArrow(ownerId: string, team: TeamId, startPos: THREE.Vector3, direction: THREE.Vector3, force = 32) {
    const arrowGroup = new THREE.Group();

    // Arrow shaft (wood)
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft);

    // Arrow tip (flint)
    const tipGeo = new THREE.ConeGeometry(0.08, 0.2, 6);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x424242 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = 0.45;
    arrowGroup.add(tip);

    // Arrow feathers
    const featherGeo = new THREE.BoxGeometry(0.18, 0.18, 0.05);
    const featherMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.position.z = -0.35;
    arrowGroup.add(feather);

    arrowGroup.position.copy(startPos);
    arrowGroup.lookAt(startPos.clone().add(direction));

    this.scene.add(arrowGroup);
    soundManager.playBowShoot();

    this.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      type: 'arrow',
      ownerId,
      ownerTeam: team,
      mesh: arrowGroup,
      velocity: direction.clone().normalize().multiplyScalar(force),
      spawnTime: performance.now() / 1000,
      maxAge: 8,
      radius: 0.2,
    });
  }

  // Shoot Fireball
  public shootFireball(ownerId: string, team: TeamId, startPos: THREE.Vector3, direction: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.35, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff5722,
      emissive: 0xff3d00,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    soundManager.playSwordSwing();

    this.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      type: 'fireball',
      ownerId,
      ownerTeam: team,
      mesh,
      velocity: direction.clone().normalize().multiplyScalar(22),
      spawnTime: performance.now() / 1000,
      maxAge: 5,
      radius: 0.35,
    });
  }

  // Throw Ender Pearl
  public throwEnderPearl(ownerId: string, team: TeamId, startPos: THREE.Vector3, direction: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.2, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x004d40,
      emissive: 0x00bfa5,
      emissiveIntensity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    this.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      type: 'ender_pearl',
      ownerId,
      ownerTeam: team,
      mesh,
      velocity: direction.clone().normalize().multiplyScalar(26).add(new THREE.Vector3(0, 3.5, 0)),
      spawnTime: performance.now() / 1000,
      maxAge: 6,
      radius: 0.2,
    });
  }

  // Throw Bridge Egg
  public throwBridgeEgg(ownerId: string, team: TeamId, startPos: THREE.Vector3, direction: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.22, 10, 10);
    const mat = new THREE.MeshStandardMaterial({ color: 0xfff9c4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    this.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      type: 'bridge_egg',
      ownerId,
      ownerTeam: team,
      mesh,
      velocity: direction.clone().normalize().multiplyScalar(18).add(new THREE.Vector3(0, 2.0, 0)),
      spawnTime: performance.now() / 1000,
      maxAge: 5,
      radius: 0.25,
    });
  }

  // Spawn Primed TNT
  public spawnPrimedTNT(ownerId: string, team: TeamId, position: THREE.Vector3) {
    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const mat = this.world.getMaterial('tnt').clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    soundManager.playTNTFuse();

    this.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      type: 'tnt',
      ownerId,
      ownerTeam: team,
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 3.5, (Math.random() - 0.5) * 1.5),
      spawnTime: performance.now() / 1000,
      maxAge: 2.8, // 2.8s fuse
      radius: 0.5,
    });
  }

  // Update Projectiles and Physics
  public update(
    deltaTime: number,
    currentTime: number,
    onHitEntity: (proj: Projectile, hitPos: THREE.Vector3) => void,
    onEnderPearlLand: (ownerId: string, landingPos: THREE.Vector3) => void,
    onExplosion: (pos: THREE.Vector3, radius: number, isFireball: boolean) => void
  ) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const elapsed = currentTime - proj.spawnTime;

      // 1. Check Lifetime expiry
      if (elapsed >= proj.maxAge) {
        if (proj.type === 'tnt') {
          // Explode
          this.scene.remove(proj.mesh);
          this.projectiles.splice(i, 1);
          soundManager.playExplosion();
          onExplosion(proj.mesh.position, 4.0, false);
          this.spawnExplosionParticles(proj.mesh.position);
          continue;
        }
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // 2. Physics & Gravity
      if (proj.type === 'arrow' || proj.type === 'ender_pearl' || proj.type === 'bridge_egg' || proj.type === 'tnt') {
        proj.velocity.y -= 18.0 * deltaTime; // Gravity
      }

      // 3. Primed TNT flashing white animation
      if (proj.type === 'tnt') {
        const flashRate = Math.floor(elapsed * 8) % 2 === 0;
        const mesh = proj.mesh as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(flashRate ? 0xffffff : 0x000000);
        mat.emissiveIntensity = flashRate ? 0.9 : 0.0;
      }

      // 4. Bridge Egg trailing blocks
      if (proj.type === 'bridge_egg') {
        const teamWoolMap: Record<TeamId, BlockType> = {
          red: 'wool_red',
          blue: 'wool_blue',
          green: 'wool_green',
          yellow: 'wool_yellow',
        };
        const woolType = teamWoolMap[proj.ownerTeam] || 'wool_red';
        const blockPos = proj.mesh.position.clone().add(new THREE.Vector3(0, -1.2, 0));
        const bx = Math.floor(blockPos.x);
        const by = Math.floor(blockPos.y);
        const bz = Math.floor(blockPos.z);

        if (!this.world.isSolid(bx, by, bz) && by > 0) {
          this.world.addBlock(bx, by, bz, woolType, false);
          soundManager.playBlockPlace('wool');
        }
      }

      // 5. Move step
      const step = proj.velocity.clone().multiplyScalar(deltaTime);
      const nextPos = proj.mesh.position.clone().add(step);

      // Rotate arrow or pearl to match velocity
      if (proj.type === 'arrow' && proj.velocity.lengthSq() > 0.1) {
        proj.mesh.lookAt(proj.mesh.position.clone().add(proj.velocity));
      }

      // 6. Raycast Voxel World Collision
      const ray = new THREE.Ray(proj.mesh.position, proj.velocity.clone().normalize());
      const dist = step.length();
      let hitBlock = false;

      // Check small increments along step
      const checks = Math.max(2, Math.ceil(dist / 0.5));
      for (let s = 1; s <= checks; s++) {
        const checkPos = proj.mesh.position.clone().add(ray.direction.clone().multiplyScalar((dist / checks) * s));
        const bx = Math.floor(checkPos.x);
        const by = Math.floor(checkPos.y);
        const bz = Math.floor(checkPos.z);

        if (this.world.isSolid(bx, by, bz)) {
          hitBlock = true;
          nextPos.copy(checkPos);
          break;
        }
      }

      if (hitBlock) {
        if (proj.type === 'fireball') {
          this.scene.remove(proj.mesh);
          this.projectiles.splice(i, 1);
          soundManager.playExplosion();
          onExplosion(nextPos, 3.2, true);
          this.spawnExplosionParticles(nextPos);
          continue;
        } else if (proj.type === 'ender_pearl') {
          this.scene.remove(proj.mesh);
          this.projectiles.splice(i, 1);
          soundManager.playTeleport();
          onEnderPearlLand(proj.ownerId, nextPos);
          continue;
        } else if (proj.type === 'bridge_egg' || proj.type === 'arrow') {
          this.scene.remove(proj.mesh);
          this.projectiles.splice(i, 1);
          continue;
        } else if (proj.type === 'tnt') {
          // Bounce
          proj.velocity.set(0, 0, 0);
          continue;
        }
      }

      proj.mesh.position.copy(nextPos);
    }

    // Update Particles
    this.updateParticles(deltaTime, currentTime);
  }

  // Spawn visual explosion debris and smoke
  public spawnExplosionParticles(center: THREE.Vector3) {
    const count = 30;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = center.x;
      positions[i * 3 + 1] = center.y;
      positions[i * 3 + 2] = center.z;

      // Orange, yellow, dark gray smoke
      const r = Math.random();
      if (r > 0.6) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.4; colors[i * 3 + 2] = 0.0;
      } else if (r > 0.3) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.1;
      } else {
        colors[i * 3] = 0.3; colors[i * 3 + 1] = 0.3; colors[i * 3 + 2] = 0.3;
      }

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() * 8) + 2,
        (Math.random() - 0.5) * 12
      );
      velocities.push(vel);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(geo, this.particleMats);
    this.scene.add(points);

    this.activeParticles.push({
      points,
      velocities,
      spawnTime: performance.now() / 1000,
      lifespan: 1.2,
    });
  }

  private updateParticles(deltaTime: number, currentTime: number) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const part = this.activeParticles[i];
      const elapsed = currentTime - part.spawnTime;
      if (elapsed > part.lifespan) {
        this.scene.remove(part.points);
        this.activeParticles.splice(i, 1);
        continue;
      }

      const posAttr = part.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      for (let j = 0; j < part.velocities.length; j++) {
        part.velocities[j].y -= 9.8 * deltaTime;
        array[j * 3] += part.velocities[j].x * deltaTime;
        array[j * 3 + 1] += part.velocities[j].y * deltaTime;
        array[j * 3 + 2] += part.velocities[j].z * deltaTime;
      }
      posAttr.needsUpdate = true;
    }
  }
}
