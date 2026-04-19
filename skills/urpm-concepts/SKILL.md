---
name: urpm-concepts
description: TCL URPM 平台概念库管理。CRUD 概念（concepts），从一组痛点 ID 合成产品概念或功能概念，按 FABES（特征-优势-利益-证据-故事）和 013 卖点（基础-必备-期望）维度结构化输出。当用户提到"基于痛点 101,102 合成一个产品概念"、"生成功能概念"、"看高评分概念"、"概念评分（可行性/创新性/影响力）"、"概念列表按状态筛选"、"FABES 拆解"、"013 卖点"时使用。依赖 urpm-shared（先登录）。
---

# urpm-concepts — 概念库

## 触发场景

- "基于痛点 [101,102,103] 合成一个产品概念"
- "为这些痛点生成一个功能概念"
- "新建概念：C7 Plus 静音模式"
- "看下评分最高的概念" / "构思中的概念列表"
- "把概念 55 改成已采纳"
- "对概念 55 写条评论"

## 概念分类（关键）

| concept_category | 适用 | 关键字段 |
|---|---|---|
| `产品概念` | 整机/品类层面 | target_segment, target_scenario, core_needs, **FABES** (5字段), **013 卖点** (3字段), data_sources |
| `功能概念` | 单一功能/特性 | painpoint_analysis, function_design, implementation_plan, prototype_url, tech_feasibility |

**FABES 字段**: `fabs_features` 特征 / `fabs_advantages` 优势 / `fabs_benefits` 利益 / `fabs_evidence` 证据 / `fabs_story` 用户故事

**013 卖点**: `selling_points_basic` 基础 / `selling_points_must` 必备 / `selling_points_wow` 期望

## 通用字段

| 字段 | 说明 |
|---|---|
| `title` `description` | 必填 |
| `concept_category` | 默认"产品概念" |
| `type` | 自定义类型 |
| `status` | 构思中（默认）/ 评审中 / 已采纳 / 已废弃 |
| `project_id` | 归属项目 |
| `target_users` `expected_benefits` `estimated_cost` `estimated_timeline` | 商务字段 |
| `feasibility_score` `innovation_score` `impact_score` | 0-10 评分，三者均值自动算 `rating` |
| `tags` | JSON 数组或逗号分隔 |
| `painpoint_ids` | 来源痛点 |
| `data_sources` | JSON 字符串 `[{type, ref}]` |

## 命令

### CRUD

```bash
# 列表
urpm concepts list --concept_category 产品概念 --status 构思中
urpm concepts list --search "静音" --json

# 详情 / 统计
urpm concepts get 55 --json
urpm concepts stats --json

# 创建：产品概念
urpm concepts create \
  --title "C7 Plus 静音模式" \
  --description "针对夜间睡眠场景的超静音模式" \
  --concept_category 产品概念 \
  --target_segment "高端家庭" \
  --target_scenario "夜间睡眠" \
  --core_needs "降低运行噪音, 同时保证制冷效果" \
  --fabs_features "贯流风扇 + 智能压机调速" \
  --fabs_advantages "运行噪音 ≤22dB" \
  --fabs_benefits "整夜安静睡眠, 不被惊醒" \
  --fabs_evidence "实验室对比测试 + 30 户用户测试" \
  --fabs_story "王女士反馈宝宝再也不被空调声惊醒" \
  --selling_points_basic "制冷快" \
  --selling_points_must "低噪音" \
  --selling_points_wow "智能感知翻身, 自动调风" \
  --painpoint_ids "[101,102]" \
  --feasibility_score 8 --innovation_score 7 --impact_score 9 --yes

# 创建：功能概念
urpm concepts create \
  --title "宝宝睡眠模式" \
  --description "..." \
  --concept_category 功能概念 \
  --painpoint_analysis "..." \
  --function_design "..." \
  --implementation_plan "..." \
  --tech_feasibility "..." \
  --painpoint_ids "[101]" --yes

# 更新
urpm concepts update 55 --status 已采纳 --yes

# 删除
urpm concepts delete 55 --yes

# 评论
urpm concepts comments 55 --content "建议作为 2026 H2 重点项目" --yes
```

### AI 生成（核心能力）

```bash
# 通用：从痛点合成概念
urpm concepts generate-from-painpoints \
  --painpoint_ids "[101,102,103]" \
  --product_line "家用空调" --yes

# 直接生成产品概念（含 FABES + 013 卖点）
urpm concepts generate-product-concept \
  --painpoint_ids "[101,102,103]" \
  --product_line "家用空调" \
  --target_users "高端家庭" \
  --extra_instruction "重点突出夜间睡眠场景" --yes

# 直接生成功能概念
urpm concepts generate-function-concept \
  --painpoint_ids "[101]" \
  --extra_instruction "聚焦智能调风算法" --yes
```

## 给 Agent 的提示

1. **先看痛点再生成**：用户说"基于这几个痛点生成"时，先 `urpm painpoints get <id>` 确认痛点确实存在且相关。
2. **AI 生成是写操作**：会落库为新概念（status=构思中），需 `--yes` 才执行。
3. **评分**：三个评分填齐后 rating 自动算均值；只填一两个不算。
4. **数组字段格式**：`painpoint_ids` 用 JSON 字符串：`"[101,102]"`；`tags` 可用 `"a,b,c"` 或 `'["a","b"]'`。
5. **状态机**：`构思中 → 评审中 → 已采纳/已废弃`，update 时按业务节奏推进。
