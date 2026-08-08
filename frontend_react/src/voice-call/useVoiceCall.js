import { useCallback, useEffect, useRef, useState } from 'react';

import { createVoiceCallController } from './voiceCallController.js';


const INITIAL = Object.freeze({
  state: 'ended', transcript: '', assistantText: '', error: null, muted: false,
});

export function useVoiceCall(authenticated) {
  const controllerRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const [snapshot, setSnapshot] = useState(INITIAL);

  const ensureController = useCallback(() => {
    if (!controllerRef.current) {
      const controller = createVoiceCallController();
      controllerRef.current = controller;
      unsubscribeRef.current = controller.subscribe(setSnapshot);
    }
    return controllerRef.current;
  }, []);

  const startCall = useCallback(async () => {
    if (!authenticated) return;
    await ensureController().start();
  }, [authenticated, ensureController]);

  const endCall = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) return;
    await controller.end();
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    controllerRef.current = null;
  }, []);

  const continueCall = useCallback(async () => {
    if (controllerRef.current) await controllerRef.current.start();
  }, []);

  const toggleMute = useCallback(async () => {
    if (controllerRef.current) await controllerRef.current.toggleMute();
  }, []);

  const reloadCall = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => () => {
    unsubscribeRef.current?.();
    void controllerRef.current?.end();
  }, []);

  return {
    status: snapshot.state,
    userTranscript: snapshot.transcript,
    assistantText: snapshot.assistantText,
    error: snapshot.error || '',
    muted: snapshot.muted,
    startCall,
    endCall,
    continueCall,
    toggleMute,
    reloadCall,
  };
}
