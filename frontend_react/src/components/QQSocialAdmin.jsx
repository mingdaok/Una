import { useEffect, useState } from 'react';
import { authFetch } from '../auth/session';

const behaviorLabels = [
  ['autonomous', '无需 @，允许根据上下文插话'], ['stickers', '允许按情境发送表情'],
  ['collect', '收集本群表情（会调用识图模型）'], ['auto_accept', '高置信度表情自动接收'],
  ['voice', '允许请求语音回复'], ['autonomous_voice', '允许偶尔主动发语音'],
];
const reasonLabels = { direct_question: '直接提问', topic_followup: '接续话题', can_help: '可以提供帮助', natural_banter: '自然接话', not_relevant: '不适合参与', conflict: '避免卷入争执', too_recent: '频率限制或已关闭', no_new_information: '没有新内容', topic_stale: '话题已过时', generation_failed: '生成失败', quota: '额度已用完' };
const stateLabels = { pending: '排队中', processing: '处理中', done: '完成', failed: '失败', unknown: '回执不明', cancelled: '已取消', expired: '已过期', ready: '可使用', review: '待审核', disabled: '已禁用', rejected: '已删除，不再收集' };

function Preview({ asset }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true, objectUrl;
    authFetch(`/api/channels/qq/admin/stickers/${asset.id}/preview`).then(async response => {
      if (!response.ok) return;
      objectUrl = URL.createObjectURL(await response.blob());
      if (alive) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl);
    }).catch(() => {});
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset.id, asset.version]);
  return url ? <img src={url} alt={asset.description || '待描述表情'} loading="lazy" /> : <span>暂无预览</span>;
}

export default function QQSocialAdmin({ groups = [], request }) {
  const [group, setGroup] = useState(groups[0]?.group_id || '');
  const [tab, setTab] = useState('behavior');
  const [scope, setScope] = useState('public');
  const [settings, setSettings] = useState(null);
  const [revision, refresh] = useState(0);
  const [testMode, setTestMode] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { let alive = true; setTestMode(null); if (group && tab === 'behavior') request(`admin/groups/${group}/test-mode`).then(data => alive && setTestMode(data)).catch(() => {}); return () => { alive = false; }; }, [group, tab, revision, request]);
  const [items, setItems] = useState([]);
  const [health, setHealth] = useState([]);
  useEffect(() => { let alive = true; if (tab === 'jobs') request('admin/media-health').then(data => alive && setHealth(Array.isArray(data) ? data : [])).catch(() => {}); return () => { alive = false; }; }, [tab, revision, request]);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [description, setDescription] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    let alive = true;
    setError(''); setItems([]); setSettings(null);
    const endpoint = tab === 'stickers' ? `admin/stickers?scope=${encodeURIComponent(scope)}&offset=${offset}&limit=30`
      : tab === 'jobs' ? `admin/media-jobs?offset=${offset}&limit=30`
      : group ? `admin/groups/${group}/${tab === 'behavior' ? 'behavior' : tab}?offset=${offset}&limit=30` : null;
    if (endpoint) request(endpoint).then(data => {
      if (alive) { if (tab === 'behavior') setSettings(data); else setItems(data); }
    }).catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, [group, tab, scope, offset, revision, request]);
  async function run(operation, message = '已保存') {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); setNotice(message); refresh(n => n + 1); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function navigate(next) { setTab(next); setOffset(0); setNotice(''); setConfirmClear(false); }
  async function upload(files) {
    if (files.length > 20) throw new Error('每批最多选择 20 张图片');
    let count = 0;
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} 超过 5 MB；此前已上传 ${count} 张`);
      const body = new FormData(); body.append('file', file);
      const response = await authFetch(`/api/channels/qq/admin/stickers?scope=${encodeURIComponent(scope)}&description=${encodeURIComponent(description)}`, { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : '上传失败');
      count += 1;
    }
  }
  return <section className="qq-social-admin" aria-label="群友能力管理">
    <h3>群友能力</h3>
    <div className="qq-admin-tabs" role="tablist" aria-label="群友管理功能">
      {[['behavior', '群行为'], ['history', '聊天记录'], ['decisions', '插话诊断'], ['stickers', '表情库'], ['jobs', '后台任务']].map(([id, label]) =>
        <button key={id} role="tab" aria-selected={tab === id} disabled={busy} onClick={() => navigate(id)}>{label}</button>)}
    </div>
    {!['stickers', 'jobs'].includes(tab) && <label>管理群<select aria-label="管理群" value={group} onChange={e => { setGroup(e.target.value); setOffset(0); setConfirmClear(false); }}>
      {!groups.length && <option value="">没有配置白名单群</option>}{groups.map(g => <option key={g.group_id} value={g.group_id}>{g.group_id}{g.enabled ? '' : '（未启用）'}</option>)}
    </select></label>}
    {error && <p role="alert" className="qq-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {tab === 'behavior' && settings && <fieldset disabled={busy}>
      {behaviorLabels.map(([key, label]) => <label key={key}><input type="checkbox" checked={!!settings[key]} onChange={e => run(() => request(`admin/groups/${group}/behavior`, 'PATCH', { [key]: e.target.checked }))} />{label}</label>)}
      <label>近期上下文条数<select value={settings.context_count} onChange={e => run(() => request(`admin/groups/${group}/behavior`, 'PATCH', { context_count: Number(e.target.value) }))}>
        {[20, 60, 100, 200].map(n => <option key={n} value={n}>{n} 条</option>)}</select></label>
      <div className="qq-status">{testMode?.percent && (!testMode.until || testMode.until * 1000 > now) ? `本群测试概率 ${testMode.percent}% · ${testMode.until ? `剩余 ${Math.max(0, Math.ceil((testMode.until * 1000 - now) / 60000))} 分钟` : '沿用部署配置，未设置到期时间'}` : '本群使用普通插话频率'}
        <div className="qq-admin-actions"><button onClick={() => run(() => request(`admin/groups/${group}/test-mode`, 'PUT', { percent: 95, minutes: 30 }))}>测试 30 分钟（95%）</button><button onClick={() => run(() => request(`admin/groups/${group}/test-mode`, 'PUT', { percent: 0 }))}>结束本群测试</button></div>
      </div>
      <p className="qq-hint">普通插话至少间隔 3 分钟。收集到的表情默认需要审核，只供本群使用；关闭“自动接收”不影响已有可用表情。</p>
    </fieldset>}
    {tab === 'history' && group && <>
      <div className="qq-admin-actions"><button disabled={busy} onClick={() => run(() => request(`admin/groups/${group}/history-sync`, 'POST'), '已排队，请到后台任务查看实际获取数量')}>补取最近 100 条</button>
        <button disabled={busy} className="qq-danger" onClick={() => confirmClear ? run(async () => { await request(`admin/groups/${group}/context`, 'DELETE'); setConfirmClear(false); }, '上下文已清空，旧回复已失效') : setConfirmClear(true)}>{confirmClear ? '确认清空本群上下文' : '清空本群上下文'}</button></div>
      <p className="qq-hint">保留最近 24 小时内最多 1000 条。补取不保证包含离线期间全部消息，也不会回复旧消息。</p>
      {items.map((item, i) => <article className="qq-log-row" key={item.platform_id || i}><small>{item.sender_name || item.sender} · {new Date(item.created * 1000).toLocaleString()} · {item.source === 'backfill' ? '补取' : '在线'}</small><p>{item.content}</p></article>)}
    </>}
    {tab === 'decisions' && items.map((item, i) => <p className="qq-log-row" key={i}>{reasonLabels[item.reason] || item.reason} · {item.elapsed.toFixed(1)} 秒 · {new Date(item.created * 1000).toLocaleTimeString()}{item.stage ? ` · 阶段：${item.stage}` : ''}{item.error_code ? ` · ${item.error_code}` : ''}{item.delivery_status ? ` · 投递：${item.delivery_status}` : ''}</p>)}
    {tab === 'stickers' && <>
      <label>图库范围<select value={scope} onChange={e => { setScope(e.target.value); setOffset(0); }}><option value="public">公共图库（所有授权会话可用）</option>{groups.map(g => <option key={g.group_id} value={g.group_id}>仅群 {g.group_id}</option>)}</select></label>
      <label>新图片含义（留空则由模型描述后审核）<input value={description} maxLength={500} onChange={e => setDescription(e.target.value)} /></label>
      <div className="qq-admin-actions"><label>上传图片<input aria-label="上传表情图片" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple disabled={busy} onChange={e => { const files = [...e.target.files]; run(() => upload(files), '图片已上传，可刷新查看描述进度'); e.target.value = ''; }} /></label>
        <label>导入自有素材文件夹<input aria-label="导入表情文件夹" type="file" webkitdirectory="" multiple disabled={busy} onChange={e => { const files = [...e.target.files].filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f.name)); run(() => upload(files), '素材已上传'); e.target.value = ''; }} /></label></div>
      <p className="qq-hint">每批最多 20 张，单张不超过 5 MB。不填写含义会调用识图模型。接收后可按语境选图，无需设置关键词对应关系。</p>
      <div className="qq-sticker-grid">{items.map(asset => <article key={`${asset.id}:${asset.version}`}>
        {asset.status !== 'rejected' && <Preview asset={asset} />}
        <small>{stateLabels[asset.status]} · {asset.format} · {asset.index_status === 'semantic' ? '语义索引' : asset.index_status === 'lexical' ? '文字检索（降级）' : '索引待处理'}</small>
        <textarea disabled={asset.status === 'rejected'} aria-label={`表情含义 ${asset.id}`} maxLength={500} defaultValue={asset.description} onBlur={e => { if (e.target.value !== asset.description) run(() => request(`admin/stickers/${asset.id}`, 'PATCH', { description: e.target.value })); }} />
        <div className="qq-admin-actions">
          {asset.status !== 'rejected' && <><button disabled={busy || !asset.description} onClick={() => run(() => request(`admin/stickers/${asset.id}`, 'PATCH', { status: asset.status === 'ready' ? 'disabled' : 'ready' }))}>{asset.status === 'ready' ? '禁用' : '接收使用'}</button>
          <button disabled={busy} onClick={() => run(() => request(`admin/stickers/${asset.id}/reindex`, 'POST'), '已排队处理')}>{asset.description ? '重建索引' : '重试描述'}</button>
          {asset.scope !== 'public' && <button disabled={busy} onClick={() => run(() => request(`admin/stickers/${asset.id}`, 'PATCH', { scope: 'public' }))}>移入公共图库</button>}
          <button disabled={busy} onClick={() => run(() => request(`admin/stickers/${asset.id}`, 'DELETE'), '已删除，同一图片不会再次自动收集')}>删除并不再收集</button></>}
        </div></article>)}</div>
    </>}
    {tab === 'jobs' && <><p className="qq-hint">全局任务汇总（包含私人任务数量，不含私人内容）：{health.length ? health.map(h => `${h.kind} ${stateLabels[h.status] || h.status} ${h.count} 项`).join('；') : '暂无记录'}</p><p className="qq-hint">失败不会导致已发送的文字重复发送。TTS 任务需等待文字成功；语音播放效果仍需手机 QQ 验证。</p>
      {items.map(item => <p className="qq-log-row" key={item.id}>{item.kind} · {stateLabels[item.status] || item.status}{item.stage ? ` · ${item.stage}` : ''}{item.result === 'lexical' ? ' · 已降级为文字检索' : ''}{item.error ? ` · ${item.error}` : ''}{item.received != null ? ` · 获取 ${item.received} 条，新增 ${item.imported} 条` : ''}</p>)}</>}
    {tab !== 'behavior' && <><p>{items.length ? `第 ${offset + 1}–${offset + items.length} 项` : '暂无记录'}</p><div className="qq-admin-actions">
      <button disabled={busy || offset === 0} onClick={() => setOffset(n => Math.max(0, n - 30))}>上一页</button><button disabled={busy || items.length < 30} onClick={() => setOffset(n => n + 30)}>下一页</button>
      <button disabled={busy} onClick={() => refresh(n => n + 1)}>刷新列表</button></div></>}
  </section>;
}
