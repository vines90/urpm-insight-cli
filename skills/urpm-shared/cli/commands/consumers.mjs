/**
 * 消费者 Agent 命令 (consumer_profiles)
 *
 * 字段:
 *   name (必填), gender, age_range, occupation, income_level, location, education,
 *   family_status, consumer_type, consumption_habits, brand_preference, characteristics
 *
 * 头像上传: --avatar <path>
 * 学习: 让 Agent 从样本/痛点中学习
 * 对话: 与 Agent 进行 AI 对话
 */
import { request, upload } from '../http.mjs';
import { parseArgs, pickFields, shouldExecute, getFormat, requireArg } from '../args.mjs';
import { render, printSuccess, printError } from '../output.mjs';

const FIELDS = [
  'name',
  'gender',
  'age_range',
  'occupation',
  'income_level',
  'location',
  'education',
  'family_status',
  'consumer_type',
  'consumption_habits',
  'brand_preference',
  'characteristics'
];

const LIST_COLUMNS = [
  'id',
  'name',
  'gender',
  'age_range',
  'occupation',
  'consumer_type',
  'location',
  'sample_count',
  'chat_count',
  'created_at'
];

function help() {
  process.stderr.write(`urpm consumers <subcommand> [options]

CRUD:
  list                                   列出消费者 Agent
  get <id>                               查看详情
  create                                 创建 (支持 --avatar 头像上传)
  update <id>                            更新
  delete <id>                            删除

学习与对话:
  learn <id>                             让 Agent 从相关样本中学习, 生成画像摘要
  chat <id> --question "..."             与 Agent 对话, --session_id 默认 default
  conversations <id>                     列出当前 session 对话历史
  sessions <id>                          列出所有 session
  clear-conversations <id>               清空对话

Common flags:
  --env --json --tsv
  --search --gender --age_range --consumer_type --location
  --page --pageSize --sortBy --sortOrder

Examples:
  urpm consumers list --consumer_type 访谈受访者
  urpm consumers create --name "张女士" --gender 女 --age_range "35-45" \\
       --occupation "教师" --location "广州" --consumer_type "访谈受访者" --yes
  urpm consumers learn 22 --yes
  urpm consumers chat 22 --question "你购买空调时最看重什么?"
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
      const data = await request('/api/insight/consumers', {
        env,
        query: {
          search: flags.search,
          gender: flags.gender,
          age_range: flags.age_range,
          consumer_type: flags.consumer_type,
          location: flags.location,
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
      const data = await request(`/api/insight/consumers/${id}`, { env });
      render({ item: data.data }, { format });
      return;
    }

    case 'create': {
      const fields = pickFields(flags, FIELDS);
      requireArg(fields.name, '--name');
      if (!shouldExecute(flags)) {
        printError('dry-run: 不会创建. 加 --yes 确认');
        render({ item: { ...fields, avatar: flags.avatar } }, { format });
        return;
      }
      const data = flags.avatar
        ? await upload('/api/insight/consumers', {
            env,
            fileSpecs: [{ field: 'avatar', filePath: flags.avatar }],
            fields
          })
        : await request('/api/insight/consumers', { env, method: 'POST', body: fields });
      printSuccess(`Consumer 已创建: id=${data.data.id} name=${data.data.name}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'update': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const fields = pickFields(flags, FIELDS);
      if (Object.keys(fields).length === 0 && !flags.avatar) throw new Error('请至少传入一个字段');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会更新 id=${id}. 加 --yes 确认`);
        render({ item: fields }, { format });
        return;
      }
      const data = flags.avatar
        ? await upload(`/api/insight/consumers/${id}`, {
            env,
            method: 'PUT',
            fileSpecs: [{ field: 'avatar', filePath: flags.avatar }],
            fields
          })
        : await request(`/api/insight/consumers/${id}`, { env, method: 'PUT', body: fields });
      printSuccess(`Consumer 已更新: id=${id}`);
      render({ item: data.data }, { format });
      return;
    }

    case 'delete': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会删除 id=${id}. 加 --yes 确认`);
        return;
      }
      await request(`/api/insight/consumers/${id}`, { env, method: 'DELETE' });
      printSuccess(`Consumer 已删除: id=${id}`);
      return;
    }

    case 'learn': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会触发学习 id=${id}. 加 --yes 确认`);
        return;
      }
      const data = await request(`/api/insight/consumers/${id}/learn`, { env, method: 'POST' });
      printSuccess(`Consumer 已学习: id=${id}`);
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'chat': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const question = requireArg(flags.question, '--question');
      const session_id = flags.session_id || 'default';
      const data = await request(`/api/insight/consumers/${id}/chat`, {
        env,
        method: 'POST',
        body: { question, session_id }
      });
      render({ item: data.data ?? data }, { format });
      return;
    }

    case 'conversations': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const session_id = flags.session_id || 'default';
      const data = await request(`/api/insight/consumers/${id}/conversations`, {
        env,
        query: { session_id }
      });
      render({ rows: data.data, columns: ['id', 'session_id', 'user_message', 'ai_response', 'created_at'] }, { format });
      return;
    }

    case 'sessions': {
      const id = requireArg(positional[1] || flags.id, 'id');
      const data = await request(`/api/insight/consumers/${id}/chat-sessions`, { env });
      render({ rows: data.data, columns: ['session_id', 'message_count', 'last_message_at'] }, { format });
      return;
    }

    case 'clear-conversations': {
      const id = requireArg(positional[1] || flags.id, 'id');
      if (!shouldExecute(flags)) {
        printError(`dry-run: 不会清空对话 id=${id}. 加 --yes 确认`);
        return;
      }
      const session_id = flags.session_id;
      await request(`/api/insight/consumers/${id}/conversations`, {
        env,
        method: 'DELETE',
        query: session_id ? { session_id } : undefined
      });
      printSuccess(`对话已清空: id=${id}${session_id ? ` session=${session_id}` : ''}`);
      return;
    }

    default:
      help();
      throw new Error(`未知子命令: ${sub}`);
  }
}
