import { describe, expect, it, vi } from 'vitest';
import {
  createAudioBufferLoader,
  startSyncedPlayback,
} from '../syncedAudioPlayer';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fakeAudioContext({ currentTime = 10 } = {}) {
  const source = {
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
    onerror: null,
  };
  const context = {
    currentTime,
    destination: { id: 'destination' },
    createBufferSource: vi.fn(() => source),
  };
  return { context, source };
}

function createPlayback(overrides = {}) {
  const { context, source } = fakeAudioContext();
  const frames = [];
  const onViseme = vi.fn();
  const onEnded = vi.fn();
  const onError = vi.fn();
  const cancelFrame = vi.fn();
  const handle = startSyncedPlayback({
    audioContext: context,
    audioBuffer: { id: 'decoded-buffer' },
    visemes: [],
    onViseme,
    onEnded,
    onError,
    requestFrame: callback => {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame,
    ...overrides,
  });
  return {
    context,
    source,
    frames,
    onViseme,
    onEnded,
    onError,
    cancelFrame,
    handle,
  };
}

describe('startSyncedPlayback', () => {
  it('samples Rhubarb from the exact AudioContext start time', () => {
    const playback = createPlayback({
      visemes: [{ start: 0.10, end: 0.20, value: 'A' }],
    });

    expect(playback.source.start).toHaveBeenCalledWith(playback.handle.startAt);
    playback.context.currentTime = playback.handle.startAt + 0.15;
    playback.frames.shift()();

    expect(playback.onViseme).toHaveBeenLastCalledWith('A');
  });

  it('keeps the mouth closed when a frame runs before the scheduled start', () => {
    const playback = createPlayback({
      visemes: [{ start: 0, end: 0.20, value: 'A' }],
    });

    playback.context.currentTime = playback.handle.startAt - 0.001;
    playback.frames.shift()();

    expect(playback.onViseme).toHaveBeenLastCalledWith('X');
    expect(playback.onViseme).not.toHaveBeenCalledWith('A');
  });

  it('closes the mouth and runs ended cleanup only once', () => {
    const playback = createPlayback();
    const ended = playback.source.onended;

    ended();
    ended();

    expect(playback.onViseme).toHaveBeenLastCalledWith('X');
    expect(playback.source.stop).toHaveBeenCalledOnce();
    expect(playback.cancelFrame).toHaveBeenCalledOnce();
    expect(playback.onEnded).toHaveBeenCalledOnce();
    expect(playback.onError).not.toHaveBeenCalled();
  });

  it('stops the source, cancels RAF, closes the mouth, and is idempotent', () => {
    const playback = createPlayback();

    playback.handle.stop();
    playback.handle.stop();

    expect(playback.source.stop).toHaveBeenCalledOnce();
    expect(playback.cancelFrame).toHaveBeenCalledOnce();
    expect(playback.onViseme).toHaveBeenLastCalledWith('X');
    expect(playback.onEnded).not.toHaveBeenCalled();
    expect(playback.onError).not.toHaveBeenCalled();
  });

  it('allows only one terminal outcome across error, ended, and stop races', () => {
    const playback = createPlayback();
    const ended = playback.source.onended;
    const failed = playback.source.onerror;

    failed(new Error('decoder failed'));
    ended();
    playback.handle.stop();

    expect(playback.source.stop).toHaveBeenCalledOnce();
    expect(playback.cancelFrame).toHaveBeenCalledOnce();
    expect(playback.onError).toHaveBeenCalledOnce();
    expect(playback.onEnded).not.toHaveBeenCalled();
  });

  it('does not schedule another frame when onViseme stops playback re-entrantly', () => {
    const frames = [];
    const { context, source } = fakeAudioContext();
    let handle;
    handle = startSyncedPlayback({
      audioContext: context,
      audioBuffer: {},
      visemes: [{ start: 0, end: 1, value: 'A' }],
      onViseme: value => {
        if (value === 'A') handle.stop();
      },
      onEnded: vi.fn(),
      onError: vi.fn(),
      requestFrame: callback => {
        frames.push(callback);
        return frames.length;
      },
      cancelFrame: vi.fn(),
    });

    context.currentTime = handle.startAt + 0.1;
    frames.shift()();

    expect(source.stop).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(0);
  });

  it('does not schedule RAF when source.start ends synchronously', () => {
    const { context, source } = fakeAudioContext();
    const requestFrame = vi.fn();
    const onEnded = vi.fn();
    source.start.mockImplementation(() => source.onended());

    startSyncedPlayback({
      audioContext: context,
      audioBuffer: {},
      visemes: [],
      onViseme: vi.fn(),
      onEnded,
      onError: vi.fn(),
      requestFrame,
      cancelFrame: vi.fn(),
    });

    expect(onEnded).toHaveBeenCalledOnce();
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('keeps X for empty, invalid, and gap regions while advancing cues', () => {
    const playback = createPlayback({
      visemes: [
        null,
        { start: 'bad', end: 0.1, value: 'B' },
        { start: 0.10, end: 0.20, value: 'A' },
        { start: 0.30, end: 0.40, value: 'B' },
        { start: 0.5, end: 0.4, value: 'C' },
        { start: 0.5, end: 0.6, value: '' },
      ],
    });

    playback.context.currentTime = playback.handle.startAt + 0.15;
    playback.frames.shift()();
    expect(playback.onViseme).toHaveBeenLastCalledWith('A');

    playback.context.currentTime = playback.handle.startAt + 0.25;
    playback.frames.shift()();
    expect(playback.onViseme).toHaveBeenLastCalledWith('X');

    playback.context.currentTime = playback.handle.startAt + 0.35;
    playback.frames.shift()();
    expect(playback.onViseme).toHaveBeenLastCalledWith('B');
  });

  it.each(['connect', 'start'])(
    'routes a synchronous source %s failure through one cleanup',
    failingMethod => {
      const { context, source } = fakeAudioContext();
      source[failingMethod].mockImplementation(() => {
        throw new Error(`${failingMethod} failed`);
      });
      const onViseme = vi.fn();
      const onEnded = vi.fn();
      const onError = vi.fn();
      const requestFrame = vi.fn();
      const cancelFrame = vi.fn();

      const handle = startSyncedPlayback({
        audioContext: context,
        audioBuffer: {},
        visemes: [],
        onViseme,
        onEnded,
        onError,
        requestFrame,
        cancelFrame,
      });
      handle.stop();

      expect(onError).toHaveBeenCalledOnce();
      expect(onEnded).not.toHaveBeenCalled();
      expect(onViseme).toHaveBeenLastCalledWith('X');
      expect(requestFrame).not.toHaveBeenCalled();
      expect(source.stop).toHaveBeenCalledOnce();
    },
  );
});

describe('createAudioBufferLoader', () => {
  it('shares one promise and one decode for concurrent and cached URL loads', async () => {
    const bytes = new ArrayBuffer(8);
    const response = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(bytes),
    };
    const fetchImpl = vi.fn().mockResolvedValue(response);
    const audioContext = {
      decodeAudioData: vi.fn().mockResolvedValue({ id: 'decoded' }),
    };
    const load = createAudioBufferLoader({ audioContext, fetchImpl });

    const first = load('/media/one.wav');
    const concurrent = load('/media/one.wav');

    expect(concurrent).toBe(first);
    await expect(first).resolves.toEqual({ id: 'decoded' });
    expect(load('/media/one.wav')).toBe(first);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(response.arrayBuffer).toHaveBeenCalledOnce();
    expect(audioContext.decodeAudioData).toHaveBeenCalledOnce();
  });

  it('does not permanently cache a failure and redacts the ticket URL', async () => {
    const secretUrl = '/media/two.wav?ticket=secret-ticket';
    const decode = deferred();
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error(`network failed for ${secretUrl}`))
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
      });
    const audioContext = { decodeAudioData: vi.fn(() => decode.promise) };
    const load = createAudioBufferLoader({ audioContext, fetchImpl });

    const firstError = await load(secretUrl).catch(error => error);
    expect(firstError.message).not.toContain(secretUrl);
    expect(firstError.cause?.message || '').not.toContain(secretUrl);

    const retry = load(secretUrl);
    decode.resolve({ id: 'retried-buffer' });
    await expect(retry).resolves.toEqual({ id: 'retried-buffer' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('rejects a non-ok HTTP response without exposing its URL', async () => {
    const secretUrl = '/media/denied.wav?ticket=do-not-log';
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      arrayBuffer: vi.fn(),
    });
    const load = createAudioBufferLoader({
      audioContext: { decodeAudioData: vi.fn() },
      fetchImpl,
    });

    const error = await load(secretUrl).catch(caught => caught);

    expect(error.message).toContain('403');
    expect(error.message).not.toContain(secretUrl);
  });
});
