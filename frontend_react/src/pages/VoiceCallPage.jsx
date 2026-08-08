import { Mic, MicOff, PhoneOff } from 'lucide-react';

import { useVoiceCall } from '../voice-call/useVoiceCall.js';


const STATUS_TEXT = {
  connecting: '正在连接 UNA',
  listening: 'UNA 正在倾听',
  recognizing: '正在识别你的话',
  thinking: 'UNA 正在思考',
  speaking: 'UNA 正在说话',
  interrupted: '通话已暂停',
  error: '通话遇到问题',
  ended: '准备好后开始通话',
};

export default function VoiceCallPage({ authenticated }) {
  const call = useVoiceCall(authenticated);
  const active = !['ended', 'error'].includes(call.status);
  return (
    <main className="voice-call-page">
      <a className="voice-call-back" href="./">返回 UNA</a>
      <section className="voice-call-card" aria-label="UNA 实时语音通话">
        <div className={`voice-call-orb voice-call-orb--${call.status}`} aria-hidden="true">UNA</div>
        <p className="voice-call-status" aria-live="polite">
          {STATUS_TEXT[call.status] || 'UNA 实时语音'}
        </p>
        {call.error && <p className="voice-call-error" role="alert">{call.error}</p>}
        <div className="voice-call-transcript" aria-live="polite">
          {call.userTranscript && <p><span>你</span>{call.userTranscript}</p>}
          {call.assistantText && <p><span>UNA</span>{call.assistantText}</p>}
        </div>
        <div className="voice-call-actions">
          {call.status === 'ended' && (
            <button className="voice-call-primary" onClick={call.startCall}>开始通话</button>
          )}
          {call.status === 'interrupted' && !call.muted && (
            <button className="voice-call-primary" onClick={call.continueCall}>继续通话</button>
          )}
          {call.status === 'error' && (
            <button className="voice-call-primary" onClick={call.reloadCall}>重新加载通话</button>
          )}
          {active && (
            <button className="voice-call-round" onClick={call.toggleMute} aria-label={call.muted ? '取消静音' : '静音麦克风'}>
              {call.muted ? <MicOff /> : <Mic />}
            </button>
          )}
          {call.status !== 'ended' && (
            <button className="voice-call-round voice-call-round--danger" onClick={call.endCall} aria-label="结束通话">
              <PhoneOff />
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
