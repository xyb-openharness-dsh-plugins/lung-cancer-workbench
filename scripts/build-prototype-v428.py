"""Build v4.2.8 from the frozen v4.2.7: add the 36 号 disease primer and the D+N status card.

Additive only — the baseline file is never rewritten, and its sha256 is asserted first.
"""
from pathlib import Path
import hashlib, json, re

root = Path(__file__).resolve().parents[1]
base = root / 'docs/prototype/lung-workbench-v4.2.7.html'
baseline = root / 'docs/reviews/prototype-v4.2.7-baseline.json'
assert hashlib.sha256(base.read_bytes()).hexdigest() == json.loads(baseline.read_text())['sha256'], \
    'v4.2.7 baseline changed; build a new revision instead of rewriting history'

s = base.read_text().replace('v4.2.7', 'v4.2.8')

# ---- 1. 36 号 §2.6 看板状态卡：hero() 改为 statusCard() ----
a = s.index('function hero() {')
b = s.index('function dashboard()', a)
s = s[:a] + s[b:]
s = s.replace('function dashboard() {',
              (root / 'docs/prototype/primer-status-card.js').read_text().replace('</script', '<\\/script')
              + '\nfunction hero() { return statusCard(); }\n\nfunction dashboard() {', 1)

# ---- 2. 顶栏「?」入口：放在版本号 chip 左侧（36 号 §3.2）----
trigger = ('<button class="top-btn dp-trigger" data-primer-open aria-haspopup="dialog" '
           'aria-label="疾病概要：定义、医学资料与指南情况、治疗全景、发展趋势" '
           'title="疾病概要：定义 · 指南 · 治疗全景 · 趋势">?</button>')
# 本仓顶栏由 RC12 的 prototype-host-header 承载，原 .topbar 已 display:none；
# 因此挂到实际可见的 .prototype-host-actions（36 号 §3.2 的「顶栏右侧」语义不变）。
host_actions = '<div class="prototype-host-actions">'
assert host_actions in s, 'prototype host actions not found'
s = s.replace(host_actions, host_actions + trigger, 1)

# ---- 3. 样式：primer 结构 + 状态卡 ----
css = ('\n/* ---- 36 号 疾病概要 ---- */\n'
       + (root / 'docs/prototype/primer-tokens.css').read_text()
       + (root / 'docs/prototype/primer.css').read_text()
       + '\n/* ---- 36 号 §2.6 状态卡 ---- */\n'
       + (root / 'docs/prototype/primer-status-card.css').read_text())
s = s.replace('</style></head>', css + '\n</style></head>', 1)

# ---- 4. 脚本：数据 → 模块 → 状态卡，必须早于主脚本执行 render() ----
def inline(name):
    # 内联时必须打断字面量 </script>，否则 HTML 解析器会提前结束脚本块。
    return (root / 'docs/prototype' / name).read_text().replace('</script', '<\\/script')

scripts = ('<script>\n' + inline('primer-data.js') + '\n</script>\n'
           + '<script>\n' + inline('primer.js') + '\n</script>\n')
assert s.count('<script>') == 1
s = s.replace("<script>\n'use strict';", scripts + "<script>\n'use strict';", 1)

out = root / 'docs/prototype/lung-workbench-v4.2.8.html'
out.write_text(s)
print(f'Built {out.relative_to(root)}; frozen v4.2.7 unchanged.')
