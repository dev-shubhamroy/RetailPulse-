import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div>
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <Link to="/" className="mt-2 inline-block text-emerald-600 hover:underline">Back to dashboard</Link>
    </div>
  );
}
