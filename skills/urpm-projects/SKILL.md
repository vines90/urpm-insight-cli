---
name: urpm-projects
description: TCL URPM 平台研究项目管理。创建/查询/更新/删除研究项目（research_projects），管理项目成员，按产品线/状态/类型筛选，查看项目下的样本/痛点/概念统计。当用户提到"创建研究项目"、"看一下进行中的项目"、"按产品线列项目"、"把项目改成已完成"、"加成员到项目"、"项目统计概览"时使用。依赖 urpm-shared（先登录）。
---

# urpm-projects — 研究项目

## 触发场景

- "新建一个用研项目 / 创建项目 XXX"
- "列一下家用空调的所有研究项目"
- "看下项目 ID=12 的详情和成员"
- "把项目状态改成已完成"
- "添加 XXX 到项目 12 作为 owner / member"
- "项目统计：进行中 vs 已完成"

## 字段速查

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✅ | 项目名称 |
| `description` |  | 描述 |
| `project_code` |  | 编号 |
| `project_type` |  | 类型（用户调研、概念测试...） |
| `product_line` |  | 产品线（家用空调、商用空调...） |
| `target_users` |  | 目标人群 |
| `status` |  | 进行中（默认）/ 已完成 / 暂停 |
| `start_date` `end_date` |  | YYYY-MM-DD |
| `owner_name` |  | 业务负责人 |

> 权限：只有 `creator_id` 等于当前登录用户 ID 时才能 update / delete。

## 命令

```bash
# 必备：先登录
urpm auth login --env=prod

# 列表（带筛选）
urpm projects list
urpm projects list --product-line "家用空调" --status 进行中
urpm projects list --search "C7" --pageSize 50 --json

# 详情
urpm projects get 12
urpm projects get 12 --json

# 平台统计
urpm projects stats --json

# 全局产品线选项
urpm projects product-lines

# 创建（先 dry-run）
urpm projects create \
  --name "C7挂机回访 2026Q2" \
  --product_line "家用空调" \
  --project_type "用户回访" \
  --status 进行中 \
  --start_date 2026-04-01 \
  --owner_name "李洋"
# 确认无误后加 --yes 提交

# 更新
urpm projects update 12 --status 已完成 --end_date 2026-06-30 --yes

# 删除
urpm projects delete 12 --yes

# 成员
urpm projects members 12 --add 5 --role member --yes
urpm projects members 12 --remove 5 --yes
```

## 给 Agent 的提示

1. **创建前查重**：用户说"创建项目"时，先 `urpm projects list --search "..."` 检查是否已存在同名项目。
2. **id 不要乱编**：`update / delete / members` 必须先用 `list` 或 `search` 拿到真实 id。
3. **状态联动**：用户说"项目结束了"= `update --status 已完成 --end_date <today>`。
4. **常和 samples 联动**：创建完项目后通常下一步是上传样本，提示用户用 `urpm-samples` skill。
5. 中文枚举值原样传：`--status 进行中`、`--product_line "家用空调"`，不要翻译成英文。
