const TARGET_SAMPLE_RATE = 16000;
const OUTPUT_FRAME_SAMPLES = 320;

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / TARGET_SAMPLE_RATE;
    this.remainingOutputWidth = this.ratio;
    this.weightedSum = 0;
    this.accumulatedWeight = 0;
    this.output = new Float32Array(OUTPUT_FRAME_SAMPLES);
    this.outputIndex = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    for (const sample of input) {
      let remainingInputWidth = 1;
      while (remainingInputWidth > 1e-9) {
        const width = Math.min(remainingInputWidth, this.remainingOutputWidth);
        this.weightedSum += sample * width;
        this.accumulatedWeight += width;
        remainingInputWidth -= width;
        this.remainingOutputWidth -= width;

        if (this.remainingOutputWidth <= 1e-9) {
          this.output[this.outputIndex] = this.weightedSum / this.accumulatedWeight;
          this.outputIndex += 1;
          this.remainingOutputWidth = this.ratio;
          this.weightedSum = 0;
          this.accumulatedWeight = 0;
          if (this.outputIndex === OUTPUT_FRAME_SAMPLES) {
            const completed = this.output;
            this.output = new Float32Array(OUTPUT_FRAME_SAMPLES);
            this.outputIndex = 0;
            this.port.postMessage(completed.buffer, [completed.buffer]);
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor);
