import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  BlockType,
  GameEventPhase, 
  GameSettings, 
  HotbarSlot, 
  KillFeedEntry, 
  MatchStats, 
  ShopItem, 
  TeamId, 
  TeamInfo, 
  TeamUpgrades 
} from './types/game';
import { WorldManager } from './engine/world';
import { ProjectileManager } from './engine/projectiles';
import { PlayerController } from './engine/player';
import { BotController } from './engine/bot';
import { soundManager } from './audio/soundManager';
import { Crosshair } from './components/HUD/Crosshair';
import { Hotbar } from './components/HUD/Hotbar';
import { TeamSidebar } from './components/HUD/TeamSidebar';
import { KillFeed } from './components/HUD/KillFeed';
import { TouchControls } from './components/HUD/TouchControls';
import { ShopModal } from './components/Shop/ShopModal';
import { LobbyModal } from './components/Lobby/LobbyModal';
import { GameOverModal } from './components/GameOver/GameOverModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Game Engine References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<WorldManager | null>(null);
  const projectilesRef = useRef<ProjectileManager | null>(null);
  const playerRef = useRef<PlayerController | null>(null);
  const botsRef = useRef<BotController[]>([]);

  // Game State
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [respawnTimer, setRespawnTimer] = useState(0);
  const [isSpectating, setIsSpectating] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<TeamId | null>(null);

  // Safe pointer lock helpers
  const safeRequestPointerLock = useCallback((elem?: HTMLElement | null) => {
    if (!elem) return;
    try {
      const res = elem.requestPointerLock() as unknown;
      if (res && typeof (res as Promise<void>).catch === 'function') {
        (res as Promise<void>).catch(() => {
          // Gracefully ignore browser pointer lock rate limits/rejections
        });
      }
    } catch {
      // Gracefully ignore synchronous errors
    }
  }, []);

  const safeExitPointerLock = useCallback(() => {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch {
      // Gracefully ignore
    }
  }, []);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    mapType: 'classic',
    gameMode: 'classic_4teams',
    botDifficulty: 'normal',
    playerTeam: 'red',
    soundVolume: 0.7,
    mouseSensitivity: 0.0022,
    fov: 75,
    showMinimap: true,
  });

  // UI Reactive States
  const [playerHp, setPlayerHp] = useState(20);
  const [playerMaxHp] = useState(20);
  const [playerAbsorption, setPlayerAbsorption] = useState(0);
  const [playerResources, setPlayerResources] = useState({ iron: 0, gold: 0, diamond: 0, emerald: 0 });
  const [hotbarSlots, setHotbarSlots] = useState<(HotbarSlot | null)[]>(new Array(9).fill(null));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [isSneaking, setIsSneaking] = useState(false);

  // Match Status
  const [gameTime, setGameTime] = useState(0);
  const [nextEventName, setNextEventName] = useState('다이아몬드 II');
  const [nextEventTime, setNextEventTime] = useState(360); // 6 mins
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);

  const defaultTeams: Record<TeamId, TeamInfo> = {
    red: {
      id: 'red',
      name: 'Red',
      nameKo: '레드',
      color: '#ef4444',
      hex: 0xef4444,
      textColor: 'text-red-400',
      bgBadge: 'bg-red-500',
      hasBed: true,
      isEliminated: false,
      kills: 0,
      bedBreaks: 0,
      upgrades: {
        sharpness: 0,
        protection: 0,
        haste: 0,
        forge: 0,
        healPool: false,
        dragonBuff: false,
        trapAlarm: false,
        counterTrap: false,
      },
    },
    blue: {
      id: 'blue',
      name: 'Blue',
      nameKo: '블루',
      color: '#3b82f6',
      hex: 0x3b82f6,
      textColor: 'text-blue-400',
      bgBadge: 'bg-blue-500',
      hasBed: true,
      isEliminated: false,
      kills: 0,
      bedBreaks: 0,
      upgrades: {
        sharpness: 0,
        protection: 0,
        haste: 0,
        forge: 0,
        healPool: false,
        dragonBuff: false,
        trapAlarm: false,
        counterTrap: false,
      },
    },
    green: {
      id: 'green',
      name: 'Green',
      nameKo: '그린',
      color: '#22c55e',
      hex: 0x22c55e,
      textColor: 'text-green-400',
      bgBadge: 'bg-green-500',
      hasBed: true,
      isEliminated: false,
      kills: 0,
      bedBreaks: 0,
      upgrades: {
        sharpness: 0,
        protection: 0,
        haste: 0,
        forge: 0,
        healPool: false,
        dragonBuff: false,
        trapAlarm: false,
        counterTrap: false,
      },
    },
    yellow: {
      id: 'yellow',
      name: 'Yellow',
      nameKo: '옐로우',
      color: '#eab308',
      hex: 0xeab308,
      textColor: 'text-yellow-400',
      bgBadge: 'bg-yellow-500',
      hasBed: true,
      isEliminated: false,
      kills: 0,
      bedBreaks: 0,
      upgrades: {
        sharpness: 0,
        protection: 0,
        haste: 0,
        forge: 0,
        healPool: false,
        dragonBuff: false,
        trapAlarm: false,
        counterTrap: false,
      },
    },
  };

  const [teams, setTeams] = useState<Record<TeamId, TeamInfo>>(defaultTeams);

  const [matchStats, setMatchStats] = useState<MatchStats>({
    kills: 0,
    finalKills: 0,
    bedBreaks: 0,
    diamondsCollected: 0,
    emeraldsCollected: 0,
    ironCollected: 0,
    goldCollected: 0,
    blocksPlaced: 0,
    blocksBroken: 0,
    durationSeconds: 0,
    winnerTeam: null,
  });

  // 1. Initialize Three.js Scene and World
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 80, 180);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(settings.fov, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 0.9);
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    const shadowDist = 70;
    dirLight.shadow.camera.left = -shadowDist;
    dirLight.shadow.camera.right = shadowDist;
    dirLight.shadow.camera.top = shadowDist;
    dirLight.shadow.camera.bottom = -shadowDist;
    scene.add(dirLight);

    // Managers
    const world = new WorldManager(scene);
    world.generateMap(settings.mapType);
    worldRef.current = world;

    const projectiles = new ProjectileManager(scene, world);
    projectilesRef.current = projectiles;

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth || 800;
      const h = containerRef.current.clientHeight || window.innerHeight || 600;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Start Game Action
  const startGame = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !worldRef.current || !projectilesRef.current) return;

    setGameState('playing');
    setIsShopOpen(false);
    setIsSpectating(false);
    setGameTime(0);
    setKillFeed([]);

    const initialTeams: Record<TeamId, TeamInfo> = JSON.parse(JSON.stringify(defaultTeams));
    if (settings.gameMode === 'duel_1v1') {
      // In 1v1 duel, green and yellow are eliminated from the start
      initialTeams.green.hasBed = false;
      initialTeams.green.isEliminated = true;
      initialTeams.yellow.hasBed = false;
      initialTeams.yellow.isEliminated = true;
    }
    setTeams(initialTeams);

    // Regenerate Map with appropriate game mode
    worldRef.current.generateMap(settings.mapType, settings.gameMode);

    // Create Player
    const player = new PlayerController(
      sceneRef.current,
      cameraRef.current,
      worldRef.current,
      projectilesRef.current,
      settings.playerTeam,
      'You'
    );

    // If 1v1 duel, provide starter wool blocks for instant combat
    if (settings.gameMode === 'duel_1v1') {
      const woolType: BlockType = (settings.playerTeam === 'red' ? 'wool_red' : 'wool_blue') as BlockType;
      player.addItem({
        id: 'starter_wool',
        type: 'block',
        name: 'Wool',
        nameKo: '양털 블록 (32개)',
        count: 32,
        blockType: woolType,
        icon: '🧱',
      });
    }

    playerRef.current = player;
    setHotbarSlots([...player.hotbar]);
    setPlayerResources({ ...player.resources });

    // Clear old bots
    botsRef.current.forEach(b => sceneRef.current?.remove(b.model.group));
    botsRef.current = [];

    // Enemy teams configuration based on mode
    let enemyTeams: TeamId[] = [];
    if (settings.gameMode === 'duel_1v1') {
      enemyTeams = [settings.playerTeam === 'red' ? 'blue' : 'red'];
    } else {
      enemyTeams = (['red', 'blue', 'green', 'yellow'] as TeamId[]).filter(
        t => t !== settings.playerTeam
      );
    }

    const botNames = ['Alex', 'Steve', 'Shadow', 'Viper', 'Nova', 'Frost'];

    enemyTeams.forEach((t, idx) => {
      const bot = new BotController(
        `bot_${t}`,
        botNames[idx % botNames.length],
        t,
        sceneRef.current!,
        worldRef.current!,
        projectilesRef.current!,
        settings.botDifficulty
      );
      botsRef.current.push(bot);
    });

    // Request pointer lock safely
    safeRequestPointerLock(rendererRef.current?.domElement);
  }, [settings, defaultTeams, safeRequestPointerLock]);

  // 3. Pointer Lock & Mouse Listeners
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === rendererRef.current?.domElement;
      setIsPointerLocked(isLocked);
    };

    const handlePointerLockError = () => {
      setIsPointerLocked(false);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== rendererRef.current?.domElement) return;
      if (!playerRef.current || !playerRef.current.isAlive) return;

      const sens = settings.mouseSensitivity;
      playerRef.current.yaw -= e.movementX * sens;
      playerRef.current.pitch -= e.movementY * sens;
      playerRef.current.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, playerRef.current.pitch));
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameState !== 'playing' || isShopOpen) return;
      
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, input, select, textarea, [role="dialog"], .pointer-events-auto')) {
        return;
      }

      if (document.pointerLockElement !== rendererRef.current?.domElement) {
        safeRequestPointerLock(rendererRef.current?.domElement);
        return;
      }
      if (!playerRef.current || !playerRef.current.isAlive) return;

      if (e.button === 0) {
        // Left Click
        playerRef.current.mouseLeftPressed = true;
        const mySharpness = teams[playerRef.current.team]?.upgrades.sharpness || 0;
        playerRef.current.performAttack((damage, knockback) => {
          // Check hit against bots
          botsRef.current.forEach(bot => {
            if (bot.isAlive && bot.team !== playerRef.current!.team) {
              const dist = playerRef.current!.position.distanceTo(bot.position);
              if (dist <= 3.2) {
                const died = bot.takeDamage(damage, knockback);
                if (died) {
                  handleEntityKill('You', playerRef.current!.team, bot.name, bot.team, 'sword');
                }
              }
            }
          });
        }, mySharpness);
      } else if (e.button === 2) {
        // Right Click
        playerRef.current.performRightClick(() => {
          setIsShopOpen(true);
          safeExitPointerLock();
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!playerRef.current) return;
      if (e.button === 0) {
        playerRef.current.mouseLeftPressed = false;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      // Toggle Shop
      if (e.code === 'KeyE') {
        e.preventDefault();
        setIsShopOpen(prev => {
          const next = !prev;
          if (next) {
            safeExitPointerLock();
          } else {
            safeRequestPointerLock(rendererRef.current?.domElement);
          }
          return next;
        });
        return;
      }

      // Toggle Perspective (F5)
      if (e.code === 'F5') {
        e.preventDefault();
        if (playerRef.current) {
          playerRef.current.isThirdPerson = !playerRef.current.isThirdPerson;
        }
        return;
      }

      // Hotbar numbers 1-9
      if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9 && playerRef.current) {
          playerRef.current.selectedSlotIndex = num - 1;
          setSelectedSlotIndex(num - 1);
        }
      }

      // Movement keys
      if (playerRef.current) {
        playerRef.current.keys[e.code] = true;
        if (e.code === 'ShiftLeft' || e.code === 'KeyC') {
          playerRef.current.isSneaking = true;
          setIsSneaking(true);
        }
        if (e.code === 'ControlLeft') {
          playerRef.current.isSprinting = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!playerRef.current) return;
      playerRef.current.keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'KeyC') {
        playerRef.current.isSneaking = false;
        setIsSneaking(false);
      }
      if (e.code === 'ControlLeft') {
        playerRef.current.isSprinting = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!playerRef.current) return;
      let nextIdx = playerRef.current.selectedSlotIndex + (e.deltaY > 0 ? 1 : -1);
      if (nextIdx < 0) nextIdx = 8;
      if (nextIdx > 8) nextIdx = 0;
      playerRef.current.selectedSlotIndex = nextIdx;
      setSelectedSlotIndex(nextIdx);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gameState, isShopOpen, settings, safeRequestPointerLock, safeExitPointerLock]);

  // Kill & Bed destruction handlers
  const handleEntityKill = (
    killerName: string,
    killerTeam: TeamId,
    victimName: string,
    victimTeam: TeamId,
    reason: 'sword' | 'void' | 'fireball' | 'bow' | 'tnt'
  ) => {
    const isFinalKill = !teams[victimTeam].hasBed;

    setKillFeed(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        killerName,
        killerTeam,
        victimName,
        victimTeam,
        reason,
        isFinalKill,
      },
    ]);

    if (killerName === 'You') {
      setMatchStats(prev => ({
        ...prev,
        kills: prev.kills + 1,
        finalKills: isFinalKill ? prev.finalKills + 1 : prev.finalKills,
      }));
    }

    // Check if team is fully eliminated
    if (isFinalKill) {
      setTeams(prev => {
        const next = { ...prev };
        next[victimTeam].isEliminated = true;
        return next;
      });
      checkWinCondition();
    }
  };

  const handleBedDestroy = (victimTeam: TeamId, breakerName = 'You', breakerTeam = settings.playerTeam) => {
    setTeams(prev => {
      const next = { ...prev };
      next[victimTeam].hasBed = false;
      return next;
    });

    if (breakerName === 'You') {
      setMatchStats(prev => ({ ...prev, bedBreaks: prev.bedBreaks + 1 }));
    }

    setKillFeed(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        killerName: `${breakerName} (${breakerTeam.toUpperCase()})`,
        killerTeam: breakerTeam,
        victimName: `${victimTeam.toUpperCase()} 팀 침대`,
        victimTeam,
        reason: 'sword',
        isFinalKill: false,
      },
    ]);
  };

  const checkWinCondition = () => {
    // Count alive teams based on mode
    const activeTeamList: TeamId[] = settings.gameMode === 'duel_1v1' ? ['red', 'blue'] : ['red', 'blue', 'green', 'yellow'];
    const aliveTeams = activeTeamList.filter(t => !teams[t]?.isEliminated);

    if (aliveTeams.length === 1) {
      const winner = aliveTeams[0];
      setWinnerTeam(winner);
      setIsVictory(winner === settings.playerTeam);
      setGameState('gameover');
      safeExitPointerLock();
    }
  };

  // 4. Main Animation & Physics Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      animationFrameId = requestAnimationFrame(loop);

      const deltaTime = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const currentTime = time / 1000;

      if (rendererRef.current && sceneRef.current && cameraRef.current && worldRef.current) {
        if (gameState === 'lobby' || gameState === 'gameover') {
          // Update resource drops and world visuals
          worldRef.current.update(deltaTime, currentTime);

          // Orbit camera around arena
          const orbitRadius = settings.gameMode === 'duel_1v1' ? 42 : 62;
          const camX = Math.sin(currentTime * 0.16) * orbitRadius;
          const camZ = Math.cos(currentTime * 0.16) * orbitRadius;
          cameraRef.current.position.set(camX, 26, camZ);
          cameraRef.current.lookAt(0, 8, 0);

          rendererRef.current.render(sceneRef.current, cameraRef.current);
        } else if (gameState === 'playing') {
          // 1. Update Spawners & Resource Drops
          worldRef.current.update(deltaTime, currentTime);

          // 2. Update Projectiles
          if (projectilesRef.current) {
            projectilesRef.current.update(
              deltaTime,
              currentTime,
              (proj, hitPos) => {
                // On Hit Entity
              },
              (ownerId, landingPos) => {
                if (ownerId === 'player' && playerRef.current) {
                  playerRef.current.onEnderPearlLand(landingPos);
                }
              },
              (pos, radius, isFireball) => {
                // Explosion
                worldRef.current?.createExplosion(pos, radius, isFireball);
                // Check explosion damage to player
                if (playerRef.current && playerRef.current.isAlive) {
                  const dist = playerRef.current.position.distanceTo(pos);
                  if (dist <= radius + 1.0) {
                    const force = (radius + 1.0 - dist) / (radius + 1.0);
                    const dir = playerRef.current.position.clone().sub(pos).normalize();
                    playerRef.current.takeDamage(force * 12, dir.multiplyScalar(force * 1.5));
                  }
                }
                // Check bots explosion
                botsRef.current.forEach(bot => {
                  if (bot.isAlive) {
                    const dist = bot.position.distanceTo(pos);
                    if (dist <= radius + 1.0) {
                      const force = (radius + 1.0 - dist) / (radius + 1.0);
                      const dir = bot.position.clone().sub(pos).normalize();
                      bot.takeDamage(force * 12, dir.multiplyScalar(force * 1.5));
                    }
                  }
                });
              }
            );
          }

          // 3. Update Player
          if (playerRef.current) {
            if (playerRef.current.isAlive && !isSpectating) {
              playerRef.current.update(
                deltaTime,
                currentTime,
                (victimId, isFinal) => {},
                team => handleBedDestroy(team, 'You', settings.playerTeam)
              );

              // Sync reactive state
              setPlayerHp(playerRef.current.health);
              setPlayerAbsorption(playerRef.current.absorptionHp);
              setPlayerResources({ ...playerRef.current.resources });
              setHotbarSlots([...playerRef.current.hotbar]);
            } else if (isSpectating) {
              // Spectator camera orbit
              const specRadius = 45;
              const specX = Math.sin(currentTime * 0.2) * specRadius;
              const specZ = Math.cos(currentTime * 0.2) * specRadius;
              cameraRef.current.position.set(specX, 24, specZ);
              cameraRef.current.lookAt(0, 10, 0);
            } else {
              // Player is dead, respawn countdown: hover camera over island
              const spawnPos = worldRef.current.getTeamSpawnPosition(playerRef.current.team);
              cameraRef.current.position.set(spawnPos.x, 22, spawnPos.z + (playerRef.current.team === 'red' ? 10 : -10));
              cameraRef.current.lookAt(spawnPos.x, 10, spawnPos.z);

              if (teams[settings.playerTeam].hasBed) {
                playerRef.current.respawnTimer -= deltaTime;
                setRespawnTimer(Math.max(0, Math.ceil(playerRef.current.respawnTimer)));
                if (playerRef.current.respawnTimer <= 0) {
                  playerRef.current.respawn();
                  setRespawnTimer(0);
                }
              } else {
                // Final death! Player eliminated
                if (!isSpectating) {
                  setIsSpectating(true);
                  setTeams(prev => {
                    const next = { ...prev };
                    next[settings.playerTeam].isEliminated = true;
                    return next;
                  });
                  checkWinCondition();
                }
              }
            }
          }

          // 4. Update Bots
          botsRef.current.forEach(bot => {
            if (bot.isAlive && playerRef.current) {
              bot.update(
                deltaTime,
                currentTime,
                playerRef.current.position,
                playerRef.current.isAlive && !isSpectating,
                playerRef.current.team,
                botsRef.current,
                (damage, knockback) => {
                  // Bot attacks player!
                  const protLevel = teams[settings.playerTeam]?.upgrades.protection || 0;
                  const finalDamage = Math.max(1, damage * (1 - protLevel * 0.1));
                  const died = playerRef.current!.takeDamage(finalDamage, knockback);
                  if (died) {
                    playerRef.current!.respawnTimer = 5.0; // 5s respawn
                    setRespawnTimer(5);
                    handleEntityKill(bot.name, bot.team, 'You', settings.playerTeam, 'sword');
                  }
                },
                (victimTeam, breakerName, breakerTeam) => {
                  handleBedDestroy(victimTeam, breakerName, breakerTeam);
                }
              );
            } else if (!bot.isAlive) {
              if (teams[bot.team].hasBed) {
                bot.respawnTimer -= deltaTime;
                if (bot.respawnTimer <= 0) {
                  bot.respawn();
                }
              }
            }
          });

          // 5. Game Timer & Timeline events
          setGameTime(prev => {
            const next = prev + deltaTime;
            if (next >= 1440) {
              setNextEventName('서든 데스 (드래곤 소환)');
              setNextEventTime(0);
            } else if (next >= 1080) {
              setNextEventName('모든 침대 파괴');
              setNextEventTime(1440 - next);
            } else if (next >= 720) {
              setNextEventName('에메랄드 III');
              setNextEventTime(1080 - next);
            } else if (next >= 360) {
              setNextEventName('다이아몬드 III');
              setNextEventTime(720 - next);
            } else {
              setNextEventName('다이아몬드 II');
              setNextEventTime(360 - next);
            }
            return next;
          });

          // Render playing scene
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      }
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, teams, settings, isSpectating]);

  // Shop item purchase handler
  const handleBuyItem = (item: ShopItem): boolean => {
    if (!playerRef.current) return false;
    const cost = item.costAmount;
    if (playerRef.current.resources[item.costType] < cost) return false;

    playerRef.current.resources[item.costType] -= cost;

    if (item.armorTier) {
      playerRef.current.armorTier = item.armorTier;
      playerRef.current.model.setArmor(item.armorTier, settings.playerTeam);
      return true;
    }

    if (item.toolType === 'shears') {
      playerRef.current.hasShears = true;
      return true;
    }

    if (item.toolTier) {
      if (item.toolType === 'pickaxe') playerRef.current.pickaxeTier = item.toolTier;
      if (item.toolType === 'axe') playerRef.current.axeTier = item.toolTier;
      return true;
    }

    // Add to hotbar
    playerRef.current.addItem({
      id: Math.random().toString(36).substring(2, 9),
      type: item.category === 'blocks' ? 'block' : item.category === 'weapons' ? 'weapon' : 'item',
      name: item.name,
      nameKo: item.nameKo,
      count: item.amount || 1,
      blockType: item.blockType,
      weaponTier: item.weaponTier,
      itemType: item.itemType,
      potionType: item.potionType,
      potionDuration: item.potionDuration,
      icon: item.icon,
    });

    setHotbarSlots([...playerRef.current.hotbar]);
    setPlayerResources({ ...playerRef.current.resources });
    return true;
  };

  // Team upgrade purchase handler
  const handleBuyUpgrade = (upgradeId: string, cost: number): boolean => {
    if (!playerRef.current) return false;
    if (playerRef.current.resources.diamond < cost) return false;

    playerRef.current.resources.diamond -= cost;

    setTeams(prev => {
      const next = { ...prev };
      const myUpgrades = next[settings.playerTeam].upgrades;
      if (upgradeId === 'sharpness') myUpgrades.sharpness = 1;
      if (upgradeId === 'protection') myUpgrades.protection = Math.min(4, myUpgrades.protection + 1);
      if (upgradeId === 'haste') myUpgrades.haste = Math.min(2, myUpgrades.haste + 1);
      if (upgradeId === 'forge') myUpgrades.forge = Math.min(4, myUpgrades.forge + 1);
      if (upgradeId === 'healPool') myUpgrades.healPool = true;
      if (upgradeId === 'trapAlarm') myUpgrades.trapAlarm = true;
      if (upgradeId === 'dragonBuff') myUpgrades.dragonBuff = true;
      return next;
    });

    setPlayerResources({ ...playerRef.current.resources });
    return true;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 select-none">
      {/* 3D Canvas Viewport */}
      <div id="game-canvas-container" ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* Game HUD Layers */}
      {gameState === 'playing' && (
        <>
          <Crosshair />
          <Hotbar
            slots={hotbarSlots}
            selectedIndex={selectedSlotIndex}
            onSelectSlot={idx => {
              if (playerRef.current) {
                playerRef.current.selectedSlotIndex = idx;
                setSelectedSlotIndex(idx);
              }
            }}
            health={playerHp}
            maxHealth={playerMaxHp}
            absorptionHp={playerAbsorption}
            resources={playerResources}
            onOpenShop={() => {
              setIsShopOpen(true);
              safeExitPointerLock();
            }}
          />
          <TeamSidebar
            teams={teams}
            playerTeam={settings.playerTeam}
            gameTime={gameTime}
            nextEventName={nextEventName}
            nextEventTime={nextEventTime}
            playerKills={matchStats.kills}
            playerBedBreaks={matchStats.bedBreaks}
            gameMode={settings.gameMode}
          />
          <KillFeed entries={killFeed} />

          {/* Click to Lock View Prompt */}
          {!isPointerLocked && !isShopOpen && respawnTimer === 0 && !isSpectating && (
            <div 
              onClick={() => safeRequestPointerLock(rendererRef.current?.domElement)}
              className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/75 hover:bg-black/90 border border-amber-500/60 px-5 py-2.5 rounded-2xl text-amber-300 font-bold text-xs tracking-wide shadow-2xl z-30 cursor-pointer backdrop-blur-md transition transform hover:scale-105 active:scale-95 animate-pulse"
            >
              🖱️ 화면을 클릭하여 시점 조작(마우스 잠금)을 시작하세요
            </div>
          )}

          {/* Respawn Countdown Overlay */}
          {respawnTimer > 0 && (
            <div className="absolute inset-0 bg-red-950/60 backdrop-blur-sm flex flex-col items-center justify-center z-30 pointer-events-none">
              <h2 className="text-4xl font-black text-white font-mono drop-shadow-lg">
                YOU DIED!
              </h2>
              <p className="text-lg text-amber-300 font-bold mt-2 font-mono">
                {respawnTimer}초 후 부활합니다...
              </p>
            </div>
          )}

          {/* Spectator Banner */}
          {isSpectating && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-rose-500/50 px-4 py-2 rounded-xl text-rose-400 font-mono font-bold text-sm shadow-xl z-30">
              👁️ 관전 모드 (침대가 파괴되어 부활할 수 없습니다)
            </div>
          )}

          {/* Mobile Touch Controls */}
          <TouchControls
            onMoveChange={(x, y) => {
              if (playerRef.current) {
                playerRef.current.keys['KeyA'] = x < -0.3;
                playerRef.current.keys['KeyD'] = x > 0.3;
                playerRef.current.keys['KeyW'] = y < -0.3;
                playerRef.current.keys['KeyS'] = y > 0.3;
              }
            }}
            onAttack={() => {
              if (playerRef.current && playerRef.current.isAlive) {
                playerRef.current.performAttack((damage, knockback) => {
                  botsRef.current.forEach(bot => {
                    if (bot.isAlive && bot.team !== playerRef.current!.team) {
                      const dist = playerRef.current!.position.distanceTo(bot.position);
                      if (dist <= 3.2) {
                        const died = bot.takeDamage(damage, knockback);
                        if (died) {
                          handleEntityKill('You', playerRef.current!.team, bot.name, bot.team, 'sword');
                        }
                      }
                    }
                  });
                });
              }
            }}
            onPlaceOrUse={() => {
              if (playerRef.current && playerRef.current.isAlive) {
                playerRef.current.performRightClick(() => {
                  setIsShopOpen(true);
                  safeExitPointerLock();
                });
              }
            }}
            onJump={() => {
              if (playerRef.current && playerRef.current.isGrounded) {
                playerRef.current.velocity.y = 8.5;
                playerRef.current.isGrounded = false;
              }
            }}
            onToggleSneak={() => {
              if (playerRef.current) {
                playerRef.current.isSneaking = !playerRef.current.isSneaking;
                setIsSneaking(playerRef.current.isSneaking);
              }
            }}
            isSneaking={isSneaking}
            onOpenShop={() => {
              setIsShopOpen(true);
              safeExitPointerLock();
            }}
          />
        </>
      )}

      {/* Shop Modal */}
      <ShopModal
        isOpen={isShopOpen}
        onClose={() => {
          setIsShopOpen(false);
          safeRequestPointerLock(rendererRef.current?.domElement);
        }}
        resources={playerResources}
        teamUpgrades={teams[settings.playerTeam].upgrades}
        playerTeam={settings.playerTeam}
        onBuyItem={handleBuyItem}
        onBuyUpgrade={handleBuyUpgrade}
      />

      {/* Lobby / Start Menu */}
      <LobbyModal
        isOpen={gameState === 'lobby'}
        settings={settings}
        onUpdateSettings={newS => setSettings(prev => ({ ...prev, ...newS }))}
        onStartGame={startGame}
      />

      {/* Game Over / Victory Modal */}
      <GameOverModal
        isOpen={gameState === 'gameover'}
        isVictory={isVictory}
        winnerTeam={winnerTeam}
        playerTeam={settings.playerTeam}
        stats={matchStats}
        onPlayAgain={startGame}
        onSpectate={() => {
          setGameState('playing');
          setIsSpectating(true);
        }}
        canSpectate={!isVictory}
      />
    </div>
  );
}
