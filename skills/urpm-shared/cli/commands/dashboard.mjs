/**
 * 总览 / 搜索 / 健康检查 / 全局选项
 */
import { request } from '../http.mjs';
import { parseArgs, getFormat, requireArg } from '../args.mjs';
import { render } from '../output.mjs';

function help() {
  process.stderr.write(`urpm dashboard <subcommand> [options]

Subcommands:
  overview                平台 stats + recentActivity
  health                  insight 数据库连通性
  search --q <kw>         全局搜索 (--type project|sample|painpoint|concept|consumer --limit 20)
  product-lines           全局产品线
  user-stats              用户工作量统计 (management 模块)

Common flags:
  --env --json --tsv

Examples:
  urpm dashboard overview --json
  urpm dashboard search --q "C7挂机" --type sample --limit 10
`);
}

export async function run(argv) {
  const { positional, flags } = parseArgs(argv);
  const sub = positional[0];
  if (!sub || sub === 'help' || flags.help) return help();

  const env = flags.env;
  const format = getFormat(flags);

  switch (sub) {
    case 'overview': {
      const data = await request('/api/insight/dashboard', { env, anonymous: true });
      render({ item: data.data }, { format });
      return;
    }

    case 'health': {
      const data = await request('/api/insight/health', { env, anonymous: true });
      render({ item: data.data }, { format });
      return;
    }

    case 'search': {
      const q = requireArg(flags.q || flags.query, '--q');
      const data = await request('/api/insight/search', {
        env,
        anonymous: true,
        query: { q, type: flags.type, limit: flags.limit || 20 }
      });
      const rows = [];
      const r = data.data || {};
      ['projects', 'samples', 'painpoints', 'concepts', 'consumers'].forEach((bucket) => {
        (r[bucket] || []).forEach((item) => rows.push({ bucket, ...item }));
      });
      render({ rows, columns: ['bucket', 'id', 'type', 'title', 'description'] }, {
        format,
        summary: `total=${data.total ?? rows.length}`
      });
      return;
    }

    case 'product-lines': {
      const data = await request('/api/insight/options/product-lines', { env, anonymous: true });
      render({ rows: data.data?.map((v) => ({ product_line: v })) }, { format });
      return;
    }

    case 'user-stats': {
      const data = await request('/api/insight/management/user-stats', { env, anonymous: true });
      const rows = data.data?.userStats ?? [];
      render(
        {
          rows,
          columns: [
            'id',
            'username',
            'full_name',
            'samples_total',
            'painpoints_total',
            'agents_total',
            'concepts_total',
            'reports_total'
          ]
        },
        { format }
      );
      return;
    }

    default:
      help();
      throw new Error(`未知子命令: ${sub}`);
  }
}
