import * as faceapi from '@vladmandic/face-api/dist/face-api.esm.js';
import * as tf from '@tensorflow/tfjs';
import { Canvas, Image, ImageData } from 'canvas';

// Set backend to CPU or WASM (CPU is default for plain tfjs in Node)
await tf.setBackend('cpu');
await tf.ready();

console.log("TF Backend:", tf.getBackend());

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
console.log("Face-api initialized with ESM version.");
process.exit(0);
