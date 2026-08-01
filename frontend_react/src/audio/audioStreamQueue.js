const TERMINAL_STATUSES = new Set(['done', 'failed']);

export function createAudioStreamQueue({
  prepareChunk,
  playChunk,
  now,
  reportMetric,
}) {
  let generation = 0;
  let replyId = null;
  let sealed = false;
  let expectedIndex = 0;
  let playing = false;
  let starvationStartedAtMs = null;
  let records = new Map();
  let idleWaiters = [];

  function readNow() {
    return now();
  }

  function durationSince(startedAtMs) {
    return Math.max(0, readNow() - startedAtMs);
  }

  function emitMetric(payload) {
    try {
      reportMetric(payload);
    } catch {
      // Metrics must never interrupt preload or playback.
    }
  }

  function highestKnownIndex() {
    let highest = -1;
    for (const index of records.keys()) highest = Math.max(highest, index);
    return highest;
  }

  function barrierComplete(targetIndex) {
    if (targetIndex < 0) return true;
    if (expectedIndex <= targetIndex) return false;
    for (let index = 0; index <= targetIndex; index += 1) {
      const record = records.get(index);
      if (!record || !TERMINAL_STATUSES.has(record.status)) return false;
    }
    return true;
  }

  function settleIdleWaiters() {
    const remaining = [];
    for (const waiter of idleWaiters) {
      if (waiter.generation !== generation || barrierComplete(waiter.targetIndex)) {
        waiter.resolve();
      } else {
        remaining.push(waiter);
      }
    }
    idleWaiters = remaining;
  }

  function isCurrent(callbackGeneration, callbackReplyId) {
    return callbackGeneration === generation && callbackReplyId === replyId;
  }

  function beginPlayback(record, index, callbackGeneration, callbackReplyId) {
    if (starvationStartedAtMs !== null) {
      const starvationDurationMs = durationSince(starvationStartedAtMs);
      if (starvationDurationMs > 0) {
        emitMetric({
          replyId: callbackReplyId,
          chunkIndex: index,
          stage: 'queue_starvation',
          durationMs: starvationDurationMs,
          status: 'ready',
        });
      }
      starvationStartedAtMs = null;
    }

    record.status = 'playing';
    playing = true;
    const startedAtMs = readNow();
    let playback;
    try {
      playback = playChunk(record.prepared);
    } catch (error) {
      playback = Promise.reject(error);
    }

    Promise.resolve(playback).then(
      () => finishPlayback(null),
      error => finishPlayback(error),
    );

    function finishPlayback(error) {
      if (!isCurrent(callbackGeneration, callbackReplyId) || record.status !== 'playing') return;

      record.status = error ? 'failed' : 'done';
      playing = false;
      expectedIndex = index + 1;
      if (error) {
        emitMetric({
          replyId: callbackReplyId,
          chunkIndex: index,
          stage: 'play',
          durationMs: durationSince(startedAtMs),
          status: 'failed',
        });
      }
      starvationStartedAtMs = readNow();
      pump(callbackGeneration, callbackReplyId);
    }
  }

  function pump(callbackGeneration = generation, callbackReplyId = replyId) {
    if (!isCurrent(callbackGeneration, callbackReplyId) || playing) return;

    while (isCurrent(callbackGeneration, callbackReplyId)) {
      const record = records.get(expectedIndex);
      if (!record || record.status === 'received' || record.status === 'loading') {
        settleIdleWaiters();
        return;
      }
      if (record.status === 'playing') return;
      if (TERMINAL_STATUSES.has(record.status)) {
        expectedIndex += 1;
        continue;
      }
      if (record.status === 'ready') {
        beginPlayback(record, expectedIndex, callbackGeneration, callbackReplyId);
        return;
      }
      return;
    }
  }

  function finishPrepare(record, index, callbackGeneration, callbackReplyId, prepared, error) {
    if (!isCurrent(callbackGeneration, callbackReplyId) || record.status !== 'loading') return;

    if (error) {
      record.status = 'failed';
      emitMetric({
        replyId: callbackReplyId,
        chunkIndex: index,
        stage: 'prepare',
        durationMs: durationSince(record.receivedAtMs),
        status: 'failed',
      });
    } else {
      record.status = 'ready';
      record.readyAtMs = readNow();
      record.prepared = prepared;
    }
    pump(callbackGeneration, callbackReplyId);
  }

  function start(nextReplyId) {
    generation += 1;
    settleIdleWaiters();
    replyId = nextReplyId;
    sealed = false;
    expectedIndex = 0;
    playing = false;
    starvationStartedAtMs = null;
    records = new Map();
    return snapshot();
  }

  function enqueue(enqueueReplyId, chunk) {
    if (replyId === null || enqueueReplyId !== replyId) {
      return { accepted: false, reason: 'stale_reply' };
    }
    const index = chunk?.index;
    if (!Number.isInteger(index) || index < 0) {
      return { accepted: false, reason: 'invalid_index' };
    }
    if (records.has(index)) {
      return { accepted: false, reason: 'duplicate' };
    }

    const callbackGeneration = generation;
    const callbackReplyId = replyId;
    const record = {
      status: 'received',
      receivedAtMs: readNow(),
      readyAtMs: null,
      prepared: undefined,
    };
    records.set(index, record);
    record.status = 'loading';

    let preload;
    try {
      preload = prepareChunk(chunk);
    } catch (error) {
      preload = Promise.reject(error);
    }
    Promise.resolve(preload).then(
      prepared => finishPrepare(
        record,
        index,
        callbackGeneration,
        callbackReplyId,
        prepared,
        null,
      ),
      error => finishPrepare(
        record,
        index,
        callbackGeneration,
        callbackReplyId,
        undefined,
        error,
      ),
    );

    pump(callbackGeneration, callbackReplyId);
    return { accepted: true, reason: 'accepted' };
  }

  function seal(sealReplyId) {
    if (replyId === null || sealReplyId !== replyId) {
      return { accepted: false, reason: 'stale_reply' };
    }
    sealed = true;
    pump();
    settleIdleWaiters();
    return { accepted: true, reason: 'sealed' };
  }

  function stop() {
    generation += 1;
    settleIdleWaiters();
    replyId = null;
    sealed = false;
    expectedIndex = 0;
    playing = false;
    starvationStartedAtMs = null;
    records = new Map();
  }

  function snapshot() {
    const chunks = [...records.entries()]
      .sort(([left], [right]) => left - right)
      .map(([index, record]) => ({
        index,
        status: record.status,
        receivedAtMs: record.receivedAtMs,
        readyAtMs: record.readyAtMs,
      }));
    const targetIndex = highestKnownIndex();
    return {
      replyId,
      sealed,
      expectedIndex,
      playing,
      idle: !playing && barrierComplete(targetIndex),
      chunks,
    };
  }

  function whenIdle() {
    const targetIndex = highestKnownIndex();
    if (barrierComplete(targetIndex)) return Promise.resolve();
    return new Promise(resolve => {
      idleWaiters.push({ generation, targetIndex, resolve });
    });
  }

  return {
    start,
    enqueue,
    seal,
    stop,
    snapshot,
    whenIdle,
  };
}
