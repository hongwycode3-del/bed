import * as THREE from 'three';
import { 
  ArmorTier, 
  BlockType, 
  HotbarSlot, 
  InventoryResources, 
  ActivePotionEffect, 
  TeamId, 
  ToolTier, 
  WeaponTier 
} from '../types/game';
import { WorldManager } from './world';
import { ProjectileManager } from './projectiles';
import { soundManager } from '../audio/soundManager';
import { createHumanoidModel, HumanoidModel } from './humanoid';
import { getBreakOverlayTexture } from './textures';

export class PlayerController {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public world: WorldManager;
  public projectiles: ProjectileManager;

  // Identity & State
  public id: string = 'player';
  public name: string = 'Player';
  public team: TeamId;
  public health: number = 20;
  public maxHealth: number = 20;
  public absorptionHp: number = 0;
  public isAlive: boolean = true;
  public isSpectator: boolean = false;
  public respawnTimer: number = 0;

  // Equipment & Inventory
  public resources: InventoryResources = { iron: 0, gold: 0, diamond: 0, emerald: 0 };
  public armorTier: ArmorTier = 'leather';
  public weaponTier: WeaponTier = 'wood';
  public pickaxeTier: ToolTier = 'none';
  public axeTier: ToolTier = 'none';
  public hasShears: boolean = false;
  public hotbar: (HotbarSlot | null)[] = new Array(9).fill(null);
  public selectedSlotIndex: number = 0;
  public activeEffects: ActivePotionEffect[] = [];

  // Physics & Movement
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = false;
  public isSneaking: boolean = false;
  public isSprinting: boolean = false;
  public pitch: number = 0; // Look up/down
  public yaw: number = 0;   // Look left/right
  public isThirdPerson: boolean = false;

  // Visuals & 3D Model
  public model: HumanoidModel;
  public ghostBlockMesh: THREE.Mesh;
  public breakOverlayMesh: THREE.Mesh;

  // Input states
  public keys: Record<string, boolean> = {};
  public mouseLeftPressed: boolean = false;
  public mouseRightPressed: boolean = false;

  // Combat & Mining State
  public lastAttackTime: number = 0;
  public attackCooldown: number = 0.4;
  public miningBlockPos: THREE.Vector3 | null = null;
  public miningProgress: number = 0; // 0 to 1
  public miningTimeRequired: number = 1.0;
  public useItemProgress: number = 0;
  public isUsingItem: boolean = false;

  // Raycaster for targeting blocks and entities
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  public targetedBlock: { pos: THREE.Vector3; normal: THREE.Vector3; type: BlockType } | null = null;
  public targetedEntityId: string | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    world: WorldManager,
    projectiles: ProjectileManager,
    team: TeamId = 'red',
    playerName = 'You'
  ) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.projectiles = projectiles;
    this.team = team;
    this.name = playerName;

    // Create 3D character mesh
    this.model = createHumanoidModel(this.name, this.team, true);
    this.scene.add(this.model.group);

    // Ghost block for place preview
    const ghostGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    this.ghostBlockMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghostBlockMesh.visible = false;
    this.scene.add(this.ghostBlockMesh);

    // Break crack overlay
    const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const crackMat = new THREE.MeshBasicMaterial({
      map: getBreakOverlayTexture(0),
      transparent: true,
      depthTest: true,
    });
    this.breakOverlayMesh = new THREE.Mesh(crackGeo, crackMat);
    this.breakOverlayMesh.visible = false;
    this.scene.add(this.breakOverlayMesh);

    this.initDefaultInventory();
    this.respawn();
  }

  public initDefaultInventory() {
    this.hotbar = new Array(9).fill(null);
    // Slot 0: Wooden Sword
    this.hotbar[0] = {
      id: 'default_sword',
      type: 'weapon',
      name: 'Wooden Sword',
      nameKo: '나무 검',
      count: 1,
      weaponTier: 'wood',
      icon: '🗡️',
    };
    this.weaponTier = 'wood';
    this.model.setWeapon('wood');
    this.model.setArmor('leather', this.team);
  }

  public respawn() {
    this.isAlive = true;
    this.isSpectator = false;
    this.health = this.maxHealth;
    this.absorptionHp = 0;
    this.velocity.set(0, 0, 0);

    // Spawn at team island
    const spawnPos = this.world.getTeamSpawnPosition(this.team);
    this.position.copy(spawnPos);

    // Look towards center
    this.yaw = Math.atan2(-spawnPos.x, -spawnPos.z);
    this.pitch = 0;

    // Reset weapons to default if lost, keep armor tier
    if (!this.hotbar.some(slot => slot?.type === 'weapon')) {
      this.hotbar[0] = {
        id: 'sword',
        type: 'weapon',
        name: 'Wooden Sword',
        nameKo: '나무 검',
        count: 1,
        weaponTier: 'wood',
        icon: '🗡️',
      };
      this.weaponTier = 'wood';
    }
    this.model.setWeapon(this.weaponTier);
    this.model.setArmor(this.armorTier, this.team);
    this.model.updateHealthDisplay(this.health, this.maxHealth, this.absorptionHp);
  }

  // Get currently held item
  public getHeldItem(): HotbarSlot | null {
    return this.hotbar[this.selectedSlotIndex] || null;
  }

  // Add Item to Inventory
  public addItem(item: HotbarSlot): boolean {
    // If stackable block or item exists, increment count
    if (item.type === 'block' || item.itemType === 'arrow' || item.itemType === 'golden_apple' || item.itemType === 'fireball' || item.itemType === 'ender_pearl' || item.itemType === 'bridge_egg') {
      for (let i = 0; i < 9; i++) {
        const slot = this.hotbar[i];
        if (slot && slot.name === item.name && slot.blockType === item.blockType && slot.count < 64) {
          slot.count += item.count;
          return true;
        }
      }
    }

    // Find first empty slot
    for (let i = 0; i < 9; i++) {
      if (!this.hotbar[i]) {
        this.hotbar[i] = { ...item };
        if (i === this.selectedSlotIndex && item.weaponTier) {
          this.weaponTier = item.weaponTier;
          this.model.setWeapon(item.weaponTier);
        }
        return true;
      }
    }
    return false;
  }

  // Handle Damage & Knockback
  public takeDamage(damage: number, knockbackDir?: THREE.Vector3, protLevel = 0): boolean {
    if (!this.isAlive || this.isSpectator) return false;

    // Calculate Armor reduction
    const armorReductions: Record<ArmorTier, number> = {
      leather: 0.1,
      chainmail: 0.3,
      iron: 0.5,
      diamond: 0.7,
    };
    const baseReduct = armorReductions[this.armorTier] || 0;
    const protReduct = protLevel * 0.08;
    const totalReduct = Math.min(0.85, baseReduct + protReduct);
    const finalDamage = Math.max(1, damage * (1 - totalReduct));

    // Absorb with absorption hearts first
    if (this.absorptionHp > 0) {
      if (this.absorptionHp >= finalDamage) {
        this.absorptionHp -= finalDamage;
      } else {
        const rem = finalDamage - this.absorptionHp;
        this.absorptionHp = 0;
        this.health -= rem;
      }
    } else {
      this.health -= finalDamage;
    }

    soundManager.playHitSound();
    this.model.flashHurt();
    this.model.updateHealthDisplay(this.health, this.maxHealth, this.absorptionHp);

    // Apply Knockback velocity
    if (knockbackDir) {
      this.velocity.x += knockbackDir.x * 12;
      this.velocity.y = Math.max(this.velocity.y + 4.5, 4.5);
      this.velocity.z += knockbackDir.z * 12;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      return true; // Died
    }
    return false;
  }

  // Update Loop
  public update(
    deltaTime: number,
    currentTime: number,
    onKill: (victimId: string, isFinal: boolean) => void,
    onBedDestroy: (team: TeamId) => void
  ) {
    if (!this.isAlive) {
      return;
    }

    // 1. Potion Effects countdown & buffs
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const eff = this.activeEffects[i];
      eff.timeLeft -= deltaTime;
      if (eff.timeLeft <= 0) {
        this.activeEffects.splice(i, 1);
      }
    }

    const hasSpeed = this.activeEffects.some(e => e.type === 'speed');
    const hasJump = this.activeEffects.some(e => e.type === 'jump');
    const hasInvis = this.activeEffects.some(e => e.type === 'invisibility');
    const hasRegen = this.activeEffects.some(e => e.type === 'regeneration');

    if (hasRegen && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + deltaTime * 1.5);
      this.model.updateHealthDisplay(this.health, this.maxHealth, this.absorptionHp);
    }

    // Invisibility model transparency
    this.model.group.visible = !hasInvis || this.isThirdPerson;

    // 2. Movement & Physics
    let moveSpeed = 6.0;
    if (this.isSprinting) moveSpeed = 8.5;
    if (this.isSneaking) moveSpeed = 3.0;
    if (hasSpeed) moveSpeed *= 1.35;

    const moveVector = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      // Rotate by player Yaw
      const moveQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      moveVector.applyQuaternion(moveQuat);

      this.velocity.x = moveVector.x * moveSpeed;
      this.velocity.z = moveVector.z * moveSpeed;
    } else {
      this.velocity.x *= 0.65;
      this.velocity.z *= 0.65;
    }

    // Jump
    if ((this.keys['Space']) && this.isGrounded) {
      this.velocity.y = hasJump ? 12.0 : 8.5;
      this.isGrounded = false;
    }

    // Gravity
    this.velocity.y -= 26.0 * deltaTime;

    // 3. Collision Detection & Step
    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * deltaTime;
    nextPos.z += this.velocity.z * deltaTime;

    // Player AABB Box (0.6 x 1.8 x 0.6)
    const playerBox = new THREE.Box3();
    const halfW = 0.3;

    // X collision
    playerBox.min.set(nextPos.x - halfW, this.position.y, this.position.z - halfW);
    playerBox.max.set(nextPos.x + halfW, this.position.y + 1.8, this.position.z + halfW);
    if (!this.world.checkAABBCollision(playerBox)) {
      this.position.x = nextPos.x;
    } else {
      this.velocity.x = 0;
    }

    // Z collision
    playerBox.min.set(this.position.x - halfW, this.position.y, nextPos.z - halfW);
    playerBox.max.set(this.position.x + halfW, this.position.y + 1.8, nextPos.z + halfW);
    if (!this.world.checkAABBCollision(playerBox)) {
      this.position.z = nextPos.z;
    } else {
      this.velocity.z = 0;
    }

    // Y collision (Ground & Ceil)
    const nextY = this.position.y + this.velocity.y * deltaTime;
    playerBox.min.set(this.position.x - halfW, nextY, this.position.z - halfW);
    playerBox.max.set(this.position.x + halfW, nextY + 1.8, this.position.z + halfW);

    if (!this.world.checkAABBCollision(playerBox)) {
      this.position.y = nextY;
      this.isGrounded = false;
    } else {
      if (this.velocity.y < 0) {
        // Landed on block
        this.position.y = Math.ceil(nextY);
        this.isGrounded = true;
      }
      this.velocity.y = 0;
    }

    // Sneaking Edge Snapping (prevents walking off block edges if shift held)
    if (this.isSneaking && this.isGrounded) {
      const belowCheck = new THREE.Vector3(this.position.x, this.position.y - 0.5, this.position.z);
      if (!this.world.isSolid(Math.floor(belowCheck.x), Math.floor(belowCheck.y), Math.floor(belowCheck.z))) {
        this.position.x -= this.velocity.x * deltaTime;
        this.position.z -= this.velocity.z * deltaTime;
      }
    }

    // Void death check
    if (this.position.y < -15) {
      this.takeDamage(100);
      return;
    }

    // 4. Update Camera Position & Rotation
    const eyeHeight = this.isSneaking ? 1.4 : 1.62;
    if (this.isThirdPerson) {
      const backDist = 3.5;
      const camOffset = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch) * backDist,
        Math.sin(this.pitch) * backDist + eyeHeight,
        -Math.cos(this.yaw) * Math.cos(this.pitch) * backDist
      );
      this.camera.position.copy(this.position).add(camOffset);
      this.camera.lookAt(this.position.x, this.position.y + eyeHeight, this.position.z);
    } else {
      this.camera.position.set(this.position.x, this.position.y + eyeHeight, this.position.z);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }

    // 5. Update 3D Character Model
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.yaw;
    const isMoving = Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.z) > 0.5;
    const isAttacking = currentTime - this.lastAttackTime < 0.25;
    this.model.updateAnimation(isMoving, isAttacking, currentTime);

    // 6. Raycast block targeting (range: 4.8 blocks)
    this.updateTargeting();

    // 7. Auto Pick Up Nearby Resources (Range: 1.8 blocks)
    for (let i = this.world.resourceDrops.length - 1; i >= 0; i--) {
      const drop = this.world.resourceDrops[i];
      if (this.position.distanceTo(drop.position) <= 2.0) {
        this.resources[drop.type] += drop.amount;
        soundManager.playPickup(drop.type);
        this.world.scene.remove(drop.mesh);
        this.world.resourceDrops.splice(i, 1);
      }
    }

    // 8. Continuous Mining loop
    if (this.mouseLeftPressed && this.targetedBlock) {
      const block = this.world.getBlock(this.targetedBlock.pos.x, this.targetedBlock.pos.y, this.targetedBlock.pos.z);
      if (block && !block.unbreakable) {
        if (!this.miningBlockPos || !this.miningBlockPos.equals(this.targetedBlock.pos)) {
          this.miningBlockPos = this.targetedBlock.pos.clone();
          this.miningProgress = 0;
          this.calculateMiningTime(block.type);
        }

        this.miningProgress += deltaTime / this.miningTimeRequired;
        const stage = Math.min(5, Math.floor(this.miningProgress * 6));
        (this.breakOverlayMesh.material as THREE.MeshBasicMaterial).map = getBreakOverlayTexture(stage);
        this.breakOverlayMesh.position.set(
          this.targetedBlock.pos.x + 0.5,
          this.targetedBlock.pos.y + 0.5,
          this.targetedBlock.pos.z + 0.5
        );
        this.breakOverlayMesh.visible = true;

        if (this.miningProgress >= 1.0) {
          // Block Broken!
          this.world.removeBlock(this.targetedBlock.pos.x, this.targetedBlock.pos.y, this.targetedBlock.pos.z);
          soundManager.playBlockBreak();
          this.miningBlockPos = null;
          this.miningProgress = 0;
          this.breakOverlayMesh.visible = false;

          // Check if this was an enemy Bed!
          this.world.beds.forEach((bed, teamId) => {
            if (teamId !== this.team && bed.alive) {
              if (
                bed.headPos.equals(this.targetedBlock!.pos) ||
                bed.footPos.equals(this.targetedBlock!.pos)
              ) {
                bed.alive = false;
                this.world.scene.remove(bed.group);
                soundManager.playBedBreak();
                onBedDestroy(teamId);
              }
            }
          });
        }
      } else {
        this.breakOverlayMesh.visible = false;
      }
    } else {
      this.miningBlockPos = null;
      this.miningProgress = 0;
      this.breakOverlayMesh.visible = false;
    }
  }

  // Calculate mining speed based on held tools and block type
  private calculateMiningTime(type: BlockType) {
    let baseTime = 1.0;
    if (type.includes('wool')) {
      baseTime = this.hasShears ? 0.05 : 0.4;
    } else if (type === 'wood') {
      baseTime = this.axeTier === 'iron' ? 0.3 : 1.2;
    } else if (type === 'endstone') {
      baseTime = this.pickaxeTier === 'diamond' ? 0.6 : this.pickaxeTier === 'iron' ? 1.0 : 2.5;
    } else if (type === 'obsidian') {
      baseTime = this.pickaxeTier === 'diamond' ? 3.5 : 25.0; // Obsidian requires diamond pickaxe!
    } else if (type === 'glass') {
      baseTime = 0.2;
    }
    this.miningTimeRequired = baseTime;
  }

  // Raycast from center of screen to find target block
  private updateTargeting() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const range = 4.8;
    const start = this.camera.position.clone();
    const dir = this.raycaster.ray.direction.clone().normalize();

    this.targetedBlock = null;
    this.ghostBlockMesh.visible = false;

    // Step along ray
    for (let d = 0.2; d <= range; d += 0.1) {
      const p = start.clone().add(dir.clone().multiplyScalar(d));
      const bx = Math.floor(p.x);
      const by = Math.floor(p.y);
      const bz = Math.floor(p.z);

      if (this.world.isSolid(bx, by, bz)) {
        // Found hit block! Calculate hit normal
        const blockCenter = new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5);
        const diff = p.clone().sub(blockCenter);
        const normal = new THREE.Vector3();

        if (Math.abs(diff.x) > Math.abs(diff.y) && Math.abs(diff.x) > Math.abs(diff.z)) {
          normal.x = Math.sign(diff.x);
        } else if (Math.abs(diff.y) > Math.abs(diff.x) && Math.abs(diff.y) > Math.abs(diff.z)) {
          normal.y = Math.sign(diff.y);
        } else {
          normal.z = Math.sign(diff.z);
        }

        const block = this.world.getBlock(bx, by, bz)!;
        this.targetedBlock = {
          pos: new THREE.Vector3(bx, by, bz),
          normal,
          type: block.type,
        };

        // If holding a block, show ghost preview
        const held = this.getHeldItem();
        if (held && (held.type === 'block' || held.blockType)) {
          const placePos = new THREE.Vector3(bx, by, bz).add(normal);
          this.ghostBlockMesh.position.set(placePos.x + 0.5, placePos.y + 0.5, placePos.z + 0.5);
          this.ghostBlockMesh.visible = true;
        }
        break;
      }
    }
  }

  // Left Click: Attack or Mine
  public performAttack(onHitBot: (damage: number, knockback: THREE.Vector3) => void, sharpnessLevel = 0) {
    this.lastAttackTime = performance.now() / 1000;
    soundManager.playSwordSwing();

    // Damage calculation based on weapon tier
    const weaponDamages: Record<WeaponTier, number> = {
      none: 1.5,
      wood: 4.0,
      stone: 5.0,
      iron: 6.0,
      diamond: 7.5,
    };
    const held = this.getHeldItem();
    let dmg = weaponDamages[this.weaponTier] || 4.0;
    if (held?.itemType === 'knockback_stick') {
      dmg = 2.0;
    }

    // Team Sharpness Enchantment Bonus (+1.5 per level)
    if (sharpnessLevel > 0) {
      dmg += sharpnessLevel * 1.5;
    }

    // Critical Hit if falling
    const isCrit = this.velocity.y < -0.5 && !this.isGrounded;
    if (isCrit) dmg *= 1.5;

    // Knockback vector
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0.2, -Math.cos(this.yaw)).normalize();
    if (held?.itemType === 'knockback_stick') {
      forward.multiplyScalar(2.5); // Super knockback!
    }

    onHitBot(dmg, forward);
  }

  // Right Click: Place Block or Use Item
  public performRightClick(onOpenShop: () => void) {
    const held = this.getHeldItem();

    // Check if clicked an NPC Shopkeeper
    if (this.targetedBlock) {
      for (const npc of this.world.npcs) {
        if (npc.team === this.team && this.position.distanceTo(npc.position) < 4.0) {
          onOpenShop();
          return;
        }
      }
    }

    if (!held) return;

    // 1. Place Block
    if (held.type === 'block' && this.targetedBlock) {
      const placePos = this.targetedBlock.pos.clone().add(this.targetedBlock.normal);
      // Check if place block overlaps player
      const blockBox = new THREE.Box3(placePos, placePos.clone().add(new THREE.Vector3(1, 1, 1)));
      const playerBox = new THREE.Box3(
        new THREE.Vector3(this.position.x - 0.3, this.position.y, this.position.z - 0.3),
        new THREE.Vector3(this.position.x + 0.3, this.position.y + 1.8, this.position.z + 0.3)
      );

      if (!blockBox.intersectsBox(playerBox)) {
        if (held.blockType === 'tnt') {
          // Spawn primed TNT immediately!
          this.projectiles.spawnPrimedTNT(this.id, this.team, placePos.clone().add(new THREE.Vector3(0.5, 0.5, 0.5)));
        } else {
          let bType: BlockType = held.blockType || 'wool_red';
          if (bType.startsWith('wool_')) {
            const teamWool: Record<TeamId, BlockType> = {
              red: 'wool_red',
              blue: 'wool_blue',
              green: 'wool_green',
              yellow: 'wool_yellow',
            };
            bType = teamWool[this.team];
          }
          this.world.addBlock(placePos.x, placePos.y, placePos.z, bType, false);
          soundManager.playBlockPlace(bType);
        }

        held.count--;
        if (held.count <= 0) {
          this.hotbar[this.selectedSlotIndex] = null;
        }
        return;
      }
    }

    // 2. Use Utility Items
    if (held.itemType === 'golden_apple') {
      // Eat Golden Apple
      soundManager.playPotionDrink();
      this.absorptionHp = Math.min(8, this.absorptionHp + 4);
      this.activeEffects.push({ type: 'regeneration', timeLeft: 5, duration: 5 });
      this.model.updateHealthDisplay(this.health, this.maxHealth, this.absorptionHp);
      held.count--;
      if (held.count <= 0) this.hotbar[this.selectedSlotIndex] = null;
      return;
    }

    if (held.itemType === 'fireball') {
      // Shoot Fireball
      const lookDir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
      const launchPos = this.camera.position.clone().add(lookDir.clone().multiplyScalar(0.8));
      this.projectiles.shootFireball(this.id, this.team, launchPos, lookDir);
      held.count--;
      if (held.count <= 0) this.hotbar[this.selectedSlotIndex] = null;
      return;
    }

    if (held.itemType === 'ender_pearl') {
      // Throw Ender Pearl
      const lookDir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
      const launchPos = this.camera.position.clone().add(lookDir.clone().multiplyScalar(0.8));
      this.projectiles.throwEnderPearl(this.id, this.team, launchPos, lookDir);
      held.count--;
      if (held.count <= 0) this.hotbar[this.selectedSlotIndex] = null;
      return;
    }

    if (held.itemType === 'bridge_egg') {
      // Throw Bridge Egg
      const lookDir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
      const launchPos = this.camera.position.clone().add(lookDir.clone().multiplyScalar(0.8));
      this.projectiles.throwBridgeEgg(this.id, this.team, launchPos, lookDir);
      held.count--;
      if (held.count <= 0) this.hotbar[this.selectedSlotIndex] = null;
      return;
    }

    if (held.itemType === 'bow') {
      // Shoot Arrow if have arrows in hotbar
      const arrowSlot = this.hotbar.find(s => s?.itemType === 'arrow');
      if (arrowSlot && arrowSlot.count > 0) {
        const lookDir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
        const launchPos = this.camera.position.clone().add(lookDir.clone().multiplyScalar(0.8));
        this.projectiles.shootArrow(this.id, this.team, launchPos, lookDir);
        arrowSlot.count--;
        if (arrowSlot.count <= 0) {
          const idx = this.hotbar.indexOf(arrowSlot);
          if (idx !== -1) this.hotbar[idx] = null;
        }
      }
      return;
    }

    if (held.potionType && held.potionDuration) {
      // Drink potion
      soundManager.playPotionDrink();
      this.activeEffects.push({
        type: held.potionType,
        timeLeft: held.potionDuration,
        duration: held.potionDuration,
      });
      held.count--;
      if (held.count <= 0) this.hotbar[this.selectedSlotIndex] = null;
    }
  }

  // Teleport from Ender Pearl landing
  public onEnderPearlLand(pos: THREE.Vector3) {
    this.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
    this.takeDamage(5); // Ender Pearl 5hp self-damage
  }
}
