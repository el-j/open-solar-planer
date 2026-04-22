import { Sun, GitFork, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppHeader() {
  return (
    <div className="p-5 border-b border-slate-200 bg-blue-600 text-white">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sun className="w-6 h-6 text-yellow-300" />
          PV Layout Planer
        </h1>
        <div className="flex items-center gap-1">
          <a
            href="https://github.com/el-j/open-solar-planer"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-blue-500 transition-colors"
            aria-label="Open GitHub repository"
          >
            <GitFork className="w-4 h-4 text-blue-100" />
          </a>
          <Link
            to="/about"
            className="p-1.5 rounded hover:bg-blue-500 transition-colors"
            aria-label="About this app"
          >
            <Info className="w-4 h-4 text-blue-100" />
          </Link>
        </div>
      </div>
      <p className="text-blue-100 text-sm mt-1">Open Source Solar Tool</p>
    </div>
  );
}
