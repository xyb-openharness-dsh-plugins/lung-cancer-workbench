# -*- coding: utf-8 -*-
"""生成 lib/demo-cases.json：两套连续 6 个月的合成肺癌病程档案。

全部数据为虚构演示数据：不对应任何真实患者、机构或报告编号。
时间窗 2026-04-20 → 2026-10-20（连续 6 个月），按月/按周连续，不是孤立时间点。
数值参考区间采用中国实验室常用区间（WS/T 405、WS/T 404 系列）。

生成后由 scripts/embed-client-logo.mjs 内嵌进单文件客户端。
用法：python3 scripts/build-demo-cases.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'lib' / 'demo-cases.json'
NOTE_DEMO = '仅为 UI 演示而生成的虚构资料'
LAB = '本院检验科'


def rec(rid, kind, date, source_kind, document, data, review='accepted', excerpt=None, reference=NOTE_DEMO):
    return {
        'id': rid, 'kind': kind, 'subjectId': None,
        'date': {'precision': 'day', 'value': date},
        'source': {'kind': source_kind, 'documentId': document, 'excerpt': excerpt, 'reference': reference},
        'data': data,
        'review': {'state': review, 'revision': 1},
        'createdBy': None,
        'createdAt': date + 'T09:00:00.000Z',
    }


def metric(rid, date, name, value, unit, ref, flag='', method=None, lab=LAB, doc=None, review='accepted'):
    if method is None:
        method = '电化学发光法' if name in ('CEA', 'CYFRA21-1', 'NSE', 'ProGRP') else '全自动血细胞分析'
        if name in ('ALT', 'AST', '白蛋白', '肌酐'):
            method = '全自动生化分析'
        if name == '体重':
            method = '同一台电子体重秤'
            lab = '家中自测'
    return rec(rid, 'metric', date, 'report', doc or f'{name} 检验 {date}',
               {'metricName': name, 'rawValue': str(value), 'unit': unit, 'methodText': method,
                'laboratoryText': lab, 'refRangeText': ref, 'flagText': flag,
                'detailText': f'{name} {value} {unit}（参考区间 {ref}）'}, review)


def symptom(rid, date, term, words, impact='', onset='', domain=None, by='患者本人', review='accepted'):
    data = {'termText': term, 'patientWords': words, 'impactText': impact, 'onsetText': onset,
            'detailText': words, 'ownerText': by}
    if domain:
        data['domain'] = domain
    return rec(rid, 'symptom', date, 'patient_reported' if by == '患者本人' else 'caregiver_reported',
               '患者自述 · 症状记录', data, review, excerpt=words,
               reference='患者或照护者自述，未与报告核对')


# ============================================================
# 病例 A：晚期 EGFR 突变肺腺癌（女性），一线奥希替尼，连续 6 个月
# cT2aN2M1c IVB 期；胸膜 + 骨多发转移
# ============================================================
def case_a():
    rid = 0

    def n():
        nonlocal rid
        rid += 1
        return f'a{rid:03d}'

    R, add = [], None
    add = R.append

    # ---------- 4 月：发现与分期 ----------
    add(symptom(n(), '2026-04-20', '咳嗽', '干咳有两个多月了，夜里躺下更明显，有时候要坐起来缓一缓。',
                impact='影响入睡', onset='2026-02 中旬'))
    add(rec(n(), 'imaging', '2026-04-22', 'report', '胸部 CT 平扫+增强 2026-04-22',
            {'titleText': '胸部 CT 平扫 + 增强', 'comparisonText': '无既往同部位影像可比较',
             'reportText': '右肺下叶软组织密度肿块约 38×31 mm，边界分叶，邻近胸膜牵拉；右侧胸腔中量积液；右肺门及气管隆突下淋巴结增大，短径约 15 mm。',
             'detailText': '右肺下叶肿块 38×31 mm；右侧胸腔中量积液；纵隔淋巴结短径 15 mm'}))
    add(symptom(n(), '2026-04-23', '活动后气促', '走到二楼要停下来喘一会儿，以前一口气能上五楼。', impact='爬 2 层楼需停一次'))
    add(rec(n(), 'imaging', '2026-04-28', 'report', 'PET-CT 报告 2026-04-28',
            {'titleText': 'PET-CT 全身显像',
             'reportText': '右肺下叶肿块 SUVmax 12.6；右侧胸膜多发结节样摄取增高；右侧髂骨及第 3 腰椎局部摄取增高，SUVmax 分别 7.8、6.4；余部位未见异常摄取。',
             'detailText': '右肺下叶 SUVmax 12.6；右侧胸膜摄取增高；右侧髂骨与第 3 腰椎摄取增高'}))
    add(rec(n(), 'imaging', '2026-04-30', 'report', '头颅 MRI 增强 2026-04-30',
            {'titleText': '头颅 MRI 增强', 'reportText': '脑实质内未见异常强化灶，脑膜未见增厚强化。',
             'detailText': '脑部未见转移征象（报告原文）'}))

    # ---------- 5 月：取材 → 病理 → 分子 → 分期 → 治疗开始 ----------
    add(rec(n(), 'specimen', '2026-05-06', 'pathology', 'CT 引导经皮肺穿刺记录 2026-05-06',
            {'specimenId': 'SP-A-260506', 'collectionMethodText': 'CT 引导经皮肺穿刺', 'anatomicSiteText': '右肺下叶肿块',
             'materialType': '组织', 'titleText': 'CT 引导经皮肺穿刺（右肺下叶）',
             'detailText': '取出组织 2 条，长度分别约 12 mm、9 mm；一条送病理，一条留作分子检测'}))
    add(rec(n(), 'pathology', '2026-05-08', 'pathology', '病理报告 BL-A-260508',
            {'histologyText': '浸润性腺癌（腺泡型为主，伴约 10% 微乳头成分）', 'titleText': '肺穿刺病理报告',
             'originalText': '右肺下叶穿刺组织：浸润性腺癌，腺泡型为主，伴约 10% 微乳头成分。免疫组化：TTF-1（+）、Napsin A（+）、p40（-）、Ki-67 约 35%。',
             'reportText': '浸润性腺癌，腺泡型为主；TTF-1（+）、Napsin A（+）、p40（-）'}))
    add(rec(n(), 'pleural_procedure', '2026-05-11', 'clinician_document', '胸腔穿刺记录 2026-05-11',
            {'eventTypeText': '诊断性胸腔穿刺', 'sideText': '右侧', 'procedureTypeText': '诊断性穿刺',
             'volumeText': '650 mL', 'fluidText': '淡血性、微浑', 'status': 'completed',
             'titleText': '胸腔穿刺（右侧 · 诊断性）',
             'detailText': '右侧诊断性穿刺，引出淡血性微浑液体 650 mL（首次抽液不超过 700 mL），送细胞学及生化'}))
    add(rec(n(), 'pathology', '2026-05-13', 'pathology', '胸水细胞学报告 CY-A-260513',
            {'histologyText': '胸水细胞学：查见腺癌细胞', 'titleText': '胸水细胞学报告',
             'originalText': '涂片及细胞块中查见异型腺样细胞，形态与肺原发腺癌一致。',
             'reportText': '胸水细胞学阳性（查见腺癌细胞）'}))
    add(rec(n(), 'molecular_test', '2026-05-15', 'report', 'NGS 检测报告 NG-A-260515',
            {'testTypeText': '组织 NGS · 12 基因 panel', 'status': 'completed', 'specimenId': 'SP-A-260506',
             'methodText': 'NGS（杂交捕获，平均深度 ≥1000×）',
             'scopeText': 'EGFR/ALK/ROS1/RET/MET/KRAS/BRAF/HER2/PIK3CA/TP53/RB1/PTEN',
             'limitationText': '未做融合基因的 RNA 层面验证；拷贝数变异灵敏度有限',
             'resultText': 'EGFR exon21 L858R 错义突变，丰度 41.2%；TP53 exon5 突变，丰度 38.7%；ALK/ROS1/RET 融合未检出；MET 扩增未检出；KRAS、BRAF、HER2 未检出'}))
    add(rec(n(), 'biomarker', '2026-05-15', 'report', 'PD-L1 免疫组化报告 IHC-A-260515',
            {'titleText': 'PD-L1 表达（22C3）', 'markerText': 'PD-L1', 'resultText': 'TPS 60%',
             'methodText': 'IHC · 22C3 pharmDx', 'status': 'needs_review', 'evidenceState': 'reported',
             'detailText': 'PD-L1 TPS 60%（22C3）；抗体克隆与切片日期待与报告原件核对'}))
    add(rec(n(), 'diagnosis', '2026-05-18', 'clinician_document', '门诊病历 2026-05-18',
            {'clinicalType': 'nsclc', 'titleText': '右肺下叶浸润性腺癌',
             'detailText': '右肺下叶浸润性腺癌，伴胸膜及骨多发转移'}))
    add(rec(n(), 'staging', '2026-05-18', 'clinician_document', '分期记录 2026-05-18',
            {'stageText': 'cT2aN2M1c · IVB 期', 'systemText': 'AJCC 第 8 版', 'prefixText': 'c（临床）',
             'tnmText': 'cT2a N2 M1c', 'detailText': 'cT2aN2M1c，IVB 期（AJCC 第 8 版）；骨多发为 M1c；胸膜受累另行记录，不以后者覆盖前者'}))
    add(rec(n(), 'lesion', '2026-05-20', 'report', 'PET-CT 2026-04-28 + 骨窗 CT',
            {'siteText': '骨（右侧髂骨、第 3 腰椎）', 'status': 'reported', 'evidenceState': 'reported',
             'findingText': 'PET-CT 摄取增高（SUVmax 7.8 / 6.4），CT 骨窗见溶骨性破坏',
             'basisText': '2026-04-28 PET-CT', 'detailText': '骨多发转移：右侧髂骨、第 3 腰椎'}))
    add(rec(n(), 'lesion', '2026-05-20', 'report', '胸水细胞学 CY-A-260513',
            {'siteText': '胸膜 / 胸腔积液', 'status': 'team_confirmed', 'evidenceState': 'team_confirmed',
             'findingText': '右侧胸腔积液，细胞学查见腺癌细胞', 'basisText': '2026-05-13 胸水细胞学',
             'detailText': '右侧恶性胸腔积液（细胞学阳性）'}))
    add(rec(n(), 'care_task', '2026-05-21', 'clinician_document', 'MDT 讨论记录 2026-05-21',
            {'titleText': '多学科讨论结论', 'topicText': '一线治疗选择', 'domain': 'decision',
             'detailText': '记录为团队意见原文：一线选择 EGFR-TKI；骨转移灶建议同期局部姑息放疗并加用骨改良药物。此处不记录具体商品名与个人剂量建议。'}))
    add(rec(n(), 'systemic_therapy', '2026-05-22', 'clinician_document', '用药记录 2026-05-22',
            {'eventTypeText': '奥希替尼 80 mg 口服 每日一次', 'status': 'administered_or_performed',
             'planText': '医嘱：80 mg 口服 每日一次', 'actualText': '患者自述基本按时服用，偶有漏服',
             'titleText': '奥希替尼 80 mg qd', 'detailText': '第三代 EGFR-TKI；开始日期 2026-05-22'}))
    add(rec(n(), 'systemic_therapy', '2026-05-25', 'clinician_document', '骨改良药物记录 2026-05-25',
            {'eventTypeText': '地舒单抗 120 mg 皮下注射 每 4 周', 'status': 'administered_or_performed',
             'planText': '每 4 周一次', 'actualText': '第 1 次已完成',
             'detailText': '骨改良药物，用于骨转移相关骨事件预防；用药期间补钙与维生素 D'}))
    # 基线实验室（治疗开始后第 6 天）
    for name, val, unit, ref, flag in [('CEA', 28.6, 'ng/mL', '0–5.0', '↑'), ('CYFRA21-1', 9.8, 'ng/mL', '0–3.3', '↑'),
                                       ('白细胞', 6.4, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 4.1, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 121, 'g/L', '115–150', ''), ('血小板', 232, '10^9/L', '125–350', ''),
                                       ('ALT', 22, 'U/L', '7–40', ''), ('白蛋白', 36, 'g/L', '40–55', '↓'),
                                       ('肌酐', 68, 'μmol/L', '41–73', '')]:
        add(metric(n(), '2026-05-28', name, val, unit, ref, flag))
    add(metric(n(), '2026-05-28', '体重', 58.2, 'kg', '—'))

    # ---------- 6 月：靶向治疗早期毒性 ----------
    add(symptom(n(), '2026-06-02', '腹泻', '一天要跑两三趟厕所，大便不成形，但不肚子疼。',
                impact='轻微，基本不影响日常', onset='用药后约 10 天'))
    add(symptom(n(), '2026-06-05', '皮疹', '脸上和前胸起了一些小红疙瘩，有点痒，摸着扎手。',
                impact='轻微，基本不影响日常', onset='用药后约 2 周'))
    add(metric(n(), '2026-06-05', 'ALT', 41, 'U/L', '7–40', '↑'))
    add(metric(n(), '2026-06-05', '白细胞', 5.8, '10^9/L', '3.5–9.5', ''))
    add(symptom(n(), '2026-06-19', '皮疹加重', '脸上和前胸疙瘩多了些，晒过太阳更明显，看着心里烦。',
                impact='影响部分日常（自述）', onset='用药后约 4 周'))
    add(symptom(n(), '2026-06-19', '皮肤干燥', '小腿干得起皮，抹了润肤乳能好两天。', impact='轻微，基本不影响日常'))
    for name, val, unit, ref, flag in [('CEA', 15.8, 'ng/mL', '0–5.0', '↑'), ('CYFRA21-1', 6.1, 'ng/mL', '0–3.3', '↑'),
                                       ('ALT', 68, 'U/L', '7–40', '↑'), ('白细胞', 5.4, '10^9/L', '3.5–9.5', ''),
                                       ('中性粒细胞绝对值', 3.4, '10^9/L', '1.8–6.3', '')]:
        add(metric(n(), '2026-06-19', name, val, unit, ref, flag))
    add(symptom(n(), '2026-06-26', '甲周红肿', '两个大拇指边上肿了一块，穿鞋顶着疼，沾水的时候更疼。',
                impact='影响部分日常', onset='用药后约 5 周'))
    add(metric(n(), '2026-06-26', '体重', 57.4, 'kg', '—'))

    # ---------- 7 月：首次疗效评估（6 周，PR）+ 胸腔积液再处理 ----------
    add(rec(n(), 'imaging', '2026-07-03', 'report', '胸部 CT 增强 2026-07-03',
            {'titleText': '胸部 CT 增强（首次疗效评估 · 第 6 周）', 'comparisonText': '与 2026-04-22 胸部 CT 比较',
             'reportText': '右肺下叶肿块约 26×21 mm，径线和较基线缩小约 33%；右侧胸腔积液由中量转为少量；纵隔淋巴结短径约 9 mm。',
             'detailText': '靶病灶径线和较基线缩小约 33%（达 PR 标准）；胸腔积液减少；淋巴结缩小'}))
    for name, val, unit, ref, flag in [('CEA', 10.4, 'ng/mL', '0–5.0', '↑'), ('CYFRA21-1', 4.3, 'ng/mL', '0–3.3', '↑'),
                                       ('白细胞', 5.2, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 3.2, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 118, 'g/L', '115–150', ''), ('血小板', 205, '10^9/L', '125–350', ''),
                                       ('ALT', 54, 'U/L', '7–40', '↑'), ('白蛋白', 39, 'g/L', '40–55', '↓')]:
        add(metric(n(), '2026-07-03', name, val, unit, ref, flag))
    add(symptom(n(), '2026-07-10', '口腔溃疡', '舌头边缘和腮帮子破了两个小口，吃点辣的或者烫的就火辣辣的。',
                impact='影响部分日常', onset='用药后约 7 周'))
    add(rec(n(), 'systemic_therapy', '2026-07-15', 'clinician_document', '骨改良药物记录 2026-07-15',
            {'eventTypeText': '地舒单抗 120 mg 皮下注射', 'status': 'administered_or_performed',
             'planText': '每 4 周一次', 'actualText': '第 2 次', 'detailText': '第 2 次给药，未记录中断'}))
    add(rec(n(), 'pleural_procedure', '2026-07-22', 'clinician_document', '胸腔置管引流记录 2026-07-22',
            {'eventTypeText': '治疗性胸腔置管引流', 'sideText': '右侧', 'procedureTypeText': '置管引流',
             'volumeText': '900 mL（首日）', 'fluidText': '淡血性', 'status': 'administered_or_performed',
             'titleText': '胸腔置管引流（右侧 · 治疗性）',
             'detailText': '气促加重后行右侧猪尾管置管引流，首日引出 900 mL（每日不超过 1000 mL）；未做胸膜固定术'}))
    add(rec(n(), 'pleural_procedure', '2026-07-25', 'clinician_document', '引流管拔除记录 2026-07-25',
            {'eventTypeText': '引流管拔除', 'sideText': '右侧', 'procedureTypeText': '拔管',
             'volumeText': '<200 mL/日', 'fluidText': '淡血性', 'status': 'completed',
             'titleText': '胸腔引流管拔除', 'detailText': '连续 2 日引流量少于 200 mL 后拔管；未记录胸膜固定'}))
    add(symptom(n(), '2026-07-24', '气促缓解', '抽了胸水以后，喘得没那么厉害了，能平躺睡整觉了。',
                impact='较引流前明显好转', onset='引流后当天'))
    for name, val, unit, ref, flag in [('CEA', 7.6, 'ng/mL', '0–5.0', '↑'), ('CYFRA21-1', 3.6, 'ng/mL', '0–3.3', '↑'),
                                       ('白细胞', 4.8, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 2.9, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 115, 'g/L', '115–150', ''), ('血小板', 188, '10^9/L', '125–350', '')]:
        add(metric(n(), '2026-07-31', name, val, unit, ref, flag))
    add(metric(n(), '2026-07-31', '体重', 56.8, 'kg', '—'))

    # ---------- 8 月：骨转移灶姑息放疗 + 第 12 周评估 ----------
    add(rec(n(), 'radiotherapy', '2026-08-05', 'clinician_document', '放疗计划单 RT-A-260805',
            {'siteText': '右侧髂骨转移灶', 'planFractions': '10', 'doneFractions': '0', 'status': 'scheduled',
             'eventTypeText': '骨转移灶姑息放疗 30 Gy / 10 次', 'planText': '30 Gy / 10 次，每周 5 次',
             'actualText': '尚未开始', 'detailText': '计划 30 Gy / 10 次；与全身靶向治疗同期进行'}))
    add(symptom(n(), '2026-08-07', '骨痛', '右边胯骨那块隐隐作痛，晚上翻身时更明显，白天活动开又好些。',
                impact='影响部分日常'))
    add(rec(n(), 'radiotherapy', '2026-08-18', 'clinician_document', '放疗记录 RT-A-260805',
            {'siteText': '右侧髂骨转移灶', 'planFractions': '10', 'doneFractions': '10', 'status': 'completed',
             'eventTypeText': '骨转移灶姑息放疗 30 Gy / 10 次', 'planText': '30 Gy / 10 次',
             'actualText': '已完成 10 次，无暂停记录',
             'detailText': '2026-08-05 至 2026-08-18 完成 10 次；未记录中断原因'}))
    add(rec(n(), 'imaging', '2026-08-13', 'report', '胸部 CT 增强 2026-08-13',
            {'titleText': '胸部 CT 增强（第 12 周评估）', 'comparisonText': '与 2026-07-03 胸部 CT 比较',
             'reportText': '右肺下叶肿块约 24×19 mm，较 2026-07-03 略缩小；右侧胸腔少量积液；未见新发结节。',
             'detailText': '靶病灶较 2026-07-03 略缩小，维持 PR；胸腔积液少量', 'status': 'completed'}))
    for name, val, unit, ref, flag in [('CEA', 5.4, 'ng/mL', '0–5.0', '↑'), ('CYFRA21-1', 2.9, 'ng/mL', '0–3.3', ''),
                                       ('白细胞', 5.5, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 3.4, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 119, 'g/L', '115–150', ''), ('血小板', 196, '10^9/L', '125–350', ''),
                                       ('ALT', 33, 'U/L', '7–40', ''), ('白蛋白', 41, 'g/L', '40–55', '')]:
        add(metric(n(), '2026-08-21', name, val, unit, ref, flag))
    add(metric(n(), '2026-08-21', '体重', 57.6, 'kg', '—'))
    add(symptom(n(), '2026-08-26', '骨痛缓解', '放疗做完后胯骨疼轻了不少，能侧着睡了。', impact='较放疗前好转'))

    # ---------- 9 月：第 18 周评估（维持 PR）+ 咯血 + 营养 / 心理 ----------
    add(symptom(n(), '2026-09-02', '痰中带血丝', '早上咳出来一口痰里有一点血丝，就那一次，后面没有了。',
                impact='仅一次，量少', domain='hemoptysis'))
    add(rec(n(), 'imaging', '2026-09-10', 'report', '胸部 + 上腹部 CT 2026-09-10',
            {'titleText': '胸部 + 上腹部 CT（第 18 周评估）', 'comparisonText': '与 2026-08-13 胸部 CT 比较',
             'reportText': '右肺下叶肿块约 23×19 mm，与 2026-08-13 相仿；右侧胸腔少量积液；骨窗见右侧髂骨溶骨灶周围出现硬化边。',
             'detailText': '靶病灶与 2026-08-13 相仿（未达进展标准）；胸腔积液少量；骨灶出现硬化边'}))
    add(symptom(n(), '2026-09-09', '乏力', '下午特别困，要躺一两个小时才有精神，家务做到一半就想歇着。',
                impact='明显影响日常'))
    add(symptom(n(), '2026-09-16', '食欲下降', '闻到油味就反胃，一碗饭吃半碗就饱了。', impact='影响部分日常'))
    add(rec(n(), 'care_task', '2026-09-18', 'patient_reported', '进食与体重记录 2026-09-18',
            {'titleText': '进食与体重记录', 'topicText': '营养', 'domain': 'nutrition', 'ownerText': '患者本人',
             'intakeText': '比平常少一些', 'weightKg': 57.9, 'difficultyText': '恶心 / 味觉改变',
             'detailText': '最近两周吃得少，主要是闻不了油味；体重 57.9 kg，比 8 月略高一点。',
             'patientWords': '最近两周吃得少，主要是闻不了油味。'}))
    add(metric(n(), '2026-09-18', '体重', 57.9, 'kg', '—'))
    for name, val, unit, ref, flag in [('CEA', 4.4, 'ng/mL', '0–5.0', ''), ('CYFRA21-1', 2.6, 'ng/mL', '0–3.3', ''),
                                       ('白蛋白', 38, 'g/L', '40–55', '↓'), ('ALT', 29, 'U/L', '7–40', ''),
                                       ('QTc', 438, 'ms', '<470', '')]:
        add(metric(n(), '2026-09-23', name, val, unit, ref, flag))
    add(rec(n(), 'care_task', '2026-09-25', 'patient_reported', '私密记录 2026-09-25',
            {'titleText': '心理记录', 'topicText': '心理', 'domain': 'mind', 'ownerText': '患者本人', 'moodText': '害怕',
             'private': True, 'sharingScope': 'private',
             'patientWords': '复查前一天晚上睡不着，一直想报告上会不会出现「进展」两个字。',
             'detailText': '复查前一天晚上睡不着，一直想报告上会不会出现「进展」两个字。'}))
    add(rec(n(), 'care_task', '2026-09-30', 'caregiver_reported', '照护者记录 2026-09-30',
            {'titleText': '照护者自己的记录', 'topicText': '心理', 'domain': 'mind', 'ownerText': '照护者自己',
             'private': True, 'sharingScope': 'private',
             'patientWords': '白天上班晚上陪床，最近容易发火，发完火又觉得对不起她。',
             'detailText': '白天上班晚上陪床，最近容易发火，发完火又觉得对不起她。'}))

    # ---------- 10 月：第 21 周评估 + 复诊准备 ----------
    for name, val, unit, ref, flag in [('CEA', 4.0, 'ng/mL', '0–5.0', ''), ('CYFRA21-1', 2.5, 'ng/mL', '0–3.3', ''),
                                       ('白细胞', 5.9, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 3.6, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 122, 'g/L', '115–150', ''), ('血小板', 214, '10^9/L', '125–350', ''),
                                       ('白蛋白', 40, 'g/L', '40–55', ''), ('肌酐', 66, 'μmol/L', '41–73', '')]:
        add(metric(n(), '2026-10-08', name, val, unit, ref, flag))
    add(symptom(n(), '2026-10-09', '皮疹反复', '脸上又冒出来一点，涂了保湿霜之后好一些，没有停药。',
                impact='轻微，基本不影响日常'))
    add(rec(n(), 'imaging', '2026-10-14', 'report', '胸部 CT 增强 2026-10-14',
            {'titleText': '胸部 CT 增强（第 21 周评估）', 'comparisonText': '与 2026-09-10 胸部 CT 比较',
             'reportText': '右肺下叶肿块约 24×19 mm，与 2026-09-10 相仿；右侧胸腔少量积液，较前相仿；未见新发病灶。',
             'detailText': '靶病灶与 2026-09-10 相仿；未见新发病灶；靶病灶径线和较基线缩小约 35%'}, review='needs_review'))
    add(metric(n(), '2026-10-14', 'CEA', 4.3, 'ng/mL', '0–5.0', ''))
    add(metric(n(), '2026-10-14', 'CYFRA21-1', 2.7, 'ng/mL', '0–3.3', ''))
    add(metric(n(), '2026-10-14', '体重', 58.3, 'kg', '—'))
    for q, src in [('这次 CT 和 9 月那张相比，哪些部位由团队确认稳定？', '2026-10-14 胸部 CT 报告'),
                   ('CEA 从 4.0 到 4.3 算是波动还是趋势？需要提前复查吗？', '2026-10-08 / 2026-10-14 检验报告'),
                   ('皮疹和甲周炎反复，日常护理要注意什么？到什么程度需要联系团队？', '用药自述 2026-06-05 / 2026-10-09'),
                   ('如果将来出现耐药，需要重新取材还是先做血液检测？', '2026-05-15 NGS 报告'),
                   ('右侧胸水处理过两次，后面还会再长吗？有没有其他办法？', '2026-05-11 / 2026-07-22 操作记录')]:
        add(rec(n(), 'visit_question', '2026-10-16', 'patient_reported', '患者整理',
                {'questionText': q, 'sourceText': src, 'selected': True, 'detailText': f'来源：{src}'}))
    add(rec(n(), 'care_task', '2026-10-20', 'clinician_document', '预约记录 2026-10-20',
            {'titleText': '肿瘤内科复诊（已预约）', 'topicText': '就诊安排', 'domain': 'visit',
             'eventTypeText': '门诊复诊', 'status': 'scheduled',
             'detailText': '需携带 2026-10-14 CT 报告、近三次检验单、胸腔操作记录与用药自述'}))
    add(rec(n(), 'imaging', '2026-10-23', 'clinician_document', '预约记录 2026-10-23',
            {'titleText': '胸部 CT 复查（计划）', 'status': 'proposed', 'reportText': '',
             'detailText': '计划复查时间由团队确认；尚未执行'}, review='candidate'))
    # 待核对草稿：治疗中补做的血浆检测
    add(rec(n(), 'molecular_test', '2026-10-14', 'report', '血浆 ctDNA 检测（送检中）',
            {'testTypeText': '血浆 ctDNA · 9 基因', 'status': 'pending', 'methodText': 'NGS（血浆）',
             'scopeText': 'EGFR/TP53/MET/ERBB2/PIK3CA/PTEN/RB1/ALK/RET',
             'limitationText': '血浆检测灵敏度受肿瘤负荷影响；阴性不代表无变异。MET 扩增优先组织活检',
             'resultText': ''}, review='candidate'))
    return R, {
        'id': 'demo-egfr-advanced-6m', 'displayName': '样例档案 A', 'subjectRole': 'patient',
        'demoScenario': '晚期 EGFR 肺腺癌 · 一线靶向治疗 6 个月',
        'demoSummary': '虚构演示：右肺下叶浸润性腺癌 cT2aN2M1c IVB 期，EGFR L858R，一线奥希替尼 80 mg qd；含腹泻/皮疹/甲周炎/口腔溃疡等毒性记录、恶性胸腔积液与骨多发转移放疗等并发症，以及 4 月—10 月连续的影像、检验与体重数据。'}


# ============================================================
# 病例 B：局限期 SCLC（男性，照护者代记），同步放化疗后免疫维持，连续 6 个月
# 局限期（VALSG）· cT3N2M0 IIIB 期
# ============================================================
def case_b():
    rid = 0

    def n():
        nonlocal rid
        rid += 1
        return f'b{rid:03d}'

    R = []
    add = R.append

    # ---------- 4 月：确诊 ----------
    add(symptom(n(), '2026-04-20', '咳嗽', '咳了三个月，一开始当感冒治，最近痰里偶尔有血丝。',
                impact='夜间影响入睡', onset='2026-01 下旬', by='照护者代记'))
    add(rec(n(), 'imaging', '2026-04-23', 'report', '胸部 CT 增强 2026-04-23',
            {'titleText': '胸部 CT 增强',
             'reportText': '右肺门区软组织肿块约 52×41 mm，包绕右肺门血管；气管隆突下及右气管旁淋巴结增大，短径约 18 mm；右肺中叶阻塞性炎症。',
             'detailText': '右肺门肿块 52×41 mm；纵隔淋巴结短径 18 mm；右肺中叶阻塞性炎症'}))
    add(rec(n(), 'specimen', '2026-04-25', 'pathology', '支气管镜检查记录 2026-04-25',
            {'specimenId': 'SP-B-260425', 'collectionMethodText': '支气管镜钳取活检', 'anatomicSiteText': '右肺门肿块',
             'materialType': '组织', 'titleText': '支气管镜活检（右肺门）',
             'detailText': '钳取组织 3 块送病理；未行 EBUS 穿刺'}))
    add(rec(n(), 'pathology', '2026-04-28', 'pathology', '病理报告 BL-B-260428',
            {'histologyText': '小细胞肺癌', 'titleText': '支气管镜活检病理报告',
             'originalText': '右肺门活检：小细胞癌。免疫组化：Syn（+）、CgA（+）、CD56（+）、TTF-1（+）、p40（-）、Ki-67 约 85%。',
             'reportText': '小细胞肺癌；神经内分泌标记阳性，Ki-67 约 85%'}))
    add(rec(n(), 'imaging', '2026-04-30', 'report', '头颅 MRI 增强 2026-04-30',
            {'titleText': '头颅 MRI 增强（分期）', 'reportText': '脑内未见异常强化灶；脑膜未见异常强化。',
             'detailText': '脑部未见转移（报告原文）'}))
    add(rec(n(), 'imaging', '2026-05-02', 'report', '胸腹 CT + 全身骨显像 2026-05-02',
            {'titleText': '胸腹 CT + 全身骨显像（分期）',
             'reportText': '胸部病灶同前；肝、肾上腺未见转移；全身骨显像未见明确异常放射性浓聚。',
             'detailText': '肝、肾上腺未见转移；骨显像未见明确异常'}))

    # ---------- 5 月：分期、基线、第 1 周期 ----------
    add(rec(n(), 'diagnosis', '2026-05-06', 'clinician_document', '门诊病历 2026-05-06',
            {'clinicalType': 'sclc', 'titleText': '右肺门小细胞肺癌（局限期）',
             'detailText': '局限期判断依据来自团队记录（VALSG）；与 TNM 分期并列保存，不互相换算'}))
    add(rec(n(), 'staging', '2026-05-06', 'clinician_document', '分期记录 2026-05-06',
            {'stageText': '局限期（VALSG）· cT3N2M0 · IIIB 期', 'systemText': 'VALSG + AJCC 第 8 版',
             'prefixText': 'c（临床）', 'tnmText': 'cT3 N2 M0',
             'detailText': '局限期与 TNM 并存记录；局限期不等同于某个 TNM 期'}))
    add(rec(n(), 'molecular_test', '2026-05-08', 'clinician_document', '分子检测说明 2026-05-08',
            {'testTypeText': '驱动基因检测', 'status': 'not_tested', 'methodText': '未开展',
             'scopeText': 'SCLC 未列为常规项目', 'limitationText': '未开展不等于阴性',
             'resultText': '当前未列为常规项目；不因未开展而推断结果'}))
    for name, val, unit, ref, flag in [('NSE', 42.6, 'ng/mL', '0–16.3', '↑'), ('ProGRP', 386, 'pg/mL', '0–50', '↑'),
                                       ('白细胞', 7.2, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 4.8, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 134, 'g/L', '130–175', ''), ('血小板', 245, '10^9/L', '125–350', ''),
                                       ('白蛋白', 40, 'g/L', '40–55', ''), ('肌酐', 72, 'μmol/L', '57–97', '')]:
        add(metric(n(), '2026-05-11', name, val, unit, ref, flag))
    add(metric(n(), '2026-05-11', '体重', 68.5, 'kg', '—'))
    add(rec(n(), 'systemic_therapy', '2026-05-13', 'clinician_document', '化疗记录 2026-05-13',
            {'eventTypeText': '依托泊苷 + 卡铂（EC）第 1 周期', 'status': 'administered_or_performed',
             'planText': '依托泊苷 100 mg/m² d1–3 + 卡铂 AUC 5 d1，每 21 天，计划 4 周期',
             'actualText': '第 1 周期已执行，未记录减量', 'detailText': '实际执行以输液记录为准'}))
    for name, val, unit, ref, flag in [('白细胞', 2.9, '10^9/L', '3.5–9.5', '↓'), ('中性粒细胞绝对值', 1.3, '10^9/L', '1.8–6.3', '↓'),
                                       ('血红蛋白', 131, 'g/L', '130–175', ''), ('血小板', 176, '10^9/L', '125–350', '')]:
        add(metric(n(), '2026-05-23', name, val, unit, ref, flag))
    add(symptom(n(), '2026-05-25', '乏力', '化疗后三四天开始没劲，走一层楼要歇一下。',
                impact='影响部分日常', onset='第 1 周期后', by='照护者代记'))
    add(symptom(n(), '2026-05-29', '食欲下降', '什么都不想吃，闻到饭味就反胃。', impact='影响部分日常', by='照护者代记'))

    # ---------- 6 月：第 2 周期 + 放疗开始（同步） ----------
    add(rec(n(), 'systemic_therapy', '2026-06-03', 'clinician_document', '化疗记录 2026-06-03',
            {'eventTypeText': '依托泊苷 + 卡铂（EC）第 2 周期', 'status': 'administered_or_performed',
             'planText': '原剂量', 'actualText': '按原剂量执行；中性粒细胞减少后加用 G-CSF 支持',
             'detailText': '前次出现 1 级中性粒细胞减少；是否减量由团队决定并记录'}))
    add(symptom(n(), '2026-06-01', '恶心', '早上起来恶心，吐过一次，吃药后好一些。', impact='影响部分日常', by='照护者代记'))
    add(symptom(n(), '2026-06-05', '脱发', '洗头的时候掉得厉害，索性剪短了。', impact='轻微，基本不影响日常', by='照护者代记'))
    for name, val, unit, ref, flag in [('白细胞', 4.6, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 2.6, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 124, 'g/L', '130–175', '↓'), ('血小板', 168, '10^9/L', '125–350', '')]:
        add(metric(n(), '2026-06-08', name, val, unit, ref, flag))
    add(metric(n(), '2026-06-08', '体重', 66.9, 'kg', '—'))
    add(rec(n(), 'care_task', '2026-06-15', 'clinician_document', '放疗定位记录 2026-06-15',
            {'titleText': '放疗定位 CT', 'topicText': '放疗', 'domain': 'radiotherapy', 'status': 'completed',
             'detailText': '体位固定与定位 CT 完成；靶区勾画中'}))
    add(rec(n(), 'radiotherapy', '2026-06-17', 'clinician_document', '放疗计划单 RT-B-260617',
            {'siteText': '胸部（右肺门 + 纵隔）', 'planFractions': '30', 'doneFractions': '0', 'status': 'scheduled',
             'eventTypeText': '胸部根治性放疗 45 Gy / 30 次（超分割 BID）',
             'planText': '45 Gy / 30 次，每日 2 次，每周 5 天', 'actualText': '尚未开始',
             'detailText': '同步放化疗；计划 45 Gy / 30 次 BID'}))
    add(rec(n(), 'systemic_therapy', '2026-06-24', 'clinician_document', '化疗记录 2026-06-24',
            {'eventTypeText': '依托泊苷 + 卡铂（EC）第 3 周期（同步放疗）', 'status': 'administered_or_performed',
             'planText': '原剂量', 'actualText': '与放疗同期执行', 'detailText': '第 3 周期与胸部放疗同步进行'}))
    add(symptom(n(), '2026-06-29', '吞咽疼痛', '放疗做到后半程，咽东西像有东西刮着，咽饭团要喝水送。',
                impact='影响部分日常', onset='放疗第 2 周', domain='radiotherapy', by='照护者代记'))
    for name, val, unit, ref, flag in [('白细胞', 3.2, '10^9/L', '3.5–9.5', '↓'), ('中性粒细胞绝对值', 1.4, '10^9/L', '1.8–6.3', '↓'),
                                       ('血红蛋白', 112, 'g/L', '130–175', '↓'), ('血小板', 142, '10^9/L', '125–350', ''),
                                       ('NSE', 18.2, 'ng/mL', '0–16.3', '↑'), ('ProGRP', 96, 'pg/mL', '0–50', '↑')]:
        add(metric(n(), '2026-06-28', name, val, unit, ref, flag))

    # ---------- 7 月：第 4 周期减量 + 放疗完成 ----------
    add(rec(n(), 'care_task', '2026-07-05', 'caregiver_reported', '进食与体重记录 2026-07-05',
            {'titleText': '进食与体重记录', 'topicText': '营养', 'domain': 'nutrition', 'ownerText': '照护者代记',
             'intakeText': '比平常少很多', 'weightKg': 64.8, 'difficultyText': '吞咽不舒服',
             'patientWords': '只能吃稀的软的，热汤喝下去胸口热，凉一点舒服些。',
             'detailText': '放疗后吞咽疼，主食吃得少，改成稀饭和蒸蛋；体重 64.8 kg。'}))
    add(metric(n(), '2026-07-05', '体重', 64.8, 'kg', '—'))
    for name, val, unit, ref, flag in [('白细胞', 2.8, '10^9/L', '3.5–9.5', '↓'), ('中性粒细胞绝对值', 1.2, '10^9/L', '1.8–6.3', '↓'),
                                       ('血红蛋白', 108, 'g/L', '130–175', '↓'), ('血小板', 131, '10^9/L', '125–350', '')]:
        add(metric(n(), '2026-07-10', name, val, unit, ref, flag))
    add(rec(n(), 'systemic_therapy', '2026-07-15', 'clinician_document', '化疗记录 2026-07-15',
            {'eventTypeText': '依托泊苷 + 卡铂（EC）第 4 周期（剂量调整）', 'status': 'administered_or_performed',
             'planText': '原剂量', 'actualText': '减量约 20% 后执行',
             'titleText': 'EC 第 4 周期（剂量调整）',
             'detailText': '计划与实际不一致已分开记录；减量原因需与团队核对'}))
    add(rec(n(), 'radiotherapy', '2026-07-12', 'clinician_document', '放疗记录 RT-B-260617',
            {'siteText': '胸部（右肺门 + 纵隔）', 'planFractions': '30', 'doneFractions': '30', 'status': 'completed',
             'eventTypeText': '胸部根治性放疗 45 Gy / 30 次（超分割 BID）', 'planText': '45 Gy / 30 次 BID',
             'actualText': '完成 30 次；中间暂停 2 次，原因未记录',
             'detailText': '总治疗时间因暂停延长；暂停原因待与放疗记录核对'}))
    for name, val, unit, ref, flag in [('白细胞', 3.6, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 1.9, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 110, 'g/L', '130–175', '↓'), ('血小板', 156, '10^9/L', '125–350', ''),
                                       ('NSE', 13.6, 'ng/mL', '0–16.3', '')]:
        add(metric(n(), '2026-07-22', name, val, unit, ref, flag))
    add(symptom(n(), '2026-07-25', '干咳加重', '放疗后咳嗽又多了，晚上干咳，没什么痰。', impact='影响入睡', by='照护者代记'))

    # ---------- 8 月：疗效评估 PR + 放射性改变 + 免疫维持启动 ----------
    add(rec(n(), 'imaging', '2026-08-03', 'report', '胸部 CT 增强 2026-08-03',
            {'titleText': '胸部 CT 增强（放化疗后疗效评估）', 'comparisonText': '与 2026-04-23 胸部 CT 比较',
             'reportText': '右肺门肿块约 22×16 mm，径线和较基线缩小约 52%；纵隔淋巴结短径约 8 mm；右肺中叶炎症吸收。',
             'detailText': '靶病灶径线和较基线缩小约 52%（达 PR 标准）；纵隔淋巴结缩小；阻塞性炎症吸收'}))
    for name, val, unit, ref, flag in [('NSE', 11.8, 'ng/mL', '0–16.3', ''), ('ProGRP', 41, 'pg/mL', '0–50', ''),
                                       ('白细胞', 4.9, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 2.8, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 116, 'g/L', '130–175', '↓'), ('血小板', 188, '10^9/L', '125–350', ''),
                                       ('白蛋白', 37, 'g/L', '40–55', '↓')]:
        add(metric(n(), '2026-08-05', name, val, unit, ref, flag))
    add(metric(n(), '2026-08-05', '体重', 64.2, 'kg', '—'))
    add(symptom(n(), '2026-08-08', '低热', '下午体温 37.8℃ 左右，有点怕冷，咳嗽比前几天多一点。',
                impact='影响部分日常', onset='放疗结束后约 4 周', domain='radiotherapy', by='照护者代记'))
    add(rec(n(), 'imaging', '2026-08-11', 'report', '胸部 CT 平扫 2026-08-11',
            {'titleText': '胸部 CT（新发症状评估）', 'comparisonText': '与 2026-08-03 胸部 CT 比较',
             'reportText': '右肺照射野内见斑片状磨玻璃密度影，边界模糊，形态与照射野一致；未见明显实变。',
             'detailText': '照射野内斑片状磨玻璃影，形态与照射野一致（报告原文）'}))
    add(rec(n(), 'care_task', '2026-08-12', 'clinician_document', '门诊处理记录 2026-08-12',
            {'titleText': '新发症状的处理（团队记录）', 'topicText': '放疗', 'domain': 'radiotherapy', 'status': 'completed',
             'detailText': '按团队记录处理；是否与放疗相关由团队判断，工作台不做判断。后续免疫治疗是否启动请与团队确认。'}))
    add(rec(n(), 'imaging', '2026-08-19', 'report', '头颅 MRI 增强 2026-08-19',
            {'titleText': '头颅 MRI 增强（复查）', 'reportText': '脑内未见异常强化灶。',
             'detailText': '脑部复查未见异常（报告原文）'}))
    add(rec(n(), 'systemic_therapy', '2026-08-24', 'clinician_document', '用药记录 2026-08-24',
            {'eventTypeText': '度伐利尤单抗 1500 mg 静脉输注 每 4 周', 'status': 'administered_or_performed',
             'planText': '放化疗后维持治疗，每 4 周一次', 'actualText': '第 1 次已执行',
             'detailText': '末次化疗 2026-07-15、末次放疗 2026-07-12；首剂在 42 天内启动'}))
    for name, val, unit, ref, flag in [('NSE', 10.6, 'ng/mL', '0–16.3', ''), ('白细胞', 5.4, '10^9/L', '3.5–9.5', ''),
                                       ('中性粒细胞绝对值', 3.1, '10^9/L', '1.8–6.3', ''), ('血红蛋白', 124, 'g/L', '130–175', '↓'),
                                       ('血小板', 205, '10^9/L', '125–350', '')]:
        add(metric(n(), '2026-08-24', name, val, unit, ref, flag))
    add(rec(n(), 'care_task', '2026-08-28', 'clinician_document', '门诊沟通记录 2026-08-28',
            {'titleText': '预防性脑照射（PCI）沟通记录', 'topicText': '就诊安排', 'domain': 'visit', 'status': 'completed',
             'detailText': '记录为沟通事项：是否适合 PCI 由团队按本人情况解释；本页不判断适用性。'}))

    # ---------- 9 月：免疫维持 + 免疫相关变化 ----------
    for name, val, unit, ref, flag in [('NSE', 10.2, 'ng/mL', '0–16.3', ''), ('ProGRP', 36, 'pg/mL', '0–50', ''),
                                       ('白蛋白', 38, 'g/L', '40–55', '↓'), ('ALT', 26, 'U/L', '9–50', '')]:
        add(metric(n(), '2026-09-09', name, val, unit, ref, flag))
    add(metric(n(), '2026-09-09', '体重', 65.6, 'kg', '—'))
    add(symptom(n(), '2026-09-15', '新发气促', '这两周走路又有点喘，和 8 月比不太一样，说不好是不是累的。',
                impact='影响部分日常', onset='免疫治疗第 1 次后约 3 周', domain='immune', by='照护者代记'))
    add(rec(n(), 'care_task', '2026-09-16', 'caregiver_reported', '免疫治疗期间身体变化记录 2026-09-16',
            {'titleText': '免疫治疗期间身体变化', 'topicText': '照护', 'domain': 'immune', 'ownerText': '照护者代记',
             'itemsText': '新发或加重的气促', 'levelText': '影响部分日常',
             'patientWords': '这两周走路又有点喘，和 8 月比不太一样。',
             'detailText': '仅记录，不判断是否属于免疫相关不良事件；是否处理由治疗团队决定。'}))
    add(rec(n(), 'systemic_therapy', '2026-09-21', 'clinician_document', '用药记录 2026-09-21',
            {'eventTypeText': '度伐利尤单抗 1500 mg 静脉输注', 'status': 'administered_or_performed',
             'planText': '每 4 周一次', 'actualText': '第 2 次已执行', 'detailText': '第 2 次维持治疗'}))
    for name, val, unit, ref, flag in [('白细胞', 5.8, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 3.4, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 128, 'g/L', '130–175', ''), ('血小板', 218, '10^9/L', '125–350', ''),
                                       ('NSE', 9.9, 'ng/mL', '0–16.3', ''), ('ALT', 29, 'U/L', '9–50', '')]:
        add(metric(n(), '2026-09-23', name, val, unit, ref, flag))
    add(symptom(n(), '2026-09-30', '乏力改善', '这两个月慢慢有劲了，下午不用躺那么久，能在小区走两圈。',
                impact='较放化疗期间好转', by='照护者代记'))

    # ---------- 10 月：再评估 + 复诊准备 ----------
    add(rec(n(), 'imaging', '2026-10-12', 'report', '胸部 CT 增强 2026-10-12',
            {'titleText': '胸部 CT 增强（再评估）', 'comparisonText': '与 2026-08-03 及 2026-08-11 胸部 CT 比较',
             'reportText': '右肺门病灶约 20×15 mm，与 2026-08-03 相仿；照射野内磨玻璃影较 2026-08-11 吸收减少。',
             'detailText': '病灶与 2026-08-03 相仿；放射性改变较前吸收'}, review='needs_review'))
    for name, val, unit, ref, flag in [('白细胞', 6.1, '10^9/L', '3.5–9.5', ''), ('中性粒细胞绝对值', 3.8, '10^9/L', '1.8–6.3', ''),
                                       ('血红蛋白', 131, 'g/L', '130–175', ''), ('血小板', 226, '10^9/L', '125–350', ''),
                                       ('NSE', 9.6, 'ng/mL', '0–16.3', ''), ('ProGRP', 33, 'pg/mL', '0–50', ''),
                                       ('白蛋白', 41, 'g/L', '40–55', '')]:
        add(metric(n(), '2026-10-14', name, val, unit, ref, flag))
    add(metric(n(), '2026-10-14', '体重', 66.4, 'kg', '—'))
    for q, src in [('目前记录对应局限期还是广泛期？依据是哪一份检查？', '2026-05-06 分期记录'),
                   ('放疗中间暂停的 2 次，对总剂量和疗效有什么影响？', '2026-07-12 放疗记录'),
                   ('8 月头颅 MRI 之后，PCI 还需要讨论吗？由谁来解释？', '2026-08-19 头颅 MRI'),
                   ('9 月开始走路有点喘，需要做什么检查来排除原因？', '2026-09-15 症状自述'),
                   ('免疫维持治疗要做几次？什么情况下需要停？', '2026-08-24 用药记录')]:
        add(rec(n(), 'visit_question', '2026-10-16', 'patient_reported', '照护者整理',
                {'questionText': q, 'sourceText': src, 'selected': True, 'detailText': f'来源：{src}'}))
    add(rec(n(), 'care_task', '2026-10-21', 'clinician_document', '预约记录 2026-10-21',
            {'titleText': '肿瘤内科 + 放疗科复诊（已预约）', 'topicText': '就诊安排', 'domain': 'visit',
             'eventTypeText': '门诊复诊', 'status': 'scheduled',
             'detailText': '需携带 2026-10-12 CT 报告、近三次血常规与 NSE、放疗记录与免疫治疗记录'}))
    add(rec(n(), 'molecular_test', '2026-10-14', 'report', 'PD-L1 检测（SCLC · 未开展）',
            {'testTypeText': 'PD-L1 免疫组化', 'status': 'not_tested', 'methodText': '未开展',
             'scopeText': 'SCLC 中未列为常规选择依据项目', 'limitationText': '未开展不等于阴性',
             'resultText': ''}, review='candidate'))
    return R, {
        'id': 'demo-sclc-chemo-rt-6m', 'displayName': '样例档案 B', 'subjectRole': 'caregiver',
        'demoScenario': '局限期 SCLC · 同步放化疗 6 个月',
        'demoSummary': '虚构演示：右肺门小细胞肺癌局限期（VALSG）cT3N2M0 IIIB 期，依托泊苷+卡铂 4 周期同步胸部放疗 45 Gy/30 次，后接免疫维持；含骨髓抑制最低点、放射性食管炎、放射性改变与体重先降后回升的连续记录。'}


def build():
    out = []
    for records, meta in (case_a(), case_b()):
        subject_id = f"subject-{meta['id']}"
        for record in records:
            record['subjectId'] = subject_id
            record['createdBy'] = subject_id
        out.append({
            'id': meta['id'], 'workspaceId': 'demo-workspace', 'subjectId': subject_id,
            'displayName': meta['displayName'], 'subjectRole': meta['subjectRole'],
            'revision': len(records), 'createdAt': '2026-04-20T09:00:00.000Z',
            'records': records, 'decisions': [],
            'demo': True, 'demoScenario': meta['demoScenario'], 'demoSummary': meta['demoSummary'],
        })
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for case in out:
        dates = [r['date']['value'] for r in case['records'] if r['date']['value']]
        kinds = {}
        for r in case['records']:
            kinds[r['kind']] = kinds.get(r['kind'], 0) + 1
        print(f"{case['id']}: {len(case['records'])} 条，{min(dates)} → {max(dates)}")
        print('   ', dict(sorted(kinds.items())))


if __name__ == '__main__':
    build()
