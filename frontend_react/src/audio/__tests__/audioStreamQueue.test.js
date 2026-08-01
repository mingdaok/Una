import { describe, expect, it, vi } from 'vitest';
import { createAudioStreamQueue } from '../audioStreamQueue';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function withTimeout(promise, label, timeoutMs = 300) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function waitUntil(predicate, label) {
  await withTimeout((async () => {
    while (!predicate()) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  })(), label);
}

function createQueue(overrides = {}) {
  return createAudioStreamQueue({
    prepareChunk: async chunk => chunk,
    playChunk: async () => {},
    now: () => 100,
    reportMetric: vi.fn(),
    ...overrides,
  });
}

describe('createAudioStreamQueue', () => {
  it('plays out-of-order arrivals only after each expected index is ready', async () => {
    const played = [];
    const queue = createQueue({
      playChunk: async chunk => { played.push(chunk.index); },
    });

    queue.start('reply-1');
    await queue.enqueue('reply-1', { index: 1 });
    await queue.enqueue('reply-1', { index: 0 });
    await withTimeout(queue.whenIdle(), 'ordered playback');

    expect(played).toEqual([0, 1]);
  }, 1_000);

  it('starts each preload immediately without waiting for earlier chunks', async () => {
    const loads = [deferred(), deferred()];
    const loading = [];
    const played = [];
    const queue = createQueue({
      prepareChunk: chunk => {
        loading.push(chunk.index);
        return loads[chunk.index].promise;
      },
      playChunk: async chunk => { played.push(chunk.index); },
    });

    queue.start('reply-1');
    const firstResult = queue.enqueue('reply-1', { index: 0 });
    const secondResult = queue.enqueue('reply-1', { index: 1 });

    expect(firstResult).toEqual({ accepted: true, reason: 'accepted' });
    expect(secondResult).toEqual({ accepted: true, reason: 'accepted' });
    expect(loading).toEqual([0, 1]);

    loads[1].resolve({ index: 1 });
    await Promise.resolve();
    expect(played).toEqual([]);

    loads[0].resolve({ index: 0 });
    await withTimeout(queue.whenIdle(), 'parallel preload playback');
    expect(played).toEqual([0, 1]);
  }, 1_000);

  it('reports starvation from playback completion until the next loading chunk is ready', async () => {
    let currentTime = 100;
    const secondLoad = deferred();
    const metrics = [];
    const queue = createQueue({
      now: () => currentTime,
      prepareChunk: chunk => chunk.index === 1 ? secondLoad.promise : Promise.resolve(chunk),
      playChunk: async chunk => {
        if (chunk.index === 0) currentTime = 125;
      },
      reportMetric: metric => { metrics.push(metric); },
    });

    queue.start('reply-1');
    queue.enqueue('reply-1', { index: 0 });
    queue.enqueue('reply-1', { index: 1 });
    await waitUntil(
      () => queue.snapshot().chunks.some(chunk => chunk.index === 0 && chunk.status === 'done'),
      'first chunk playback',
    );

    currentTime = 164;
    secondLoad.resolve({ index: 1 });
    await withTimeout(queue.whenIdle(), 'starvation recovery');

    expect(metrics).toEqual([{
      replyId: 'reply-1',
      chunkIndex: 1,
      stage: 'queue_starvation',
      durationMs: 39,
      status: 'ready',
    }]);
  }, 1_000);

  it('marks a prepare failure terminal and continues with the next index', async () => {
    const played = [];
    const queue = createQueue({
      prepareChunk: async chunk => {
        if (chunk.index === 0) throw new Error('prepare failed');
        return chunk;
      },
      playChunk: async chunk => { played.push(chunk.index); },
    });

    queue.start('reply-1');
    queue.enqueue('reply-1', { index: 0 });
    queue.enqueue('reply-1', { index: 1 });
    await withTimeout(queue.whenIdle(), 'prepare failure skip');

    expect(played).toEqual([1]);
    expect(queue.snapshot().chunks.map(({ index, status }) => ({ index, status }))).toEqual([
      { index: 0, status: 'failed' },
      { index: 1, status: 'done' },
    ]);
  }, 1_000);

  it('marks a play failure terminal and continues with the next index', async () => {
    const attempted = [];
    const queue = createQueue({
      playChunk: async chunk => {
        attempted.push(chunk.index);
        if (chunk.index === 0) throw new Error('play failed');
      },
    });

    queue.start('reply-1');
    queue.enqueue('reply-1', { index: 0 });
    queue.enqueue('reply-1', { index: 1 });
    await withTimeout(queue.whenIdle(), 'play failure skip');

    expect(attempted).toEqual([0, 1]);
    expect(queue.snapshot().chunks.map(({ index, status }) => ({ index, status }))).toEqual([
      { index: 0, status: 'failed' },
      { index: 1, status: 'done' },
    ]);
  }, 1_000);

  it('isolates delayed prepare callbacks after a newer reply starts', async () => {
    const staleSuccess = deferred();
    const staleFailure = deferred();
    const played = [];
    const reportMetric = vi.fn();
    const queue = createQueue({
      prepareChunk: chunk => {
        if (chunk.reply === 'old-success') return staleSuccess.promise;
        if (chunk.reply === 'old-failure') return staleFailure.promise;
        return Promise.resolve(chunk);
      },
      playChunk: async chunk => { played.push(chunk.reply); },
      reportMetric,
    });

    queue.start('reply-1');
    queue.enqueue('reply-1', { index: 0, reply: 'old-success' });
    queue.enqueue('reply-1', { index: 1, reply: 'old-failure' });
    queue.start('reply-2');
    queue.enqueue('reply-2', { index: 0, reply: 'current' });
    await withTimeout(queue.whenIdle(), 'new reply playback');

    staleSuccess.resolve({ index: 0, reply: 'old-success' });
    staleFailure.reject(new Error('late stale failure'));
    await Promise.resolve();
    await Promise.resolve();

    expect(played).toEqual(['current']);
    expect(reportMetric).not.toHaveBeenCalled();
    expect(queue.snapshot().replyId).toBe('reply-2');
  }, 1_000);

  it('does not prepare or play a duplicate chunk index twice', async () => {
    const prepared = [];
    const played = [];
    const queue = createQueue({
      prepareChunk: async chunk => {
        prepared.push(chunk.value);
        return chunk;
      },
      playChunk: async chunk => { played.push(chunk.value); },
    });

    queue.start('reply-1');
    expect(queue.enqueue('reply-1', { index: 0, value: 'first' })).toEqual({
      accepted: true,
      reason: 'accepted',
    });
    expect(queue.enqueue('reply-1', { index: 0, value: 'duplicate' })).toEqual({
      accepted: false,
      reason: 'duplicate',
    });
    await withTimeout(queue.whenIdle(), 'duplicate suppression');

    expect(prepared).toEqual(['first']);
    expect(played).toEqual(['first']);
  }, 1_000);

  it('seal preserves loading and playing work until it reaches a terminal state', async () => {
    const load = deferred();
    const play = deferred();
    let idleSettled = false;
    const queue = createQueue({
      prepareChunk: () => load.promise,
      playChunk: () => play.promise,
    });

    queue.start('reply-1');
    queue.enqueue('reply-1', { index: 0 });
    expect(queue.seal('reply-1')).toEqual({ accepted: true, reason: 'sealed' });
    const idlePromise = queue.whenIdle().then(() => { idleSettled = true; });
    expect(queue.snapshot().chunks[0].status).toBe('loading');

    load.resolve({ index: 0 });
    await waitUntil(() => queue.snapshot().chunks[0].status === 'playing', 'sealed chunk playing');
    await Promise.resolve();
    expect(idleSettled).toBe(false);

    play.resolve();
    await withTimeout(idlePromise, 'sealed chunk completion');
    expect(queue.snapshot().chunks[0].status).toBe('done');
  }, 1_000);

  it('stop invalidates old callbacks and resets the queue to an empty idle snapshot', async () => {
    const load = deferred();
    const played = [];
    const reportMetric = vi.fn();
    const queue = createQueue({
      prepareChunk: () => load.promise,
      playChunk: async chunk => { played.push(chunk.index); },
      reportMetric,
    });

    queue.start('reply-1');
    queue.enqueue('reply-1', { index: 0 });
    queue.stop();
    load.resolve({ index: 0 });
    await Promise.resolve();
    await Promise.resolve();
    await withTimeout(queue.whenIdle(), 'stopped queue idle');

    expect(played).toEqual([]);
    expect(reportMetric).not.toHaveBeenCalled();
    expect(queue.snapshot()).toEqual({
      replyId: null,
      sealed: false,
      expectedIndex: 0,
      playing: false,
      idle: true,
      chunks: [],
    });
  }, 1_000);

  it('returns predictable ignored results for stale replies and invalid indexes', () => {
    const prepareChunk = vi.fn();
    const queue = createQueue({ prepareChunk });
    queue.start('reply-1');

    expect(queue.enqueue('reply-old', { index: 0 })).toEqual({
      accepted: false,
      reason: 'stale_reply',
    });
    expect(queue.enqueue('reply-1', { index: -1 })).toEqual({
      accepted: false,
      reason: 'invalid_index',
    });
    expect(queue.enqueue('reply-1', { index: 1.5 })).toEqual({
      accepted: false,
      reason: 'invalid_index',
    });
    expect(queue.enqueue('reply-1', null)).toEqual({
      accepted: false,
      reason: 'invalid_index',
    });
    expect(prepareChunk).not.toHaveBeenCalled();
  });

  it('whenIdle is a barrier for accepted work and a later chunk uses a new barrier', async () => {
    const firstPlay = deferred();
    const secondPlay = deferred();
    const played = [];
    const queue = createQueue({
      playChunk: chunk => {
        played.push(chunk.index);
        return chunk.index === 0 ? firstPlay.promise : secondPlay.promise;
      },
    });

    queue.start('reply-1');
    queue.enqueue('reply-1', { index: 0 });
    const firstIdle = queue.whenIdle();
    await waitUntil(() => played.length === 1, 'first play start');
    firstPlay.resolve();
    await withTimeout(firstIdle, 'first unsealed barrier');

    queue.enqueue('reply-1', { index: 1 });
    const secondIdle = queue.whenIdle();
    await waitUntil(() => played.length === 2, 'second play start');
    secondPlay.resolve();
    await withTimeout(secondIdle, 'second unsealed barrier');

    expect(played).toEqual([0, 1]);
  }, 1_000);

  it('contains only safe metric fields and isolates a throwing metric reporter', async () => {
    const metrics = [];
    const played = [];
    const queue = createQueue({
      prepareChunk: async chunk => {
        if (chunk.index === 0) throw new Error('prepare failed');
        return chunk;
      },
      playChunk: async chunk => { played.push(chunk.index); },
      reportMetric: metric => {
        metrics.push(metric);
        throw new Error('metric backend failed');
      },
    });

    queue.start('reply-1');
    queue.enqueue('reply-1', {
      index: 0,
      url: 'https://example.invalid/audio?ticket=secret',
      ticket: 'secret',
      Authorization: 'Bearer secret',
    });
    queue.enqueue('reply-1', { index: 1 });
    await withTimeout(queue.whenIdle(), 'throwing metric reporter');

    expect(played).toEqual([1]);
    expect(metrics).toHaveLength(1);
    expect(Object.keys(metrics[0])).toEqual([
      'replyId',
      'chunkIndex',
      'stage',
      'durationMs',
      'status',
    ]);
    expect(metrics[0]).toEqual({
      replyId: 'reply-1',
      chunkIndex: 0,
      stage: 'prepare',
      durationMs: 0,
      status: 'failed',
    });
  }, 1_000);
});
