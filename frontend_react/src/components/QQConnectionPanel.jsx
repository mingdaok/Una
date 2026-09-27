import { useEffect, useRef, useState } from 'react';
import { authFetch } from '../auth/session';
import './QQConnectionPanel.css';
import QQSocialAdmin from './QQSocialAdmin';

async function request(path, method = 'GET', body) {
  const response = await authFetch(`/api/channels/qq/${path}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : '操作未完成，请检查设置');
  return data;
}
const sharing = [
  ['share_profile', '共享个人画像'], ['share_memory', '共享长期记忆'],
  ['share_history', '读取网页近期对话'], ['share_life', '读取私人生活动态和日记提醒'],
];
const notices = [['proactive', '允许 UNA 主动联系'], ['greeting', '轻声问候'], ['diary', '日记提醒'], ['life', '生活动态']];

export default function QQConnectionPanel({ onClose }) {
  const [status, setStatus] = useState(null);
  const [binding, setBinding] = useState(null);
  const [pending, setPending] = useState([]);
  const [code, setCode] = useState(null);
  const [mediaJobs, setMediaJobs] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  const mounted = useRef(true);
  async function load() {
    const [health, account] = await Promise.all([request('status'), request('binding')]);
    if (!mounted.current) return;
    setStatus(health); setBinding(account.binding); setPending(account.pending);
    if (health.enabled) {
      try { const jobs = await request('media-jobs'); if (mounted.current) setMediaJobs(Array.isArray(jobs) ? jobs : []); } catch { /* Older servers may not expose task status. */ }
    }
  }
  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement;
    dialog.current?.focus();
    load().catch(e => mounted.current && setError(e.message));
    const timer = setInterval(() => load().catch(e => mounted.current && setError(e.message)), 5000);
    return () => { mounted.current = false; clearInterval(timer); previous?.focus?.(); };
  }, []);
  async function act(operation, message) {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); await load(); setNotice(message || '设置已保存'); }
    catch (e) { setError(e.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  const change = (key, value) => act(() => request('preferences', 'PATCH', { [key]: value }));
  function keyboard(event) {
    if (event.key === 'Escape') onClose();
    if (event.key !== 'Tab') return;
    const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')];
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <div className="qq-panel-overlay">
    <section className="qq-panel" role="dialog" aria-modal="true" aria-labelledby="qq-title" tabIndex={-1} ref={dialog} onKeyDown={keyboard}>
      <header><div><small>UNA · 消息连接</small><h2 id="qq-title">QQ 连接</h2></div><button onClick={onClose} aria-label="关闭 QQ 连接">关闭</button></header>
      <p className="qq-status">{!status ? '正在读取状态…' : status.error || (!status.enabled ? '尚未启用 · 请先完成服务器配置' : status.connected ? '已连接 QQ' : '等待 QQ 协议端连接')}</p>
      {error && <p role="alert" className="qq-error">{error}</p>}
      <p role="status">{notice}</p>
      {!binding ? <section><h3>连接你的账号</h3><p>在这里生成绑定码，私聊机器人发送下方命令，再回到这里确认。绑定码 5 分钟内有效。</p>
        <button disabled={busy || !status?.enabled || !!status?.error} onClick={() => act(async () => setCode(await request('binding-codes', 'POST')), '绑定码已生成')}>生成绑定码</button>
        {code && <code className="qq-code">/una bind {code.code}</code>}
        {pending.map(item => <div className="qq-pending" key={item.id}><span>QQ {item.external_id} 请求绑定</span><button disabled={busy} onClick={() => act(async () => { await request('bindings/confirm', 'POST', { code_id: item.id }); setCode(null); }, '绑定成功')}>确认这是我的 QQ</button></div>)}
      </section> : <>
        <section><h3>已绑定 QQ {binding.external_id}</h3><p>群聊始终与个人资料隔离。共享选项仅对你的 QQ 私聊生效。</p>
          <fieldset disabled={busy}>{sharing.map(([key, label]) => <label key={key}><input type="checkbox" checked={!!binding.prefs[key]} onChange={e => change(key, e.target.checked)} />{label}</label>)}</fieldset>
          <p className="qq-hint">关闭共享会取消按旧权限排队的回复，不会删除已经形成的历史记忆。</p>
        </section>
        <section><h3>回复方式</h3><label>语音回复<select disabled={busy} value={binding.prefs.voice_mode} onChange={e => change('voice_mode', e.target.value)}><option value="follow">跟随输入：语音消息用文字加语音回复</option><option value="text">只回复文字</option><option value="always">始终文字加语音</option></select></label></section>
        <section><h3>主动联系</h3><fieldset disabled={busy}>{notices.map(([key, label]) => <label key={key}><input type="checkbox" checked={!!binding.prefs[key]} onChange={e => change(key, e.target.checked)} />{label}</label>)}</fieldset><p className="qq-hint">每天最多 2 条，北京时间 22:00–08:00 不打扰。日记和生活提醒需要同时开启私人生活共享。</p></section>
        <button disabled={busy} className="qq-danger" onClick={() => act(() => request('binding', 'DELETE'), '已解绑，排队中的私人回复已撤销')}>解除 QQ 绑定</button>
      </>}
      {mediaJobs.length > 0 && <section aria-label="我的语音任务"><h3>我的语音任务</h3>{mediaJobs.map(job => <p key={job.id}>{new Date(job.created * 1000).toLocaleTimeString()} · {({ pending: '等待发送', processing: '正在合成', done: '合成完成', failed: '失败', unknown: '回执不明', cancelled: '已取消', expired: '已过期' })[job.status] || job.status}{job.stage ? ` · ${job.stage}` : ''}{job.error ? ` · ${job.error}` : ''}{job.delivery_status ? ` · 投递：${({ delivered: '已发送', unknown: '回执不明（不重发）', pending: '待发送', preparing: '准备发送', sending: '等待回执', failed: '发送失败', cancelled: '已取消', expired: '已过期' })[job.delivery_status] || job.delivery_status}` : ''}</p>)}</section>}
      {status?.is_admin && status.groups && <section><h3>机器人管理</h3><p>只能管理部署白名单中的群。开启群聊后，UNA 会读取近期群消息并自主选择参与。</p>
        {!!status.test_reply_percent && <p className="qq-status">测试模式：每轮新消息 {status.test_reply_percent}% 概率尝试回复，覆盖下方活跃度限制。仍按 15 秒评估间隔和总配额控制；可在“群友能力 → 群行为”按群结束测试或设置 30 分钟测试。单群设置优先。</p>}
        {status.groups.map(group => <div className="qq-group" key={group.group_id}><label><input type="checkbox" disabled={busy} checked={!!group.enabled} onChange={e => act(() => request(`groups/${group.group_id}`, 'PATCH', { enabled: e.target.checked, cooldown: group.cooldown, hourly: group.hourly }))} />群 {group.group_id}</label><label>活跃度<select disabled={busy} value={group.cooldown === 180 ? 'natural' : 'quiet'} onChange={e => act(() => request(`groups/${group.group_id}`, 'PATCH', { enabled: !!group.enabled, cooldown: e.target.value === 'natural' ? 180 : 600, hourly: e.target.value === 'natural' ? 6 : 3 }))}><option value="natural">自然克制 · 每小时最多 6 次</option><option value="quiet">安静 · 每小时最多 3 次</option></select></label></div>)}
        <h4>发送异常</h4>{status.failures.length === 0 ? <p>暂无发送异常</p> : <ul>{status.failures.map(row => <li key={row.id}>{row.kind} · {row.status === 'unknown' ? '回执不明，未自动重发' : '发送失败'} · {row.error}</li>)}</ul>}
        <p className="qq-hint">已接收 {status.metrics.received || 0} 条 · 已发送 {status.metrics.delivered || 0} 条</p>
      </section>}
      {status?.is_admin && <QQSocialAdmin groups={status.groups || []} request={request} />}
    </section>
  </div>;
}
