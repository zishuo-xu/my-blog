import { useEffect, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
});

interface MermaidDiagramProps {
  code: string;
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!code) return;
    const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
    mermaid
      .render(id, code)
      .then(({ svg }) => {
        setSvg(svg);
        setError("");
      })
      .catch((err) => {
        setError("图表渲染失败");
        console.error("Mermaid render error:", err);
      });
  }, [code]);

  if (error) {
    return (
      <div className="my-4 p-4 rounded border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700">
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        <pre className="mt-2 text-xs text-gray-500 overflow-x-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div className="my-4 overflow-x-auto rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
