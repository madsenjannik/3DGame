// @ts-nocheck
// R150 (GO 09/10, Jannik: Golden Seeds go to community things, the tree in the big Orangery, fed from stage 0 as a
// long-term goal). The tree in the Orangery starts as soil and grows one stage each time it has been fed enough
// Golden Seeds (economyCatalog.TREE_COSTS). E at the tree feeds one seed. State: profile.tree { stage, fed } on the
// shared save; until there is a server it is your own tree on this device. Uses OrangeryHubSystem.setStage (its
// collision rebuild and lantern shatter at stage 6 come with it). DEV ?treeStage still wins. Fails soft.
import * as THREE from 'three';
import { TREE_COSTS, TREE_NAMES } from '../data/economyCatalog.js?build=SAVE-R155-20261009A';

const NEAR = 3.2, SIGN = 11;   // R152: the progress sign shows within 11 m
// R152: a small in-world sign over the soil ('COMMUNITY TREE · 1/2'), drawn on top so the trunk never hides it
function sign() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })); s.renderOrder = 20;
  s.scale.set(2.8, .88, 1); s.userData = { c, tex, text: '' }; s.name = 'COMMUNITY_TREE_SIGN'; return s;   // R153: bigger, readable on a phone
}
function drawSign(s, title, sub) {
  const { c, tex } = s.userData, x = c.getContext('2d'); if (s.userData.text === title + sub) return; s.userData.text = title + sub;
  x.clearRect(0, 0, c.width, c.height); x.fillStyle = 'rgba(25,34,22,.78)'; x.beginPath();
  const L = 8, T = 12, W = c.width - 16, H = 136, R = 40; x.moveTo(L + R, T); x.arcTo(L + W, T, L + W, T + H, R); x.arcTo(L + W, T + H, L, T + H, R); x.arcTo(L, T + H, L, T, R); x.arcTo(L, T, L + W, T, R); x.closePath(); x.fill();   // R153: arcTo, not roundRect (Safari < 16)
  x.strokeStyle = 'rgba(255,224,138,.55)'; x.lineWidth = 2; x.stroke(); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#ffe08a'; x.font = '800 28px Manrope, sans-serif'; x.fillText(title, c.width / 2, 54);
  x.fillStyle = '#f4f1e8'; x.font = '700 34px Manrope, sans-serif'; x.fillText(sub, c.width / 2, 104); tex.needsUpdate = true;
}
export class OrangeryTree {
  constructor(game) { this.g = game; this.applied = false; this.q = Promise.resolve(); }
  // R153: stage loads are async; queue them so quick feeding can never leave the model on an older stage
  show(stage, opts) { const o = this.g.orangery; this.q = this.q.then(() => o?.setStage(stage, opts)).catch(e => console.warn('[TGW] tree stage failed', e)); return this.q; }
  get t() { const p = this.g.save?.profile; if (!p) return { stage: 0, fed: 0 }; const t = p.tree ||= { stage: 0, fed: 0 }; return t; }
  max() { return TREE_COSTS.length; }
  need() { return TREE_COSTS[this.t.stage] ?? 0; }
  update() {
    const o = this.g.orangery; if (!o?.ready) return;
    if (this.applied) return this.updateSign(o);
    this.applied = true;
    if (/[?&]treeStage=/.test(location.search) && /[?&]dev=1/.test(location.search)) return;   // DEV preview stays as asked
    if (o.stage !== this.t.stage) this.show(this.t.stage, { playShatter: false });
  }
  updateSign(o) {
    if (!this.sign) { this.sign = sign(); this.sign.position.set(0, 2.5, 0); o.root.add(this.sign); }
    const c = this.g.character?.position, near = !!c && this.g.world?.space !== 'garden' && Math.hypot(c.x - o.root.position.x, c.z - o.root.position.z) < SIGN;
    this.sign.visible = near; if (!near) return;
    const t = this.t; drawSign(this.sign, 'COMMUNITY TREE', t.stage >= this.max() ? 'Fully grown' : `Stage ${t.stage} · ${t.fed}/${this.need()} Golden Seeds`);
  }
  interaction(pos) {
    const o = this.g.orangery; if (!o?.ready || !pos || this.g.world?.space === 'garden') return null;
    const d = Math.hypot(pos.x - o.root.position.x, pos.z - o.root.position.z); if (d > NEAR) return null;
    const t = this.t; if (t.stage >= this.max()) return { type: 'orangery-feed', label: 'The tree is fully grown', distance: d, disabled: true };
    const seeds = this.g.state.inventory.get('golden_seed') || 0, prog = `${t.fed}/${this.need()}`;
    if (seeds < 1) return { type: 'orangery-feed', label: 'Locked', distance: d, disabled: true, locked: true, reason: `Feed the tree a Golden Seed (${prog} to the next stage)` };
    return { type: 'orangery-feed', label: `Feed the tree · ${prog}`, distance: d };
  }
  feed() {
    const t = this.t, W = this.g.wilds; if (t.stage >= this.max() || !W?.pay?.({ golden_seed: 1 })) return false;
    t.fed++; let grew = false;
    if (t.fed >= this.need()) { t.stage++; t.fed = 0; grew = true; this.show(t.stage, { playShatter: true }); }
    this.g.save.persist();
    // R153: feeding is a moment: gold sparks at the soil and the count floats up; growing is a bigger burst
    try { const p = this.g.orangery.root.position, v = new THREE.Vector3(p.x, p.y + .5, p.z); this.g.fx?.burst?.(v, 0xffd86b, grew ? 22 : 8, grew ? 2 : 1);
      this.g.fx?.floatText?.(grew ? `Stage ${t.stage}` : `${t.fed}/${this.need()}`, v.clone().setY(v.y + .6)); } catch {}
    const name = TREE_NAMES[t.stage];   // R153: English names (the manifest's are Danish)
    this.g.hud?.showToast?.(grew ? `The tree grows · stage ${t.stage}${name ? ' · ' + name : ''}` : `The tree drinks the seed · ${t.fed}/${this.need()}`, { milestone: grew });
    return true;
  }
}
