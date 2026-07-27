const GESTURES = [
  ['nod', /(?:上下)?点头/],
  ['shake', /摇头/],
  ['look_up', /抬头|向上看/],
  ['look_down', /低头|向下看/],
  ['look_left', /向左看|看左边/],
  ['look_right', /向右看|看右边/],
  ['tilt_left', /向左歪头|头往左歪/],
  ['tilt_right', /向右歪头|头往右歪/],
  ['lean_forward', /身体前倾|靠近(?:我)?/],
  ['lean_back', /身体后退|往后退/],
  ['lean_left', /身体向左倾/],
  ['lean_right', /身体向右倾/],
  ['blink', /眨眼/],
  ['close_eyes', /闭眼|闭上眼睛/],
];

const NEGATION = /不|别|勿|禁止|停止|无需/;
const CHINESE_DIGITS = Object.freeze({
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
});

function countFromText(value) {
  if (/^\d+$/.test(value)) return Math.max(1, Math.min(5, Number(value)));
  if (value === '十') return 5;

  const tenIndex = value.indexOf('十');
  if (tenIndex >= 0) {
    const tens = tenIndex === 0 ? 1 : (CHINESE_DIGITS[value[tenIndex - 1]] ?? 0);
    const ones = CHINESE_DIGITS[value.at(-1)] ?? 0;
    return Math.max(1, Math.min(5, (tens * 10) + (tenIndex === value.length - 1 ? 0 : ones)));
  }
  return Math.max(1, Math.min(5, CHINESE_DIGITS[value] ?? 1));
}

function parseSingleGesture(segment) {
  const matches = GESTURES.flatMap(([kind, pattern]) => {
    const match = pattern.exec(segment);
    return match ? [{ kind, match }] : [];
  });
  if (matches.length !== 1) return null;

  const [{ kind, match }] = matches;
  const after = segment.slice(match.index + match[0].length);
  const countMatch = after.match(/^\s*(\d+|[一二两三四五六七八九十]+)(?:次|下|遍)/);
  const before = segment.slice(Math.max(0, match.index - 4), match.index);
  const gesture = {
    kind,
    count: countMatch ? countFromText(countMatch[1]) : 1,
  };
  if (/(慢慢|缓慢|慢一点|慢些)/.test(before)) gesture.speed = 'slow';
  if (/(快速|迅速|快一点|快些)/.test(before)) gesture.speed = 'fast';
  return gesture;
}

function parseParallelGroup(segment) {
  const pieces = segment.split(/并|同时|和/).map(piece => piece.trim()).filter(Boolean);
  if (pieces.length > 1) {
    const gestures = pieces.map(parseSingleGesture);
    if (gestures.every(Boolean)) return { gestures };
  }

  const gesture = parseSingleGesture(segment);
  return gesture ? { gestures: [gesture] } : null;
}

function parseSequentialGroups(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('先')) return null;

  const againIndex = trimmed.indexOf('再');
  if (againIndex <= 1 || againIndex === trimmed.length - 1) return null;

  const before = trimmed.slice(1, againIndex).replace(/[，,。；;\s]+$/, '');
  const after = trimmed.slice(againIndex + 1).replace(/^[，,。；;\s]+/, '');
  const groups = [parseParallelGroup(before), parseParallelGroup(after)];
  return groups.every(Boolean) ? groups : null;
}

export function parseImmediateGesture(text) {
  if (typeof text !== 'string' || !text.trim() || NEGATION.test(text)) return null;

  const groups = parseSequentialGroups(text) ?? [parseParallelGroup(text)];
  return groups.every(Boolean) ? { groups } : null;
}
