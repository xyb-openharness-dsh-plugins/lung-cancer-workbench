/* 36 号 · 疾病概要数据（小肺宝 · 肺癌）
 *
 * 四条硬约束见 docs/36-DISEASE-PRIMER.md：四段固定顺序、第②层只做解释、趋势段白名单、来源栏必标是否取得原件。
 * §2.5：每一行指南都必须带可点链接——original:true 用 url，original:false 用 secondaryUrl，且只收 https。
 * 本文件所有链接于 2026-10-27 逐条用 HTTP 请求验证可达（200）。
 */
window.DISEASE_PRIMER = {
  brand: '小肺宝 LungPal',
  name: '原发性支气管肺癌',
  en: 'Primary Lung Cancer / Bronchogenic Carcinoma',
  updated: '2026-10-27',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '原发性支气管肺癌简称肺癌，起源于支气管黏膜或腺体上皮，是我国发病与死亡人数最多的恶性肿瘤。从病理与治疗角度，通常先分非小细胞肺癌与小细胞肺癌两大类，再结合分期与分子检测决定后续路径。',
      points: [
        '非小细胞肺癌（NSCLC）约占 80%–85%，主要包括腺癌、鳞状细胞癌、大细胞癌等亚型；小细胞肺癌（SCLC）约占 15%，生物学行为与治疗路径与 NSCLC 分开处理。',
        'WHO 第 5 版胸部肿瘤分类（2021）把肺腺癌按生长方式分为贴壁型、腺泡型、乳头型、微乳头型、实体型等，并将原位腺癌（AIS）与不典型腺瘤样增生（AAH）改列为腺样前体病变。',
        '按发生部位分为中央型（主支气管及叶、段支气管）与周围型（段支气管远端）。中央型更常与鳞癌、小细胞癌相关，但腺癌亦可呈中央型生长。',
        '常见就诊表现包括咳嗽、痰中带血或咯血、气促、胸痛、声音嘶哑、消瘦；早期肺癌多数没有明显症状，常在影像检查中被发现。',
        '中国 2022 年肺癌新发病例 106.06 万，占全部恶性肿瘤的 22.0%；死亡 73.33 万，占全部恶性肿瘤死亡的 28.5%。',
        '分期使用 AJCC 第 8 版 TNM 体系，临床分期前缀为 c、病理分期前缀为 p，两者并列保存、不互相覆盖。小细胞肺癌另有「局限期 / 广泛期」二分口径，与 TNM 并存记录。'
      ],
      sources: [
        { org: 'WHO / IARC', doc: 'WHO Classification of Tumours · Thoracic Tumours', version: '5th ed.（2021）', original: false, secondaryUrl: 'https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Thoracic-Tumours-2021', page: '页码待核', note: '纸质与在线版需订阅；此处为 IARC 官方出版页' },
        { org: '中华医学会', doc: '肺癌临床诊疗指南', version: '2025 版', original: false, secondaryUrl: 'https://rs.yiigle.com/cmaid/1553565', page: '页码待核', note: '中华医学期刊全文数据库（官方）；正文需登录，摘要与参考文献公开' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '本台引用的文件按下表管理。「原件」一列区分「已取得原件」与「未取得原件、据二次来源」——没看到原件时不写成看到了。',
      table: {
        head: ['机构', '文件全名', '版本 / 年份', '原件', '本台用途'],
        rows: [
          ['国家卫生健康委', '原发性肺癌诊疗指南', '2022 年版（2022-04-03 印发）',
            { text: '已取得原件 · 打开 PDF', url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930/files/1732863054387_68585.pdf' },
            '诊断流程、分期检查与治疗原则的国内基线'],
          ['中华医学会', '肺癌临床诊疗指南', '2025 版',
            { text: '未取得原件（全文需登录），据中华医学期刊网', url: 'https://rs.yiigle.com/cmaid/1553565' },
            '筛查人群、基因检测范围与随访节奏'],
          ['CSCO', '非小细胞肺癌诊疗指南', '2025 版',
            { text: '未取得原件（纸质书），据人卫社书目页', url: 'https://www.pmphmall.com/gdsdetail/654973-333567' },
            'NSCLC 分期治疗与推荐分级'],
          ['CSCO', '小细胞肺癌诊疗指南', '2025 版',
            { text: '未取得原件（纸质书），据人卫社书目页', url: 'https://www.pmphmall.com/gdsdetail/654952-333546' },
            'SCLC 分期治疗、放疗与免疫巩固'],
          ['NCCN', 'NCCN Guidelines · Non-Small Cell Lung Cancer', 'V9.2026',
            { text: '未取得原件（官网需注册），据官方目录页', url: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1450' },
            '国际 NSCLC 路径对照'],
          ['NCCN', 'NCCN Guidelines · Small Cell Lung Cancer', 'V2.2026',
            { text: '未取得原件（官网需注册），据官方目录页', url: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1451' },
            '国际 SCLC 路径对照'],
          ['WHO / IARC', 'WHO Classification of Tumours · Thoracic Tumours', '5th ed.（2021）',
            { text: '未取得原件（需订阅），据官方出版页', url: 'https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Thoracic-Tumours-2021' },
            '组织学分类与命名口径'],
          ['AJCC', 'AJCC Cancer Staging Manual', '8th ed.（2017）',
            { text: '未取得原件（需订阅），据出版方条目', url: 'https://doi.org/10.1007/978-3-319-40618-3' },
            'TNM 分期体系与期组'],
          ['ESMO', 'Metastatic Non-Small Cell Lung Cancer: ESMO Clinical Practice Guidelines', '2018（Ann Oncol 29 Suppl 4）',
            { text: '已取得原件 · 打开全文', url: 'https://doi.org/10.1093/annonc/mdy275' },
            '晚期 NSCLC 的国际对照口径']
        ]
      },
      points: [
        '中国境内文件的优先级：国家卫生健康委诊疗指南 > 中华医学会指南 > CSCO 指南 > 国际指南。四者在分期体系与主要治疗原则上口径一致，差异多在药物可及性与推荐分级。',
        'CSCO 指南每年更新一版，纸质与电子版通过学会渠道发行；本台未取得其电子原件，相关条目一律标注为二次来源。',
        'NCCN 指南的 PDF 需要注册账号才能下载；本台只链接到官方目录页，不转载其正文。'
      ],
      sources: [
        { org: '国家卫生健康委', doc: '原发性肺癌诊疗指南', version: '2022 年版', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930/files/1732863054387_68585.pdf', page: '页码待核' },
        { org: '中华医学会', doc: '肺癌临床诊疗指南', version: '2025 版', original: false, secondaryUrl: 'https://rs.yiigle.com/cmaid/1553565', page: '页码待核', note: '中华医学期刊全文数据库（官方）；正文需登录' },
        { org: 'CSCO', doc: '非小细胞肺癌诊疗指南', version: '2025 版', original: false, secondaryUrl: 'https://www.pmphmall.com/gdsdetail/654973-333567', page: '页码待核', note: '人民卫生出版社书目页（纸质书，无官方电子全文）' },
        { org: 'CSCO', doc: '小细胞肺癌诊疗指南', version: '2025 版', original: false, secondaryUrl: 'https://www.pmphmall.com/gdsdetail/654952-333546', page: '页码待核', note: '人民卫生出版社书目页（纸质书，无官方电子全文）' },
        { org: 'NCCN', doc: 'NCCN Guidelines · Non-Small Cell Lung Cancer', version: 'V9.2026', original: false, secondaryUrl: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1450', page: '页码待核', note: '官方指南页，PDF 需注册' },
        { org: 'NCCN', doc: 'NCCN Guidelines · Small Cell Lung Cancer', version: 'V2.2026', original: false, secondaryUrl: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1451', page: '页码待核', note: '官方指南页，PDF 需注册' },
        { org: 'WHO / IARC', doc: 'WHO Classification of Tumours · Thoracic Tumours', version: '5th ed.（2021）', original: false, secondaryUrl: 'https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Thoracic-Tumours-2021', page: '页码待核', note: 'IARC 官方出版页，正文需订阅' },
        { org: 'AJCC', doc: 'AJCC Cancer Staging Manual', version: '8th ed.（2017）', original: false, secondaryUrl: 'https://doi.org/10.1007/978-3-319-40618-3', page: '页码待核', note: '出版方条目，正文需订阅' },
        { org: 'ESMO', doc: 'Metastatic NSCLC: ESMO Clinical Practice Guidelines', version: '2018', original: true, url: 'https://doi.org/10.1093/annonc/mdy275', page: '页码待核' }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '下面只写指南里列举了哪些手段、各自用在什么期别与线序，不排序、不比较优劣。',
      groups: [
        {
          label: '非小细胞肺癌 · 早期（Ⅰ–Ⅱ 期，可手术）',
          points: [
            '解剖性肺叶切除 + 肺门与纵隔淋巴结清扫或采样，是首选局部治疗方式；部分外周小病灶可做亚肺叶切除。',
            '因心肺功能或其他原因不能耐受手术者，采用立体定向放射治疗（SBRT）。',
            '术后按病理分期讨论辅助治疗：ⅠB–ⅢA 期可讨论含铂辅助化疗；EGFR 19del/L858R 阳性者讨论辅助 EGFR-TKI；部分期别讨论辅助免疫治疗。'
          ]
        },
        {
          label: '非小细胞肺癌 · 局部晚期（Ⅲ 期，不可切除）',
          points: [
            '根治性同步放化疗是主线；序贯放化疗用于不能耐受同步方案者。',
            '同步放化疗后未进展者，按驱动基因与免疫状态讨论巩固治疗：EGFR 19del/L858R 阳性讨论奥希替尼，其余讨论度伐利尤单抗。',
            '可切除的Ⅲ期可讨论新辅助免疫联合化疗、或新辅助靶向治疗后手术。'
          ]
        },
        {
          label: '非小细胞肺癌 · 晚期（Ⅳ 期，驱动基因阳性）',
          points: [
            'EGFR 19del / L858R：一代至三代 EGFR-TKI 均可选，三代药物亦用于一线。',
            'ALK 融合、ROS1 融合、RET 融合、MET 14 外显子跳跃、NTRK 融合、BRAF V600E、HER2 突变、KRAS G12C 各有对应的靶向药物类别。',
            '靶向治疗进展后，按进展模式（寡进展 / 广泛进展）讨论继续靶向联合局部治疗或更换全身方案。'
          ]
        },
        {
          label: '非小细胞肺癌 · 晚期（Ⅳ 期，驱动基因阴性）',
          points: [
            '含铂双药化疗（非鳞癌常用培美曲塞联合铂类；鳞癌常用吉西他滨或紫杉类联合铂类）。',
            'PD-1/PD-L1 抑制剂单药（用于 PD-L1 高表达）或联合化疗；部分方案联合抗血管生成药物。',
            '后线包括多西他赛、安罗替尼等，以及按登记条件参加临床研究。'
          ]
        },
        {
          label: '小细胞肺癌 · 局限期',
          points: [
            '依托泊苷联合铂类化疗，同步胸部放疗；放疗分割可为 45 Gy / 30 次每日两次，或 60–70 Gy 每日一次。',
            '达到完全或部分缓解后讨论预防性脑照射（PCI）；不做 PCI 者按期复查头颅 MRI。',
            '同步放化疗后未进展者讨论度伐利尤单抗巩固治疗。',
            '极少数 T1–2N0 且无淋巴结转移者讨论根治性手术。'
          ]
        },
        {
          label: '小细胞肺癌 · 广泛期',
          points: [
            '铂类联合依托泊苷为化疗骨架，联合 PD-L1 或 PD-1 抑制剂；部分方案再加抗血管生成药物。',
            '一线缓解后讨论维持治疗；后续线包括拓扑替康、芦比替定等。',
            '胸部放疗用于缓解局部症状或按方案序贯进行。'
          ]
        },
        {
          label: '各期共用的局部与支持手段',
          points: [
            '骨转移灶姑息放疗（常用 30 Gy / 10 次、20 Gy / 5 次或 8 Gy / 1 次），联合双膦酸盐或地舒单抗。',
            '脑转移：寡转移用立体定向放射外科（SRS）或手术，多发转移用全脑放疗（WBRT）。',
            '恶性胸腔积液：诊断性穿刺、置管引流，必要时胸膜固定。',
            '气道阻塞：支气管镜下介入（消融、支架）。',
            '疼痛、营养、心理与康复支持贯穿全程。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        { org: '国家卫生健康委', doc: '原发性肺癌诊疗指南', version: '2022 年版', original: true, url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930/files/1732863054387_68585.pdf', page: '页码待核' },
        { org: '中华医学会', doc: '肺癌临床诊疗指南', version: '2025 版', original: false, secondaryUrl: 'https://rs.yiigle.com/cmaid/1553565', page: '页码待核', note: '中华医学期刊全文数据库（官方）；正文需登录' },
        { org: 'NCCN', doc: 'NSCLC / SCLC Guidelines', version: 'V9.2026 / V2.2026', original: false, secondaryUrl: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1450', note: '官网需注册' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生的事实，每条都带日期或版本号；不预测，也不评价方向好坏。',
      points: [
        '分类体系：WHO 第 5 版胸部肿瘤分类于 2021 年出版，取代第 4 版；原位腺癌与不典型腺瘤样增生改列腺样前体病变。',
        '分期体系：AJCC 第 8 版肺癌分期自 2018-01-01 起用于临床，此前为第 7 版。',
        '国内文件：国家卫生健康委《原发性肺癌诊疗指南（2022 年版）》于 2022-04-03 印发。',
        '国内指南：中华医学会《肺癌临床诊疗指南（2025 版）》于 2025 年在《中华医学杂志》2025 年第 34 期与《中华肿瘤杂志》2025 年第 9 期同步刊发。',
        '指南版本更替：NCCN 非小细胞肺癌指南已更新至 V9.2026，小细胞肺癌指南更新至 V2.2026。',
        '指南结构变化：2025 版中华医学会指南在筛查部分新增「不推荐参加肺癌筛查的人群」；CSCO 2025 版小细胞肺癌指南新增「中-高级别类癌」病理亚型，并把大细胞神经内分泌癌按基因组特征分为 SCLC 样、NSCLC 样、类癌样三型。',
        '临床研究：ADRIATIC 研究（NEJM，2024）报告局限期小细胞肺癌同步放化疗后使用度伐利尤单抗巩固的随机对照结果；CSCO 2025 版据此新增该巩固治疗的推荐。',
        '在研登记规模：本台尚未统计中国药物临床试验登记平台与 ClinicalTrials.gov 的肺癌相关登记条数，统计口径确定后补入。'
      ],
      sources: [
        { org: 'WHO / IARC', doc: 'WHO Classification of Tumours · Thoracic Tumours', version: '5th ed.（2021）', original: false, secondaryUrl: 'https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Thoracic-Tumours-2021', note: '据官方出版页' },
        { org: 'CSCO', doc: '小细胞肺癌诊疗指南', version: '2025 版', original: false, secondaryUrl: 'https://www.pmphmall.com/gdsdetail/654952-333546', note: '人民卫生出版社书目页（纸质书，无官方电子全文）' },
        { org: 'NCCN', doc: 'NSCLC / SCLC Guidelines', version: 'V9.2026 / V2.2026', original: false, secondaryUrl: 'https://www.nccn.org/guidelines/nccn-guidelines/guidelines-detail?category=1&id=1451', note: '官网需注册' }
      ]
    }
  ]
}
