import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface CodeSnippet {
  id: string;
  language: string;
  code: string;
}

export interface CodeVariant {
  id: string;
  label: string;
  snippets: CodeSnippet[];
  note?: string;
}

export function CodeVariantsPanel({
  title = "Code",
  variants,
}: {
  title?: string;
  variants: CodeVariant[];
}) {
  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">Compare the standard approaches side by side.</p>
      </div>

      <Tabs defaultValue={variants[0].id} className="space-y-3">
        <TabsList className="h-auto gap-1 rounded-xl bg-muted/70 p-1">
          {variants.map((variant) => (
            <TabsTrigger key={variant.id} value={variant.id} className="rounded-lg px-3 py-1.5 text-xs font-semibold">
              {variant.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {variants.map((variant) => (
          <TabsContent key={variant.id} value={variant.id} className="mt-0">
            {variant.note && <p className="mb-3 text-xs text-muted-foreground">{variant.note}</p>}
            <Tabs defaultValue={variant.snippets[0]?.id} className="space-y-3">
              <TabsList className="h-auto flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
                {variant.snippets.map((snippet) => (
                  <TabsTrigger key={snippet.id} value={snippet.id} className="rounded-lg px-3 py-1.5 text-xs font-semibold">
                    {snippet.language}
                  </TabsTrigger>
                ))}
              </TabsList>

              {variant.snippets.map((snippet) => (
                <TabsContent key={snippet.id} value={snippet.id} className="mt-0">
                  <pre className="overflow-x-auto rounded-xl border border-border bg-muted/45 p-4 text-xs leading-relaxed text-foreground">
                    <code>{snippet.code}</code>
                  </pre>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
