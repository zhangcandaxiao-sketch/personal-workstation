// EXPORTS: ITodo{id,text,done,createdAt,dueDate}

export interface ITodo {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;      // 创建时间戳
  dueDate: string;        // 截止日期，格式 YYYY-MM-DD，空串表示无日期
}
