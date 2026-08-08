export function float32ToPcm16(samples) {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError('samples 必须为 Float32Array');
  }
  const pcm = new ArrayBuffer(samples.length * 2);
  const view = new DataView(pcm);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    const value = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
    view.setInt16(index * 2, value, true);
  }
  return pcm;
}

export function concatPcm(chunks) {
  if (!Array.isArray(chunks)) throw new TypeError('chunks 必须为数组');
  const views = chunks.map(chunk => {
    if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
    if (ArrayBuffer.isView(chunk)) {
      return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    }
    throw new TypeError('PCM 分片必须为 ArrayBuffer 或 TypedArray');
  });
  const output = new Uint8Array(views.reduce((total, view) => total + view.byteLength, 0));
  let offset = 0;
  for (const view of views) {
    output.set(view, offset);
    offset += view.byteLength;
  }
  return output.buffer;
}
