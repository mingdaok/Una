import { LogIn } from 'lucide-react';


export default function LoginView({
  username,
  password,
  registerMode,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}) {
  const baseUrl = import.meta.env.BASE_URL || './';
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${baseUrl}assets/bg_living.jpg)` }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl w-[80%] max-w-[320px] backdrop-blur-md">
        <h1 className="text-3xl text-white font-serif text-center mb-2">Una</h1>
        <p className="text-center text-white/60 text-sm mb-5">
          {registerMode ? '创建你的私有 UNA' : '登录你的私有 UNA'}
        </p>
        <div className="space-y-4">
          <input value={username} onChange={event => onUsernameChange(event.target.value)} placeholder="账号" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none" />
          <input type="password" value={password} onChange={event => onPasswordChange(event.target.value)} placeholder="密码" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none" />
          {error && <p role="alert" className="text-red-200 text-sm text-center">{error}</p>}
          <button onClick={onSubmit} className="w-full bg-gradient-to-r from-[#8d6e63] to-[#5d4037] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            <LogIn size={18} /> {registerMode ? '注册并进入' : '登录'}
          </button>
          <button onClick={onToggleMode} className="w-full text-white/70 text-sm py-1">
            {registerMode ? '已有账号？去登录' : '没有账号？立即注册'}
          </button>
        </div>
      </div>
    </div>
  );
}
