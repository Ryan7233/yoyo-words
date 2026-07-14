// 语音选择与自然语速规则。保持纯函数，便于在没有浏览器语音 API 时测试。

export const SPEEDS = [
  { id: 'slow', label: '🐢 慢读', rate: 0.6 },
  { id: 'mid', label: '🐇 自然', rate: 0.8 },
  { id: 'fast', label: '⚡ 快读', rate: 1.0 },
];

function normLang(lang) {
  return String(lang || '').replace('_', '-').toLowerCase();
}

// 不直接把浏览器 rate 拉到 0.6；过度拉伸会破坏连读和重音。
// 保留原存档值作为“档位”，再映射到更自然的实际朗读速度。
export function naturalRate(savedRate, lang = 'en-GB', text = '') {
  const rate = Number.isFinite(savedRate) ? savedRate : 0.8;
  let out = rate <= 0.7 ? 0.78 : rate <= 0.9 ? 0.92 : 1.02;
  const normalizedLang = normLang(lang);
  if (normalizedLang.startsWith('zh')) out = Math.min(out + 0.06, 1.08);
  if (normalizedLang.startsWith('en')) {
    const words = String(text).trim().split(/\s+/).filter(Boolean).length;
    if (words > 0 && words <= 2) out -= 0.04;
  }
  return Math.round(out * 100) / 100;
}

export function voiceScore(voice, wantedLang = 'en-GB') {
  if (!voice || typeof voice !== 'object') return -Infinity;
  const lang = normLang(voice.lang);
  const wanted = normLang(wantedLang);
  const base = wanted.split('-')[0];
  if (!lang || lang.split('-')[0] !== base) return -Infinity;

  let score = lang === wanted ? 120 : 35;
  const name = String(voice.name || '').toLowerCase();
  if (/premium|enhanced|siri|natural|neural/.test(name)) score += 45;
  if (/martha|arthur|serena|daniel|kate|oliver/.test(name)) score += 18;
  if (voice.localService) score += 4;
  if (voice.default) score += 2;
  return score;
}

export function selectVoice(voices, lang = 'en-GB', preferredURI = 'auto') {
  const list = Array.isArray(voices) ? voices : [];
  if (preferredURI && preferredURI !== 'auto') {
    const preferred = list.find((voice) => voice.voiceURI === preferredURI);
    if (preferred && voiceScore(preferred, lang) > -Infinity) return preferred;
  }
  return list
    .filter((voice) => voiceScore(voice, lang) > -Infinity)
    .sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang)
      || String(a.name).localeCompare(String(b.name)))[0] || null;
}

export function englishVoices(voices) {
  const list = Array.isArray(voices) ? voices : [];
  const novelty = /bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox/;
  const usable = list
    .filter((voice) => normLang(voice.lang).startsWith('en-'))
    .filter((voice) => !novelty.test(String(voice.name || '').toLowerCase()));
  const british = usable.filter((voice) => normLang(voice.lang) === 'en-gb');
  return (british.length ? british : usable)
    .sort((a, b) => voiceScore(b, 'en-GB') - voiceScore(a, 'en-GB')
      || String(a.name).localeCompare(String(b.name)));
}
