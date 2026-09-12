import * as THREE from "three";

/** Reusable stage lighting and sequence-driven effects. No independent animation clock. */
export function createJourneyStage(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const geo = <T extends THREE.BufferGeometry>(value: T) => { geometries.push(value); return value; };
  const mat = <T extends THREE.Material>(value: T) => { materials.push(value); return value; };
  const glow = (color: string, opacity: number) => mat(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));

  const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(28, 22)), mat(new THREE.MeshStandardMaterial({ color: "#07121c", roughness: .58, metalness: .55, transparent: true, opacity: .68 })));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.4; root.add(floor);
  const gridPoints: number[] = [];
  for (let i = -14; i <= 14; i++) gridPoints.push(i, -1.385, -10, i, -1.385, 10, -14, -1.385, i, 14, -1.385, i);
  const grid = new THREE.LineSegments(geo(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3))), mat(new THREE.LineBasicMaterial({ color: "#4f8ba2", transparent: true, opacity: .065 })));
  root.add(grid);

  const pads: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
  [[-5.05, -.6, "#59edcf"], [-2.5, -.3, "#63bfff"], [2.5, -.3, "#aaa4ff"], [5.05, -.6, "#aaa4ff"]].forEach(([x, z, color]) => {
    const pad = new THREE.Mesh(geo(new THREE.RingGeometry(.94, .96, 80)), glow(color as string, .22));
    pad.rotation.x = -Math.PI / 2; pad.position.set(x as number, -1.37, z as number); root.add(pad); pads.push(pad);
    const disc = new THREE.Mesh(geo(new THREE.CircleGeometry(.94, 64)), glow(color as string, .025));
    disc.rotation.x = -Math.PI / 2; disc.position.copy(pad.position); disc.position.y -= .003; root.add(disc);
  });
  const focusRing = new THREE.Mesh(geo(new THREE.RingGeometry(1.12, 1.14, 100)), glow("#59edcf", .45));
  focusRing.rotation.x = -Math.PI / 2; focusRing.position.set(0, -1.36, 2.25); root.add(focusRing);
  const focusArc = new THREE.Mesh(geo(new THREE.RingGeometry(1.21, 1.23, 80, 1, 0, Math.PI * 1.4)), glow("#59edcf", .25));
  focusArc.rotation.x = -Math.PI / 2; focusArc.position.copy(focusRing.position); root.add(focusArc);

  const scan = new THREE.Mesh(geo(new THREE.RingGeometry(.62, .65, 64)), glow("#63bfff", .25));
  scan.rotation.x = -Math.PI / 2; root.add(scan);
  const ripple = new THREE.Mesh(geo(new THREE.RingGeometry(.32, .345, 64)), glow("#59edcf", .6));
  root.add(ripple);

  const dustArray = new Float32Array(64 * 3);
  for (let i = 0; i < 64; i++) {
    dustArray[i * 3] = Math.sin(i * 127.1) * 8;
    dustArray[i * 3 + 1] = Math.cos(i * 311.7) * 2 + 1;
    dustArray[i * 3 + 2] = Math.sin(i * 74.7) * 4 - 3;
  }
  const dust = new THREE.Points(geo(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(dustArray, 3))), mat(new THREE.PointsMaterial({ color: "#9fc9e0", size: .017, transparent: true, opacity: .32, depthWrite: false, sizeAttenuation: true })));
  root.add(dust);

  const trail = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(.035, 6, 4)), glow("#63bfff", .65), 18);
  trail.frustumCulled = false; trail.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(trail);
  const dummy = new THREE.Object3D();
  const point = new THREE.Vector3();
  return {
    update(options: { time: number; fraction: number; reduced: boolean; failed: boolean; finished: boolean; color: string; hero: THREE.Object3D | undefined; route: boolean; destination: THREE.Vector3 | undefined; sample: (fraction: number, out: THREE.Vector3) => THREE.Vector3; provider: boolean; consumer: boolean; data: boolean }) {
      const o = options;
      dust.visible = !o.reduced; dust.rotation.y = o.time * .007;
      pads.forEach((pad, index) => { pad.material.opacity = (index < 2 ? o.provider : o.consumer) ? .45 : .12; });
      const accent = o.failed ? "#ff7e9b" : o.color;
      focusRing.material.color.set(accent); focusArc.material.color.set(accent);
      focusRing.material.opacity = o.hero ? .38 : .09;
      focusArc.visible = !!o.hero; focusArc.rotation.z = o.reduced ? 0 : o.time * .16;
      scan.visible = !!o.hero && !o.reduced && !o.finished;
      if (o.hero) { scan.position.copy(o.hero.position); scan.position.y += Math.sin(o.fraction * Math.PI * 2) * .65; }
      scan.material.color.set(accent); scan.material.opacity = o.failed ? .48 : .16;
      trail.visible = o.route && !o.reduced && !o.failed && !o.finished;
      trail.material.color.set(o.data ? "#55efc8" : o.color);
      for (let i = 0; i < 18 && trail.visible; i++) {
        const fraction = o.fraction - i * .009;
        o.sample(Math.max(0, fraction), point);
        dummy.position.copy(point); dummy.scale.setScalar(fraction < 0 ? 0 : (1 - i / 18) * (o.data ? 1.4 : .85));
        dummy.updateMatrix(); trail.setMatrixAt(i, dummy.matrix);
      }
      trail.instanceMatrix.needsUpdate = true;
      const arrival = Math.max(0, (o.fraction - .8) / .2);
      ripple.visible = !!o.destination && o.route && arrival > 0 && arrival < 1 && !o.reduced && !o.failed;
      if (o.destination) ripple.position.copy(o.destination);
      ripple.material.color.set(accent); ripple.material.opacity = (1 - arrival) * .6;
      ripple.scale.setScalar(1 + arrival * 3);
    },
    dispose() { root.removeFromParent(); geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); },
  };
}
