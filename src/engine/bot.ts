import * as THREE from 'three';
import { ArmorTier, BlockType, TeamId, WeaponTier } from '../types/game';
import { WorldManager } from './world';
import { ProjectileManager } from './projectiles';
import { createHumanoidModel, HumanoidModel } from './humanoid';
import { soundManager } from '../audio/soundManager';

export type BotState = 'GATHERING' | 'DEFENDING_BED' | 'BRIDGING' | 'FARMING_DIAMONDS' | 'ATTACKING_BED' | 'COMBAT';

export class BotController {
  public id: string;
  public name: string;
  public team: TeamId;
  public scene: THREE.Scene;
  public world: WorldManager;
  public projectiles: ProjectileManager;

  // Identity & Status
  public health: number = 20;
  public maxHealth: number = 20;
  public isAlive: boolean = true;
  public respawnTimer: number = 0;
  public kills: number = 0;

  // Gear & Resources
  public resources = { iron: 0, gold: 0, diamond: 0, emerald: 0 };
  public armorTier: ArmorTier = 'leather';
  public weaponTier: WeaponTier = 'wood';
  public hasPickaxe: boolean = true;
  public woolCount: number = 32;

  // 3D Model
  public model: HumanoidModel;
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public yaw: number = 0;
  public isGrounded: boolean = false;

  // AI Decision State Machine
  public state: BotState = 'GATHERING';
  public stateTimer: number = 0;
  public targetPos: THREE.Vector3 | null = null;
  public targetEnemyId: string | null = null;
  public targetTeam: TeamId | null = null;
  public lastAttackTime: number = 0;
  public lastBridgeTime: number = 0;
  public difficulty: 'easy' | 'normal' | 'hard' = 'normal';

  constructor(
    id: string,
    name: string,
    team: TeamId,
    scene: THREE.Scene,
    world: WorldManager,
    projectiles: ProjectileManager,
    difficulty: 'easy' | 'normal' | 'hard' = 'normal'
  ) {
    this.id = id;
    this.name = name;
    this.team = team;
    this.scene = scene;
    this.world = world;
    this.projectiles = projectiles;
    this.difficulty = difficulty;

    this.model = createHumanoidModel(this.name, this.team, false);
    this.scene.add(this.model.group);
    this.respawn();
  }

  public respawn() {
    this.isAlive = true;
    this.health = this.maxHealth;
    this.velocity.set(0, 0, 0);

    const spawnPos = this.world.getTeamSpawnPosition(this.team);
    this.position.copy(spawnPos);
    this.position.x += (Math.random() - 0.5) * 2;
    this.position.z += (Math.random() - 0.5) * 2;

    this.state = 'GATHERING';
    this.stateTimer = 5 + Math.random() * 5;
    this.woolCount = 32;

    this.model.setWeapon(this.weaponTier);
    this.model.setArmor(this.armorTier, this.team);
    this.model.updateHealthDisplay(this.health, this.maxHealth, 0);
  }

  public takeDamage(damage: number, knockbackDir?: THREE.Vector3): boolean {
    if (!this.isAlive) return false;

    const armorReductions: Record<ArmorTier, number> = {
      leather: 0.1,
      chainmail: 0.3,
      iron: 0.5,
      diamond: 0.7,
    };
    const finalDamage = Math.max(1, damage * (1 - (armorReductions[this.armorTier] || 0)));
    this.health -= finalDamage;

    soundManager.playHitSound();
    this.model.flashHurt();
    this.model.updateHealthDisplay(this.health, this.maxHealth, 0);

    if (knockbackDir) {
      this.velocity.x += knockbackDir.x * 10;
      this.velocity.y = Math.max(this.velocity.y + 4.0, 4.0);
      this.velocity.z += knockbackDir.z * 10;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      return true; // Died
    }
    return false;
  }

  // Update AI Logic
  public update(
    deltaTime: number,
    currentTime: number,
    playerPos: THREE.Vector3,
    playerAlive: boolean,
    playerTeam: TeamId,
    allBots: BotController[],
    onBotAttackPlayer: (dmg: number, kb: THREE.Vector3) => void,
    onBedDestroy: (victimTeam: TeamId, breakerName: string, breakerTeam: TeamId) => void
  ) {
    if (!this.isAlive) return;

    this.stateTimer -= deltaTime;

    // 1. Check Nearby Resource Pickup
    for (let i = this.world.resourceDrops.length - 1; i >= 0; i--) {
      const drop = this.world.resourceDrops[i];
      if (this.position.distanceTo(drop.position) <= 2.2) {
        this.resources[drop.type] += drop.amount;
        this.world.scene.remove(drop.mesh);
        this.world.resourceDrops.splice(i, 1);

        // Auto-buy upgrades if bot has enough resources
        this.checkAutoUpgrades();
      }
    }

    // 2. High-Level AI State Transitions
    if (this.stateTimer <= 0) {
      this.decideNextState(playerAlive, playerTeam);
    }

    // 3. State Actions
    this.executeCurrentState(
      deltaTime,
      currentTime,
      playerPos,
      playerAlive,
      playerTeam,
      allBots,
      onBotAttackPlayer,
      onBedDestroy
    );

    // 4. Physics & Gravity
    this.velocity.y -= 26.0 * deltaTime;

    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * deltaTime;
    nextPos.z += this.velocity.z * deltaTime;

    // Collision Box
    const box = new THREE.Box3(
      new THREE.Vector3(nextPos.x - 0.3, this.position.y, nextPos.z - 0.3),
      new THREE.Vector3(nextPos.x + 0.3, this.position.y + 1.8, nextPos.z + 0.3)
    );

    if (!this.world.checkAABBCollision(box)) {
      this.position.x = nextPos.x;
      this.position.z = nextPos.z;
    } else {
      this.velocity.x *= 0.3;
      this.velocity.z *= 0.3;
      // If stuck on low obstacle, try jump
      if (this.isGrounded) {
        this.velocity.y = 8.5;
        this.isGrounded = false;
      }
    }

    // Y Axis Collision
    const nextY = this.position.y + this.velocity.y * deltaTime;
    const yBox = new THREE.Box3(
      new THREE.Vector3(this.position.x - 0.3, nextY, this.position.z - 0.3),
      new THREE.Vector3(this.position.x + 0.3, nextY + 1.8, this.position.z + 0.3)
    );

    if (!this.world.checkAABBCollision(yBox)) {
      this.position.y = nextY;
      this.isGrounded = false;
    } else {
      if (this.velocity.y < 0) {
        this.position.y = Math.ceil(nextY);
        this.isGrounded = true;
      }
      this.velocity.y = 0;
    }

    // Void Check
    if (this.position.y < -15) {
      this.takeDamage(100);
      return;
    }

    // 5. Update 3D Model
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.yaw;
    const isMoving = Math.abs(this.velocity.x) > 0.3 || Math.abs(this.velocity.z) > 0.3;
    const isAttacking = currentTime - this.lastAttackTime < 0.25;
    this.model.updateAnimation(isMoving, isAttacking, currentTime);
  }

  // AI Buying Logic
  private checkAutoUpgrades() {
    // Weapons
    if (this.resources.emerald >= 4 && this.weaponTier !== 'diamond') {
      this.resources.emerald -= 4;
      this.weaponTier = 'diamond';
      this.model.setWeapon('diamond');
    } else if (this.resources.gold >= 7 && this.weaponTier === 'wood') {
      this.resources.gold -= 7;
      this.weaponTier = 'iron';
      this.model.setWeapon('iron');
    } else if (this.resources.iron >= 10 && this.weaponTier === 'wood') {
      this.resources.iron -= 10;
      this.weaponTier = 'stone';
      this.model.setWeapon('stone');
    }

    // Armor
    if (this.resources.emerald >= 6 && this.armorTier !== 'diamond') {
      this.resources.emerald -= 6;
      this.armorTier = 'diamond';
      this.model.setArmor('diamond', this.team);
    } else if (this.resources.gold >= 12 && this.armorTier === 'leather') {
      this.resources.gold -= 12;
      this.armorTier = 'iron';
      this.model.setArmor('iron', this.team);
    } else if (this.resources.iron >= 24 && this.armorTier === 'leather') {
      this.resources.iron -= 24;
      this.armorTier = 'chainmail';
      this.model.setArmor('chainmail', this.team);
    }

    // Wool
    if (this.resources.iron >= 4 && this.woolCount < 16) {
      this.resources.iron -= 4;
      this.woolCount += 16;
    }
  }

  // State Decision Machine
  private decideNextState(playerAlive: boolean, playerTeam: TeamId) {
    // Check if enemy beds are alive
    const enemyBeds: TeamId[] = [];
    this.world.beds.forEach((bed, teamId) => {
      if (teamId !== this.team && bed.alive) {
        enemyBeds.push(teamId);
      }
    });

    const roll = Math.random();

    if (this.woolCount < 16) {
      this.state = 'GATHERING';
      this.stateTimer = 6 + Math.random() * 4;
    } else if (enemyBeds.length > 0 && roll > 0.4) {
      // Attack enemy bed!
      this.state = 'ATTACKING_BED';
      this.targetTeam = enemyBeds[Math.floor(Math.random() * enemyBeds.length)];
      const bedLoc = this.world.beds.get(this.targetTeam);
      if (bedLoc) {
        this.targetPos = bedLoc.headPos.clone();
      }
      this.stateTimer = 18 + Math.random() * 10;
    } else if (roll > 0.2) {
      // Go farm diamond island or center
      this.state = 'FARMING_DIAMONDS';
      // Pick diamond spawner
      const diaSpawners = this.world.spawners.filter(s => s.type === 'diamond' || s.type === 'emerald');
      if (diaSpawners.length > 0) {
        const picked = diaSpawners[Math.floor(Math.random() * diaSpawners.length)];
        this.targetPos = picked.position.clone();
      }
      this.stateTimer = 14 + Math.random() * 8;
    } else {
      this.state = 'DEFENDING_BED';
      this.stateTimer = 8 + Math.random() * 6;
    }
  }

  // State Execution
  private executeCurrentState(
    deltaTime: number,
    currentTime: number,
    playerPos: THREE.Vector3,
    playerAlive: boolean,
    playerTeam: TeamId,
    allBots: BotController[],
    onBotAttackPlayer: (dmg: number, kb: THREE.Vector3) => void,
    onBedDestroy: (victimTeam: TeamId, breakerName: string, breakerTeam: TeamId) => void
  ) {
    // 1. Check for nearby enemies to engage in COMBAT
    const combatRange = 9.0;
    let closestEnemyPos: THREE.Vector3 | null = null;
    let isTargetPlayer = false;

    // Check player
    if (playerAlive && playerTeam !== this.team) {
      const dist = this.position.distanceTo(playerPos);
      if (dist < combatRange) {
        closestEnemyPos = playerPos;
        isTargetPlayer = true;
      }
    }

    // Check other bots
    if (!closestEnemyPos) {
      for (const other of allBots) {
        if (other.isAlive && other.team !== this.team) {
          const dist = this.position.distanceTo(other.position);
          if (dist < combatRange) {
            closestEnemyPos = other.position;
            break;
          }
        }
      }
    }

    // If enemy is right in front, attack!
    if (closestEnemyPos) {
      const dist = this.position.distanceTo(closestEnemyPos);
      this.moveTowards(closestEnemyPos, 5.5, deltaTime);

      if (dist <= 2.8 && currentTime - this.lastAttackTime >= (this.difficulty === 'hard' ? 0.45 : 0.7)) {
        this.lastAttackTime = currentTime;
        this.model.updateAnimation(true, true, currentTime);
        soundManager.playSwordSwing();

        const damages: Record<WeaponTier, number> = {
          none: 1.5,
          wood: 3.5,
          stone: 4.5,
          iron: 5.5,
          diamond: 7.0,
        };
        const dmg = damages[this.weaponTier] || 3.5;
        const forward = closestEnemyPos.clone().sub(this.position).normalize();

        if (isTargetPlayer) {
          onBotAttackPlayer(dmg, forward);
        }
      }
      return;
    }

    // 2. Normal State Behaviors
    if (this.state === 'GATHERING') {
      // Move to base spawner
      const mySpawner = this.world.spawners.find(s => s.team === this.team);
      if (mySpawner) {
        this.moveTowards(mySpawner.position, 4.5, deltaTime);
      }
    } else if (this.state === 'ATTACKING_BED' && this.targetPos) {
      const dist = this.position.distanceTo(this.targetPos);
      this.moveTowards(this.targetPos, 5.0, deltaTime);

      // Try bridging over void if no ground ahead
      this.checkAndPlaceBridge(currentTime);

      // If reached enemy bed, break it!
      if (dist <= 3.5 && this.targetTeam) {
        const bed = this.world.beds.get(this.targetTeam);
        if (bed && bed.alive) {
          bed.alive = false;
          this.world.scene.remove(bed.group);
          this.world.removeBlock(bed.headPos.x, bed.headPos.y, bed.headPos.z, true);
          this.world.removeBlock(bed.footPos.x, bed.footPos.y, bed.footPos.z, true);
          soundManager.playBedBreak();
          onBedDestroy(this.targetTeam, this.name, this.team);
          this.stateTimer = 0; // Pick new goal
        }
      }
    } else if (this.state === 'FARMING_DIAMONDS' && this.targetPos) {
      this.moveTowards(this.targetPos, 5.0, deltaTime);
      this.checkAndPlaceBridge(currentTime);
    } else if (this.state === 'DEFENDING_BED') {
      const myBed = this.world.beds.get(this.team);
      if (myBed) {
        this.moveTowards(myBed.headPos, 4.0, deltaTime);
      }
    }
  }

  // Move towards coordinate
  private moveTowards(target: THREE.Vector3, speed: number, deltaTime: number) {
    const diff = target.clone().sub(this.position);
    diff.y = 0; // horizontal only

    if (diff.lengthSq() > 0.2) {
      diff.normalize();
      this.yaw = Math.atan2(-diff.x, -diff.z);

      this.velocity.x = diff.x * speed;
      this.velocity.z = diff.z * speed;
    } else {
      this.velocity.x *= 0.5;
      this.velocity.z *= 0.5;
    }
  }

  // Smart Bridging: checks if walking over void and places a wool block beneath!
  private checkAndPlaceBridge(currentTime: number) {
    if (this.woolCount <= 0 || currentTime - this.lastBridgeTime < 0.22) return;

    const lookAhead = new THREE.Vector3(
      -Math.sin(this.yaw) * 1.2,
      -1.0,
      -Math.cos(this.yaw) * 1.2
    );
    const checkPos = this.position.clone().add(lookAhead);
    const bx = Math.floor(checkPos.x);
    const by = Math.floor(checkPos.y);
    const bz = Math.floor(checkPos.z);

    if (!this.world.isSolid(bx, by, bz) && by > 0) {
      const teamWoolMap: Record<TeamId, BlockType> = {
        red: 'wool_red',
        blue: 'wool_blue',
        green: 'wool_green',
        yellow: 'wool_yellow',
      };
      this.world.addBlock(bx, by, bz, teamWoolMap[this.team], false);
      soundManager.playBlockPlace('wool');
      this.woolCount--;
      this.lastBridgeTime = currentTime;
    }
  }
}
