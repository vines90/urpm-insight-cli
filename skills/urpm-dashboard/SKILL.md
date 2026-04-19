---
name: urpm-dashboard
description: TCL URPM 平台总览和全局检索。查看平台 dashboard（项目/样本/痛点/概念/Consumer 总数 + 最近活动），全局搜索（跨 5 类对象按关键词），列出全局产品线选项，查看用户工作量统计，做平台健康检查。当用户提到"看下 URPM 整体情况"、"最近平台动态"、"全局搜一下 C7"、"哪些产品线有数据"、"看每个用户的工作量"、"insight 后端通不通"时使用。依赖 urpm-shared（先登录）。
---

# urpm-dashboard — 平台总览与搜索

## 触发场景

- "URPM 平台整体情况怎么样" / "今天看下 dashboard"
- "最近平台有哪些新增"
- "全局搜一下 C7" / "找一下跟'静音'相关的所有内容"
- "看下都有哪些产品线"
- "团队每个人贡献了多少样本/痛点/概念"
- "insight 数据库通不通"

## 命令

### 平台总览

```bash
# 总数 + 最近 10 条活动（项目/样本/痛点/概念）
urpm dashboard overview
urpm dashboard overview --json

# 健康检查
urpm dashboard health
```

### 全局搜索（跨 5 类对象）

```bash
# 默认 5 类全搜
urpm dashboard search --q "C7挂机" --limit 20

# 限定类型
urpm dashboard search --q "静音" --type sample
urpm dashboard search --q "宝妈" --type consumer
# type 取值: project | sample | painpoint | concept | consumer
```

输出按 bucket 分组：
```
bucket    id  type      title           description
projects  12  project   C7回访 2026Q2  ...
samples   87  sample    广州C7-王先生   ...
```

### 元数据

```bash
urpm dashboard product-lines     # 所有有数据的产品线（去重）
urpm dashboard user-stats        # 各用户的项目/样本/痛点/概念计数
```

## 给 Agent 的提示

1. **第一次接触平台时**：先 `urpm dashboard overview` + `urpm dashboard product-lines` 摸底，再决定切入哪个产品线/项目。
2. **检索优先级**：用户给关键词时，先 `urpm dashboard search`，比一上来按 list 翻页快很多。
3. **`search` 关键词最少 2 字**，否则后端会 400。
4. **观察后再行动**：用 `overview` 或 `user-stats` 报数据时优先 `--json`，便于后续解析归纳。
5. **健康检查用于排错**：遇到 5xx 时先 `urpm dashboard health` 判断是否后端 / 数据库挂了。
