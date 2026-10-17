# 分子检测、靶向药与用药帮助 v0.2

本模块是用户指定的肺癌重点。知识样例用于指导产品结构与内容准备，非完整药品目录或个人处方。全部来源获取于2026-10-17；美国资料不能替代中国标签。正式药物知识发布前按GUIDELINE-SCOPE逐条核验当前地区/条件/标签。

## 1. 从患者问题出发

“有没有做基因检测？”“血液没检出是不是没靶点？”“这个具体变异和病友是不是一样？”“PD-L1高是否就用免疫？”“一代/三代、联合/单药究竟为何？”“脑部和身体变化不一致该怎么问？”“进展后为什么又要穿刺？”“这个药中国能否用、报销吗？”

这些是研究与医学背景导出的待验证问题，不是本项目已完成访谈的原话。界面先回答与当前材料有关的一小段，再展开专业详情，不要求患者先记住全部基因。

## 2. 检测结果的结构与语义

保存基因/变异原文、HGVS/转录本（如报告提供）、外显子、改变类型、融合伙伴、丰度/拷贝数/单位、样本与取材时间、方法（DNA/RNA/NGS/PCR/IHC/FISH等原文）、检测覆盖范围与报告限制。

结果状态：待出/成功检出/在本方法范围内未检出/未检测/不足/失败/未知/VUS；缺字段不能默认阴性，0与未检出不同。血浆与组织是不同来源，未检出不能自动排除，提示就检测范围/样本和是否需组织或复核向团队询问，不自动要求再穿刺。PD-L1结果单独保存克隆/平台、评分方法/数值及样本，不能等同驱动基因检测。

检测适用背景参考[IASLC分子检测图谱](https://www.iaslc.org/iaslc-atlas-molecular-testing-targeted-therapy-lung-cancer)与[液体检测共识发布说明](https://www.iaslc.org/iaslc-news/press-release/iaslc-issues-consensus-updated-report-liquid-biopsies)；未据入口目录声称读完整本。

## 3. 首批知识目录：变异级而非基因级

下表为代表性内容样例，不表示穷尽、优先顺序或中国可用。

| 靶点/改变 | 样例条目 | 产品必须保留的区别 |
| --- | --- | --- |
| EGFR 19del/L858R等 | 奥希替尼；吉非替尼/厄洛替尼/阿法替尼等历史/现用药名可识别 | 具体改变、阶段、单药/联合、既往治疗；不能把所有EGFR阳性视为同条件 |
| EGFR exon20ins | 舒沃替尼（sunvozertinib）；amivantamab相关条目 | 与经典敏感改变分开；既往含铂治疗/组合条件逐条查标签 |
| ALK融合 | 阿来替尼、洛拉替尼等 | 融合证据；术后辅助与转移治疗是不同条目，不单按“几代”排序 |
| ROS1融合 | repotrectinib（瑞普替尼）等 | 融合/既往TKI/适用地区，不能把不同变异或不同前治条件混同 |
| RET融合 | selpercatinib（塞普替尼） | RET融合不等于所有RET改变；NSCLC与泛瘤种标签分别记录 |
| MET exon14跳跃 | capmatinib/tepotinib等名称索引 | exon14跳跃≠扩增≠IHC高表达；样例名称不是本轮中国批准结论 |
| BRAF V600E | BRAF/MEK组合，例如dabrafenib＋trametinib | 组合与单药不同；non-V600E另条，不能套用V600E解释 |
| KRAS G12C | sotorasib/阿达格拉西布等 | G12C不等于其他KRAS；阶段/前治与地区必留 |
| NTRK融合 | larotrectinib等 | 融合而非普通点突变，泛瘤种条件需要逐条核对 |
| HER2/ERBB2 | trastuzumab deruxtecan；zongertinib等 | 激活突变/TKD、扩增和IHC表达不同，ADC和TKI机制不同 |
| NRG1融合 | zenocutuzumab条目 | 低频改变仍可记录；不能因少见就只显示“其他”并丢原文 |

基础名称目录参照[ACS靶向药患者教育](https://www.cancer.org/cancer/types/lung-cancer/treating-non-small-cell/targeted-therapies.html)。每条完整药品卡需独立来源，不以这张概览替代说明书。

### 可核对的批准事件样例，用来检验内容模型

- [FDA阿来替尼术后辅助，2024-04-18](https://www.fda.gov/drugs/resources-information-approved-drugs/fda-approves-alectinib-adjuvant-treatment-alk-positive-non-small-cell-lung-cancer)：说明靶向药知识不能只建“晚期”场景。
- [FDA奥希替尼III期放化疗后，2024-09-25](https://www.fda.gov/drugs/resources-information-approved-drugs/fda-approves-osimertinib-locally-advanced-unresectable-stage-iii-non-small-cell-lung-cancer)：特定EGFR改变、不可切除、放化疗后未进展等条件必须同时记录。
- [FDA舒沃替尼，2025-07-02](https://www.fda.gov/drugs/resources-information-approved-drugs/fda-grants-accelerated-approval-sunvozertinib-metastatic-non-small-cell-lung-cancer-egfr-exon-20)：该通知涉及exon20ins和既往含铂后的条件，不等于所有EGFR患者可用。
- [FDA ROS1 repotrectinib，2023-11-15](https://www.fda.gov/drugs/resources-information-approved-drugs/fda-approves-repotrectinib-ros1-positive-non-small-cell-lung-cancer)：保留药物、改变和阶段的原始适应证条目。
- [FDA zongertinib适应证扩展，2026-02-26](https://www.fda.gov/drugs/resources-information-approved-drugs/fda-grants-accelerated-approval-zongertinib-unresectable-or-metastatic-non-squamous-non-small-cell)：说明同药不同时间版本可能改变前治条件，不能固定沿用2025旧卡。
- [FDA NRG1 zenocutuzumab，2024-12-04](https://www.fda.gov/drugs/resources-information-approved-drugs/fda-grants-accelerated-approval-zenocutuzumab-zbco-non-small-cell-lung-cancer-and-pancreatic)：保留NSCLC、融合与前治条件，不把同药其他原发癌标签混入。
- [FDA KRAS sotorasib标签样例2024](https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/214665s012lbl.pdf)、[HER2伴随检测条目](https://www.fda.gov/medical-devices/recently-approved-devices/guardant360-cdx-p200010s008)、[NTRK批准记录](https://www.accessdata.fda.gov/scripts/opdlisting/oopd/detailedIndex.cfm?cfgridkey=578317)：用于验证精确变异/检测与适应证关系，后续仍需核对当前标签。

中国药名索引还应准备阿美替尼、伏美替尼、贝福替尼、恩沙替尼、赛沃替尼等条目以及其他已用药物；**本轮尚未完成它们的中国当前逐药标签核验，不能填造批准阶段/线次或医保状态**。它们作为名称识别/内容准备队列，可存患者实际医嘱原文；个人记录不因目录未收录而丢失或被系统否定。未知药名保留原文后人工关联，不猜同音药。

## 4. 药物卡与个人用药卡

知识卡：通用名/地区商品名、机制类别、目标改变、适应证条目版本、病理/阶段/前治/组合条件、给药途径原文、常见关注点及需立即联系团队的经审阅说明、相互作用来源、批准性质/地区/核验日、来源链接与限制。不提供个人起始剂量、跨药等效换算或“最优药”排名。

个人用药卡：关联医嘱/处方、计划与实际、开始/暂停/结束、剂量/频率原文、漏服/呕吐自述、药师/团队回复、合并药和保健品。记录一条并不要求完整填完。已有药物名/剂量识别不清时保留图片及待核，不自动补标准剂量。

动作闭环：看懂药卡→选本人来源/未知→保留问题→记录专业回复→更新医嘱版本→日常/复诊复用。患者可以只问不建卡，医嘱药物不因无知识条目而不可记录。

## 5. 耐药与再评估

保存医生提出变化的依据、哪些部位变化、此前响应与真实用药时间、组织/液体再检测及样本限制。新增变异、旁路/组织学转化仅作为来源中的结果；报告未写不能用模型补全。再检测结果与初诊并存，不能“最新一次阴性”抹去历史。

问题模板：是否已确定进展、影像比较哪次、是某个部位还是多处、是否需要新的病理或分子材料、局部治疗与原全身治疗如何讨论、是否有研究线索、我的目标与费用顾虑如何纳入。模板不等于建议自行停/换药。

## 6. 本模块验收要点

同一基因不同改变不能互换卡；旧标签/国外条目有地区和版本；中国未核验不标未批准；样本不足/血浆未检出不归“无靶点”；PD-L1不覆盖驱动基因条件；药名无法识别有人工回退；病例更正使派生解释提示过期；源于候选的用药问题不进入默认确定病情导出。
