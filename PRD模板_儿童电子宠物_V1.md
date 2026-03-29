# PRD：儿童电子宠物网页版（V1 模板 + 首版示例）

## 1. 背景与目标
### 1.1 背景
6 岁儿童在日常习惯（洗漱、整理、作息）和学习执行（识字、数学、阅读）上常依赖家长高频提醒，家长管理成本高，孩子主动性弱。

### 1.2 本期目标（8 周）
- 将目标家庭的“日任务完成率”提升到 **≥70%**。
- 将“连续打卡中位数”提升到 **≥5 天**。
- 家长每周至少完成 1 次任务规则调整（可运营）。

## 2. 用户与场景
### 2.1 用户画像
- 孩子（5-8 岁）：低阅读能力，偏好即时反馈。
- 家长：希望低成本督促并可查看行为数据。

### 2.2 核心场景
- 晨间习惯：刷牙/整理床铺。
- 晚间习惯：整理书包/阅读打卡。
- 学习微任务：5 分钟识字或数学小游戏。

## 3. 功能范围
### In Scope（V1）
1. 宠物主页（状态 + 今日目标）
2. 今日任务清单（生活 + 学习）
3. 完成任务后的即时奖励（星星 + 宠物状态提升）
4. 家长设置页（任务启停、难度、时段）
5. 基础数据看板（完成率、连续打卡）

### Out of Scope（V1）
- 多人社交
- 付费商城
- 高复杂剧情系统

## 4. 用户故事与验收标准
### 用户故事 A（孩子）
As a child, I want to complete one easy task and see my pet become happier, so that I feel motivated.

**验收标准**
- Given 孩子打开首页，When 进入今日任务，Then 可在 2 次点击内开始任务。
- Given 任务完成，When 提交结果，Then 1 秒内看到奖励动画和星星增加。

### 用户故事 B（家长）
As a parent, I want to configure tasks in under 3 minutes, so that it fits my daily routine.

**验收标准**
- Given 家长进入控制台，When 修改任务难度，Then 新规则次日生效并可回溯。

## 5. 信息架构
1. `/` 宠物首页
2. `/tasks` 今日任务
3. `/rewards` 奖励页
4. `/parent` 家长控制台
5. `/insights` 数据看板

## 6. 规则引擎（V1）
- 每日默认 3 个任务（2 生活 + 1 学习）。
- 连续 3 天完成率 >= 80%，次日任务 +1。
- 连续 2 天完成率 < 40%，次日任务 -1（不低于 2 个）。
- 每日星星上限：30，防过度刺激。

## 7. 数据与埋点
### 7.1 关键实体
family, user(parent/child), pet, task_template, daily_task, checkin, reward_ledger

### 7.2 关键事件
- task_assigned
- task_started
- task_completed
- reward_granted
- streak_incremented
- parent_rule_updated

## 8. 技术方案
- 前端：Vanilla JS 原型（当前）→ React + TS（下一迭代）
- 后端：Node.js API（下一迭代）
- 数据库：PostgreSQL（见 `db/schema.sql`）

## 9. 发布计划
- W1: PRD + 原型 + 数据模型
- W2: API + 登录/任务闭环
- W3: 家长控制台 + 埋点
- W4: 小范围试点

## 10. 风险与待决策项
- 风险：孩子新鲜感衰减，需要每 2-4 周内容更新。
- 待决策：是否在 V1 引入语音识别打卡（Owner: 产品，DDL: 下周三）。
