import React, { useState } from 'react';
import { InventoryResources, ShopItem, TeamId, TeamUpgrades, UpgradeShopItem } from '../../types/game';
import { SHOP_ITEMS, UPGRADE_ITEMS } from '../../data/shopData';
import { soundManager } from '../../audio/soundManager';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: InventoryResources;
  teamUpgrades: TeamUpgrades;
  playerTeam: TeamId;
  onBuyItem: (item: ShopItem) => boolean;
  onBuyUpgrade: (upgradeId: string, cost: number) => boolean;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  resources,
  teamUpgrades,
  playerTeam,
  onBuyItem,
  onBuyUpgrade,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'upgrades'>('items');
  const [itemCategory, setItemCategory] = useState<'all' | 'blocks' | 'weapons' | 'armor' | 'tools' | 'utility'>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const resourceIcons: Record<string, { label: string; color: string; badge: string }> = {
    iron: { label: '철', color: 'text-slate-300', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    gold: { label: '금', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    diamond: { label: '다이아', color: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    emerald: { label: '에메랄드', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  };

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const filteredItems = SHOP_ITEMS.filter(item => {
    if (itemCategory === 'all') return true;
    return item.category === itemCategory;
  });

  const handleBuy = (item: ShopItem) => {
    const costInfo = resourceIcons[item.costType];
    if (resources[item.costType] < item.costAmount) {
      soundManager.playErrorSound();
      showFeedback(`⚠️ 재화가 부족합니다! (${costInfo.label} ${item.costAmount}개 필요, 현재 ${resources[item.costType]}개)`, 'error');
      return;
    }

    const success = onBuyItem(item);
    if (success) {
      soundManager.playBuySound();
      showFeedback(`✅ ${item.nameKo} 구매 완료!`, 'success');
    }
  };

  const handleUpgradeBuy = (upg: UpgradeShopItem) => {
    const currentTier = getUpgradeTier(upg.id);
    if (currentTier >= upg.maxTier) return;
    const cost = upg.diamondCost[currentTier] || upg.diamondCost[0];

    if (resources.diamond < cost) {
      soundManager.playErrorSound();
      showFeedback(`⚠️ 다이아몬드가 부족합니다! (${cost}개 필요, 현재 ${resources.diamond}개)`, 'error');
      return;
    }

    const success = onBuyUpgrade(upg.id, cost);
    if (success) {
      soundManager.playUpgradeSound();
      showFeedback(`🎉 ${upg.nameKo} 업그레이드 완료! (단계 ${currentTier + 1}/${upg.maxTier})`, 'success');
    }
  };

  const getUpgradeTier = (id: string): number => {
    switch (id) {
      case 'sharpness': return teamUpgrades.sharpness;
      case 'protection': return teamUpgrades.protection;
      case 'haste': return teamUpgrades.haste;
      case 'forge': return teamUpgrades.forge;
      case 'healPool': return teamUpgrades.healPool ? 1 : 0;
      case 'trapAlarm': return teamUpgrades.trapAlarm ? 1 : 0;
      case 'dragonBuff': return teamUpgrades.dragonBuff ? 1 : 0;
      default: return 0;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-zinc-900 border border-white/20 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-amber-400 tracking-wide font-mono">
              🛒 BEDWARS SHOP
            </h2>
            <div className="flex items-center gap-2 bg-zinc-800/80 px-3 py-1 rounded-lg border border-white/10 text-xs">
              <span className="text-slate-300">철: <strong>{resources.iron}</strong></span>
              <span className="text-amber-400">금: <strong>{resources.gold}</strong></span>
              <span className="text-cyan-400">다이아: <strong>{resources.diamond}</strong></span>
              <span className="text-emerald-400">에메랄드: <strong>{resources.emerald}</strong></span>
            </div>
          </div>

          <button
            id="btn-close-shop"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-lg transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Dynamic Toast Feedback Notification */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2 text-xs font-bold flex items-center justify-center transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
            }`}
          >
            {feedbackMessage.text}
          </div>
        )}

        {/* Primary Tabs (Items vs Team Upgrades) */}
        <div className="flex items-center border-b border-white/10 bg-zinc-950/40 px-4 pt-2 gap-2">
          <button
            id="tab-shop-items"
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 text-sm font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'items'
                ? 'bg-zinc-900 text-amber-400 border-t border-x border-white/10'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⚔️ 아이템 상점
          </button>
          <button
            id="tab-shop-upgrades"
            onClick={() => setActiveTab('upgrades')}
            className={`px-4 py-2 text-sm font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'upgrades'
                ? 'bg-zinc-900 text-cyan-400 border-t border-x border-white/10'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🛡️ 팀 업그레이드 (다이아)
          </button>
        </div>

        {/* Secondary Category Filters for Item Shop */}
        {activeTab === 'items' && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-950/20 border-b border-white/5 overflow-x-auto text-xs font-semibold">
            {[
              { id: 'all', label: '전체' },
              { id: 'blocks', label: '🧱 블록' },
              { id: 'weapons', label: '⚔️ 무기' },
              { id: 'armor', label: '🥼 방어구' },
              { id: 'tools', label: '⛏️ 도구' },
              { id: 'utility', label: '🧪 특수/포션' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setItemCategory(cat.id as typeof itemCategory)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  itemCategory === cat.id
                    ? 'bg-amber-500 text-black font-extrabold shadow'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'items' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map(item => {
                const canAfford = resources[item.costType] >= item.costAmount;
                const costInfo = resourceIcons[item.costType];

                return (
                  <div
                    key={item.id}
                    className="bg-zinc-800/70 border border-white/10 hover:border-white/25 rounded-xl p-3 flex flex-col justify-between transition shadow-md hover:bg-zinc-800"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xl">{item.icon}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border font-mono font-bold ${costInfo.badge}`}
                        >
                          {item.costAmount} {costInfo.label}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white">{item.nameKo}</h4>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {item.descriptionKo}
                      </p>
                    </div>

                    <button
                      id={`btn-buy-${item.id}`}
                      disabled={!canAfford}
                      onClick={() => handleBuy(item)}
                      className={`mt-3 w-full py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md active:scale-95'
                          : 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? '구매하기' : '자원 부족'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            // Team Upgrades List
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UPGRADE_ITEMS.map(upg => {
                const currentTier = getUpgradeTier(upg.id);
                const isMax = currentTier >= upg.maxTier;
                const nextCost = isMax ? 0 : upg.diamondCost[currentTier] || upg.diamondCost[0];
                const canAfford = !isMax && resources.diamond >= nextCost;

                return (
                  <div
                    key={upg.id}
                    className="bg-zinc-800/70 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{upg.icon}</span>
                          <div>
                            <h4 className="font-bold text-sm text-white">{upg.nameKo}</h4>
                            <span className="text-[11px] text-cyan-400 font-mono">
                              단계: {currentTier} / {upg.maxTier}
                            </span>
                          </div>
                        </div>

                        {!isMax && (
                          <span className="text-xs px-2 py-0.5 rounded-md border border-cyan-500/30 bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                            {nextCost} 다이아
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 mt-2">
                        {upg.descriptionKo}
                      </p>
                    </div>

                    <button
                      id={`btn-upgrade-${upg.id}`}
                      disabled={isMax || !canAfford}
                      onClick={() => handleUpgradeBuy(upg)}
                      className={`mt-3 w-full py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer ${
                        isMax
                          ? 'bg-emerald-900/60 text-emerald-300 cursor-default'
                          : canAfford
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md active:scale-95'
                          : 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? '최대 단계 완료' : canAfford ? '업그레이드 구매' : '다이아 부족'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer instruction */}
        <div className="p-3 bg-zinc-950/80 border-t border-white/10 text-center text-xs text-zinc-400">
          <span>게임 중 언제든지 <strong>E</strong> 키 또는 우측 하단 상점 버튼을 눌러 열 수 있습니다.</span>
        </div>
      </div>
    </div>
  );
};
