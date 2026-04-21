import { Link } from 'react-router-dom';
import { Sun, GitFork, ExternalLink, ArrowLeft, Code2, Shield, Users } from 'lucide-react';

const MIT_LICENSE_BODY =
  'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and ' +
  'associated documentation files (the "Software"), to deal in the Software without restriction, ' +
  'including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, ' +
  'and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, ' +
  'subject to the following conditions:\n\n' +
  'The above copyright notice and this permission notice shall be included in all copies or substantial ' +
  'portions of the Software.\n\n' +
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT ' +
  'LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="w-7 h-7 text-yellow-300 shrink-0" />
            <div>
              <h1 className="text-xl font-bold leading-tight">PV Layout Planer</h1>
              <p className="text-blue-100 text-sm">Open Source Solar Tool</p>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-blue-100 hover:text-white text-sm font-medium transition-colors"
            aria-label="Back to planner"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">

        {/* About */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" />
            Über die App
          </h2>
          <p className="text-slate-600 leading-relaxed mb-3">
            <strong>Open Solar Planer</strong> ist ein freies, quelloffenes Tool zur Planung von Solarmodul-Layouts auf
            Dachflächen. Du kannst die Abmessungen deiner Fläche eingeben, ein Draufsichtfoto hochladen und sofort sehen,
            wie viele Module passen und welche Gesamtleistung erreichbar ist.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Die App läuft vollständig im Browser — es werden keinerlei Daten an Server übertragen. Alle Berechnungen
            finden lokal auf deinem Gerät statt.
          </p>
        </section>

        {/* GitHub */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <GitFork className="w-5 h-5 text-slate-700" />
            Quellcode &amp; Repository
          </h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Der vollständige Quellcode ist auf GitHub veröffentlicht. Issues, Pull Requests und Beiträge sind
            herzlich willkommen.
          </p>
          <a
            href="https://github.com/el-j/open-solar-planer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
            aria-label="Open GitHub repository"
          >
            <GitFork className="w-4 h-4" />
            github.com/el-j/open-solar-planer
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </section>

        {/* License */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Lizenz
          </h2>
          <p className="text-slate-600 mb-3 leading-relaxed">
            Open Solar Planer steht unter der <strong>MIT License</strong>. Du darfst die Software frei nutzen,
            kopieren, verändern und verbreiten — auch für kommerzielle Zwecke — unter der Bedingung, dass der
            ursprüngliche Copyright-Hinweis erhalten bleibt.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-500 font-mono leading-relaxed whitespace-pre-wrap">
            {'MIT License\n\nCopyright (c) 2025 el-j and contributors\n\n' + MIT_LICENSE_BODY}
          </div>
          <a
            href="https://github.com/el-j/open-solar-planer/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:underline text-sm mt-3"
            aria-label="View full license on GitHub"
          >
            Vollständige Lizenz auf GitHub ansehen
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>

        {/* Contributing */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Mitmachen
          </h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            Dieses Projekt lebt von der Community. Fehler melden, neue Features vorschlagen oder direkt Code
            beisteuern — jede Hilfe ist willkommen.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/el-j/open-solar-planer/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-2 rounded-lg transition-colors text-sm border border-blue-200"
              aria-label="Report an issue on GitHub"
            >
              Bug melden / Feature anfragen
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/el-j/open-solar-planer/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium px-3 py-2 rounded-lg transition-colors text-sm border border-slate-200"
              aria-label="View contributing guide"
            >
              Contributing Guide
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* Tech Stack */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3">Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {['React 19', 'TypeScript', 'Vite', 'Tailwind CSS v4', 'Vitest', 'GitHub Pages'].map(tech => (
              <span
                key={tech}
                className="bg-white border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 pt-4 pb-8 border-t border-slate-200">
          <p>
            Open Solar Planer — MIT License — Made with ☀️ by{' '}
            <a
              href="https://github.com/el-j"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
              aria-label="Author on GitHub"
            >
              el-j
            </a>{' '}
            and contributors
          </p>
        </footer>
      </div>
    </div>
  );
}
