import { getStats } from "@/lib/db/sqlite";

const FORMAT_LABELS: Record<string, string> = {
  rgb_pdf: "电子版 PDF",
  png: "电子版 PNG",
  cmyk_pdf: "印刷版 PDF",
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const stats = getStats();
  const total = stats.reduce((sum, row) => sum + row.count, 0);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">导出统计</h1>
        <p className="mb-8 text-sm text-gray-500">累计导出次数（按格式）</p>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">格式</th>
                <th className="px-6 py-3 text-right">下载次数</th>
                <th className="px-6 py-3 text-right">最近导出</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.map((row) => (
                <tr key={row.format} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {FORMAT_LABELS[row.format] ?? row.format}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {row.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {row.last_exported_at ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-6 py-3 font-semibold text-gray-700">合计</td>
                <td className="px-6 py-3 text-right font-semibold text-gray-900">
                  {total.toLocaleString()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          数据存储于服务端 SQLite，刷新页面获取最新数据。
        </p>
      </div>
    </main>
  );
}
