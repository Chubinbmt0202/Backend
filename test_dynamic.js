async function test() {
    try {
        console.log("Attempting dynamic import...");
        const faceapi = await import('./node_modules/@vladmandic/face-api/dist/face-api.node-wasm.js');
        console.log("Success! faceapi loaded.");
        process.exit(0);
    } catch (e) {
        console.error("Failed:", e.message);
        process.exit(1);
    }
}
test();
