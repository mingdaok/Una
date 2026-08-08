import { lazy, Suspense, useEffect, useState } from 'react';

import LoginView from './components/LoginView';
import { authenticate, getSession, refreshSession } from './auth/session';


const MainUnaPage = lazy(() => import('./pages/MainUnaPage.jsx'));
const VoiceCallPage = lazy(() => import('./pages/VoiceCallPage.jsx'));

function LoadingScreen() {
  return <div className="app-loading" role="status">正在打开 UNA…</div>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getSession()?.access_token));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerMode, setRegisterMode] = useState(false);
  const [error, setError] = useState('');
  const voiceMode = new URLSearchParams(window.location.search).get('view') === 'voice';

  useEffect(() => {
    if (!getSession()?.refresh_token) return;
    refreshSession().then(session => setAuthenticated(Boolean(session?.access_token)));
  }, []);

  async function submit() {
    if (!username.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    try {
      setError('');
      await authenticate(username, password, registerMode);
      setAuthenticated(true);
    } catch (nextError) {
      setError(nextError.message || '认证失败');
    }
  }

  if (!authenticated) {
    return <LoginView
      username={username}
      password={password}
      registerMode={registerMode}
      error={error}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onSubmit={submit}
      onToggleMode={() => { setRegisterMode(value => !value); setError(''); }}
    />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      {voiceMode ? <VoiceCallPage authenticated /> : <MainUnaPage authenticated />}
    </Suspense>
  );
}
