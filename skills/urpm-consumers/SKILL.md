---
name: urpm-consumers
description: TCL URPM 平台消费者 Agent 管理。CRUD 数字消费者档案（consumer_profiles），让 Agent 从关联的访谈样本中"学习"形成画像，并以受访者身份进行 AI 对话（chat）、查看对话历史和会话。当用户提到"创建数字消费者/受访者"、"让 22 号 consumer 学习一下"、"以 22 号消费者身份回答这个问题"、"看消费者 Agent 的画像"、"聊一下宝妈消费者关于 XX 的看法"、"清空对话历史"时使用。依赖 urpm-shared（先登录）。
---

# urpm-consumers — 消费者 Agent

## 触发场景

- "创建一个消费者档案：广州张女士、35 岁、教师、有 2 个孩子"
- "把样本 87 的受访者建成消费者 Agent"（→ 用 `urpm-samples create-agent`）
- "让 22 号 consumer 学习它名下的所有访谈，生成画像"
- "以宝妈视角问：你买空调时最看重什么？"
- "看下消费者 22 的对话历史 / 所有会话"
- "清空消费者 22 的对话"

## 关键字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✅ | 姓名（虚构或脱敏） |
| `gender` |  | 男/女 |
| `age_range` |  | 例: `25-35` / `35-45` |
| `occupation` |  | 职业 |
| `income_level` |  | 收入水平 |
| `location` |  | 城市 |
| `education` |  | 学历 |
| `family_status` |  | 家庭情况 |
| `consumer_type` |  | 类型（访谈受访者 / 目标用户画像 / 决策者...） |
| `consumption_habits` |  | 消费习惯 |
| `brand_preference` |  | 品牌偏好 |
| `characteristics` |  | 个性特点 |
| `--avatar <path>` |  | 头像图片 |

> 权限：只有 `creator_id` 等于当前登录用户、或 admin 才能 update / delete。

## 命令

### CRUD

```bash
# 列表
urpm consumers list --consumer_type "访谈受访者"
urpm consumers list --age_range "25-35" --gender 女 --json

# 详情
urpm consumers get 22 --json

# 创建（带头像）
urpm consumers create \
  --name "张女士" --gender 女 --age_range "35-45" \
  --occupation "小学教师" --income_level "20-30万" \
  --location "广州" --education "本科" \
  --family_status "已婚有 2 孩" \
  --consumer_type "访谈受访者" \
  --consumption_habits "理性, 注重性价比" \
  --brand_preference "美的、格力、TCL" \
  --characteristics "对噪音敏感, 在意能效" \
  --avatar ./avatars/zhang.png --yes

# 更新
urpm consumers update 22 --consumption_habits "..." --yes

# 删除
urpm consumers delete 22 --yes
```

### 学习（让 Agent 吸收名下样本）

```bash
# 学习当前关联的所有访谈样本, 自动生成 ai_profile_summary
urpm consumers learn 22 --yes
```

### 对话（核心能力）

```bash
# 默认 session_id=default
urpm consumers chat 22 --question "你购买空调时最看重什么？"

# 多 session（按主题分组对话）
urpm consumers chat 22 --question "夏天怎么使用空调？" --session_id "summer-usage"

# 历史
urpm consumers conversations 22                     # 默认 session
urpm consumers conversations 22 --session_id summer-usage
urpm consumers sessions 22                          # 列出所有 session

# 清空
urpm consumers clear-conversations 22 --yes
urpm consumers clear-conversations 22 --session_id summer-usage --yes
```

## 给 Agent 的提示

1. **建议工作流**：
   - 先用 `urpm-samples create-agent <sample_id>` **从访谈样本批量建** consumer，比手动 create 准确
   - 再 `learn` 让 Agent 吸收画像
   - 然后 `chat` 用于产品概念验证、用户旅程测试
2. **chat 是 LLM 调用，按 token 计费**：避免循环刷问题。
3. **对话历史按 user_id 隔离**：当前登录账号只能看自己发起的会话。
4. **session_id 设计**：默认 `default`；做主题研究建议按主题分（`pricing-decision`、`use-scenario` 等）。
5. **学习触发时机**：consumer 名下样本变化（新增/重新分析后）需要重新 `learn`，否则 Agent 用旧画像答题。
6. **chat 不是 dry-run**：`chat` 是只读问答（不改动 profile，但会写对话日志），所以**不需要 `--yes`**，可直接发请求。
