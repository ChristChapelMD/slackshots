export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message = params.message
    ? decodeURIComponent(params.message)
    : "Something went wrong.";

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">OAuth Error</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{message}</p>
      </div>
    </main>
  );
}
