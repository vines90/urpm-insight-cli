---
name: urpm-painpoints
description: TCL URPM 平台痛点库管理。CRUD 痛点（painpoints）、维护痛点标签、给痛点自动打标签、关联痛点与样本、从用户/专家视角 AI 分析痛点、批量创建、预览从文本中可抽取的痛点。当用户提到"看一下高优先级痛点"、"给痛点 ID=101 自动打标签"、"批量为没标签的痛点打标"、"从这段话里能抽出哪些痛点"、"把痛点 101 关联到样本 87"、"专家视角分析这个痛点"时使用。依赖 urpm-shared（先登录）。
---

# urpm-painpoints — 痛点库

## 触发场景

- "列出家用空调高优先级痛点"
- "新建一个痛点：夏季制冷慢"
- "给痛点 ID=101 自动打标签"
- "把所有没标签的痛点都自动打一遍"
- "把痛点 101 关联到样本 87"
- "用专家视角分析痛点 101"
- "从这段访谈片段里能抽出哪些痛点"

## 字段速查

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 痛点标题 |
| `description` | ✅ | 详细描述 |
| `category` |  | 性能/外观/服务/价格/其他... |
| `priority` |  | 高优先级 / 中优先级 / 低优先级 |
| `severity` |  | 严重程度 |
| `impact_score` |  | 影响评分 0-10（默认 5.0） |
| `source` |  | 来源（手动创建/AI 抽取...） |
| `product_line` `user_segment` `project_id` |  | 归属 |
| `related_products` |  | 关联机型 |
| `is_ux_issue` |  | 是否 UX 问题 |
| `tag_ids` / `tags` |  | 标签 ID 数组（JSON） |
| `source_sample_ids` |  | 来源样本 ID 数组（JSON） |

## 命令

### CRUD

```bash
# 列表（支持多维筛选）
urpm painpoints list --product_line "家用空调" --priority 高优先级
urpm painpoints list --tag_id 5 --status open
urpm painpoints list --search "制冷" --pageSize 50 --json

# 详情
urpm painpoints get 101 --json

# 统计
urpm painpoints stats --json

# 创建
urpm painpoints create \
  --title "夏季制冷慢" \
  --description "用户反馈高温环境下 C7 制冷启动慢, 需要等 5-10 分钟" \
  --category 性能 --priority 高优先级 --impact_score 8 \
  --product_line "家用空调" \
  --source_sample_ids "[87,88]" --yes

# 更新
urpm painpoints update 101 --priority 中优先级 --status in_progress --yes

# 删除
urpm painpoints delete 101 --yes
```

### 标签管理

```bash
urpm painpoints tags                              # 列出全部
urpm painpoints add-tag --name "夏季场景" --color "#ff5722" --yes
urpm painpoints delete-tag 12 --yes

# 自动打标
urpm painpoints auto-tag 101 --yes                # 单个
urpm painpoints auto-tag-batch --yes              # 全量未打标
```

### 关联

```bash
urpm painpoints link-sample 101 --sample_id 87 --yes
urpm painpoints comments 101 --content "建议优先排进 2026Q3 OTA" --yes
```

### AI 分析

```bash
urpm painpoints analyze-user 101 --yes        # 用户视角
urpm painpoints analyze-expert 101 --yes      # 专家视角

# 不写库, 仅预览能从一段文本/某个样本里抽出哪些痛点
urpm painpoints extract-preview --text "用户说夏天空调启动慢..." --product_line "家用空调"
urpm painpoints extract-preview --sample_id 87
```

### 批量创建

```bash
urpm painpoints batch \
  --items '[
    {"title":"噪音偏大","description":"...","category":"性能","priority":"高优先级"},
    {"title":"遥控器复杂","description":"...","category":"交互","priority":"中优先级"}
  ]' --yes
```

## 给 Agent 的提示

1. **抽痛点 vs 创建痛点**：从样本里 AI 抽痛点应优先用 `urpm samples extract-painpoints <id>`，会自动建 painpoint + 关联样本。手动 `painpoints create` 用于专家补充。
2. **打标签策略**：批量补标用 `auto-tag-batch`；新增/重要痛点用 `auto-tag <id>`；不要在循环里重复触发 AI。
3. **数组类字段**：`source_sample_ids`、`tag_ids`、`tags` 一律传 JSON 字符串：`--source_sample_ids "[87,88]"`。
4. **优先级和分类用中文枚举**：`高优先级`、`中优先级`、`低优先级`；`性能`、`外观`、`服务`、`价格`、`其他`等。
5. **下一步常用**：抽完痛点后，用户通常会基于痛点 `urpm-concepts generate-product-concept` 合成产品概念。
