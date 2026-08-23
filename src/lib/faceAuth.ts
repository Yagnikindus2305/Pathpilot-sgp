// Loads @vladmandic/face-api (a maintained, TensorFlow.js-based face
// detection/recognition library) and its model weights only when actually
// needed -- enrollment, the face-scan login tab, and Aptitude Test
// proctoring are the only three places that import this module, so the
// ~6.7MB of model weight files never load for anyone just using the rest
// of the app. Model files are served as plain static assets from
// /models (copied from node_modules/@vladmandic/face-api/model at build
// time -- see public/models).

// The library author's own documented-optimal value ("A threshold of 0.6
// is optimal yes, I won't change it" -- justadudewhohacks/face-api.js#542,
// discussing this exact symptom). Enrollment stores three separate
// reference captures rather than one (see FaceEnrollmentScreen), and every
// comparison is matched against the *mean* distance across all of them --
// that averaging is the author's own recommended fix for a genuine
// same-person scan occasionally landing just above threshold, so the
// threshold itself doesn't need to be loosened to compensate.
export const FACE_MATCH_THRESHOLD = 0.6;
const MODEL_URL = '/models';

type FaceApiModule = typeof import('@vladmandic/face-api');

let apiPromise: Promise<FaceApiModule> | null = null;

export function loadFaceApi(): Promise<FaceApiModule> {
  if (!apiPromise) {
    apiPromise = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        // Full landmark model, not the tiny one -- reported blink-detection
        // failures (glasses in particular) trace back to the tiny model's
        // coarser eye-point precision, which the eye-aspect-ratio signal is
        // directly sensitive to. ~280KB larger, negligible next to the
        // ~6.7MB already being loaded, and this only ever runs during a
        // short deliberate scan, not a continuous high-fps stream.
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    })();
  }
  return apiPromise;
}

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  // `ideal` rather than a hard constraint -- asks for a sharp 720p feed but
  // still falls back gracefully on a weaker camera instead of failing
  // outright. The old 320x240 request produced a visibly blurry preview
  // even on cameras that could do far better.
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export interface FaceDetection {
  descriptor: Float32Array;
  earAvg: number;
  noseX: number;
  boxWidth: number;
  darkGlasses: boolean;
}

// There's no real glasses classifier available in this stack -- face-api
// doesn't ship one, and training one is far out of scope. What's actually
// detectable is the specific thing dark/opaque lenses do: block the eyes
// from being visible, which shows up as unusually dark pixels exactly where
// the eye region should be. Clear prescription glasses don't trigger this
// (the eyes are still visible through them); sunglasses/dark tints do.
// Below this average 0-255 luminance across both eye regions counts as
// "can't see the eyes" -- a reasonable starting point, not empirically
// tuned, since there was no real dark-glasses sample to calibrate against.
const DARK_GLASSES_BRIGHTNESS_THRESHOLD = 55;

let sampleCanvas: HTMLCanvasElement | null = null;

function sampleEyeDarkness(video: HTMLVideoElement, landmarks: { getLeftEye(): { x: number; y: number }[]; getRightEye(): { x: number; y: number }[] }): boolean {
  if (!video.videoWidth || !video.videoHeight) return false;
  if (!sampleCanvas) sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = video.videoWidth;
  sampleCanvas.height = video.videoHeight;
  const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(video, 0, 0);
  const eyes = [...landmarks.getLeftEye(), ...landmarks.getRightEye()];
  const xs = eyes.map((p) => p.x);
  const ys = eyes.map((p) => p.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const w = Math.min(sampleCanvas.width - minX, Math.ceil(Math.max(...xs) - minX) || 1);
  const h = Math.min(sampleCanvas.height - minY, Math.ceil(Math.max(...ys) - minY) || 1);
  if (w <= 0 || h <= 0) return false;
  const pixels = ctx.getImageData(minX, minY, w, h).data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) { sum += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3; count += 1; }
  return count > 0 && sum / count < DARK_GLASSES_BRIGHTNESS_THRESHOLD;
}

// Detector + landmarks only -- no descriptor. FaceRecognitionNet (the model
// that produces the 128-d descriptor) is by far the heaviest of the three
// models; running it on every frame of a "just checking someone's in frame
// yet" polling loop was most of what made things feel slow. Presence
// checks (enrollment's live preview, the liveness sampling loop) use this;
// only the one-shot moments that actually need to identify or verify a
// person (final capture, login, proctoring) use the full detectFace below.
export async function detectFacePresence(video: HTMLVideoElement): Promise<{ earAvg: number; noseX: number; boxWidth: number; darkGlasses: boolean } | null> {
  const faceapi = await loadFaceApi();
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
    .withFaceLandmarks();
  if (!result) return null;
  const nose = result.landmarks.getNose();
  const noseX = nose.reduce((sum, p) => sum + p.x, 0) / nose.length;
  return { earAvg: eyeAspectRatio(result.landmarks), noseX, boxWidth: result.detection.box.width, darkGlasses: sampleEyeDarkness(video, result.landmarks) };
}

// A single detect pass: face + landmarks + the 128-d recognition
// descriptor, all in one model pass -- for the moments that actually need
// to identify or verify someone, not just confirm a face is present.
export async function detectFace(video: HTMLVideoElement): Promise<FaceDetection | null> {
  const faceapi = await loadFaceApi();
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;
  const nose = result.landmarks.getNose();
  const noseX = nose.reduce((sum, p) => sum + p.x, 0) / nose.length;
  return { descriptor: result.descriptor, earAvg: eyeAspectRatio(result.landmarks), noseX, boxWidth: result.detection.box.width, darkGlasses: sampleEyeDarkness(video, result.landmarks) };
}

// A single-frame descriptor is noisier than it needs to be -- one bad frame
// (mild motion blur, a blink half-caught, a compression artifact) shifts it
// enough to matter at a 0.6 distance threshold. Averaging a handful of
// frames a beat apart cancels out that per-frame noise and produces a
// materially more stable descriptor, for both enrollment (where it matters
// most, since every future login is judged against this one reference) and
// login itself.
export async function captureAveragedDescriptor(video: HTMLVideoElement, samples = 4, intervalMs = 120): Promise<Float32Array | null> {
  const collected: Float32Array[] = [];
  for (let i = 0; i < samples; i++) {
    const face = await detectFace(video).catch((err) => { console.error('Face detection failed during capture:', err); return null; });
    if (face) collected.push(face.descriptor);
    if (i < samples - 1) await new Promise((r) => setTimeout(r, intervalMs));
  }
  if (!collected.length) return null;
  const avg = new Float32Array(128);
  for (const d of collected) for (let i = 0; i < 128; i++) avg[i] += d[i] / collected.length;
  return avg;
}

// How "open" the eyes look, 68-point landmark convention (points 36-41 left
// eye, 42-47 right eye on the full model; the tiny landmark model returns
// the same 6-point-per-eye shape). A blink is a brief dip in this value.
function eyeAspectRatio(landmarks: { getLeftEye(): { x: number; y: number }[]; getRightEye(): { x: number; y: number }[] }): number {
  const ear = (eye: { x: number; y: number }[]) => {
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * dist(eye[0], eye[3]));
  };
  return (ear(landmarks.getLeftEye()) + ear(landmarks.getRightEye())) / 2;
}

export type LivenessResult = 'blink' | 'turn' | false;

// A fixed EAR threshold (what this used to do) assumes everyone's eyes,
// camera angle, and lighting produce the same absolute numbers -- they
// don't, so a hardcoded cutoff reliably fails for some faces/cameras/glasses
// and works for others with no way to tell which you'll get. This instead
// calibrates a personal baseline from the first ~half-second of samples,
// then looks for a *relative* dip below it (a blink), and separately checks
// for a head turn (the nose landmark shifting sideways relative to face
// width) as a second, independent way to pass -- either one is accepted,
// so someone whose blink doesn't register cleanly still has a way through.
export async function waitForLiveness(video: HTMLVideoElement, onSample?: (ear: number) => void, timeoutMs = 12000): Promise<LivenessResult> {
  const start = Date.now();
  const earBaselineSamples: number[] = [];
  let earBaseline: number | null = null;
  let noseBaseline: number | null = null;
  let sawDip = false;
  while (Date.now() - start < timeoutMs) {
    // detectFacePresence, not detectFace -- this loop only ever reads
    // earAvg/noseX/boxWidth, never the descriptor, so there's no reason to
    // pay for FaceRecognitionNet on every single sample here.
    const face = await detectFacePresence(video).catch((err) => { console.error('Face detection failed during liveness check:', err); return null; });
    if (face) {
      onSample?.(face.earAvg);
      if (earBaseline === null) {
        earBaselineSamples.push(face.earAvg);
        if (noseBaseline === null) noseBaseline = face.noseX;
        if (earBaselineSamples.length >= 3) earBaseline = earBaselineSamples.reduce((a, b) => a + b, 0) / earBaselineSamples.length;
      } else {
        if (face.earAvg < earBaseline * 0.8) sawDip = true;
        else if (sawDip && face.earAvg > earBaseline * 0.92) return 'blink';
        if (noseBaseline !== null && face.boxWidth > 0 && Math.abs(face.noseX - noseBaseline) / face.boxWidth > 0.09) return 'turn';
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

export function descriptorDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

// Mirrors the Worker's own matching logic (worker/index.ts's faceLogin) for
// the one place that compares against a stored enrollment directly on the
// client instead of through that endpoint -- Aptitude Test proctoring's
// periodic identity re-check. Same normalization: the new multi-reference
// enrollment format (number[][], three captures) or an older single-vector
// row from before that existed (number[]), matched against the mean
// distance across whichever it is.
export function meanDistanceToReferences(live: Float32Array | number[], stored: number[] | number[][]): number {
  const references: number[][] = Array.isArray(stored[0]) ? (stored as number[][]) : [stored as number[]];
  return references.reduce((sum, ref) => sum + descriptorDistance(ref, live), 0) / references.length;
}

// Object detection (phone / second person) for Aptitude Test proctoring --
// a completely separate model from face-api above, loaded independently and
// only inside the test screen, same lazy-loading reasoning.
type CocoModel = Awaited<ReturnType<typeof import('@tensorflow-models/coco-ssd').load>>;
let cocoPromise: Promise<CocoModel> | null = null;

export function loadCocoModel(): Promise<CocoModel> {
  if (!cocoPromise) {
    cocoPromise = (async () => {
      await import('@tensorflow/tfjs');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      return cocoSsd.load({ base: 'lite_mobilenet_v2' });
    })();
  }
  return cocoPromise;
}
