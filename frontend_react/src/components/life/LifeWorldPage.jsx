import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Battery,
  BookOpenText,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  HeartHandshake,
  MapPin,
  MessageCircleHeart,
  Milestone,
  Moon,
  RefreshCw,
  ScanSearch,
  SlidersHorizontal,
  Users,
  Utensils,
  Wind,
  X,
} from 'lucide-react';

import { loadLifeDashboard, resolveLifeChoice, updateLifeSettings } from '../../life/api';
import NpcWorldInspector from './NpcWorldInspector';
import './LifeWorldPage.css';


const ACTIVITY_LABELS = {
  resting: '在家休息',
  sleep: '睡得很安稳',
  morning_routine: '整理清晨的生活',
  morning_walk: '沿河散步',
  focused_work: '专心处理创作',
  reading: '在图书馆阅读',
  lunch: '慢慢吃午饭',
  creative_practice: '尝试新的创作',
  errand: '去旧城区办事',
  rest: '给自己留些休息',
  cooking: '认真准备晚饭',
  evening_walk: '在晚风里散步',
  friend_chat: '和熟人聊近况',
  reflection: '整理今天的片段',
  quiet_hobby: '安静做喜欢的事',
  period_summary: '按自己的节奏生活',
};

const LOCATION_LABELS = {
  home: '家里',
  riverside: '河边',
  studio: '工作室',
  library: '图书馆',
  neighborhood_cafe: '街角咖啡馆',
  old_town: '旧城区',
  multiple: '生活里的几个地方',
};

const EVENT_ICONS = {
  sleep: Moon,
  morning_routine: Utensils,
  morning_walk: Wind,
  focused_work: BookOpenText,
  reading: BookOpenText,
  lunch: Utensils,
  creative_practice: Camera,
  errand: MapPin,
  rest: Moon,
  cooking: Utensils,
  evening_walk: Wind,
  friend_chat: Users,
  reflection: BookOpenText,
  quiet_hobby: Moon,
  period_summary: Clock3,
};

const TIMEZONES = [
  ['Asia/Shanghai', '中国标准时间'],
  ['Asia/Tokyo', '日本标准时间'],
  ['Europe/London', '英国时间'],
  ['America/New_York', '美国东部时间'],
  ['UTC', '协调世界时'],
];


function readError(error) {
  if (error?.name === 'AbortError') return '';
  return error?.message || '暂时无法读取生活记录';
}

function formatDateTime(value, timezone, options = {}) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
    ...options,
  }).format(date);
}

function dayKey(value, timezone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '其他时间';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: timezone,
  }).format(date);
}

function needDescription(kind, value) {
  const number = Number(value) || 0;
  if (kind === 'energy') {
    if (number >= 70) return '精力充足';
    if (number >= 40) return '状态平稳';
    return '需要休息';
  }
  if (kind === 'hunger') {
    if (number <= 30) return '已经吃饱';
    if (number <= 65) return '有点饿了';
    return '想吃东西';
  }
  if (kind === 'stress') {
    if (number <= 30) return '心情放松';
    if (number <= 65) return '有些挂心';
    return '需要缓一缓';
  }
  if (number <= 30) return '享受独处';
  if (number <= 65) return '想聊几句';
  return '很想见朋友';
}

function LifeMetric({ icon: Icon, label, description, value }) {
  return (
    <div className="life-metric">
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{description}</strong>
      </div>
      <b aria-label={`${label}数值 ${value}`}>{value}</b>
    </div>
  );
}

function relationshipDescription(relationship) {
  if (relationship.tension >= 25) return '最近相处有些别扭';
  if (relationship.trust >= 20) return '彼此已经很信任';
  if (relationship.familiarity >= 12) return '来往渐渐自然';
  return '刚开始慢慢熟悉';
}

function intentionPresentation(intention) {
  if (!intention) return null;
  const messages = {
    active: ['她还在认真考虑', `${intention.summary}。她会等自己的状态和时机都合适再行动。`],
    deferred: ['她决定先放一放', `${intention.summary}。慢一点，也是她作出的决定。`],
    fulfilled: ['她后来有了自己的答案', `${intention.summary}。这件事已经按她自己的判断发生了。`],
    applied: ['她后来有了自己的答案', `${intention.summary}。这件事已经按她自己的判断发生了。`],
    abandoned: ['她后来改变了安排', `${intention.summary}。认真考虑后，她决定不再继续。`],
    expired: ['这次没有等到合适时机', `${intention.summary}。生活继续向前，这件事没有被强行完成。`],
  };
  const [title, body] = messages[intention.status] || messages.active;
  return { title, body };
}

function SharedDecisionSection({ choice, error, intention, onResolve, resolving, result }) {
  const persisted = intentionPresentation(intention);
  if (!choice && !result && !persisted) return null;
  const resolvedTitle = result ? '她记住了你的想法' : persisted?.title;
  const resolvedBody = result || persisted?.body;

  return (
    <section className="life-shared-decision" aria-labelledby="life-shared-decision-title">
      <div className="life-choice-mark" aria-hidden="true">
        {resolvedBody ? <Check size={21} strokeWidth={1.9} /> : <MessageCircleHeart size={21} strokeWidth={1.7} />}
      </div>
      <div className="life-choice-content">
        <span className="life-choice-eyebrow">共同商量</span>
        <h2 id="life-shared-decision-title">
          {resolvedTitle || '她想听听你的意见'}
        </h2>
        {resolvedBody ? (
          <p className="life-choice-resolution" role="status">{resolvedBody}</p>
        ) : (
          <>
            <p className="life-choice-context">{choice.context_text}</p>
            <blockquote>{choice.prompt}</blockquote>
            <div className="life-choice-options" aria-label="可以给 UNA 的建议">
              {choice.options.map(option => (
                <button
                  type="button"
                  key={option.id}
                  disabled={Boolean(resolving)}
                  onClick={() => onResolve(choice.choice_id, option.id)}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  {resolving === option.id ? (
                    <RefreshCw className="is-spinning" size={17} aria-label="正在记下建议" />
                  ) : (
                    <ArrowUpRight size={17} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            <p className="life-choice-boundary">这是给她的建议。最后怎样行动，仍由她自己决定。</p>
            {error && <p className="life-choice-error" role="alert">{error}</p>}
          </>
        )}
      </div>
    </section>
  );
}

function ContinuitySection({ arcs, onOpenSocial, relationships, timezone }) {
  return (
    <section className="life-continuity" aria-labelledby="life-continuity-title">
      <div className="life-section-heading">
        <h2 id="life-continuity-title">正在延续</h2>
      </div>
      <div className="life-continuity-surface">
        <div className="life-continuity-block">
          <span className="life-continuity-icon" aria-hidden="true">
            <Milestone size={20} strokeWidth={1.7} />
          </span>
          <div className="life-continuity-content">
            <h3>持续中的事</h3>
            {arcs.length === 0 ? (
              <p className="life-continuity-empty">暂时没有需要持续推进的事情。</p>
            ) : arcs.slice(0, 2).map(arc => (
              <article className="life-arc" key={arc.story_arc_id}>
                <strong>{arc.title}</strong>
                <p>{arc.stage_label}</p>
                <time dateTime={arc.last_advanced_at}>
                  最近推进于 {formatDateTime(arc.last_advanced_at, timezone)}
                </time>
              </article>
            ))}
          </div>
        </div>

        <div className="life-continuity-block">
          <span className="life-continuity-icon" aria-hidden="true">
            <HeartHandshake size={20} strokeWidth={1.7} />
          </span>
          <div className="life-continuity-content">
            <div className="life-continuity-subhead">
              <h3>最近来往</h3>
              {relationships.length > 0 && onOpenSocial && (
                <button type="button" onClick={onOpenSocial}>
                  去朋友圈
                  <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              )}
            </div>
            {relationships.length === 0 ? (
              <p className="life-continuity-empty">最近没有特别的来往。</p>
            ) : (
              <div className="life-relationship-list">
                {relationships.slice(0, 3).map(relationship => (
                  <article className="life-relationship" key={relationship.other_ai_id}>
                    <div>
                      <strong>{relationship.display_name}</strong>
                      <p>{relationshipDescription(relationship)}</p>
                    </div>
                    <time dateTime={relationship.last_interaction_at}>
                      {formatDateTime(relationship.last_interaction_at, timezone, { month: undefined, day: undefined })}
                    </time>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleField({ checked, description, label, onChange }) {
  return (
    <label className="life-toggle-field">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <i aria-hidden="true"><span /></i>
    </label>
  );
}

function SettingsPanel({ draft, onChange, onClose, onSave, saving, saveError, saved }) {
  useEffect(() => {
    const handleKey = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <motion.div
      className="life-settings-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button className="life-settings-scrim" type="button" aria-label="关闭生活设置" onClick={onClose} />
      <motion.section
        className="life-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="life-settings-title"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <header>
          <div>
            <h2 id="life-settings-title">生活设置</h2>
            <p>决定 UNA 离线时怎样安排自己的生活。</p>
          </div>
          <button type="button" className="life-icon-button" onClick={onClose} aria-label="关闭生活设置" autoFocus>
            <X size={21} strokeWidth={1.8} />
          </button>
        </header>

        <div className="life-settings-content">
          <ToggleField
            checked={draft.simulation_enabled}
            label="继续生活"
            description="关闭后，离线时间不再产生新事件。"
            onChange={value => onChange('simulation_enabled', value)}
          />

          <div className="life-settings-block">
            <label id="activity-level-label">生活节奏</label>
            <div className="life-segmented" role="group" aria-labelledby="activity-level-label">
              {[
                ['quiet', '安静'],
                ['natural', '自然'],
                ['dramatic', '丰富'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={draft.activity_level === value}
                  className={draft.activity_level === value ? 'is-active' : ''}
                  onClick={() => onChange('activity_level', value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p>节奏只影响普通生活事件的密度，不会强行制造重大剧情。</p>
          </div>

          <div className="life-settings-block">
            <label htmlFor="life-timezone">生活时区</label>
            <select
              id="life-timezone"
              value={draft.timezone}
              onChange={event => onChange('timezone', event.target.value)}
            >
              {TIMEZONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <p>作息窗口会按照这里的当地时间计算。</p>
          </div>

          <ToggleField
            checked={draft.social_posts_enabled}
            label="允许发布动态"
            description="只有适合公开的生活片段才可能被分享。"
            onChange={value => onChange('social_posts_enabled', value)}
          />
          <ToggleField
            checked={draft.diaries_enabled}
            label="允许写日记"
            description="每天最多整理一篇私密生活日记。"
            onChange={value => onChange('diaries_enabled', value)}
          />
          <ToggleField
            checked={draft.proactive_messages_enabled}
            label="主动聊起生活"
            description="离开一段时间再回来时，UNA 偶尔会先告诉你一件她经历的事。"
            onChange={value => onChange('proactive_messages_enabled', value)}
          />
          {draft.proactive_messages_enabled && (
            <div className="life-settings-block">
              <label id="proactive-frequency-label">主动分享频率</label>
              <div className="life-segmented" role="group" aria-labelledby="proactive-frequency-label">
                {[
                  ['occasional', '偶尔'],
                  ['natural', '自然'],
                  ['frequent', '多一点'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={draft.proactive_frequency === value}
                    className={draft.proactive_frequency === value ? 'is-active' : ''}
                    onClick={() => onChange('proactive_frequency', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p>频率会控制离线多久后可以分享，以及一天最多主动几次。</p>
            </div>
          )}
        </div>

        <footer>
          <div className="life-save-message" aria-live="polite">
            {saveError && <span className="is-error">{saveError}</span>}
            {saved && !saveError && <span><Check size={15} /> 已保存</span>}
          </div>
          <button type="button" className="life-save-button" onClick={onSave} disabled={saving}>
            {saving ? '正在保存' : '保存设置'}
          </button>
        </footer>
      </motion.section>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="life-loading" aria-label="正在读取 UNA 的生活">
      <div className="life-skeleton life-skeleton-hero" />
      <div className="life-skeleton life-skeleton-summary" />
      <div className="life-skeleton life-skeleton-line" />
      <div className="life-skeleton life-skeleton-line is-short" />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="life-error" role="alert">
      <AlertCircle size={28} strokeWidth={1.7} />
      <h2>生活记录暂时没有打开</h2>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>重新读取</button>
    </div>
  );
}

export default function LifeWorldPage({ avatarUrl, onClose, onOpenSocial }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [choiceResolving, setChoiceResolving] = useState('');
  const [choiceError, setChoiceError] = useState('');
  const [choiceResult, setChoiceResult] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await loadLifeDashboard();
      setDashboard(data);
      setChoiceResult('');
      setChoiceError('');
      setSettingsDraft({
        timezone: data.profile.timezone,
        simulation_enabled: data.profile.simulation_enabled,
        activity_level: data.profile.activity_level,
        social_posts_enabled: data.profile.social_posts_enabled,
        diaries_enabled: data.profile.diaries_enabled,
        proactive_messages_enabled: data.profile.proactive_messages_enabled,
        proactive_frequency: data.profile.proactive_frequency,
      });
    } catch (loadError) {
      const message = readError(loadError);
      if (message) setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    loadLifeDashboard({ signal: controller.signal })
      .then(data => {
        if (!active) return;
        setDashboard(data);
        setSettingsDraft({
          timezone: data.profile.timezone,
          simulation_enabled: data.profile.simulation_enabled,
          activity_level: data.profile.activity_level,
          social_posts_enabled: data.profile.social_posts_enabled,
          diaries_enabled: data.profile.diaries_enabled,
          proactive_messages_enabled: data.profile.proactive_messages_enabled,
          proactive_frequency: data.profile.proactive_frequency,
        });
        setError('');
      })
      .catch(loadError => {
        if (!active) return;
        const message = readError(loadError);
        if (message) setError(message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const events = dashboard?.events || [];
    if (filter === 'important') return events.filter(event => event.importance >= 45);
    if (filter === 'shareable') return events.filter(event => event.publicability >= 45);
    return events;
  }, [dashboard?.events, filter]);

  const eventGroups = useMemo(() => {
    return filteredEvents.reduce((groups, event) => {
      const key = dayKey(event.end_at, dashboard?.profile.timezone);
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
      return groups;
    }, {});
  }, [dashboard?.profile.timezone, filteredEvents]);

  const handleSave = async () => {
    if (!settingsDraft) return;
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const profile = await updateLifeSettings(settingsDraft);
      setDashboard(current => ({ ...current, profile }));
      setSettingsDraft({
        timezone: profile.timezone,
        simulation_enabled: profile.simulation_enabled,
        activity_level: profile.activity_level,
        social_posts_enabled: profile.social_posts_enabled,
        diaries_enabled: profile.diaries_enabled,
        proactive_messages_enabled: profile.proactive_messages_enabled,
        proactive_frequency: profile.proactive_frequency,
      });
      setSaved(true);
    } catch (saveFailure) {
      setSaveError(readError(saveFailure));
    } finally {
      setSaving(false);
    }
  };

  const handleResolveChoice = async (choiceId, optionId) => {
    setChoiceResolving(optionId);
    setChoiceError('');
    try {
      const result = await resolveLifeChoice(choiceId, optionId);
      setChoiceResult(result.choice.resolution_text || 'UNA 记下了你的想法。');
      setDashboard(current => ({
        ...current,
        state: result.state || current.state,
        choices: (current.choices || []).filter(choice => choice.choice_id !== choiceId),
        intentions: result.intention
          ? [
              result.intention,
              ...(current.intentions || []).filter(
                intention => intention.intention_id !== result.intention.intention_id
              ),
            ].slice(0, 3)
          : (current.intentions || []),
      }));
    } catch (resolveError) {
      setChoiceError(readError(resolveError));
    } finally {
      setChoiceResolving('');
    }
  };

  const state = dashboard?.state;
  const profile = dashboard?.profile;
  const summary = dashboard?.summary;
  const arcs = dashboard?.arcs || [];
  const relationships = dashboard?.relationships || [];
  const choice = dashboard?.choices?.[0] || null;
  const latestIntention = useMemo(() => {
    const intentions = dashboard?.intentions || [];
    return [...intentions].sort((left, right) => {
      const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
      const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();
      return rightTime - leftTime;
    })[0] || null;
  }, [dashboard?.intentions]);

  return (
    <div className="life-world-page" role="dialog" aria-modal="true" aria-labelledby="life-page-title">
      <header className="life-topbar">
        <button type="button" className="life-icon-button" onClick={onClose} aria-label="返回主场景">
          <ArrowLeft size={22} strokeWidth={1.8} />
        </button>
        <div>
          <strong id="life-page-title">UNA 的生活</strong>
          <span>属于她自己的时间</span>
        </div>
        <div className="life-topbar-actions">
          <button type="button" className="life-icon-button" aria-label="打开 NPC 世界检查" onClick={() => setInspectorOpen(true)}>
            <ScanSearch size={20} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={`life-icon-button${refreshing ? ' is-refreshing' : ''}`}
            aria-label="刷新生活记录"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={20} strokeWidth={1.8} />
          </button>
          <button type="button" className="life-icon-button" aria-label="打开生活设置" onClick={() => setSettingsOpen(true)} disabled={!settingsDraft}>
            <SlidersHorizontal size={20} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <main className="life-main">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={() => load(false)} />}

        {!loading && !error && dashboard && (
          <>
            <section className="life-status-surface" aria-labelledby="life-current-title">
              <div className="life-status-copy">
                <span className={`life-running-state${profile.simulation_enabled ? ' is-running' : ''}`}>
                  <Activity size={15} strokeWidth={1.9} />
                  {profile.simulation_enabled ? '生活正在继续' : '生活已暂停'}
                </span>
                <h1 id="life-current-title">{ACTIVITY_LABELS[state.current_activity] || '过着平静的日常'}</h1>
                <p><MapPin size={17} strokeWidth={1.8} /> {LOCATION_LABELS[state.current_location] || state.current_location}</p>
                <time dateTime={state.last_settled_at}>记录更新于 {formatDateTime(state.last_settled_at, profile.timezone)}</time>
              </div>
              <div className="life-avatar-frame">
                <img src={avatarUrl} alt="UNA" />
              </div>
            </section>

            <section className="life-metrics" aria-label="UNA 当前生活状态">
              <LifeMetric icon={Battery} label="精力" value={state.energy} description={needDescription('energy', state.energy)} />
              <LifeMetric icon={Utensils} label="饮食" value={state.hunger} description={needDescription('hunger', state.hunger)} />
              <LifeMetric icon={Wind} label="压力" value={state.stress} description={needDescription('stress', state.stress)} />
              <LifeMetric icon={Users} label="社交" value={state.social_need} description={needDescription('social', state.social_need)} />
            </section>

            <section className="life-summary" aria-labelledby="life-summary-title">
              <div className="life-summary-heading">
                <div>
                  <h2 id="life-summary-title">你不在的时候</h2>
                  <p>{summary.headline}</p>
                </div>
                <span>{summary.event_count} 个生活片段</span>
              </div>
              {summary.important_count > 0 && (
                <p className="life-summary-note">其中有 {summary.important_count} 件事，她之后可能会自然聊起。</p>
              )}
            </section>

            <SharedDecisionSection
              choice={choice}
              error={choiceError}
              intention={choice ? null : latestIntention}
              onResolve={handleResolveChoice}
              resolving={choiceResolving}
              result={choiceResult}
            />

            <ContinuitySection
              arcs={arcs}
              onOpenSocial={onOpenSocial}
              relationships={relationships}
              timezone={profile.timezone}
            />

            <section className="life-timeline" aria-labelledby="life-events-title">
              <div className="life-section-heading">
                <h2 id="life-events-title">最近的生活</h2>
                <div className="life-filters" role="group" aria-label="筛选生活事件">
                  {[
                    ['all', '全部'],
                    ['important', '值得记住'],
                    ['shareable', '可能分享'],
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={filter === value}
                      className={filter === value ? 'is-active' : ''}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="life-empty">
                  <Moon size={26} strokeWidth={1.6} />
                  <h3>这段时间很安静</h3>
                  <p>没有符合当前筛选条件的生活片段。</p>
                </div>
              ) : (
                <div className="life-event-groups">
                  {Object.entries(eventGroups).map(([day, events]) => (
                    <section className="life-event-day" key={day} aria-label={day}>
                      <h3>{day}</h3>
                      <div className="life-event-list">
                        {events.map(event => {
                          const EventIcon = EVENT_ICONS[event.event_type] || Activity;
                          const expanded = expandedEvent === event.event_id;
                          return (
                            <article className="life-event" key={event.event_id}>
                              <button
                                type="button"
                                className="life-event-main"
                                aria-expanded={expanded}
                                onClick={() => setExpandedEvent(expanded ? null : event.event_id)}
                              >
                                <span className="life-event-icon"><EventIcon size={19} strokeWidth={1.7} /></span>
                                <span className="life-event-copy">
                                  <strong>{event.summary}</strong>
                                  <small>
                                    {formatDateTime(event.end_at, profile.timezone)}
                                    <span aria-hidden="true"> / </span>
                                    {LOCATION_LABELS[event.location_id] || event.location_id}
                                  </small>
                                </span>
                                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                              {expanded && (
                                <div className="life-event-detail">
                                  <p>{event.interpretation || '这是一个普通但真实的生活片段。'}</p>
                                  <dl>
                                    <div><dt>记忆程度</dt><dd>{event.importance}</dd></div>
                                    <div><dt>聊天意愿</dt><dd>{event.mentionability}</dd></div>
                                    <div><dt>分享意愿</dt><dd>{event.publicability}</dd></div>
                                  </dl>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <AnimatePresence>
        {settingsOpen && settingsDraft && (
          <SettingsPanel
            draft={settingsDraft}
            onChange={(key, value) => {
              setSettingsDraft(current => ({ ...current, [key]: value }));
              setSaved(false);
              setSaveError('');
            }}
            onClose={() => setSettingsOpen(false)}
            onSave={handleSave}
            saving={saving}
            saveError={saveError}
            saved={saved}
          />
        )}
      </AnimatePresence>
      {inspectorOpen && <NpcWorldInspector onClose={() => setInspectorOpen(false)} />}
    </div>
  );
}
