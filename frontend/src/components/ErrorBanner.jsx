export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {message}
    </div>
  );
}
