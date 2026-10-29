import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function LessonMarkdown({ content = "" }) {
  return (
    <div className="min-w-0 break-words text-sm leading-7 text-slate-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-5 mt-8 text-3xl font-bold leading-tight text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-8 border-b border-white/10 pb-3 text-2xl font-semibold text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-6 text-xl font-semibold text-white">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-5 text-lg font-semibold text-white">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-4 leading-7">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="my-4 list-disc space-y-2 pl-6 marker:text-cyan-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 list-decimal space-y-2 pl-6 marker:text-cyan-400">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-5 rounded-r-xl border-l-4 border-cyan-400/60 bg-cyan-400/5 px-5 py-1 text-slate-300">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="my-5 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950 p-5 text-sm leading-7 [&>code]:bg-transparent [&>code]:p-0">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code
              className={`rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-sky-200 ${
                className || ""
              }`}
            >
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 underline decoration-cyan-400/30 underline-offset-4 hover:text-cyan-200"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-8 border-white/10" />,
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/5 text-white">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/10 px-4 py-3 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/5 px-4 py-3 align-top">
              {children}
            </td>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ""}
              loading="lazy"
              className="my-5 max-w-full rounded-xl border border-white/10"
            />
          ),
        }}
      >
        {content || "*No lesson content yet.*"}
      </ReactMarkdown>
    </div>
  );
}