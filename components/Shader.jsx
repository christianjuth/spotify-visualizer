import TWEEN from '@tweenjs/tween.js';
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useSpotify } from './Player';

export function useScene2(createSceneFn) { 
	const ref = useRef(null);
	const [pulse, setPulse] = useState({ pulse: (beat) => {} })
	const createdSceneRef = useRef(null)
	const { imageColors, trackId } = useSpotify()

	useEffect(() => {
		let stopped = false
		function animate(time) {
			if (stopped) {
				return
			}
			window.requestAnimationFrame(animate);
			TWEEN.update(time);
		}
		animate()
		return () => {
			stopped = true
		}
	}, [])

	useEffect(() => {
		const canvas = ref.current
		if (canvas) {
			let stopped = false

			// Scene
			const scene = new THREE.Scene()

				/**
			 * Sizes
			 */
				 const sizes = {
					width: window.innerWidth,
					height: window.innerHeight
				}

			/**
			 * Camera
			 */
			// Base camera
			const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 100)
			camera.position.x = 0
			camera.position.y = 0
			camera.position.z = 2
			scene.add(camera)

			/**
			 * Renderer
			 */
			const renderer = new THREE.WebGLRenderer({
				canvas: canvas,
			})
			renderer.setSize(sizes.width, sizes.height)
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

			// Create scene
			const createdScene = createSceneFn({ scene, renderer, camera })
			createdSceneRef.current = createdScene
			setPulse({ pulse: createdScene.pulse })

			function handleResize() {
				// Update sizes
				sizes.width = window.innerWidth
				sizes.height = window.innerHeight

				// Update camera
				camera.aspect = sizes.width / sizes.height
				camera.updateProjectionMatrix()

				// Update renderer
				renderer.setSize(sizes.width, sizes.height)
				renderer.setPixelRatio()
				createdScene.resize(sizes.height, sizes.width, Math.min(window.devicePixelRatio, 2))
			}
			handleResize()

			window.addEventListener('resize', handleResize)

			/**
			 * Animate
			 */

			const clock = new THREE.Clock()
			let lastTick = 0

			const tick = () => {
				if (stopped) {
					return
				}

				const elapsedTime = clock.getElapsedTime()
				const diff = elapsedTime - lastTick
				lastTick = elapsedTime

				createdScene.tick(diff)

				// Call tick again on the next frame
				window.requestAnimationFrame(tick)
			}

			tick()

			return () => {
				stopped = true
				window.removeEventListener('resize', handleResize)
			}
		}
	}, [createSceneFn, trackId])

	useEffect(() => {
		if (createdSceneRef.current && imageColors) {
			createdSceneRef.current.setColors(imageColors)
		}
	}, [imageColors])

	return {
		containerRef: ref,
		pulse: pulse.pulse
	}
}

export function Scene({ containerRef }) {
	return (
		<canvas
			ref={containerRef}
			style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0 }}
		></canvas>
  );
}
