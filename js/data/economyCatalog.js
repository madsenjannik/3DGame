// @ts-nocheck
// R148+ economy (Jannik 09/10, "Ressourceøkonomi" doc): three separate tracks.
//   Amber          -> Perk Shrine (personal perks, each costs more than the last)
//   Golden Seeds   -> the community tree in the Orangery (fed one seed at a time, long-term goal)
//   Special Seeds  -> one character each, planted at the Sprouting Ring
// New file (tagged import) so cached older modules never miss an export.

// Price of the next perk = PERK_PRICES[number of perks you already own].
export const PERK_PRICES = [10, 15, 20, 30];
export const perkPrice = owned => PERK_PRICES[Math.min(owned, PERK_PRICES.length - 1)];
