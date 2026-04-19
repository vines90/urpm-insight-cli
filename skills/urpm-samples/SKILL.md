---
name: urpm-samples
description: TCL URPM 平台访谈样本管理。上传访谈记录文件（txt/md/docx）到样本库（research_samples）、CRUD、运行 AI 摘要分析、抽取痛点、深度分析（含研究框架）、跟踪分析任务、关联消费者 Agent。当用户提到"导入访谈"、"上传笔录"、"批量导入样本"、"对样本做 AI 分析/摘要"、"从样本里抽痛点"、"深度分析这个访谈"、"看深度分析进度"、"基于样本创建消费者 agent"时使用。依赖 urpm-shared（先登录）。
---

# urpm-samples — 访谈样本

## 触发场景

- "把这个访谈记录上传到样本库"、"导入笔录到项目 12"
- "批量导入 ./笔录 下面的所有 docx"
- "对样本 87 跑一下 AI 摘要" / "重新解析"
- "从样本 87 里抽痛点出来"
- "对样本 87 启动深度分析（用框架 ID=3）"
- "看下样本 87 的分析任务状态"
- "把样本 87 的受访者建成消费者 Agent"

## 关键字段

**基础**: `title`(必填), `sample_type`(默认"深度访谈"), `project_id`, `content`, `product_line`, `interview_date`, `interview_duration`, `interviewer`, `interview_location`, `tags`

**受访者**: `respondent_name`, `respondent_gender`, `respondent_age`, `respondent_occupation`, `respondent_location`, `respondent_income`, `respondent_family`

**自动化开关**: `auto_analyze=true|false`、`auto_create_consumer=true|false`

**上传**: `--file <访谈正文.docx>`、`--image <现场图.jpg>`（可重复）

> 上传时若不传 `content`，后端会自动用 `documentParser` 从 docx/doc/txt/md 解析正文。

## 命令

### CRUD

```bash
# 列表
urpm samples list --project_id 12 --ai_analyzed false --pageSize 50
urpm samples list --search "C7挂机" --product_line "家用空调"

# 详情（含完整 content）
urpm samples get 87 --json

# 创建：纯文本
urpm samples create \
  --title "广州C7回访-王先生" --project_id 12 \
  --product_line "家用空调" --interview_date 2026-04-01 \
  --respondent_name "王先生" --respondent_age "35-45" \
  --content "Q: ...\nA: ..." --yes

# 创建：上传 docx 文件 + 自动分析 + 自动建 consumer
urpm samples create \
  --title "广州C7回访-王先生" --project_id 12 \
  --product_line "家用空调" --interview_date 2026-04-01 \
  --respondent_name "王先生" \
  --file ./笔录/广州_王先生.docx \
  --auto_analyze true --auto_create_consumer true --yes

# 更新元数据
urpm samples update 87 --interview_location "广州" --tags "C7,回访,夏季" --yes

# 删除
urpm samples delete 87 --yes

# 批量导入（一次提交多个文件）
urpm samples batch-import \
  --files ./笔录/a.docx --files ./笔录/b.docx \
  --project_id 12 --product_line "家用空调" --auto_analyze true --yes
```

### AI 分析（写操作，需 --yes）

```bash
# 1) 摘要分析（生成 ai_summary）
urpm samples analyze 87 --yes

# 2) 抽痛点（生成 painpoints 并关联）
urpm samples extract-painpoints 87 --yes

# 3) 重新解析文件
urpm samples reparse 87 --yes

# 4) 深度分析（启动后台任务）
urpm samples deep-analyze 87 --framework_id 3 --yes

# 5) 拉深度报告 / 状态
urpm samples deep-analysis 87 --json
urpm samples deep-analysis-status 87
urpm samples regenerate-report 87 --yes
urpm samples reanalyze-with-framework 87 --framework_id 5 --yes
```

### 任务跟踪

```bash
urpm samples tasks 87                    # 该样本所有任务
urpm samples task <task_id>              # 任务详情
urpm samples current-task 87             # 当前进行中的任务
urpm samples reset-stuck-analysis --yes  # 全局重置卡住的任务
```

### 与 Consumer 关联

```bash
urpm samples link-consumer 87 --consumer_id 22 --yes  # 关联到已有 consumer
urpm samples create-agent 87 --yes                    # 基于受访者新建 consumer
```

### 痛点列表

```bash
urpm samples painpoints 87
```

## 给 Agent 的提示

1. **先建项目再上传样本**：`project_id` 是软关联，但建议有；先 `urpm projects list` 拿 id。
2. **大批量导入**：超过 5 个文件的导入用 `batch-import`，不要 for 循环 `create`。
3. **AI 操作昂贵且耗时**：
   - `analyze` / `extract-painpoints` / `deep-analyze` 都按 LLM token 计费
   - 触发后用 `tasks` 或 `current-task` 轮询，不要并行重复发起
4. **dry-run 优先**：`create` 默认 dry-run，先让用户检查字段映射，再加 `--yes`
5. **日期格式**：`interview_date` 必须是 `YYYY-MM-DD`，否则后端 INSERT 会失败
6. **上传文件路径**：相对路径会基于命令执行的 cwd 解析，建议用绝对路径或先 `cd` 到对的目录
