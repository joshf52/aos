"use client";

// THE ONLY FILE ALLOWED TO IMPORT three / @react-three/* — keep it that way so
// the WebGL stack stays a single lazy chunk (see hero-stage.tsx's dynamic
// import). Renders the "Idea -> Lens -> Build Path -> MVP -> Launch" pipeline
// as five emissive nodes strung along a receding rail, with a traveling
// energy pulse, a drifting Sparkles field, and Bloom to make the emissive
// materials glow. All motion is damped (THREE.MathUtils.damp) — nothing
// linear. Frameloop is fully paused (`frameloop="never"`) whenever the scene
// is off-screen (`active` prop, driven by hero-stage's inView) or the tab is
// hidden, so an idle hero costs zero GPU/CPU.
//
// TUNING KNOBS: NODE_POSITIONS (path shape), PULSE_SPEED, bloom `intensity` /
// `luminanceThreshold`, Sparkles `count`/`speed`. Copy lives in hero-copy.tsx.
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, Float, Preload, Sparkles } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

const EMERALD = "#3DB87A";
const GOLD = "#D4A574";

const NODE_POSITIONS: [number, number, number][] = [
  [-3.4, 0.35, 2.4],
  [-1.7, -0.35, 1.0],
  [0, 0.45, -0.5],
  [1.7, -0.25, -2.0],
  [3.4, 0.55, -3.6],
];

const NODE_LABELS = ["Idea", "Lens", "Build Path", "MVP", "Launch"] as const;

const NODES = NODE_POSITIONS.map((position, i) => ({
  position,
  label: NODE_LABELS[i],
  isFinal: i === NODE_POSITIONS.length - 1,
  color: i === NODE_POSITIONS.length - 1 ? GOLD : EMERALD,
}));

// Curve the rail + traveling pulse both ride — built once at module scope
// since the node layout never changes at runtime.
const PIPELINE_CURVE = new THREE.CatmullRomCurve3(
  NODE_POSITIONS.map(([x, y, z]) => new THREE.Vector3(x, y, z))
);

const PULSE_SPEED = 0.12; // loops/sec along the curve

function Scene({ scrollProgress }: { scrollProgress?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseT = useRef(0);

  const isCoarsePointer = useMemo(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(pointer: coarse)").matches,
    []
  );

  const railGeometry = useMemo(
    () => new THREE.TubeGeometry(PIPELINE_CURVE, 64, 0.015, 8, false),
    []
  );

  const backdropTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "#17171D");
    gradient.addColorStop(1, "#0A0A0C");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Ambient drift — always on, independent of input.
    const ambientRotY = Math.sin(t * 0.15) * 0.12;
    const ambientRotX = Math.cos(t * 0.12) * 0.05;

    // Pointer parallax — skip on coarse (touch) pointers and before the
    // pointer has ever moved (fiber defaults it to 0,0).
    const pointerActive = !isCoarsePointer && (state.pointer.x !== 0 || state.pointer.y !== 0);
    const pointerX = pointerActive ? state.pointer.x : 0;
    const pointerY = pointerActive ? state.pointer.y : 0;

    // Scroll parallax — prefer the passed-in progress, fall back to a raw
    // scrollY read (cheap, and this only runs while the scene is active).
    const scroll =
      scrollProgress ??
      (typeof window !== "undefined"
        ? THREE.MathUtils.clamp(window.scrollY / Math.max(window.innerHeight, 1), 0, 1)
        : 0);

    const group = groupRef.current;
    if (group) {
      const targetRotY = ambientRotY + pointerX * 0.15;
      const targetRotX = ambientRotX + pointerY * 0.08;
      const targetPosY = -scroll * 0.7 + Math.sin(t * 0.2) * 0.03;
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetRotY, 4, delta);
      group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetRotX, 4, delta);
      group.position.y = THREE.MathUtils.damp(group.position.y, targetPosY, 3, delta);
    }

    pulseT.current = (pulseT.current + delta * PULSE_SPEED) % 1;
    const pulse = pulseRef.current;
    if (pulse) {
      const point = PIPELINE_CURVE.getPointAt(pulseT.current);
      pulse.position.copy(point);
      const material = pulse.material as THREE.MeshBasicMaterial;
      material.opacity = 0.35 + Math.sin(pulseT.current * Math.PI) * 0.6;
    }
  });

  return (
    <>
      <ambientLight intensity={0.18} color="#F5F2ED" />
      <pointLight position={[3, 4, 5]} intensity={1.3} color="#F5F2ED" />

      <mesh position={[0, 0, -7]}>
        <planeGeometry args={[22, 15]} />
        {backdropTexture ? (
          <meshBasicMaterial map={backdropTexture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#101014" />
        )}
      </mesh>

      <group ref={groupRef}>
        <mesh geometry={railGeometry}>
          <meshBasicMaterial color={EMERALD} transparent opacity={0.28} toneMapped={false} />
        </mesh>

        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial
            color={EMERALD}
            transparent
            opacity={0.9}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {NODES.map((node, i) => (
          <Float
            key={node.label}
            speed={1.1 + i * 0.08}
            rotationIntensity={0.35}
            floatIntensity={0.8}
            floatingRange={[-0.09, 0.09]}
          >
            <mesh position={node.position}>
              <icosahedronGeometry args={[node.isFinal ? 0.46 : 0.4, node.isFinal ? 2 : 1]} />
              <meshStandardMaterial
                color={node.color}
                emissive={node.color}
                emissiveIntensity={node.isFinal ? 3 : 2.5}
                roughness={0.35}
                metalness={0.1}
                toneMapped={false}
              />
            </mesh>
          </Float>
        ))}

        <Sparkles
          count={120}
          scale={[9, 6, 9]}
          size={2}
          speed={0.25}
          color={EMERALD}
          opacity={0.5}
          position={[0, 0, -1]}
        />
      </group>
    </>
  );
}

interface PipelineCanvasProps {
  /** Off-screen (or otherwise inactive) hero should pass `false` to fully halt the frameloop. */
  active?: boolean;
  /** 0..1 progress through the hero section; omit to fall back to a raw window.scrollY read. */
  scrollProgress?: number;
  className?: string;
}

export default function PipelineCanvas({
  active = true,
  scrollProgress,
  className,
}: PipelineCanvasProps) {
  // Belt-and-braces containment: even if a parent forgets to gate `active` on
  // scroll visibility, a backgrounded tab always stops rendering.
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const frameloop = active && pageVisible ? "always" : "never";

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 48 }}
      frameloop={frameloop}
      className={className}
    >
      <AdaptiveDpr pixelated={false} />
      <Preload all />
      <fog attach="fog" args={["#0A0A0C", 6, 18]} />
      <Scene scrollProgress={scrollProgress} />
      <EffectComposer>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.2} luminanceSmoothing={0.9} />
      </EffectComposer>
    </Canvas>
  );
}
