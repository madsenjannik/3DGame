// @ts-nocheck
import { createSproutVisual } from '../visual/SproutVisual.js';

const sharedPlayableContract = {
  forwardAxis: '+Z',
  groundOrigin: 'feet',
  // Species is visual identity, not power. Keep gameplay collision normalized.
  colliderRadius: 0.30,
  animations: ['Idle', 'Walk', 'Hop']
};

export const characterCatalog = {
  tulip: {
    id: 'tulip', displayName: 'Tulip', selectorOrder: 1,
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.66, nominalHeight: 0.88 },
    source: { type: 'gltf', url: './assets/characters/tulip.glb', scale: 0.72, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' } }
  },
  daisy: {
    id: 'daisy', displayName: 'Daisy', selectorOrder: 2,
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.65, nominalHeight: 0.90 },
    source: { type: 'gltf', url: './assets/characters/daisy.glb', scale: 0.64, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' } }
  },
  hyacinth: {
    id: 'hyacinth', displayName: 'Hyacinth', selectorOrder: 3,
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.69, nominalHeight: 0.92 },
    source: { type: 'gltf', url: './assets/characters/hyacinth.glb', scale: 0.66, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' } }
  },
  cactus: {
    id: 'cactus', displayName: 'Cactus', selectorOrder: 4, selectorAccent: '#9eaa42', portraitUrl: './assets/portraits/cactus.png',
    selectorBlurb: 'Keeps cool when the brief gets prickly.',
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.72, nominalHeight: 0.92 },
    source: { type: 'gltf', url: './assets/characters/cactus.glb', scale: 0.62, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' }, animationPlaybackRate: { Walk: 1.52 } }
  },
  fern: {
    id: 'fern', displayName: 'Fern', selectorOrder: 5,
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.71, nominalHeight: 0.94 },
    source: { type: 'gltf', url: './assets/characters/fern.glb', scale: 0.60, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' } }
  },
  succulent: {
    id: 'succulent', displayName: 'Succulent', selectorOrder: 6, selectorAccent: '#879b62', portraitUrl: './assets/portraits/succulent.png',
    selectorBlurb: 'Steady, adaptable. Grows best with good people around.',
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.66, nominalHeight: 1.01 },
    source: { type: 'gltf', url: './assets/characters/succulent.glb', scale: 0.50, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' } }
  },
  spire: {
    id: 'spire', displayName: 'Spire', selectorOrder: 7, selectorAccent: '#718f4c', portraitUrl: './assets/portraits/spire.png',
    selectorBlurb: 'Always reaching a little higher. Ideas first.',
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.73, nominalHeight: 1.12 },
    source: { type: 'gltf', url: './assets/characters/spire.glb', scale: 0.50, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' } }
  },
  swamp: {
    id: 'swamp', displayName: 'Swamp', selectorOrder: 8, selectorAccent: '#bd7751', portraitUrl: './assets/portraits/swamp.png',
    selectorBlurb: 'Finds a way through the messy middle.',
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.70, nominalHeight: 1.06 },
    source: { type: 'gltf', url: './assets/characters/swamp.glb', scale: 0.54, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' } }
  },
  aloe: {
    id: 'aloe', displayName: 'Aloe Vera', selectorOrder: 9,
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.67, nominalHeight: 1.02 },
    source: { type: 'gltf', url: './assets/characters/aloe-vera.glb', scale: 0.50, animationMap: { Idle: 'Idle', Walk: 'Walk', Hop: 'Hop' } }
  },
  sprout_alpha: {
    id: 'sprout_alpha', displayName: 'Sprout Alpha', sizeClass: 'MEDIUM', hiddenFromSelector: true,
    contract: { ...sharedPlayableContract, cameraTargetHeight: 0.66, nominalHeight: 1.02 },
    source: { type: 'procedural', factory: createSproutVisual }
  }
};

export const resourceCatalog = {
  rare_seed: { id: 'rare_seed', displayName: 'Golden Seed', collectibleRadius: 1.75, awakenRadius: 3.4, inventoryIcon: '✦', source: { type: 'gltf', url: './assets/collectibles/golden-seed.glb', scale: 1, hoverHeight: 0.34, animationMap: { Idle: 'Idle', Awaken: 'Awaken', Collect: 'Collect' } } },
  wood: { id: 'wood', displayName: 'Wood', collectibleRadius: 1.55, gatherAmount: 2, inventoryIcon: '▰', worldColor: 0xb08355 },
  stone: { id: 'stone', displayName: 'Stone', collectibleRadius: 1.55, gatherAmount: 2, inventoryIcon: '◆', worldColor: 0x93998b },
  clay: { id: 'clay', displayName: 'Clay', collectibleRadius: 1.55, gatherAmount: 2, inventoryIcon: '●', worldColor: 0xb87550 },
  fiber: { id: 'fiber', displayName: 'Fiber', collectibleRadius: 1.55, gatherAmount: 2, inventoryIcon: '≋', worldColor: 0x78964e }
};

export const buildingCatalog = {
  garden_lookout: {
    id: 'garden_lookout',
    displayName: 'Garden Lookout',
    requirements: { wood: 2, stone: 2, clay: 2, fiber: 2 },
    reveals: 'rare_seed_hotspot'
  }
};
