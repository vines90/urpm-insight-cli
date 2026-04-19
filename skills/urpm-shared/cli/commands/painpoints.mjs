/**
 * 痛点库命令 (painpoints)
 *
 * 字段:
 *   title (必填), description (必填), category, priority, severity, impact_score,
 *   source, product_line, user_segment, project_id, related_products, is_ux_issue,
 *   status, tags (id 数组), tag_ids (id 数组), source_sample_ids (sample id 数组)
 */
import { request } from '../http.mjs';
import { parseArgs, pickFields, shouldExecute, getFormat, requireArg } from '../args.mjs';
import { render, printSuccess, printError } from '../output.mjs';

const FIELDS = [
  'title',
  'description',
  'category',
  'priority',
  'severity',
  'impact_score',
  'source',
  'product_line',
  'user_segment',
  'project_id',
  'related_products',
  'is_ux_issue',
  'status',
  'tags',
  'tag_ids',
  'source_sample_ids'
];

const LIST_COLUMNS = [
  'id',
  'title',
  'category',
  'priority',
  'severity',
  'impact_score',
  'product_line',
  'frequency',
  'status',
  'created_at'
];

function help() {
  process.stderr.write(`urpm painpoints <subcommand> [options]

CRUD:
  list                       列出痛点
  get <id>                   查看详情
  stats                      统计概览
  create                     创建痛点
  update <id>                更新痛点
  delete <id>                删除痛点

标签:
  tags                       列出全部标签
  add-tag --name <n>         新建标签
  delete-tag <tag_id>        删除标签
  auto-tag <id>              对单个痛点自动打标
  auto-tag-batch             对全部未打标痛点批量自动打标

AI 分析:
  analyze-user <id>          从用户视角分析
  analyze-expert <id>        从专家视角分析
  extract-preview            预览从文本中可抽取的痛点 (--text 或 --sample_id)

关联:
  link-sample <id> --sample_id <sid>      关联痛点到样本
  comments <id> --content "..."           添加评论

批量:
  batch                      批量创建 (--items '[{...},{...}]')

Common flags:
  --env --json --tsv
  --search --category --priority --product_line --project_id
  --tag_id --status --source --user_segment
  --page --pageSize --sortBy --sortOrder

Examples:
  urpm painpoints list --product_line "家用空调" --priority 高优先级
  urpm painpoints create --title "夏季制冷慢" --description "用户反馈C7..." \\
       --category 性能 --priority 高优先级 --product_line "家用空调" \\
       --source_sample_ids "[87,88]" --yes
  urpm painpoints auto-tag-batch --yes
`);
}

export async function run(argv) {
  const { positional, flags } = parseArgs(argv);
  const sub = positional[0];
  if (!sub || sub === 'help' || flags.help) return help();

  const env = flags.env;
  const format = getFormat(flags);

  switch (sub) {
    case 'list': {
      const data = await request('/api/insight/painpoints', {
        env,
        query: {
          search: flags.search,
          category: flags.category,
          priority: flags.priority,
          product_line: flags.product_line,
          project_id: flags.project_id,
          tag_id: flags.tag_id,
          status: flags.status,
          source: flags.source,
          user_segment: flags.user_segment,
          page: flags.page,
          pageSize: flags.pageSize,
          sortBy: flags.sortBy,
          sortOrder: flags.sortOrder
        }
      });
      render({ rows: data.data, columns: LIST_COLUMNS }, {
        format,
        summary: `total=${data.pagination?.total ?? data.data?.length ?? 0}`
      });
      return;
    }

    case 'get': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const data = await request(`/api/insight/painpoints/${id}`, { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'stats': {
      const data = await request('/api/insight/painpoints/stats', { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'create': {
      const body = pickFields(flags, FIELDS);
      requireArg(body.title, '--title');
      requireArg(body.description, '--description');
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会创建. 加 --yes 确认');
        render({ item: body }, { format });
        return;
      }
      const data = await request('/api/insight/painpoints', { env, method: 'POST', body });
      printSuccess(`痛点已创建: id=${data.data.id}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'update': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const body = pickFields(flags, FIELDS);
      if (Object.keys(body).length === 0) throw new Error('请至少传入一个字段');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会更新 id=${id}. 加 --yes 确认`);
        render({ item: body }, { format });
        return;
      }
      const data = await request(`/api/insight/painpoints/${id}`, { env, method: 'PUT', body });
      printSuccess(`痛点已更新: id=${id}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'delete': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会删除 id=${id}. 加 --yes 确认`);
        return;
      }
      await request(`/api/insight/painpoints/${id}`, { env, method: 'DELETE' });
      printSuccess(`痛点已删除: id=${id}`);
      return;
    }

    case 'tags': {
      const data = await request('/api/insight/painpoints/tags', { env });
      render({ rows: data.data, columns: ['id', 'name', 'color', 'description', 'created_at'] }, { format });
      return;
    }

    case 'add-tag': {
      const name = requireArg(flags.name, '--name');
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会创建标签. 加 --yes 确认');
        return;
      }
      const data = await request('/api/insight/painpoints/tags', {
        env,
        method: 'POST',
        body: { name, color: flags.color, description: flags.description }
      });
      printSuccess(`标签已创建: id=${data.data.id} name=${data.data.name}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'delete-tag': {
      const id = requireArg(positional[1] || flags.id, 'tag_id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会删除 tag id=${id}. 加 --yes 确认`);
        return;
      }
      await request(`/api/insight/painpoints/tags/${id}`, { env, method: 'DELETE' });
      printSuccess(`标签已删除: id=${id}`);
      return;
    }

    case 'analyze-user':
    case 'analyze-expert': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const ep = sub === 'analyze-user' ? 'analyze-user' : 'analyze-expert';
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会触发 ${sub} on id=${id}. 加 --yes 确认`);
        return;
      }
      const data = await request(`/api/insight/painpoints/${id}/${ep}`, { env, method: 'POST' });
      printSuccess(`已触发 ${sub}: id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'link-sample': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const sample_id = requireArg(flags.sample_id, '--sample_id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会关联. 加 --yes 确认`);
        return;
      }
      const data = await request(`/api/insight/painpoints/${id}/link-sample`, {
        env,
        method: 'POST',
        body: { sample_id }
      });
      printSuccess(`已关联痛点 id=${id} <-> sample_id=${sample_id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'comments': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const content = requireArg(flags.content, '--content');
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会添加评论. 加 --yes 确认');
        return;
      }
      const data = await request(`/api/insight/painpoints/${id}/comments`, {
        env,
        method: 'POST',
        body: { content }
      });
      printSuccess(`已添加评论 to painpoint id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'extract-preview': {
      const body = pickFields(flags, ['text', 'sample_id', 'project_id', 'product_line']);
      if (!body.text && !body.sample_id) throw new Error('请提供 --text 或 --sample_id');
      const data = await request('/api/insight/painpoints/extract-preview', {
        env,
        method: 'POST',
        body
      });
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'batch': {
      const items = flags.items;
      if (!items) throw new Error('请用 --items \'[{"title":"...","description":"..."}]\' 提供数组');
      const arr = typeof items === 'string' ? JSON.parse(items) : items;
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会批量创建 ${arr.length} 条. 加 --yes 确认`);
        render({ rows: arr }, { format });
        return;
      }
      const data = await request('/api/insight/painpoints/batch', {
        env,
        method: 'POST',
        body: { items: arr }
      });
      printSuccess(`批量创建完成: ${arr.length}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'auto-tag': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会触发 auto-tag id=${id}. 加 --yes 确认`);
        return;
      }
      const data = await request(`/api/insight/painpoints/${id}/auto-tag`, { env, method: 'POST' });
      printSuccess(`自动打标已触发: id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'auto-tag-batch': {
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会触发批量 auto-tag. 加 --yes 确认');
        return;
      }
      const data = await request('/api/insight/painpoints/auto-tag-batch', { env, method: 'POST' });
      printSuccess('批量自动打标已触发');
      render({ item: data.data ?? data }, { format });
      return;
    }

    default:
      help();
      throw new Error(`未知子命令: ${sub}`);
  }
}
