// @ts-nocheck
import * as THREE from 'three';

function orderedCharacters(catalog) {
  return Object.values(catalog)
    .filter(def => !def.hiddenFromSelector && def.source?.type === 'gltf')
    .sort((a, b) => (a.selectorOrder || 999) - (b.selectorOrder || 999));
}

export class CharacterSelector {
  constructor(catalog) {
    this.catalog = catalog;
    this.characters = orderedCharacters(catalog);
    this.selectedId = this.characters[0]?.id || null;
    this.cache = new Map();
    this.current = null;
    this.mixer = null;
    this.running = false;
    this.frameId = 0;
    this.clock = new THREE.Clock();
    this.loadToken = 0;

    this.dragging = false;
    this.pointerId = null;
    this.lastPointerX = 0;
    this.rotationVelocity = 0;
    this.userRotation = -0.13;
    this.dragMoved = false;

    this.root = document.getElementById('character-selector');
    this.canvas = document.getElementById('character-preview-canvas');
    this.stage = document.getElementById('character-preview-stage');
    this.options = document.getElementById('character-options');
    this.nameEl = document.getElementById('character-preview-name');
    this.blurbEl = document.getElementById('character-preview-blurb');
    this.confirm = document.getElementById('character-confirm');
    this.loading = document.getElementById('character-preview-loading');

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.10;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(33, 1, 0.1, 30);
    this.previewGroup = new THREE.Group();
    this.scene.add(this.previewGroup);

    const hemi = new THREE.HemisphereLight(0xf1f4e9, 0x58674a, 1.7);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1d7, 3.0);
    key.position.set(3.8, 6.0, 5.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd69f, 0.85);
    fill.position.set(-4, 2.5, 2);
    this.scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 64),
      new THREE.MeshStandardMaterial({ color: 0xb6c588, roughness: 1, transparent: true, opacity: 0.52 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.012;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.onResize = () => this.resize();
    addEventListener('resize', this.onResize);

    this.onPointerDown = event => {
      if (!this.current) return;
      this.dragging = true;
      this.pointerId = event.pointerId;
      this.lastPointerX = event.clientX;
      this.rotationVelocity = 0;
      this.dragMoved = false;
      this.stage.classList.add('dragging');
      this.stage.setPointerCapture?.(event.pointerId);
    };

    this.onPointerMove = event => {
      if (!this.dragging || event.pointerId !== this.pointerId) return;
      const dx = event.clientX - this.lastPointerX;
      this.lastPointerX = event.clientX;
      if (Math.abs(dx) > 0.5) this.dragMoved = true;
      const delta = dx * 0.0115;
      this.userRotation += delta;
      this.rotationVelocity = THREE.MathUtils.lerp(this.rotationVelocity, delta * 6.4, 0.42);
    };

    this.onPointerUp = event => {
      if (!this.dragging || event.pointerId !== this.pointerId) return;
      this.dragging = false;
      this.stage.classList.remove('dragging');
      this.stage.releasePointerCapture?.(event.pointerId);
      this.pointerId = null;
    };

    this.onPreviewKey = event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      this.userRotation += direction * 0.18;
      this.rotationVelocity = direction * 0.65;
    };

    this.stage?.addEventListener('pointerdown', this.onPointerDown);
    this.stage?.addEventListener('pointermove', this.onPointerMove);
    this.stage?.addEventListener('pointerup', this.onPointerUp);
    this.stage?.addEventListener('pointercancel', this.onPointerUp);
    this.stage?.addEventListener('keydown', this.onPreviewKey);
  }

  async open() {
    if (!this.root || !this.characters.length) return this.selectedId;
    document.body.classList.add('character-select-open');
    this.renderOptions();
    this.running = true;
    this.clock.start();
    this.resize();
    this.animate();

    await this.select(this.selectedId, true);
    document.getElementById('loading')?.classList.add('hide');

    return new Promise(resolve => {
      this.confirm.onclick = () => {
        const id = this.selectedId;
        this.close();
        resolve(id);
      };
    });
  }

  renderOptions() {
    this.options.innerHTML = '';
    for (const def of this.characters) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'character-option';
      button.dataset.characterId = def.id;
      button.style.setProperty('--character-accent', def.selectorAccent || '#7f9467');
      button.setAttribute('aria-pressed', def.id === this.selectedId ? 'true' : 'false');
      button.innerHTML = `
        <span class="character-option-portrait" aria-hidden="true"><img src="${def.portraitUrl}" alt="" /></span>
        <span class="character-option-copy">
          <span class="character-option-heading"><b>${def.displayName}</b></span>
          <em>${def.selectorBlurb || ''}</em>
        </span>
        <span class="character-option-check" aria-hidden="true">✓</span>`;
      button.addEventListener('click', () => this.select(def.id));
      this.options.appendChild(button);
    }
    this.syncOptionState();
  }

  syncOptionState() {
    for (const button of this.options.querySelectorAll('.character-option')) {
      const active = button.dataset.characterId === this.selectedId;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  async loadCharacter(def) {
    if (this.cache.has(def.id)) return this.cache.get(def.id);
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(def.source.url);
    const root = gltf.scene;
    root.scale.setScalar(def.source.scale || 1);
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const result = { root, animations: gltf.animations };
    this.cache.set(def.id, result);
    return result;
  }

  async select(id, immediate = false) {
    const def = this.catalog[id];
    if (!def || def.hiddenFromSelector) return;
    this.selectedId = id;
    this.syncOptionState();
    this.nameEl.textContent = def.displayName;
    this.blurbEl.textContent = def.selectorBlurb || '';
    this.root.style.setProperty('--selected-accent', def.selectorAccent || '#7f9467');
    this.confirm.disabled = true;
    this.loading.textContent = 'Growing creature…';
    this.loading.classList.add('show');

    const token = ++this.loadToken;
    try {
      const loaded = await this.loadCharacter(def);
      if (token !== this.loadToken) return;
      this.setPreview(def, loaded, immediate);
      this.confirm.disabled = false;
    } catch (error) {
      console.error(`Could not preview ${id}`, error);
      this.loading.textContent = 'Could not load character';
    } finally {
      if (token === this.loadToken) this.loading.classList.remove('show');
    }
  }

  setPreview(def, loaded, immediate) {
    if (this.current) this.previewGroup.remove(this.current);
    this.mixer?.stopAllAction();

    // Only one preview is visible at a time, so reuse the cached skinned scene directly.
    // This preserves the GLTF skeleton bindings exactly as exported.
    const root = loaded.root;
    root.position.set(0, 0, 0);
    this.current = root;
    this.previewGroup.add(root);

    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;

    // Selector comparison contract: every species uses the exact same stage,
    // camera position, FOV, target and ground plane. Do not auto-frame per asset.
    // This preserves true relative height and width in the selector.
    this.camera.position.set(0.34, 0.78, 3.35);
    this.camera.lookAt(0, 0.56, 0);
    this.camera.near = 0.05;
    this.camera.far = 40;
    this.camera.updateProjectionMatrix();

    this.mixer = new THREE.AnimationMixer(root);
    const idleName = def.source.animationMap?.Idle || 'Idle';
    const idle = loaded.animations.find(clip => clip.name === idleName);
    if (idle) this.mixer.clipAction(idle).reset().play();

    this.userRotation = 0;
    this.rotationVelocity = 0;
    this.previewGroup.rotation.y = this.userRotation;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.mixer?.update(dt);
    if (this.current) {
      if (!this.dragging && Math.abs(this.rotationVelocity) > 0.0001) {
        this.userRotation += this.rotationVelocity * dt;
        this.rotationVelocity *= Math.pow(0.055, dt);
      }
      this.previewGroup.rotation.y = this.userRotation;
    }
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(() => this.animate());
  }

  close() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    removeEventListener('resize', this.onResize);
    this.stage?.removeEventListener('pointerdown', this.onPointerDown);
    this.stage?.removeEventListener('pointermove', this.onPointerMove);
    this.stage?.removeEventListener('pointerup', this.onPointerUp);
    this.stage?.removeEventListener('pointercancel', this.onPointerUp);
    this.stage?.removeEventListener('keydown', this.onPreviewKey);
    this.mixer?.stopAllAction();
    this.root.classList.add('closing');
    document.body.classList.remove('character-select-open');
    setTimeout(() => {
      this.root.remove();
      this.renderer.dispose();
    }, 320);
  }
}

export async function chooseCharacter(catalog) {
  const selector = new CharacterSelector(catalog);
  return selector.open();
}
