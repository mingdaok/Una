import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpenText,
  ChevronRight,
  DoorOpen,
  Heart,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Mic2,
  Settings,
  Sparkles,
  UserRoundCog,
  X,
} from 'lucide-react';

import './UnaNavigationDrawer.css';


function MenuRow({ as: Element = 'button', icon: Icon, label, value, accent = false, onClick, ...props }) {
  return (
    <Element
      className={`una-drawer-row${accent ? ' una-drawer-row--accent' : ''}`}
      onClick={onClick}
      {...props}
    >
      <span className="una-drawer-row__icon" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
      <span className="una-drawer-row__label">{label}</span>
      {value && <span className="una-drawer-row__value">{value}</span>}
      <ChevronRight className="una-drawer-row__chevron" size={18} strokeWidth={1.8} aria-hidden="true" />
    </Element>
  );
}

function MenuGroup({ title, children }) {
  return (
    <section className="una-drawer-group" aria-label={title}>
      <h2>{title}</h2>
      <div className="una-drawer-group__surface">{children}</div>
    </section>
  );
}

export default function UnaNavigationDrawer({
  open,
  onOpenChange,
  user,
  connectionStatus,
  scene,
  currentModel,
  avatarUrl,
  onOpenChat,
  onOpenSocial,
  onOpenLife,
  onOpenDiary,
  onToggleScene,
  onOpenCharacterSettings,
  onOpenSettings,
  onLogout,
  hidden = false,
}) {
  const connected = connectionStatus === 'OPEN';
  const username = user?.username || 'UNA 用户';
  const sceneLabel = scene === 'study' ? '书房' : '客厅';

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const runAndClose = action => event => {
    onOpenChange(false);
    action?.(event);
  };

  return (
    <>
      {!hidden && (
        <button
          type="button"
          className={`una-nav-trigger${open ? ' una-nav-trigger--open' : ''}`}
          aria-label={open ? '关闭功能菜单' : '打开功能菜单'}
          aria-expanded={open}
          aria-controls="una-navigation-drawer"
          onClick={() => onOpenChange(!open)}
        >
          <Menu size={25} strokeWidth={1.8} />
        </button>
      )}

      <AnimatePresence>
        {open && !hidden && (
          <motion.div
            className="una-drawer-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="una-drawer-scrim"
              aria-label="关闭功能菜单"
              onClick={() => onOpenChange(false)}
            />
            <motion.aside
              id="una-navigation-drawer"
              className="una-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="UNA 功能菜单"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                className="una-drawer-close"
                aria-label="关闭功能菜单"
                onClick={() => onOpenChange(false)}
              >
                <X size={28} strokeWidth={1.6} />
              </button>

              <header className="una-drawer-profile">
                <div className="una-drawer-avatar">
                  <img src={avatarUrl} alt="UNA 头像" />
                </div>
                <div className="una-drawer-profile__copy">
                  <strong>UNA</strong>
                  <span className="una-drawer-username">{username}</span>
                  <span className={`una-drawer-status${connected ? ' una-drawer-status--online' : ''}`}>
                    <i aria-hidden="true" />
                    私有陪伴空间 · {connected ? '已连接' : '连接中'}
                  </span>
                </div>
              </header>

              <div className="una-drawer-content">
                <MenuGroup title="陪伴">
                  <MenuRow
                    as="a"
                    href="./?view=voice"
                    icon={Mic2}
                    label="实时语音"
                    accent
                    onClick={runAndClose()}
                  />
                  <MenuRow icon={MessageCircle} label="文字聊天" onClick={runAndClose(onOpenChat)} />
                  <MenuRow icon={Heart} label="UNA 动态" onClick={runAndClose(onOpenSocial)} />
                </MenuGroup>

                <MenuGroup title="空间与回忆">
                  <MenuRow icon={Sparkles} label="UNA 的生活" onClick={runAndClose(onOpenLife)} />
                  <MenuRow icon={BookOpenText} label="回忆日记" onClick={runAndClose(onOpenDiary)} />
                  <MenuRow icon={scene === 'study' ? DoorOpen : Home} label="切换场景" value={sceneLabel} onClick={runAndClose(onToggleScene)} />
                </MenuGroup>

                <MenuGroup title="角色">
                  <MenuRow icon={UserRoundCog} label="角色与显示" value={currentModel} onClick={runAndClose(onOpenCharacterSettings)} />
                </MenuGroup>
              </div>

              <div className="una-drawer-footer">
                <MenuRow icon={Settings} label="设置" onClick={runAndClose(onOpenSettings)} />
                <MenuRow icon={LogOut} label="退出登录" onClick={runAndClose(onLogout)} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
