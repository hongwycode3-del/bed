import * as THREE from 'three';
import { ArmorTier, TeamId, WeaponTier } from '../types/game';

export interface HumanoidModel {
  group: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  heldItem: THREE.Group;
  nameplate: THREE.Sprite;
  healthBar: THREE.Sprite;
  setArmor: (tier: ArmorTier, team: TeamId) => void;
  setWeapon: (tier: WeaponTier) => void;
  updateAnimation: (isMoving: boolean, isAttacking: boolean, time: number) => void;
  updateHealthDisplay: (currentHp: number, maxHp: number, absorptionHp: number) => void;
  flashHurt: () => void;
}

export function createHumanoidModel(
  name: string,
  team: TeamId,
  isSelf = false
): HumanoidModel {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.9 });
  const teamColors: Record<TeamId, number> = {
    red: 0xd32f2f,
    blue: 0x1976d2,
    green: 0x388e3c,
    yellow: 0xfbc02d,
  };
  const shirtMat = new THREE.MeshStandardMaterial({ color: teamColors[team], roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x303f9f, roughness: 0.8 });

  // 1. Head (0.5 x 0.5 x 0.5)
  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.65, 0);
  head.castShadow = true;
  group.add(head);

  // Hair cap
  const hairGeo = new THREE.BoxGeometry(0.52, 0.2, 0.52);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x4e342e });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.set(0, 0.18, 0);
  head.add(hair);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x212121 });
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.12, 0.02, 0.26);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.12, 0.02, 0.26);
  head.add(leftEye);
  head.add(rightEye);

  // 2. Body / Torso (0.5 x 0.75 x 0.25)
  const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
  const body = new THREE.Mesh(bodyGeo, shirtMat);
  body.position.set(0, 1.05, 0);
  body.castShadow = true;
  group.add(body);

  // 3. Left Arm (pivot at top shoulder)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.38, 1.4, 0);
  const armGeo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
  const leftArmMesh = new THREE.Mesh(armGeo, shirtMat);
  leftArmMesh.position.set(0, -0.375, 0);
  leftArmMesh.castShadow = true;
  leftArmGroup.add(leftArmMesh);
  group.add(leftArmGroup);

  // 4. Right Arm (with weapon slot)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.38, 1.4, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, shirtMat);
  rightArmMesh.position.set(0, -0.375, 0);
  rightArmMesh.castShadow = true;
  rightArmGroup.add(rightArmMesh);
  group.add(rightArmGroup);

  // Held item (sword / tool)
  const heldItemGroup = new THREE.Group();
  heldItemGroup.position.set(0, -0.65, 0.2);
  heldItemGroup.rotation.x = -Math.PI / 4;
  rightArmGroup.add(heldItemGroup);

  // 5. Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.14, 0.7, 0);
  const legGeo = new THREE.BoxGeometry(0.24, 0.7, 0.24);
  const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
  leftLegMesh.position.set(0, -0.35, 0);
  leftLegMesh.castShadow = true;
  leftLegGroup.add(leftLegMesh);
  group.add(leftLegGroup);

  // 6. Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.14, 0.7, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
  rightLegMesh.position.set(0, -0.35, 0);
  rightLegMesh.castShadow = true;
  rightLegGroup.add(rightLegMesh);
  group.add(rightLegGroup);

  // 7. Floating Nameplate & Health Bar Sprite
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 256;
  nameCanvas.height = 48;
  const nameCtx = nameCanvas.getContext('2d')!;
  nameCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  nameCtx.roundRect(4, 4, 248, 40, 10);
  nameCtx.fill();
  nameCtx.font = 'bold 22px Outfit, sans-serif';
  nameCtx.textAlign = 'center';
  nameCtx.fillStyle = '#' + teamColors[team].toString(16).padStart(6, '0');
  nameCtx.fillText(`[${team.toUpperCase()}] ${name}`, 128, 32);

  const nameTexture = new THREE.CanvasTexture(nameCanvas);
  const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTexture, depthTest: false }));
  nameSprite.position.set(0, 2.3, 0);
  nameSprite.scale.set(2.0, 0.38, 1);
  group.add(nameSprite);

  // Health Bar Sprite
  const hpCanvas = document.createElement('canvas');
  hpCanvas.width = 256;
  hpCanvas.height = 32;
  const hpTexture = new THREE.CanvasTexture(hpCanvas);
  const hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTexture, depthTest: false }));
  hpSprite.position.set(0, 2.05, 0);
  hpSprite.scale.set(1.6, 0.2, 1);
  group.add(hpSprite);

  function updateHealthDisplay(currentHp: number, maxHp: number, absorptionHp: number) {
    const ctx = hpCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 32);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(10, 4, 236, 24, 6);
    ctx.fill();

    const hpPercent = Math.max(0, Math.min(1, currentHp / maxHp));
    ctx.fillStyle = hpPercent > 0.5 ? '#4caf50' : hpPercent > 0.25 ? '#ff9800' : '#f44336';
    ctx.roundRect(12, 6, Math.floor(232 * hpPercent), 20, 4);
    ctx.fill();

    if (absorptionHp > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.roundRect(12, 6, Math.floor(232 * Math.min(1, absorptionHp / 10)), 6, 2);
      ctx.fill();
    }
    hpTexture.needsUpdate = true;
  }

  updateHealthDisplay(20, 20, 0);

  // Weapon Mesh Builder
  function setWeapon(tier: WeaponTier) {
    while (heldItemGroup.children.length > 0) {
      heldItemGroup.remove(heldItemGroup.children[0]);
    }
    if (tier === 'none') return;

    const colors: Record<WeaponTier, number> = {
      none: 0x000000,
      wood: 0x8d6e63,
      stone: 0x9e9e9e,
      iron: 0xe0e0e0,
      diamond: 0x00e5ff,
    };

    const swordGroup = new THREE.Group();
    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.1, 0.7, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: colors[tier],
      metalness: tier === 'iron' || tier === 'diamond' ? 0.7 : 0.1,
      roughness: 0.3,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.45, 0);
    swordGroup.add(blade);

    // Guard
    const guardGeo = new THREE.BoxGeometry(0.3, 0.06, 0.08);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0, 0.1, 0);
    swordGroup.add(guard);

    // Handle
    const handleGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
    const handle = new THREE.Mesh(handleGeo, guardMat);
    handle.position.set(0, -0.02, 0);
    swordGroup.add(handle);

    heldItemGroup.add(swordGroup);
  }

  // Armor Mesh Builder
  function setArmor(tier: ArmorTier, team: TeamId) {
    const armorColors: Record<ArmorTier, number> = {
      leather: teamColors[team],
      chainmail: 0x78909c,
      iron: 0xe0e0e0,
      diamond: 0x00e5ff,
    };
    const mat = new THREE.MeshStandardMaterial({
      color: armorColors[tier],
      metalness: tier === 'iron' || tier === 'diamond' ? 0.6 : 0.1,
      roughness: 0.4,
    });
    body.material = mat;
    leftLegMesh.material = mat;
    rightLegMesh.material = mat;
  }

  // Animation Update
  function updateAnimation(isMoving: boolean, isAttacking: boolean, time: number) {
    if (isMoving) {
      const legAngle = Math.sin(time * 10) * 0.6;
      leftLegGroup.rotation.x = legAngle;
      rightLegGroup.rotation.x = -legAngle;

      if (!isAttacking) {
        leftArmGroup.rotation.x = -legAngle;
        rightArmGroup.rotation.x = legAngle;
      }
    } else {
      leftLegGroup.rotation.x = 0;
      rightLegGroup.rotation.x = 0;
      if (!isAttacking) {
        leftArmGroup.rotation.x = 0;
        rightArmGroup.rotation.x = 0;
      }
    }

    if (isAttacking) {
      rightArmGroup.rotation.x = -Math.PI / 3 + Math.sin(time * 25) * 0.6;
    }
  }

  // Hurt red flash
  function flashHurt() {
    const origBodyMat = body.material;
    const hurtMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 });
    body.material = hurtMat;
    head.material = hurtMat;
    setTimeout(() => {
      body.material = origBodyMat;
      head.material = skinMat;
    }, 150);
  }

  return {
    group,
    head,
    body,
    leftArm: leftArmGroup,
    rightArm: rightArmGroup,
    leftLeg: leftLegGroup,
    rightLeg: rightLegGroup,
    heldItem: heldItemGroup,
    nameplate: nameSprite,
    healthBar: hpSprite,
    setArmor,
    setWeapon,
    updateAnimation,
    updateHealthDisplay,
    flashHurt,
  };
}
