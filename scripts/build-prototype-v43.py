#!/usr/bin/env python3
"""从冻结基线 v4.2.8 生成 v4.3.0 原型（只替换临床试验模块 + 追加样式 + 升版本串）。

设计约束（踩过的坑）：
- 不用 s[:a]+s[b:] 之外的大范围切片；每一处替换都先断言唯一命中，再断言基线签名仍在。
- 基线里 hero 区间含约 296KB base64 水印；这里核对 data:image 数量与总字节数变化，防止连带删除。
"""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent.parent
base = root / 'docs/prototype/lung-workbench-v4.2.8.html'
out = root / 'docs/prototype/lung-workbench-v4.3.0.html'
js_block = Path('/tmp/trials-v43.js').read_text(encoding='utf-8')
css_block = Path('/tmp/trials-v43.css').read_text(encoding='utf-8')

s = base.read_text(encoding='utf-8')
orig_len = len(s)
orig_img = s.count('data:image')


def replace_once(haystack, needle, value, label):
    n = haystack.count(needle)
    if n != 1:
        sys.exit(f'[FAIL] {label}: 期望命中 1 次，实际 {n} 次')
    return haystack.replace(needle, value, 1)


# ---- 1. 子页：临床试验从「单页」变「匹配 / 检索 / 收藏与跟踪」----
s = replace_once(
    s,
    "  saved: ['我的收藏', '已保留结果', '问题清单', '报告与任务']\n};",
    "  saved: ['我的收藏', '已保留结果', '问题清单', '报告与任务'],\n  trials: ['匹配', '检索', '收藏与跟踪']\n};",
    'SUBPAGES.trials',
)

# ---- 2. state.trial 增加 track / prefs ----
s = replace_once(
    s,
    "    ran: false, results: null, saved: []\n  },",
    "    ran: false, results: null, saved: [],\n    /* 收藏跟踪：track[id] = { savedOn, state: watching|asking|archived } */\n    track: {},\n    /* 偏好：只影响排序与冲突提示，不参与符合度计算 */\n    prefs: { region: 'all' }\n  },",
    'state.trial.track/prefs',
)

# ---- 3. 替换 trialRow + trialsPage（从 trialRow 到 trialDetail 之前）----
start = s.find('function trialRow(r, saved) {')
end = s.find('function trialDetail(id) {')
if start < 0 or end < 0 or end <= start:
    sys.exit('[FAIL] trialRow / trialDetail 边界没找到')
old_block = s[start:end]
assert 'function trialsPage()' in old_block, '[FAIL] 待替换块里没有 trialsPage'
s = s[:start] + js_block.rstrip() + '\n\n' + s[end:]

# ---- 4. 删掉旧的 trialDetail（新版用右侧浮窗 openTrialSheet）----
start = s.find('function trialDetail(id) {')
end = s.find('/* ============================================================\n   15. 设置窗口')
if start < 0 or end < 0 or end <= start:
    sys.exit('[FAIL] trialDetail 边界没找到')
assert 'modal(' in s[start:end], '[FAIL] 待删除的 trialDetail 内容异常'
s = s[:start] + s[end:]

# ---- 5. 追加样式（放在主样式表末尾：文档里共有 3 个 </style>，只动最后一个）----
last = s.rfind('</style>')
if last < 0 or s.find('</head>', last) < 0:
    sys.exit('[FAIL] 主样式表结尾没找到')
s = s[:last] + css_block + s[last:]

# ---- 6. 动作分发：新增浮窗 / 跟踪状态 / 偏好 ----
old_cases = """    case 'trial-detail': trialDetail(el.dataset.id); return;
    case 'trial-save': {
      const id = el.dataset.id;
      const i = state.trial.saved.indexOf(id);
      if (i >= 0) state.trial.saved.splice(i, 1); else state.trial.saved.push(id);
      renderMain();
      if ($('#dialog').open) closeModal();
      toast(i >= 0 ? '已取消收藏' : '已收藏（仅本页内存）');
      return;
    }"""
new_cases = """    case 'trial-detail': openTrialSheet(el.dataset.id); return;
    case 'sheet-close': closeTrialSheet(); return;
    case 'trial-save': {
      const saved = trialToggleSave(el.dataset.id);
      renderMain();
      if ($('#trial-sheet.open')) openTrialSheet(el.dataset.id);
      toast(saved ? '已收藏到跟踪（仅本页内存）' : '已取消收藏');
      return;
    }
    case 'trial-track': {
      const id = el.dataset.id;
      state.trial.track[id] = { savedOn: (state.trial.track[id] || {}).savedOn || today, state: el.dataset.state };
      renderMain();
      toast(`已标为「${TRIAL_TRACK_LABEL[el.dataset.state] || el.dataset.state}」`);
      return;
    }
    case 'trial-pref': {
      state.trial.prefs[el.dataset.key] = el.dataset.value;
      renderMain();
      return;
    }
    case 'trial-ask': trialAsk(el.dataset.id); return;"""
s = replace_once(s, old_cases, new_cases, 'switch cases')

# 清空条件时也重置偏好，避免「看不见的筛选残留」
s = replace_once(
    s,
    """      state.trial.sort = 'start'; state.trial.ran = false;
      render();""",
    """      state.trial.sort = 'start'; state.trial.ran = false;
      state.trial.prefs = { region: 'all' };
      render();""",
    'trial-reset prefs',
)

# ---- 7. 版本串 ----
version_hits = [
    ('<title>小肺宝 · 肺癌患者与照护者工作台原型 v4.2.8</title>', '<title>小肺宝 · 肺癌患者与照护者工作台原型 v4.3.0</title>'),
    ('<b>小肺宝 · 交互原型 v4.2.8</b>', '<b>小肺宝 · 交互原型 v4.3.0</b>'),
    ('<span class="prototype-host-version">v4.2.8</span>', '<span class="prototype-host-version">v4.3.0</span>'),
    ('data-action="about">v4.2.8</button>', 'data-action="about">v4.3.0</button>'),
    ('<span>工作台原型 v4.2.8 · 构建 2026-10-20 · 模拟数据，不用于诊疗</span>', '<span>工作台原型 v4.3.0 · 构建 2026-10-27 · 模拟数据，不用于诊疗</span>'),
    ("""<b class="num">v4.2.8</b></div>""", """<b class="num">v4.3.0</b></div>"""),
    ("""<div><b>v4.2.8</b><p class="small muted">构建 2026-10-20""", """<div><b>v4.3.0</b><p class="small muted">构建 2026-10-27"""),
]
for old, new in version_hits:
    s = replace_once(s, old, new, f'version: {old[:40]}')

# ---- 8. 断言 ----
checks = {
    'PRIMER_DATA 仍在': s.count('DISEASE_PRIMER') > 0,
    '疾病概要入口仍在': s.count('data-primer-open') >= 1,
    '状态卡仍在': s.count('stage-card') >= 1 or s.count('statusCard') >= 1,
    'base64 水印未丢': s.count('data:image') == orig_img,
    '旧 trialDetail 已无': 'function trialDetail' not in s,
    '旧 trialRow 已无': 'function trialRow' not in s,
    '新浮窗在': 'function openTrialSheet' in s,
    '新匹配在': 'function scoreTrial' in s,
}
bad = [k for k, v in checks.items() if not v]
if bad:
    sys.exit('[FAIL] ' + ' / '.join(bad))

out.write_text(s, encoding='utf-8')
print(f'ok {out.name}: {orig_len} → {len(s)} 字节（{len(s) - orig_len:+d}），data:image {orig_img} 段不变')
