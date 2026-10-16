// 简讯写作辅助工具：材料准备 + 事实核查 + 流程指引
// 豆包工作内置简讯skill负责生成，本模块只做skill之外的辅助

/** 材料准备清单项 */
export interface ChecklistItem {
  id: string;
  text: string;
  hint?: string;
}

/** 材料准备清单：写之前要逐项准备好 */
export const PREPARE_CHECKLIST: ChecklistItem[] = [
  { id: 'name', text: '活动全称与规范定名', hint: '有没有官方主题标语？用全称不用简称' },
  { id: 'type', text: '活动性质确认', hint: '已完成 / 当日进行 / 预热预告——这决定时态表述，严禁把预热写成已办' },
  { id: 'time', text: '精准时间（具体到日）', hint: '尽量写到"×月×日"，少用"近日""日前"' },
  { id: 'location', text: '具体地点', hint: '写到具体场地，如"深圳（黄石）离岸科创中心"' },
  { id: 'orgs', text: '主办/协办/承办/支持单位（分层确认）', hint: '谁牵头组织、谁派员、谁支持，逐一确认；仅出席的不写进"主办"' },
  { id: 'main-leader', text: '主要领导完整职务 + 姓名', hint: '职务务必准确，首次出现用全称' },
  { id: 'leader-action', text: '主要领导在活动中的环节动作', hint: '致辞 / 总结讲话 / 推介讲话 / 调研——按实际环节准确表述，不能想当然' },
  { id: 'leader-quote', text: '领导金句/核心观点（如有）', hint: '必须是原话，不杜撰；没有就不写' },
  { id: 'key-sessions', text: '核心环节与创新做法', hint: '哪些要详写、哪些一笔带过，心里有数' },
  { id: 'data', text: '现场可量化数据', hint: '参会企业数、路演数、报名数等；没有的数据绝不编造' },
  { id: 'highlights', text: '核心亮点提炼（1-3个）', hint: '这事儿跟以往有什么不一样？最大的突破点是什么？' },
  { id: 'policy-bg', text: '对标上级政策/部署', hint: '如：党的二十届四中全会、"十五五"规划、市级专项部署' },
  { id: 'channel', text: '发布渠道与受众', hint: '官网/公众号/简报/上报？对内突出做法成效，对外突出民生获得感' },
  { id: 'word-count', text: '字数要求', hint: '短讯150字内 / 常规300-500字 / 长简讯800字+' },
];

/** 事实核查清单：初稿写完后逐项检查 */
export const FACT_CHECK_CHECKLIST: ChecklistItem[] = [
  { id: 'time-check', text: '时间精确到日，无"近日""日前"等模糊表述' },
  { id: 'loc-check', text: '地点具体到场地，无模糊表述' },
  { id: 'leader-name', text: '主要领导职务姓名准确，首次出现用全称' },
  { id: 'leader-action-check', text: '领导动作称谓准确（致辞/总结讲话/推介讲话），不臆造' },
  { id: 'org-layer', text: '主办/协办/支持分层正确，仅出席的单位没写进"主办"' },
  { id: 'org-fullname', text: '单位全称准确，无简写错误（如"驻深办事处"vs"人民政府驻深圳办事处"）' },
  { id: 'data-check', text: '所有数据有据可查，无编造' },
  { id: 'no-empty-words', text: '无"圆满完成""顺利召开""大家纷纷表示"等空话套话' },
  { id: 'no-subjective', text: '无"成效显著""广受好评""意义重大"等主观评价词' },
  { id: 'inverted-pyramid', text: '倒金字塔结构：核心信息在前，不是时间流水账' },
  { id: 'no-policy-dump', text: '开篇没有大段堆砌"为深入贯彻……"式政策套话' },
  { id: 'no-cliche-ending', text: '结尾没有"注入澎湃动能""奋力谱写新篇章"等烂大街句式' },
  { id: 'one-sentence-one-idea', text: '一句一意，无超长病句、主语不跳跃' },
  { id: 'third-person', text: '全程第三人称叙事，无第一人称' },
  { id: 'audience-fit', text: '内外口径正确：对内突出做法成效，对外突出民生获得感' },
  { id: 'no-template', text: '无万能模板句式，不是千篇一律的套话' },
];

/** 写作流程指引 */
export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  action: string;
}

export const WRITING_PROCESS: ProcessStep[] = [
  {
    step: 1,
    title: '准备素材',
    description: '对照"材料准备"清单，逐项把材料凑齐。',
    action: '在下方「材料准备」Tab 里逐项打勾，准备好一项勾一项。',
  },
  {
    step: 2,
    title: '豆包工作生成初稿',
    description: '打开豆包工作（普通对话模式），把准备好的素材发给它，让它用简讯skill写。',
    action: '提示词参考："请使用简讯写作skill，根据以下素材撰写政务简讯。素材：……"',
  },
  {
    step: 3,
    title: '事实核查',
    description: '初稿出来后，对照"事实核查"清单逐项过一遍。',
    action: '切换到「事实核查」Tab，逐项检查，有问题的改掉。',
  },
  {
    step: 4,
    title: '打磨定稿',
    description: '改完事实错误，再读一遍，把啰嗦的、套话的地方删掉。',
    action: '逐句回读：每句话有没有提供新信息？没有的整句删掉。',
  },
];
