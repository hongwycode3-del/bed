export type TeamId = 'red' | 'blue' | 'green' | 'yellow';

export interface TeamInfo {
  id: TeamId;
  name: string;
  nameKo: string;
  color: string;
  hex: number;
  textColor: string;
  bgBadge: string;
  hasBed: boolean;
  isEliminated: boolean;
  kills: number;
  bedBreaks: number;
  upgrades: TeamUpgrades;
}

export type ResourceType = 'iron' | 'gold' | 'diamond' | 'emerald';

export interface InventoryResources {
  iron: number;
  gold: number;
  diamond: number;
  emerald: number;
}

export type BlockType = 
  | 'wool_red'
  | 'wool_blue'
  | 'wool_green'
  | 'wool_yellow'
  | 'wood'
  | 'endstone'
  | 'obsidian'
  | 'glass'
  | 'tnt'
  | 'stone'
  | 'bedrock'
  | 'diamond_block'
  | 'emerald_block';

export type WeaponTier = 'none' | 'wood' | 'stone' | 'iron' | 'diamond';
export type ArmorTier = 'leather' | 'chainmail' | 'iron' | 'diamond';
export type ToolTier = 'none' | 'wood' | 'stone' | 'iron' | 'diamond';

export interface TeamUpgrades {
  sharpness: number; // 0, 1
  protection: number; // 0, 1, 2, 3, 4
  haste: number; // 0, 1, 2
  forge: number; // 0 (normal), 1 (+25%), 2 (+50%), 3 (emerald forge), 4 (molten +100%)
  healPool: boolean;
  dragonBuff: boolean;
  trapAlarm: boolean;
  counterTrap: boolean;
}

export interface HotbarSlot {
  id: string;
  type: 'weapon' | 'tool' | 'block' | 'item' | 'potion' | 'armor';
  name: string;
  nameKo: string;
  count: number;
  blockType?: BlockType;
  weaponTier?: WeaponTier;
  toolType?: 'pickaxe' | 'axe' | 'shears';
  toolTier?: ToolTier;
  itemType?: 'golden_apple' | 'fireball' | 'ender_pearl' | 'bridge_egg' | 'knockback_stick' | 'bow' | 'arrow';
  potionType?: 'speed' | 'jump' | 'invisibility';
  potionDuration?: number; // in seconds
  icon: string;
}

export interface ShopItem {
  id: string;
  category: 'blocks' | 'weapons' | 'armor' | 'tools' | 'utility';
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  costType: ResourceType;
  costAmount: number;
  icon: string;
  amount?: number;
  blockType?: BlockType;
  weaponTier?: WeaponTier;
  armorTier?: ArmorTier;
  toolType?: 'pickaxe' | 'axe' | 'shears';
  toolTier?: ToolTier;
  itemType?: 'golden_apple' | 'fireball' | 'ender_pearl' | 'bridge_egg' | 'knockback_stick' | 'bow' | 'arrow';
  potionType?: 'speed' | 'jump' | 'invisibility';
  potionDuration?: number;
}

export interface UpgradeShopItem {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  diamondCost: number[];
  maxTier: number;
  currentTier: number;
  icon: string;
}

export interface ActivePotionEffect {
  type: 'speed' | 'jump' | 'invisibility' | 'regeneration' | 'absorption';
  timeLeft: number;
  duration: number;
}

export interface KillFeedEntry {
  id: string;
  timestamp: number;
  killerName: string;
  killerTeam: TeamId;
  victimName: string;
  victimTeam: TeamId;
  reason: 'sword' | 'void' | 'fireball' | 'bow' | 'tnt';
  isFinalKill: boolean;
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  sender: string;
  team?: TeamId;
  text: string;
  isSystem?: boolean;
}

export type GameEventPhase = 
  | 'DIAMOND_II'
  | 'EMERALD_II'
  | 'DIAMOND_III'
  | 'EMERALD_III'
  | 'BED_DESTRUCTION'
  | 'SUDDEN_DEATH'
  | 'GAME_END';

export type GameMode = 'classic_4teams' | 'duel_1v1';

export interface GameSettings {
  gameMode: GameMode;
  mapType: 'classic' | 'floating_islands' | 'sakura';
  botDifficulty: 'easy' | 'normal' | 'hard';
  playerTeam: TeamId;
  soundVolume: number;
  mouseSensitivity: number;
  fov: number;
  showMinimap: boolean;
}

export interface MatchStats {
  kills: number;
  finalKills: number;
  bedBreaks: number;
  diamondsCollected: number;
  emeraldsCollected: number;
  ironCollected: number;
  goldCollected: number;
  blocksPlaced: number;
  blocksBroken: number;
  durationSeconds: number;
  winnerTeam: TeamId | null;
}
