/**
 * 概念库命令 (concepts)
 *
 * 通用字段:
 *   title (必填), description (必填), type, status, project_id, target_users,
 *   expected_benefits, estimated_cost, estimated_timeline,
 *   feasibility_score, innovation_score, impact_score, tags, painpoint_ids
 *
 * concept_category=产品概念 时:
 *   target_segment, target_scenario, core_needs,
 *   fabs_features, fabs_advantages, fabs_benefits, fabs_evidence, fabs_story,
 *   selling_points_basic, selling_points_must, selling_points_wow, data_sources
 *
 * concept_category=功能概念 时:
 *   painpoint_analysis, function_design, implementation_plan,
 *   prototype_url, tech_feasibility
 */
import { request } from '../http.mjs';
import { parseArgs, pickFields, shouldExecute, getFormat, requireArg } from '../args.mjs';
import { render, printSuccess, printError } from '../output.mjs';

const COMMON = [
  'title',
  'description',
  'type',
  'status',
  'project_id',
  'target_users',
  'expected_benefits',
  'estimated_cost',
  'estimated_timeline',
  'feasibility_score',
  'innovation_score',
  'impact_score',
  'tags',
  'painpoint_ids',
  'concept_category'
];

const PRODUCT_FIELDS = [
  'target_segment',
  'target_scenario',
  'core_needs',
  'fabs_features',
  'fabs_advantages',
  'fabs_benefits',
  'fabs_evidence',
  'fabs_story',
  'selling_points_basic',
  'selling_points_must',
  'selling_points_wow',
  'data_sources'
];

const FUNCTION_FIELDS = [
  'painpoint_analysis',
  'function_design',
  'implementation_plan',
  'prototype_url',
  'tech_feasibility'
];

const ALL_FIELDS = [...COMMON, ...PRODUCT_FIELDS, ...FUNCTION_FIELDS];

const LIST_COLUMNS = [
  'id',
  'title',
  'concept_category',
  'type',
  'status',
  'rating',
  'feasibility_score',
  'innovation_score',
  'impact_score',
  'created_at'
];

function help() {
  process.stderr.write(`urpm concepts <subcommand> [options]

CRUD:
  list                                  列出概念
  get <id>                              查看详情
  stats                                 统计概览
  create                                创建概念
  update <id>                           更新概念
  delete <id>                           删除概念

AI 生成:
  generate-from-painpoints              从痛点 id 列表合成概念 (--painpoint_ids "[1,2,3]")
  generate-product-concept              生成产品概念 (--painpoint_ids 必填)
  generate-function-concept             生成功能概念 (--painpoint_ids 必填)

评论:
  comments <id> --content "..."         添加评论

Common flags:
  --env --json --tsv
  --search --status --concept_category --project_id --type
  --page --pageSize --sortBy --sortOrder

Examples:
  urpm concepts list --concept_category 产品概念 --status 构思中
  urpm concepts create --title "C7 Plus 静音模式" --description "..." \\
       --concept_category 产品概念 --target_segment "高端家庭" --core_needs "夜间睡眠" \\
       --painpoint_ids "[101,102]" --yes
  urpm concepts generate-product-concept --painpoint_ids "[101,102,103]" --product_line "家用空调" --yes
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
      const data = await request('/api/insight/concepts', {
        env,
        query: {
          search: flags.search,
          status: flags.status,
          concept_category: flags.concept_category,
          project_id: flags.project_id,
          type: flags.type,
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
      const data = await request(`/api/insight/concepts/${id}`, { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'stats': {
      const data = await request('/api/insight/concepts/stats', { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'create': {
      const body = pickFields(flags, ALL_FIELDS);
      requireArg(body.title, '--title');
      requireArg(body.description, '--description');
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会创建. 加 --yes 确认');
        render({ item: body }, { format });
        return;
      }
      const data = await request('/api/insight/concepts', { env, method: 'POST', body });
      printSuccess(`概念已创建: id=${data.data.id}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'update': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const body = pickFields(flags, ALL_FIELDS);
      if (Object.keys(body).length === 0) throw new Error('请至少传入一个字段');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会更新 id=${id}. 加 --yes 确认`);
        render({ item: body }, { format });
        return;
      }
      const data = await request(`/api/insight/concepts/${id}`, { env, method: 'PUT', body });
      printSuccess(`概念已更新: id=${id}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'delete': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会删除 id=${id}. 加 --yes 确认`);
        return;
      }
      await request(`/api/insight/concepts/${id}`, { env, method: 'DELETE' });
      printSuccess(`概念已删除: id=${id}`);
      return;
    }

    case 'generate-from-painpoints':
    case 'generate-product-concept':
    case 'generate-function-concept': {
      const ep = sub;
      const body = pickFields(flags, [
        'painpoint_ids',
        'project_id',
        'product_line',
        'target_users',
        'extra_instruction'
      ]);
      requireArg(body.painpoint_ids, '--painpoint_ids');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会执行 ${sub}. 加 --yes 确认`);
        render({ item: body }, { format });
        return;
      }
      const data = await request(`/api/insight/concepts/${ep}`, { env, method: 'POST', body });
      printSuccess(`已触发 ${sub}`);
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
      const data = await request(`/api/insight/concepts/${id}/comments`, {
        env,
        method: 'POST',
        body: { content }
      });
      printSuccess(`已添加评论 to concept id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    default:
      help();
      throw new Error(`未知子命令: ${sub}`);
  }
}
