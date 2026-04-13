"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  const message =
    typeof error?.message === "string" && error.message.trim() !== ""
      ? error.message
      : String(error);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center p-8">
      <h1 className="text-xl font-semibold text-neutral-900">页面出错了</h1>
      <p className="mt-3 whitespace-pre-wrap break-all text-sm text-red-700">
        {message}
      </p>
      {error.digest != null && (
        <p className="mt-2 font-mono text-xs text-neutral-500">
          digest: {error.digest}
        </p>
      )}
      <p className="mt-4 text-sm text-neutral-600">
        若提示缺少 <code className="rounded bg-neutral-100 px-1">.js</code>{" "}
        等文件，请先停止服务后执行{" "}
        <code className="rounded bg-neutral-100 px-1">npm run rebuild</code>
        ，再重新启动。
      </p>
      <button
        type="button"
        className="mt-6 w-fit rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        onClick={() => reset()}
      >
        重试
      </button>
    </div>
  );
}
