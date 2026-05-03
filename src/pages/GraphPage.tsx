import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { Navigate } from "@tanstack/react-router";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GraphPoint = {
  _id: string;
  nodeId: string;
  nodeName: string;
  nodeDescription?: string;
  x: number;
  y: number;
  z: number;
};

type HoveredPoint = {
  nodeName: string;
  nodeDescription?: string;
  clientX: number;
  clientY: number;
};

function normalizePoints(points: GraphPoint[], targetRadius = 80): GraphPoint[] {
  if (points.length === 0) return points;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    minZ = Math.min(minZ, point.z);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    maxZ = Math.max(maxZ, point.z);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const scale = span > 0 ? targetRadius / span : 1;

  return points.map((point) => ({
    ...point,
    x: (point.x - centerX) * scale,
    y: (point.y - centerY) * scale,
    z: (point.z - centerZ) * scale,
  }));
}

function createPointGeometry(points: GraphPoint[]) {
  const positions = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i += 1) {
    const offset = i * 3;
    positions[offset] = points[i].x;
    positions[offset + 1] = points[i].y;
    positions[offset + 2] = points[i].z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export function GraphPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const projectionData = useQuery(api.adminProjection.listGlobalProjectionPoints);
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  const points = useMemo(
    () => normalizePoints(projectionData?.points ?? []),
    [projectionData?.points]
  );

  useEffect(() => {
    if (!mountRef.current || points.length === 0) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 220);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const geometry = createPointGeometry(points);
    geometry.computeBoundingSphere();
    const pointMaterial = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 4.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.95,
    });
    const cloud = new THREE.Points(geometry, pointMaterial);
    scene.add(cloud);

    const axesHelper = new THREE.AxesHelper(24);
    scene.add(axesHelper);
    const gridHelper = new THREE.GridHelper(180, 18, 0x23314f, 0x1b2740);
    gridHelper.rotateX(Math.PI / 2);
    scene.add(gridHelper);

    controls.target.set(0, 0, 0);
    controls.update();

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 1.25;
    const pointer = new THREE.Vector2();
    let lastHoveredIndex = -1;

    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(cloud);
      const bestHit = intersections.reduce<THREE.Intersection<THREE.Object3D> | null>(
        (closest, hit) => {
          const closestDistanceToRay = closest?.distanceToRay ?? Number.POSITIVE_INFINITY;
          const hitDistanceToRay = hit.distanceToRay ?? Number.POSITIVE_INFINITY;
          return hitDistanceToRay < closestDistanceToRay ? hit : closest;
        },
        null
      );
      const index = bestHit?.index ?? -1;

      if (index < 0 || !points[index]) {
        if (lastHoveredIndex !== -1) {
          setHoveredPoint(null);
          lastHoveredIndex = -1;
        }
        return;
      }

      const hit = points[index];
      if (!hit) return;
      lastHoveredIndex = index;
      setHoveredPoint({
        nodeName: hit.nodeName,
        nodeDescription: hit.nodeDescription,
        clientX: event.clientX - rect.left,
        clientY: event.clientY - rect.top,
      });
    };

    const onPointerLeave = () => {
      lastHoveredIndex = -1;
      setHoveredPoint(null);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    let frameId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      geometry.dispose();
      pointMaterial.dispose();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [points]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading graph…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/app" />;
  }

  if (projectionData === undefined) {
    return <div className="p-8 text-center text-muted-foreground">Loading points…</div>;
  }

  if (!projectionData.isAdmin) {
    return <Navigate to="/app" />;
  }

  if (points.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No projected points found. Run global projection from admin first.
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-4 py-3 text-sm">
        Global projection points: <span className="font-semibold">{points.length}</span>
      </div>
      <div className="relative h-full w-full">
        <div ref={mountRef} className="h-full w-full" />
        {hoveredPoint ? (
          <div
            className="pointer-events-none absolute z-20 w-[320px] max-w-[90vw]"
            style={{
              left: hoveredPoint.clientX + 16,
              top: hoveredPoint.clientY + 16,
            }}
          >
            <Card size="sm" cornerRipple className="bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{hoveredPoint.nodeName}</CardTitle>
              </CardHeader>
              {hoveredPoint.nodeDescription ? (
                <CardContent className="pb-4 text-sm text-muted-foreground">
                  {hoveredPoint.nodeDescription}
                </CardContent>
              ) : (
                <CardContent className="pb-4 text-sm text-muted-foreground">
                  No description available.
                </CardContent>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
