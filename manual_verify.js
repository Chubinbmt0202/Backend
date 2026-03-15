import * as faceapi from '@vladmandic/face-api';
import { Canvas, Image, ImageData, loadImage } from 'canvas';
import pool from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const urls = [
    "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/biden.jpg",
    "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/obama.jpg",
    "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/obama2.jpg"
];

const verifyLogic = async () => {
    try {
        console.log("=== Loading Models ===");
        const modelPath = path.join(__dirname, './node_modules/@vladmandic/face-api/model');
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
            faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
        ]);
        console.log("Models loaded.");

        const embeddings = [];
        for (const url of urls) {
            console.log(`Processing: ${url}`);
            const img = await loadImage(url);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            if (detection) {
                embeddings.push(Array.from(detection.descriptor));
                console.log(`Success: extracted embedding from ${url}`);
            } else {
                console.log(`Failed: no face in ${url}`);
            }
        }

        if (embeddings.length === 3) {
            console.log("=== Updating Database ===");
            const embeddingJSON = JSON.stringify(embeddings);
            const result = await pool.query(
                "UPDATE users SET face_mesh_data = $1, is_face_updated = true WHERE id = 1 RETURNING id, full_name, is_face_updated",
                [embeddingJSON]
            );
            console.log("Database Update Result:", result.rows[0]);
            console.log("=== VERIFICATION SUCCESSFUL ===");
        } else {
            console.error("Failed to extract all 3 embeddings.");
        }
    } catch (error) {
        console.error("Verification Error:", error);
    } finally {
        process.exit(0);
    }
};

verifyLogic();
