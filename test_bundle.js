import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as tf from '@tensorflow/tfjs';

async function test() {
    try {
        await tf.setBackend('cpu');
        await tf.ready();
        console.log("TF Backend:", tf.getBackend());

        const faceapi = require('@vladmandic/face-api/dist/face-api.js');
        console.log("FaceAPI Nets:", Object.keys(faceapi.nets).length);
        process.exit(0);
    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
}

test();
