/**
 * 访谈样本命令 (research_samples)
 *
 * 字段:
 *   title (必填), sample_type, project_id, content, product_line,
 *   interview_date, interview_duration, interviewer, interview_location,
 *   respondent_name, respondent_gender, respondent_age, respondent_occupation,
 *   respondent_location, respondent_income, respondent_family,
 *   tags (JSON 字符串或逗号分隔), auto_analyze, auto_create_consumer
 *
 * 上传:
 *   --file <path>    单个访谈文件 (txt/md/docx)
 *   --image <path>   可重复, 现场图片
 */
import { request, upload } from '../http.mjs';
import { parseArgs, pickFields, shouldExecute, getFormat, requireArg } from '../args.mjs';
import { render, printSuccess, printError } from '../output.mjs';

const FIELDS = [
  'title',
  'sample_type',
  'project_id',
  'content',
  'product_line',
  'interview_date',
  'interview_duration',
  'interviewer',
  'interview_location',
  'respondent_name',
  'respondent_gender',
  'respondent_age',
  'respondent_occupation',
  'respondent_location',
  'respondent_income',
  'respondent_family',
  'tags',
  'auto_analyze',
  'auto_create_consumer'
];

const LIST_COLUMNS = [
  'id',
  'title',
  'sample_type',
  'product_line',
  'respondent_name',
  'interview_date',
  'ai_analyzed',
  'painpoints_extracted',
  'painpoint_count',
  'created_at'
];

function help() {
  process.stderr.write(`urpm samples <subcommand> [options]

CRUD:
  list                              列出样本, 支持筛选/分页
  get <id>                          查看样本详情 (含完整 content)
  stats                             样本概览统计
  create                            创建样本 (支持 --file 上传)
  update <id>                       更新元数据
  delete <id>                       删除样本

AI 分析:
  analyze <id>                      触发摘要分析
  extract-painpoints <id>           从样本中抽取痛点
  reparse <id>                      重新解析文件
  deep-analyze <id>                 启动深度分析任务
  deep-analysis <id>                获取深度分析报告
  deep-analysis-status <id>         获取分析状态
  regenerate-report <id>            基于已有标签重生成报告
  reanalyze-with-framework <id>     按指定研究框架重新分析

样本-痛点关系:
  painpoints <id>                   该样本下抽取的痛点列表

样本-Consumer:
  link-consumer <id> --consumer_id  关联到已有 consumer
  create-agent <id>                 基于该样本创建 consumer agent

任务:
  tasks <id>                        样本下所有分析任务
  task <task_id>                    任务详情
  current-task <id>                 当前进行中的任务
  reset-stuck-analysis              重置卡住的任务

批量:
  batch-import --files a.txt b.txt  批量导入

Common flags:
  --env=prod|local --json --tsv
  --search --project_id --consumer_id --product_line
  --ai_analyzed true|false --painpoints_extracted true|false
  --page --pageSize --sortBy --sortOrder

Examples:
  urpm samples list --project_id 12 --ai_analyzed false
  urpm samples get 87 --json
  urpm samples create --title "广州C7挂机回访-王先生" --project_id 12 \\
       --product_line "家用空调" --interview_date 2026-04-01 \\
       --file ./笔录/广州_王先生.docx --auto_analyze true --yes
  urpm samples extract-painpoints 87 --yes
  urpm samples deep-analyze 87 --framework_id 3 --yes
  urpm samples link-consumer 87 --consumer_id 22 --yes
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
      const data = await request('/api/insight/samples', {
        env,
        query: {
          search: flags.search,
          project_id: flags.project_id,
          consumer_id: flags.consumer_id,
          product_line: flags.product_line,
          ai_analyzed: flags.ai_analyzed,
          painpoints_extracted: flags.painpoints_extracted,
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
      const data = await request(`/api/insight/samples/${id}`, { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'stats': {
      const data = await request('/api/insight/samples/stats', { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'create': {
      const fields = pickFields(flags, FIELDS);
      requireArg(fields.title, '--title');
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会执行创建. 加 --yes 确认');
        render({ item: { ...fields, file: flags.file, images: flags.image } }, { format });
        return;
      }
      const fileSpecs = [];
      if (flags.file) fileSpecs.push({ field: 'file', filePath: flags.file });
      const imgFlag = flags.image;
      if (imgFlag) {
        const imgs = Array.isArray(imgFlag) ? imgFlag : [imgFlag];
        imgs.forEach((p) => fileSpecs.push({ field: 'images', filePath: p }));
      }
      const data = fileSpecs.length
        ? await upload('/api/insight/samples', { env, fileSpecs, fields })
        : await request('/api/insight/samples', { env, method: 'POST', body: fields });
      printSuccess(`样本已创建: id=${data.data.id}`);
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
      const data = await request(`/api/insight/samples/${id}`, { env, method: 'PUT', body });
      printSuccess(`样本已更新: id=${id}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'delete': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会删除 id=${id}. 加 --yes 确认`);
        return;
      }
      await request(`/api/insight/samples/${id}`, { env, method: 'DELETE' });
      printSuccess(`样本已删除: id=${id}`);
      return;
    }

    case 'analyze':
    case 'extract-painpoints':
    case 'reparse':
    case 'regenerate-report': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const ep = {
        analyze: 'analyze',
        'extract-painpoints': 'extract-painpoints',
        reparse: 'reparse',
        'regenerate-report': 'regenerate-report'
      }[sub];
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会触发 ${sub} on id=${id}. 加 --yes 确认`);
        return;
      }
      const data = await request(`/api/insight/samples/${id}/${ep}`, { env, method: 'POST' });
      printSuccess(`已触发 ${sub}: id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'deep-analyze': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会启动深度分析 id=${id}. 加 --yes 确认`);
        return;
      }
      const body = pickFields(flags, ['framework_id', 'force', 'extra_instruction']);
      const data = await request(`/api/insight/samples/${id}/deep-analyze`, {
        env,
        method: 'POST',
        body
      });
      printSuccess(`深度分析任务已启动: id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'deep-analysis': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const data = await request(`/api/insight/samples/${id}/deep-analysis`, { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'deep-analysis-status': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const data = await request(`/api/insight/samples/${id}/deep-analysis/status`, { env });
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'reanalyze-with-framework': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const framework_id = requireArg(flags.framework_id, '--framework_id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会重新分析 id=${id}. 加 --yes 确认`);
        return;
      }
      const data = await request(`/api/insight/samples/${id}/reanalyze-with-framework`, {
        env,
        method: 'POST',
        body: { framework_id }
      });
      printSuccess(`已触发按框架重分析: id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'painpoints': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const data = await request(`/api/insight/samples/${id}/painpoints`, { env });
      render({ rows: data.data, columns: ['id', 'title', 'category', 'priority', 'severity', 'created_at'] }, { format });
      return;
    }

    case 'link-consumer': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const consumer_id = requireArg(flags.consumer_id, '--consumer_id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会关联 consumer. 加 --yes 确认`);
        return;
      }
      const data = await request(`/api/insight/samples/${id}/link-consumer`, {
        env,
        method: 'POST',
        body: { consumer_id }
      });
      printSuccess(`已关联 consumer_id=${consumer_id} 到 sample id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'create-agent': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会创建 agent. 加 --yes 确认`);
        return;
      }
      const data = await request(`/api/insight/samples/${id}/create-agent`, { env, method: 'POST' });
      printSuccess(`已基于 sample id=${id} 创建 consumer agent`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'tasks': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const data = await request(`/api/insight/samples/${id}/tasks`, { env });
      render({ rows: data.data, columns: ['id', 'task_type', 'status', 'progress', 'created_at', 'completed_at'] }, { format });
      return;
    }

    case 'task': {
      const taskId = requireArg(positional[1] || flags.task_id, 'task_id');
      const data = await request(`/api/insight/samples/tasks/${taskId}`, { env });
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'current-task': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const data = await request(`/api/insight/samples/${id}/current-task`, { env });
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'reset-stuck-analysis': {
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会重置卡住的任务. 加 --yes 确认');
        return;
      }
      const data = await request('/api/insight/samples/reset-stuck-analysis', { env, method: 'POST' });
      printSuccess('已重置卡住的分析任务');
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'batch-import': {
      const files = []
        .concat(flags.files || [])
        .concat(flags.file || [])
        .flatMap((v) => (Array.isArray(v) ? v : String(v).split(',')))
        .filter(Boolean);
      if (files.length === 0) throw new Error('请用 --files a.txt --files b.txt 或 --files a.txt,b.txt 指定文件');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会导入 ${files.length} 个文件. 加 --yes 确认`);
        return;
      }
      const fields = pickFields(flags, ['project_id', 'product_line', 'auto_analyze', 'auto_create_consumer']);
      const fileSpecs = files.map((p) => ({ field: 'files', filePath: p }));
      const data = await upload('/api/insight/samples/batch-import', { env, fileSpecs, fields });
      printSuccess(`批量导入完成: 提交 ${files.length} 个文件`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    default:
      help();
      throw new Error(`未知子命令: ${sub}`);
  }
}
