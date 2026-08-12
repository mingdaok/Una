import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Clock3,
  FlaskConical,
  GitBranch,
  HeartHandshake,
  History,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  advanceLifeAcceptance,
  auditLifeContent,
  evaluateContentSafety,
  evaluateLifeQuality,
  loadLifeAcceptanceStatus,
  loadNpcActorDebug,
  loadNpcActors,
  releaseLifeAcceptance,
  resetLifeAcceptance,
} from '../../life/api';
import './NpcWorldInspector.css';


const TABS = [
  ['overview', '状态与日程'],
  ['timeline', '事件与互动'],
  ['relationships', '关系网络'],
  ['decisions', '意图与建议'],
];

const TIER_LABELS = {
  distant: '疏远',
  familiar: '熟悉',
  close: '亲近',
  trusted: '信赖',
  strained: '紧张',
};

const STATUS_LABELS = {
  active: '进行中',
  completed: '已完成',
  accepted: '已接受',
  adjusted: '调整后接受',
  deferred: '延后考虑',
  declined: '已拒绝',
};

const WORLD_TIME_ZONE = 'Asia/Shanghai';


function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: WORLD_TIME_ZONE,
  }).format(new Date(value));
}

function formatWorldTime(value) {
  if (!value) return '—';
  return `${new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    timeZone: WORLD_TIME_ZONE,
  }).format(new Date(value))}（UTC+8）`;
}

function calendarDayNumber(value) {
  if (!value) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: WORLD_TIME_ZONE,
    }).formatToParts(new Date(value)).map(part => [part.type, part.value]),
  );
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86400000;
}

function formatScheduleTime(value, virtualNow) {
  const timestamp = formatWorldTime(value).replace('（UTC+8）', '');
  if (!virtualNow) return timestamp;
  const difference = calendarDayNumber(value) - calendarDayNumber(virtualNow);
  const relative = difference === 0
    ? '今天'
    : difference === 1
      ? '明天'
      : difference === 2
        ? '后天'
        : difference > 2
          ? `${difference} 天后`
          : '';
  return `${relative ? `${relative} · ` : ''}${timestamp}`;
}

function Empty({ children }) {
  return <p className="npc-inspector-empty">{children}</p>;
}

function Metric({ label, value }) {
  return (
    <div className="npc-inspector-metric">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      <i><b style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} /></i>
    </div>
  );
}

function Overview({ data, virtualNow }) {
  const state = data.state || {};
  return (
    <div className="npc-inspector-stack">
      <section className="npc-inspector-state-grid" aria-label="人物当前状态">
        <Metric label="精力" value={state.energy} />
        <Metric label="饥饿" value={state.hunger} />
        <Metric label="压力" value={state.stress} />
        <Metric label="社交需要" value={state.social_need} />
        <Metric label="独处需要" value={state.solitude_need} />
      </section>
      <section className="npc-inspector-panel">
        <header><CalendarClock size={17} /><h3>未来日程</h3><span>{data.schedule?.length || 0} 项{virtualNow ? ' · 模拟时间' : ''}</span></header>
        {!data.schedule?.length ? <Empty>暂无计划日程。</Empty> : (
          <div className="npc-inspector-list">
            {data.schedule.map(item => (
              <article key={item.schedule_id}>
                <time>{formatScheduleTime(item.starts_at, virtualNow)}</time>
                <div><strong>{item.summary}</strong><small>{item.window_key} · {item.location_id} · {item.status}</small></div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="npc-inspector-panel">
        <header><Sparkles size={17} /><h3>当前目标</h3></header>
        {!data.intentions?.filter(item => item.status === 'active').length ? <Empty>当前没有活跃意图。</Empty> : (
          <div className="npc-inspector-list">
            {data.intentions.filter(item => item.status === 'active').map(item => (
              <article key={item.intention_instance_id}>
                <time>{formatTime(item.formed_at)}</time>
                <div><strong>{item.summary}</strong><small>{item.driver} · 最早行动 {formatTime(item.earliest_at)}</small></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Timeline({ data }) {
  const items = useMemo(() => [
    ...(data.events || []).map(item => ({ ...item, source: item.schedule_id ? '固定日程' : '自主行动' })),
    ...(data.interactions || []).map(item => ({ ...item, source: '共同互动' })),
  ].sort((a, b) => new Date(b.end_at) - new Date(a.end_at)), [data.events, data.interactions]);
  if (!items.length) return <Empty>还没有生活事件或共同互动。</Empty>;
  return (
    <div className="npc-inspector-timeline">
      {items.map(item => (
        <article key={`${item.source}-${item.event_id}`}>
          <span className="npc-inspector-source">{item.source}</span>
          <time>{formatTime(item.end_at)}</time>
          <h3>{item.summary}</h3>
          <p>{item.event_type} · {item.location_id}</p>
          {item.participants?.length > 0 && (
            <small>参与者：{item.participants.map(person => person.actor_id).join('、')}</small>
          )}
          {item.perspective?.interpretation && <blockquote>{item.perspective.interpretation}</blockquote>}
        </article>
      ))}
    </div>
  );
}

function Relationships({ data }) {
  if (!data.relationships?.length) return <Empty>这个人物还没有形成持久关系。</Empty>;
  return (
    <div className="npc-inspector-relationship-grid">
      {data.relationships.map(item => (
        <article key={item.other_ai_id} className={`is-${item.relationship_tier || 'distant'}`}>
          <header>
            <div><strong>{item.display_name || item.other_ai_id}</strong><small>{item.other_ai_id}</small></div>
            <span>{TIER_LABELS[item.relationship_tier] || item.relationship_tier || '未分层'}</span>
          </header>
          <div className="npc-inspector-score"><b>{item.closeness_score ?? 0}</b><small>接近度</small></div>
          <dl>
            <div><dt>熟悉</dt><dd>{item.familiarity}</dd></div>
            <div><dt>好感</dt><dd>{item.affinity}</dd></div>
            <div><dt>信任</dt><dd>{item.trust}</dd></div>
            <div><dt>紧张</dt><dd>{item.tension}</dd></div>
          </dl>
          <footer>可披露层级：{item.disclosure_level || 'public'}</footer>
        </article>
      ))}
    </div>
  );
}

function Decisions({ data }) {
  return (
    <div className="npc-inspector-decision-grid">
      <section className="npc-inspector-panel">
        <header><GitBranch size={17} /><h3>意图历史</h3><span>{data.intentions?.length || 0}</span></header>
        {!data.intentions?.length ? <Empty>暂无意图记录。</Empty> : (
          <div className="npc-inspector-list">
            {data.intentions.map(item => (
              <article key={item.intention_instance_id}>
                <time>{formatTime(item.formed_at)}</time>
                <div><strong>{item.summary}</strong><small>{STATUS_LABELS[item.status] || item.status} · {item.template_id}</small></div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="npc-inspector-panel">
        <header><HeartHandshake size={17} /><h3>用户建议决策</h3><span>{data.suggestions?.length || 0}</span></header>
        {!data.suggestions?.length ? <Empty>用户还没有给这个人物提过建议。</Empty> : (
          <div className="npc-inspector-list">
            {data.suggestions.map(item => (
              <article key={item.suggestion_id}>
                <time>{formatTime(item.created_at)}</time>
                <div>
                  <strong>{item.response_text}</strong>
                  <small>{STATUS_LABELS[item.status] || item.status} · {item.suggestion_type}{item.linked_intention_id ? ' · 已转化为意图' : ''}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


function QualityEvaluation({ seedText, days, busy, error, result, onSeedTextChange, onDaysChange, onRun }) {
  const metrics = result?.metrics;
  return (
    <div className="npc-quality">
      <section className="npc-quality-runner">
        <header><BarChart3 size={17} /><div><h3>多种子质量评估</h3><p>在临时隔离世界中批量运行，不写入当前账号。</p></div></header>
        <div className="npc-quality-form">
          <label>种子（逗号或换行分隔）<textarea aria-label="批量评估种子" value={seedText} disabled={busy} onChange={event => onSeedTextChange(event.target.value)} /></label>
          <label>每个种子模拟天数<select aria-label="评估天数" value={days} disabled={busy} onChange={event => onDaysChange(Number(event.target.value))}>
            {[1, 2, 3, 5, 7].map(value => <option key={value} value={value}>{value} 天</option>)}
          </select></label>
          <button type="button" disabled={busy} onClick={onRun}><Play size={14} />{busy ? '正在批量模拟…' : '开始评估'}</button>
        </div>
        {error && <p className="npc-quality-error" role="alert">{error}</p>}
      </section>
      {!result && !busy && <Empty>运行后会在这里显示生活密度、重复率、互动、意图与建议分布。</Empty>}
      {metrics && (
        <>
          <section className="npc-quality-metrics" aria-label="质量评估指标">
            <article><span>事件 / 人物日</span><strong>{metrics.events_per_actor_day}</strong><small>{metrics.actor_event_count} 条 NPC 事件</small></article>
            <article><span>摘要重复率</span><strong>{Math.round(metrics.summary_repetition_rate * 100)}%</strong><small>{metrics.unique_summary_count} 个独立摘要</small></article>
            <article><span>互动 / 种子日</span><strong>{metrics.interactions_per_seed_day}</strong><small>{metrics.interaction_count} 次共同互动</small></article>
            <article><span>意图完成率</span><strong>{Math.round(metrics.intention_completion_rate * 100)}%</strong><small>{metrics.completed_intention_count} / {metrics.intention_count}</small></article>
          </section>
          {result.warnings?.length > 0 && <section className="npc-quality-warnings"><strong>调参提示</strong>{result.warnings.map(item => <p key={item}>{item}</p>)}</section>}
          <section className="npc-quality-breakdowns">
            <Distribution title="建议结果" values={metrics.suggestion_outcomes} />
            <Distribution title="关系层级" values={metrics.relationship_tiers} />
            <Distribution title="事件类型" values={metrics.event_type_distribution} limit={8} />
          </section>
          <section className="npc-quality-runs">
            <header><h3>逐种子结果</h3><span>{result.seed_count} 个种子 × {result.days_per_seed} 天</span></header>
            <div className="npc-quality-table" role="table" aria-label="逐种子评估结果">
              <div role="row"><b role="columnheader">种子</b><b role="columnheader">事件</b><b role="columnheader">互动</b><b role="columnheader">冲突 / 修复</b><b role="columnheader">意图完成</b></div>
              {result.runs.map(run => <div role="row" key={run.seed}><span role="cell">{run.seed}</span><span role="cell">{run.actor_events}</span><span role="cell">{run.interactions}</span><span role="cell">{run.conflicts} / {run.repairs}</span><span role="cell">{run.completed_intentions} / {run.intentions}</span></div>)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Distribution({ title, values = {}, limit }) {
  const entries = Object.entries(values).slice(0, limit);
  return <article><h3>{title}</h3>{!entries.length ? <small>暂无数据</small> : entries.map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</article>;
}


function ContentAudit({ busy, error, result, onRun, safetyBusy, safetyError, safetyResult, onSafetyRun }) {
  const metrics = result?.metrics;
  const summary = result?.summary;
  return (
    <div className="npc-content-audit">
      <section className="npc-content-audit-runner">
        <header><ShieldCheck size={18} /><div><h3>生成内容安全与连续性审计</h3><p>只读检查最近的朋友圈、日记和聊天；私人想法命中后统一隐藏内容片段。</p></div></header>
        <button type="button" disabled={busy} onClick={onRun}>{busy ? '正在审计…' : '审计最近内容'}</button>
        {error && <p role="alert">{error}</p>}
      </section>
      <section className="npc-content-audit-runner">
        <header><FlaskConical size={18} /><div><h3>内容安全回归门禁</h3><p>在隔离临时世界运行固定安全语料，不读取当前账号内容。</p></div></header>
        <button type="button" disabled={safetyBusy} onClick={onSafetyRun}>{safetyBusy ? '正在验证…' : '运行安全门禁'}</button>
        {safetyError && <p role="alert">{safetyError}</p>}
      </section>
      {safetyResult && (
        <section className="npc-content-audit-summary" aria-label="内容安全门禁结果">
          <article className={safetyResult.gate_passed ? '' : 'is-risk'}><span>门禁结果</span><strong>{safetyResult.gate_passed ? '通过' : '失败'}</strong><small>{safetyResult.corpus_version}</small></article>
          <article><span>危险召回率</span><strong>{Math.round(safetyResult.metrics.unsafe_recall * 100)}%</strong><small>不得漏放危险样例</small></article>
          <article><span>安全放行率</span><strong>{Math.round(safetyResult.metrics.safe_pass_rate * 100)}%</strong><small>避免误阻断安全样例</small></article>
          <article className={safetyResult.metrics.expected_code_miss_count ? 'is-risk' : ''}><span>问题码漏检</span><strong>{safetyResult.metrics.expected_code_miss_count}</strong><small>{safetyResult.case_count} 个固定样例</small></article>
        </section>
      )}
      {!result && !busy && <Empty>运行后会检查来源追踪、时间连续性、角色口吻、重复表达和隐私边界。</Empty>}
      {metrics && summary && (
        <>
          <section className="npc-content-audit-summary">
            <article><span>来源可追溯率</span><strong>{Math.round(metrics.source_traceability_rate * 100)}%</strong><small>朋友圈与日记生活内容</small></article>
            <article><span>时间一致率</span><strong>{Math.round(metrics.temporal_consistency_rate * 100)}%</strong><small>世界时间与来源事件</small></article>
            <article><span>口吻规则一致率</span><strong>{Math.round(metrics.voice_consistency_rate * 100)}%</strong><small>句长与 emoji 档案</small></article>
            <article className={metrics.privacy_leak_count ? 'is-risk' : ''}><span>隐私疑似泄漏</span><strong>{metrics.privacy_leak_count}</strong><small>高风险项</small></article>
          </section>
          <section className="npc-content-audit-overview">
            <div><strong>{summary.scanned}</strong><span>总审计内容</span></div>
            <div><strong>{summary.posts}</strong><span>朋友圈</span></div>
            <div><strong>{summary.diaries}</strong><span>日记</span></div>
            <div><strong>{summary.chats}</strong><span>聊天</span></div>
            <div className="is-risk"><strong>{summary.high_risk}</strong><span>高风险</span></div>
            <div><strong>{summary.errors}</strong><span>来源错误</span></div>
            <div><strong>{summary.warnings}</strong><span>提示</span></div>
          </section>
          {metrics.life_chat_reference_count > 0 && metrics.traceable_life_chat_count === 0 && (
            <section className="npc-content-audit-note">发现 {metrics.life_chat_reference_count} 条聊天生活引用，其中没有一条带有可验证的结构化来源；这些通常是迁移前旧消息，需要人工复查。</section>
          )}
          <section className="npc-quality-breakdowns">
            <Distribution title="问题类型" values={result.issue_codes} limit={10} />
            <article><h3>表达指标</h3><div><span>近重复内容对</span><strong>{metrics.duplicate_pair_count}</strong></div><div><span>重复内容率</span><strong>{Math.round(metrics.duplicate_content_rate * 100)}%</strong></div><div><span>来源文本关联度</span><strong>{Math.round(metrics.source_alignment_rate * 100)}%</strong></div></article>
          </section>
          <section className="npc-content-issues">
            <header><h3>审计问题</h3><span>{summary.issues} 项</span></header>
            {!result.issues.length ? <Empty>没有发现规则可识别的问题。</Empty> : result.issues.map((issue, index) => (
              <article key={`${issue.channel}-${issue.item_id}-${issue.code}-${index}`} className={`is-${issue.severity}`}>
                <div><span>{issue.severity}</span><code>{issue.code}</code><small>{issue.channel} #{issue.item_id} · {issue.author_id}</small></div>
                <p>{issue.message}</p>
                <blockquote>{issue.excerpt}</blockquote>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}


function AcceptanceControls({
  control,
  busy,
  error,
  seed,
  scenario,
  confirming,
  onSeedChange,
  onScenarioChange,
  onReset,
  onAdvance,
  onRelease,
}) {
  return (
    <section className="npc-inspector-acceptance" aria-label="模拟验收控制">
      <header>
        <FlaskConical size={17} />
        <div><strong>验收时钟</strong><small>仅开发环境 · 用户级隔离</small></div>
        <span className={control.active ? 'is-active' : ''}>{control.active ? 'VIRTUAL' : 'READY'}</span>
      </header>
      <div className="npc-inspector-acceptance-body">
        <div className="npc-inspector-clock">
          <Clock3 size={18} />
          <span>{control.active ? '当前模拟时间' : '尚未启用虚拟时间'}</span>
          <strong>{control.active ? formatWorldTime(control.virtual_now) : '使用固定种子创建可复现场景'}</strong>
          {control.active && <small>种子 {control.seed} · 起点 {formatWorldTime(control.started_at)} · 下方日程均为模拟时间</small>}
          {control.active && (
            <div className="npc-inspector-clock-actions">
              {[6, 24, 72].map(hours => (
                <button key={hours} type="button" disabled={busy} onClick={() => onAdvance(hours)}>+{hours}h</button>
              ))}
              <button type="button" disabled={busy} onClick={onRelease}>退出虚拟时间</button>
            </div>
          )}
        </div>
        <div className="npc-inspector-scenario-form">
          <label>场景种子<input value={seed} maxLength={64} disabled={busy} onChange={event => onSeedChange(event.target.value)} /></label>
          <label>初始场景<select value={scenario} disabled={busy} onChange={event => onScenarioChange(event.target.value)}>
            <option value="baseline">刚初始化</option>
            <option value="one_day">已生活一天</option>
            <option value="three_days">已生活三天</option>
            <option value="one_week">已生活一周</option>
          </select></label>
          <button type="button" className={confirming ? 'is-danger' : ''} disabled={busy || !seed.trim()} onClick={onReset}>
            <RotateCcw size={14} />{confirming ? '确认清空当前生活模拟数据' : control.active ? '重新建立场景' : '建立测试场景'}
          </button>
          {confirming && <small className="npc-inspector-reset-warning">再次点击将只清空当前用户的生活模拟世界；账号和聊天数据不受影响。</small>}
        </div>
      </div>
      {error && <p className="npc-inspector-acceptance-error" role="alert">{error}</p>}
    </section>
  );
}


export default function NpcWorldInspector({ onClose }) {
  const [actors, setActors] = useState([]);
  const [actorId, setActorId] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [acceptance, setAcceptance] = useState(undefined);
  const [acceptanceBusy, setAcceptanceBusy] = useState(false);
  const [acceptanceError, setAcceptanceError] = useState('');
  const [scenarioSeed, setScenarioSeed] = useState('manual-review');
  const [scenario, setScenario] = useState('one_day');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [qualitySeeds, setQualitySeeds] = useState('baseline-a, baseline-b, baseline-c');
  const [qualityDays, setQualityDays] = useState(3);
  const [qualityBusy, setQualityBusy] = useState(false);
  const [qualityError, setQualityError] = useState('');
  const [qualityResult, setQualityResult] = useState(null);
  const [contentAuditBusy, setContentAuditBusy] = useState(false);
  const [contentAuditError, setContentAuditError] = useState('');
  const [contentAuditResult, setContentAuditResult] = useState(null);
  const [safetyEvaluationBusy, setSafetyEvaluationBusy] = useState(false);
  const [safetyEvaluationError, setSafetyEvaluationError] = useState('');
  const [safetyEvaluationResult, setSafetyEvaluationResult] = useState(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    loadNpcActors({ signal: controller.signal })
      .then(items => {
        setActors(items);
        if (items.length) {
          setActorId(current => current || items[0].actor_id);
        } else {
          setLoading(false);
        }
      })
      .catch(failure => {
        if (failure.name !== 'AbortError') {
          setError(failure.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadLifeAcceptanceStatus({ signal: controller.signal })
      .then(setAcceptance)
      .catch(failure => {
        if (failure.name !== 'AbortError') setAcceptanceError(failure.message);
      });
    return () => controller.abort();
  }, []);

  const loadActor = useCallback(async (selectedId, refresh = false) => {
    if (!selectedId) return;
    const version = ++requestVersion.current;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const nextData = await loadNpcActorDebug(selectedId);
      if (version === requestVersion.current) setData(nextData);
    } catch (failure) {
      if (version === requestVersion.current && failure.name !== 'AbortError') {
        setError(failure.message || '无法读取人物世界数据');
      }
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => { if (actorId) loadActor(actorId); }, [actorId, loadActor]);

  const refreshWorld = useCallback(async () => {
    const items = await loadNpcActors();
    setActors(items);
    const selected = items.some(item => item.actor_id === actorId)
      ? actorId
      : items[0]?.actor_id || '';
    setActorId(selected);
    if (selected) await loadActor(selected, true);
  }, [actorId, loadActor]);

  const handleReset = async () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    setAcceptanceBusy(true);
    setAcceptanceError('');
    try {
      const next = await resetLifeAcceptance({ seed: scenarioSeed.trim(), scenario });
      setAcceptance(next);
      setConfirmingReset(false);
      await refreshWorld();
    } catch (failure) {
      setAcceptanceError(failure.message || '无法建立验收场景');
    } finally {
      setAcceptanceBusy(false);
    }
  };

  const handleAdvance = async hours => {
    setAcceptanceBusy(true);
    setAcceptanceError('');
    try {
      setAcceptance(await advanceLifeAcceptance(hours));
      await refreshWorld();
    } catch (failure) {
      setAcceptanceError(failure.message || '无法推进模拟时间');
    } finally {
      setAcceptanceBusy(false);
    }
  };

  const handleRelease = async () => {
    setAcceptanceBusy(true);
    setAcceptanceError('');
    try {
      setAcceptance(await releaseLifeAcceptance());
      setConfirmingReset(false);
    } catch (failure) {
      setAcceptanceError(failure.message || '无法退出虚拟时间');
    } finally {
      setAcceptanceBusy(false);
    }
  };

  const handleQualityRun = async () => {
    const seeds = qualitySeeds.split(/[\s,，]+/).map(item => item.trim()).filter(Boolean);
    setQualityBusy(true);
    setQualityError('');
    try {
      setQualityResult(await evaluateLifeQuality(seeds, qualityDays));
    } catch (failure) {
      setQualityError(failure.message || '无法完成批量质量评估');
    } finally {
      setQualityBusy(false);
    }
  };

  const handleContentAudit = async () => {
    setContentAuditBusy(true);
    setContentAuditError('');
    try {
      setContentAuditResult(await auditLifeContent());
    } catch (failure) {
      setContentAuditError(failure.message || '无法完成内容质量审计');
    } finally {
      setContentAuditBusy(false);
    }
  };

  const handleSafetyEvaluation = async () => {
    setSafetyEvaluationBusy(true);
    setSafetyEvaluationError('');
    try {
      setSafetyEvaluationResult(await evaluateContentSafety());
    } catch (failure) {
      setSafetyEvaluationError(failure.message || '无法完成内容安全回归门禁');
    } finally {
      setSafetyEvaluationBusy(false);
    }
  };

  const activeActor = actors.find(item => item.actor_id === actorId);
  return (
    <div className="npc-inspector" role="dialog" aria-modal="true" aria-labelledby="npc-inspector-title">
      <header className="npc-inspector-topbar">
        <button type="button" onClick={onClose} aria-label="返回 UNA 的生活"><ArrowLeft size={21} /></button>
        <div><span>WORLD INSPECTOR</span><h2 id="npc-inspector-title">NPC 世界检查</h2></div>
        <button type="button" onClick={() => loadActor(actorId, true)} aria-label="刷新人物数据" disabled={!actorId || refreshing} className={refreshing ? 'is-spinning' : ''}><RefreshCw size={19} /></button>
      </header>

      <aside className="npc-inspector-actors" aria-label="选择人物">
        {actors.map(actor => (
          <button key={actor.actor_id} type="button" className={actor.actor_id === actorId ? 'is-active' : ''} onClick={() => setActorId(actor.actor_id)}>
            <span>{actor.display_name.slice(0, 1)}</span><div><strong>{actor.display_name}</strong><small>{actor.actor_id}</small></div>
          </button>
        ))}
      </aside>

      <main className="npc-inspector-main">
        <section className="npc-inspector-hero">
          <div><span>{activeActor?.prompt_identity || '独立生活中的人物'}</span><h1>{activeActor?.display_name || '选择人物'}</h1><p>{activeActor?.traits?.join(' · ')}</p></div>
          {data?.state && <div className="npc-inspector-now"><Activity size={17} /><span>此刻</span><strong>{data.state.current_activity}</strong><small>{data.state.current_location} · {data.state.mood?.label || '平静'}</small></div>}
        </section>
        {acceptance !== undefined && acceptance !== null && (
          <AcceptanceControls
            control={acceptance}
            busy={acceptanceBusy}
            error={acceptanceError}
            seed={scenarioSeed}
            scenario={scenario}
            confirming={confirmingReset}
            onSeedChange={value => { setScenarioSeed(value); setConfirmingReset(false); }}
            onScenarioChange={value => { setScenario(value); setConfirmingReset(false); }}
            onReset={handleReset}
            onAdvance={handleAdvance}
            onRelease={handleRelease}
          />
        )}
        <nav className="npc-inspector-tabs" aria-label="检查类别">
          {TABS.map(([key, label]) => <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}
          {acceptance !== undefined && acceptance !== null && <button type="button" className={tab === 'quality' ? 'is-active' : ''} onClick={() => setTab('quality')}>质量评估</button>}
          {acceptance !== undefined && acceptance !== null && <button type="button" className={tab === 'content-audit' ? 'is-active' : ''} onClick={() => setTab('content-audit')}>内容审计</button>}
        </nav>
        {loading && <div className="npc-inspector-loading"><RefreshCw size={20} />正在结算并读取人物世界…</div>}
        {!loading && error && <div className="npc-inspector-error" role="alert"><strong>读取失败</strong><p>{error}</p><button type="button" onClick={() => loadActor(actorId)}>重试</button></div>}
        {!loading && !error && !actors.length && <Empty>当前没有启用的 NPC。</Empty>}
        {!loading && !error && data && (
          <div className="npc-inspector-content">
            {tab === 'overview' && <Overview
              data={data}
              virtualNow={acceptance?.active ? acceptance.virtual_now : null}
            />}
            {tab === 'timeline' && <Timeline data={data} />}
            {tab === 'relationships' && <Relationships data={data} />}
            {tab === 'decisions' && <Decisions data={data} />}
            {tab === 'quality' && <QualityEvaluation
              seedText={qualitySeeds}
              days={qualityDays}
              busy={qualityBusy}
              error={qualityError}
              result={qualityResult}
              onSeedTextChange={setQualitySeeds}
              onDaysChange={setQualityDays}
              onRun={handleQualityRun}
            />}
            {tab === 'content-audit' && <ContentAudit
              busy={contentAuditBusy}
              error={contentAuditError}
              result={contentAuditResult}
              onRun={handleContentAudit}
              safetyBusy={safetyEvaluationBusy}
              safetyError={safetyEvaluationError}
              safetyResult={safetyEvaluationResult}
              onSafetyRun={handleSafetyEvaluation}
            />}
          </div>
        )}
      </main>
      <footer className="npc-inspector-foot"><History size={14} />这里只展示用户安全字段；私人想法和内部评分不会进入前端。</footer>
    </div>
  );
}
