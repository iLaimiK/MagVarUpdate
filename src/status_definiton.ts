
// 定义慕心的状态接口
// noinspection NonAsciiCharacters,JSNonASCIINames
// TypeScript 类型定义

// 用于表示 [value, description] 格式的类型
type ValueWithDescription<T> = [T, string];

// 日程类型
type Schedule = {
  [timeSlot: string]: ValueWithDescription<string>
};

// 星期日程类型
type WeekSchedule = {
  [day: string]: Schedule
};

// 地点状态类型
type LocationStatus = {
  status: ValueWithDescription<string>;
  description: string;
  memory: string;
  malfunction: ValueWithDescription<string>;
};

// 区域类型
type Area = {
  [locationName: string]: LocationStatus;
};

// 所有地点类型
type Locations = {
  [areaName: string]: Area;
};

// 认知类型
type Cognition = {
  [place: string]: ValueWithDescription<string>;
};

type EventList = {
  [event: string]: number;//0 代表未经历，1代表经历过
};

// 暮莲类型
type Kuren = {
  地点: ValueWithDescription<string>;
  时段: ValueWithDescription<string>;
  "好感度-user": ValueWithDescription<number>;
  "好感度-透花": ValueWithDescription<number>;
  认知: Cognition;
  日程: WeekSchedule;
  重要物品: ValueWithDescription<string>;
  重要记忆: ValueWithDescription<string>;
  着装: ValueWithDescription<string>;
  性行为次数: ValueWithDescription<number>;
  情欲值?: number;
  处女: ValueWithDescription<string>;
};

// 透花类型
type Touka = {
  地点: ValueWithDescription<string>;
  时段: ValueWithDescription<string>;
  "好感度-user": ValueWithDescription<number>;
  "好感度-暮莲": ValueWithDescription<number>;
  认知: Cognition;
  日程: WeekSchedule;
  苏醒: ValueWithDescription<number>;
  重要物品: ValueWithDescription<string>;
  重要记忆: ValueWithDescription<string>;
  着装: ValueWithDescription<string>;
  性行为次数: ValueWithDescription<number>;
  处女: ValueWithDescription<string>;
  情欲值?: number;
};

type UserStatus = {
  地点: ValueWithDescription<string>;
  时段: ValueWithDescription<string>;
  剩余时间: ValueWithDescription<number>;
  认知: Cognition;
  未来的印记?: string;
  流星雨的回忆?: string;
  重要物品: ValueWithDescription<string>;
  重要记忆: ValueWithDescription<string>;
  情欲值?: number;
};

// 整体游戏数据类型
type GameData = {
  日期: ValueWithDescription<string>;
  备注: ValueWithDescription<string>;
  当前事件: ValueWithDescription<string>;
  暮莲: Kuren;
  透花: Touka;
  设施信息: Locations;
  user: UserStatus;
  经历: EventList;
};
