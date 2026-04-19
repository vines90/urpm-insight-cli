/**
 * 研究项目命令 (research_projects)
 *
 * 字段:
 *   name (必填), description, project_code, project_type, product_line,
 *   target_users, status (进行中/已完成/暂停), start_date, end_date, owner_name
 */
import { request } from '../http.mjs';
import { parseArgs, pickFields, shouldExecute, getFormat, requireArg } from '../args.mjs';
import { render, printSuccess, printError } from '../output.mjs';

const FIELDS = [
  'name',
  'description',
  'project_code',
  'project_type',
  'product_line',
  'target_users',
  'status',
  'start_date',
  'end_date',
  'owner_name'
];

const LIST_COLUMNS = ['id', 'name', 'product_line', 'status', 'sample_count', 'painpoint_count', 'concept_count', 'created_at'];

function help() {
  process.stderr.write(`urpm projects <subcommand> [options]

Subcommands:
  list              列出项目, 支持筛选/分页
  get <id>          查看项目详情
  stats             统计概览
  create            创建项目 (默认 dry-run, 需 --yes)
  update <id>       更新项目 (默认 dry-run, 需 --yes)
  delete <id>       删除项目 (需 --yes)
  product-lines     列出全局产品线选项
  members <id>      管理成员 (--add user_id / --remove user_id / --role)

Common flags:
  --env=prod|local        默认 prod
  --json | --tsv          输出格式
  --search <kw>           列表搜索关键词
  --status <s>            列表状态筛选
  --product-line <pl>     列表产品线筛选
  --project-type <t>      列表类型筛选
  --page <n> --pageSize <n> --sortBy <c> --sortOrder ASC|DESC

Field flags (create/update):
  --name --description --project_code --project_type --product_line
  --target_users --status --start_date --end_date --owner_name

Examples:
  urpm projects list --product-line 家用空调 --status 进行中
  urpm projects get 12 --json
  urpm projects create --name "C7挂机回访" --product_line "家用空调" --status 进行中 --yes
  urpm projects update 12 --status 已完成 --yes
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
      const data = await request('/api/insight/projects', {
        env,
        query: {
          search: flags.search,
          status: flags.status,
          product_line: flags['product-line'],
          project_type: flags['project-type'],
          page: flags.page,
          pageSize: flags.pageSize,
          sortBy: flags.sortBy,
          sortOrder: flags.sortOrder
        }
      });
      render(
        { rows: data.data, columns: LIST_COLUMNS },
        { format, summary: `total=${data.pagination?.total ?? data.data?.length ?? 0}` }
      );
      return;
    }

    case 'get': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const data = await request(`/api/insight/projects/${id}`, { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'stats': {
      const data = await request('/api/insight/projects/stats', { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'product-lines': {
      const data = await request('/api/insight/projects/options/product-lines', { env });
      render({ rows: data.data?.map((v) => ({ product_line: v })) }, { format });
      return;
    }

    case 'create': {
      const body = pickFields(flags, FIELDS);
      requireArg(body.name, '--name');
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会执行写入。如确认请加 --yes');
        render({ item: body }, { format });
        return;
      }
      const data = await request('/api/insight/projects', { env, method: 'POST', body });
      printSuccess(`项目已创建: id=${data.data.id} name=${data.data.name}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'update': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const body = pickFields(flags, FIELDS);
      if (Object.keys(body).length === 0) throw new Error('请至少传入一个字段, 例如 --status 已完成');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会执行更新 id=${id}. 如确认请加 --yes`);
        render({ item: body }, { format });
        return;
      }
      const data = await request(`/api/insight/projects/${id}`, { env, method: 'PUT', body });
      printSuccess(`项目已更新: id=${id}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'delete': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会删除 id=${id}. 如确认请加 --yes`);
        return;
      }
      await request(`/api/insight/projects/${id}`, { env, method: 'DELETE' });
      printSuccess(`项目已删除: id=${id}`);
      return;
    }

    case 'members': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (flags.add) {
        if (!shouldExecute(flags)) {
          printError(`dry-run: 不会添加成员 user_id=${flags.add}. 加 --yes 确认`);
          return;
        }
        const data = await request(`/api/insight/projects/${id}/members`, {
          env,
          method: 'POST',
          body: { user_id: flags.add, role: flags.role || 'member' }
        });
        printSuccess(`已添加成员: user_id=${flags.add}`);
        render({ item: data.data }, { format });
        return;
      }
      if (flags.remove) {
        if (!shouldExecute(flags)) {
          printError(`dry-run: 不会移除成员 user_id=${flags.remove}. 加 --yes 确认`);
          return;
        }
        await request(`/api/insight/projects/${id}/members/${flags.remove}`, { env, method: 'DELETE' });
        printSuccess(`已移除成员: user_id=${flags.remove}`);
        return;
      }
      throw new Error('请指定 --add <user_id> 或 --remove <user_id>');
    }

    default:
      help();
      throw new Error(`未知子命令: ${sub}`);
  }
}
