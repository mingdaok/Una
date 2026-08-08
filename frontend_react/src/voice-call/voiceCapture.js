import { MicVAD } from '@ricky0123/vad-web';

import { float32ToPcm16 } from './pcm.js';


const TARGET_SAMPLE_RATE = 16000;
const PRE_ROLL_SAMPLES = Math.round(TARGET_SAMPLE_RATE * 0.12);
const MAX_UTTERANCE_SAMPLES = TARGET_SAMPLE_RATE * 30;
const VAD_RUNTIME_VERSION = 'ort-1.22.0-una-2';

const noop = () => {};

function normalizeBaseUrl(baseUrl) {
  const value = String(baseUrl || '/');
  return `${value.startsWith('/') ? value : `/${value}`}${value.endsWith('/') ? '' : '/'}`;
}

export function createVoiceCapture(callbacks = {}, dependencies = {}) {
  const onSpeechStart = callbacks.onSpeechStart || noop;
  const onPcm = callbacks.onPcm || noop;
  const onSpeechEnd = callbacks.onSpeechEnd || noop;
  const onMisfire = callbacks.onMisfire || noop;
  const onError = callbacks.onError || noop;

  const getUserMedia = dependencies.getUserMedia || (constraints => (
    navigator.mediaDevices.getUserMedia(constraints)
  ));
  const createAudioContext = dependencies.createAudioContext || (() => new AudioContext());
  const createWorkletNode = dependencies.createWorkletNode || (context => (
    new AudioWorkletNode(context, 'pcm-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
    })
  ));
  const createVad = dependencies.createVad || (options => MicVAD.new(options));
  const baseUrl = normalizeBaseUrl(dependencies.baseUrl || import.meta.env.BASE_URL);
  const assetBase = `${baseUrl}vad/`;
  const workletUrl = `${baseUrl}voice/pcm-capture.worklet.js`;
  const runtimeModuleUrl = `${assetBase}ort-wasm-simd-threaded.mjs?v=${VAD_RUNTIME_VERSION}`;
  const runtimeWasmUrl = `${assetBase}ort-wasm-simd-threaded.wasm?v=${VAD_RUNTIME_VERSION}`;

  let mediaStream = null;
  let audioContext = null;
  let sourceNode = null;
  let workletNode = null;
  let vad = null;
  let initialized = false;
  let running = false;
  let destroyed = false;
  let speaking = false;
  let emittedSamples = 0;
  let restartPromise = null;
  let lifecycle = Promise.resolve();

  const ring = new Float32Array(PRE_ROLL_SAMPLES);
  let ringLength = 0;
  let ringWrite = 0;

  function appendToRing(samples) {
    for (const sample of samples) {
      ring[ringWrite] = sample;
      ringWrite = (ringWrite + 1) % PRE_ROLL_SAMPLES;
      ringLength = Math.min(PRE_ROLL_SAMPLES, ringLength + 1);
    }
  }

  function readPreRoll() {
    const output = new Float32Array(PRE_ROLL_SAMPLES);
    const padding = PRE_ROLL_SAMPLES - ringLength;
    const start = (ringWrite - ringLength + PRE_ROLL_SAMPLES) % PRE_ROLL_SAMPLES;
    for (let index = 0; index < ringLength; index += 1) {
      output[padding + index] = ring[(start + index) % PRE_ROLL_SAMPLES];
    }
    return output;
  }

  function emitPcm(samples) {
    if (!samples.length) return;
    onPcm(float32ToPcm16(samples));
    emittedSamples += samples.length;
  }

  function finishSpeech() {
    if (!speaking) return false;
    speaking = false;
    onSpeechEnd();
    return true;
  }

  async function restartVadAfterLimit() {
    if (!vad || !running || destroyed) return;
    await vad.pause();
    if (running && !destroyed) await vad.start();
  }

  function handleSamples(event) {
    try {
      if (!running || destroyed) return;
      const payload = event?.data;
      const samples = payload instanceof Float32Array
        ? payload
        : payload instanceof ArrayBuffer
          ? new Float32Array(payload)
          : null;
      if (!samples) throw new TypeError('Worklet 必须发送 Float32Array 或 ArrayBuffer');

      appendToRing(samples);
      if (!speaking) return;
      const remaining = MAX_UTTERANCE_SAMPLES - emittedSamples;
      if (remaining > 0) emitPcm(samples.length <= remaining ? samples : samples.subarray(0, remaining));
      if (emittedSamples >= MAX_UTTERANCE_SAMPLES) {
        finishSpeech();
        if (!restartPromise) {
          restartPromise = restartVadAfterLimit()
            .catch(onError)
            .finally(() => { restartPromise = null; });
        }
      }
    } catch (error) {
      onError(error);
    }
  }

  function handleSpeechStart() {
    if (!running || destroyed || speaking) return;
    speaking = true;
    emittedSamples = 0;
    onSpeechStart();
    emitPcm(readPreRoll());
  }

  function handleVadSpeechEnd() {
    finishSpeech();
  }

  function handleMisfire() {
    if (!speaking) return;
    speaking = false;
    onMisfire();
  }

  async function initialize() {
    mediaStream = await getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    audioContext = createAudioContext();
    await audioContext.audioWorklet.addModule(workletUrl);
    workletNode = createWorkletNode(audioContext);
    workletNode.port.onmessage = handleSamples;
    sourceNode = audioContext.createMediaStreamSource(mediaStream);
    sourceNode.connect(workletNode);
    vad = await createVad({
      model: 'v5',
      redemptionMs: 400,
      minSpeechMs: 250,
      preSpeechPadMs: 120,
      baseAssetPath: assetBase,
      onnxWASMBasePath: assetBase,
      ortConfig: ort => {
        ort.env.logLevel = 'error';
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.proxy = false;
        ort.env.wasm.wasmPaths = {
          mjs: runtimeModuleUrl,
          wasm: runtimeWasmUrl,
        };
      },
      audioContext,
      startOnLoad: false,
      getStream: async () => mediaStream,
      pauseStream: async () => {},
      resumeStream: async () => mediaStream,
      onSpeechStart: handleSpeechStart,
      onSpeechEnd: handleVadSpeechEnd,
      onVADMisfire: handleMisfire,
    });
    initialized = true;
  }

  async function startInternal() {
    if (destroyed) throw new Error('语音采集器已销毁');
    if (running) return;
    try {
      if (!initialized) await initialize();
      if (audioContext.state === 'suspended') await audioContext.resume();
      await vad.start();
      running = true;
    } catch (error) {
      onError(error);
      await destroyInternal().catch(onError);
      throw error;
    }
  }

  async function pauseInternal() {
    if (!initialized || !running) return;
    running = false;
    finishSpeech();
    await vad.pause();
    if (audioContext.state !== 'closed') await audioContext.suspend();
  }

  async function destroyInternal() {
    if (destroyed) return;
    destroyed = true;
    running = false;
    speaking = false;
    if (restartPromise) await restartPromise.catch(noop);
    if (vad) {
      await vad.pause();
      await vad.destroy();
    }
    if (sourceNode) sourceNode.disconnect();
    if (workletNode) {
      workletNode.port.onmessage = null;
      workletNode.disconnect();
    }
    if (audioContext && audioContext.state !== 'closed') await audioContext.close();
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
  }

  function serialize(operation) {
    const next = lifecycle.then(operation, operation);
    lifecycle = next.catch(noop);
    return next;
  }

  return {
    start: () => serialize(startInternal),
    pause: () => serialize(pauseInternal),
    destroy: () => serialize(destroyInternal),
  };
}
