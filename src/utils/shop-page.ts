import { showToast } from "@/utils/toast";
import { useRequiredUser } from "@/utils/auth";
import { BACKGROUNDS, coinsWord, SHIELD_PRICE, type ShopBackground, useShop } from "@/utils/shop";

export function useShopPage() {
  const { user } = useRequiredUser();
  const shop = useShop();

  function handleBuyShield() {
    if (shop.buyShield()) showToast("Щит куплен. Он включится сам, если мафия придёт за вами.", "success");
    else showToast(`Не хватает монет: нужно ${SHIELD_PRICE}.`, "error");
  }

  function handleBuyBackground(item: ShopBackground) {
    if (shop.buyBackground(item.id)) showToast(`Фон «${item.name}» куплен и надет.`, "success");
    else showToast(`Не хватает монет: нужно ${item.price}.`, "error");
  }

  return {
    user,
    coinsText: shop.isReady ? String(shop.coins) : "…",
    coinsWord: coinsWord(shop.coins),
    shields: shop.state.shields,
    canBuyShield: shop.isReady && shop.coins >= SHIELD_PRICE,
    hasEquipped: shop.state.equipped !== null,
    items: BACKGROUNDS.map((item) => ({
      ...item,
      isOwned: shop.state.owned.includes(item.id),
      isEquipped: shop.state.equipped === item.id,
      canBuy: shop.isReady && shop.coins >= item.price,
    })),
    handleBuyShield,
    handleBuyBackground,
    equip: shop.equip,
    unequip: () => shop.equip(null),
  };
}
