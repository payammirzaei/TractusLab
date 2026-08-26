import { glossary } from "@/data/glossary";

export function Glossary({ terms }: { terms: string[] }) {
  const uniqueTerms = [...new Set(terms)].filter((term) => term in glossary);
  if (uniqueTerms.length === 0) return null;

  return (
    <details className="group rounded-2xl border border-white/10 bg-black/15 p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-white/65 marker:hidden">
        Glossary <span className="ml-1 text-white/30">({uniqueTerms.length})</span>
      </summary>
      <div className="mt-4 space-y-3">
        {uniqueTerms.map((term) => (
          <div key={term}>
            <p className="text-sm font-semibold text-emerald-200">{term}</p>
            <p className="mt-1 text-sm leading-6 text-white/48">{glossary[term as keyof typeof glossary]}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
