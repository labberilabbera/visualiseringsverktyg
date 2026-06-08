"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  modelUrl: string;
  selected: string[];
  onToggle: (part: string) => void;
  onHover?: (part: string | null) => void;
  height?: number;
};

export default function ThreePartViewer({ modelUrl, selected, onToggle, onHover, height = 300 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const selectedRef = useRef<string[]>(selected);
  const onToggleRef = useRef(onToggle);
  const onHoverRef = useRef(onHover);

  useEffect(() => { selectedRef.current = selected; applyHighlights(); }, [selected]);
  useEffect(() => { onToggleRef.current = onToggle; onHoverRef.current = onHover; });

  function applyHighlights() {
    for (const m of meshesRef.current) {
      const name = m.name;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat) continue;
      if (selectedRef.current.includes(name)) {
        mat.emissive = new THREE.Color(0xf59e0b);
        mat.emissiveIntensity = 0.5;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  }

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5e8e5);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.set(0, 0, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(2, 4, 3);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dir2.position.set(-2, -1, -2);
    scene.add(dir2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };
    let moved = false;

    const proxied = "/api/proxy?url=" + encodeURIComponent(modelUrl);
    const loader = new GLTFLoader();
    let disposed = false;

    loader.load(proxied, (gltf) => {
      if (disposed) return;
      const root = gltf.scene;
      const meshes: THREE.Mesh[] = [];
      root.traverse((o: any) => {
        if (o.isMesh) {
          o.material = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.1, roughness: 0.8 });
          meshes.push(o);
        }
      });
      meshesRef.current = meshes;

      // centrera och skala
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      root.position.sub(center);
      const scale = 2 / maxDim;
      root.scale.setScalar(scale);
      scene.add(root);
      camera.position.set(0, 0.5, 3);
      controls.update();
      applyHighlights();
    });

    function setPointer(e: PointerEvent) {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    }

    function onDown(e: PointerEvent) { downPos = { x: e.clientX, y: e.clientY }; moved = false; }
    function onMove(e: PointerEvent) {
      if (Math.abs(e.clientX - downPos.x) > 4 || Math.abs(e.clientY - downPos.y) > 4) moved = true;
    }
    function onUp(e: PointerEvent) {
      if (moved) return; // det var en rotation, inte ett klick
      setPointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshesRef.current, false);
      if (hits.length > 0) {
        const name = (hits[0].object as THREE.Mesh).name;
        if (name) onToggleRef.current(name);
      }
    }

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);

    let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const onResize = () => {
      const w = mount.clientWidth || width;
      camera.aspect = w / height; camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      renderer.dispose();
      if (mount) mount.innerHTML = "";
    };
  }, [modelUrl, height]);

  return <div ref={mountRef} style={{ width: "100%", height: height + "px" }} />;
}
