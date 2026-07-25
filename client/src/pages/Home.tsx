import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Copy, Link2, LogIn, LogOut, ExternalLink, Clock, MousePointerClick, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [url, setUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);

  const createLinkMutation = trpc.links.create.useMutation({
    onSuccess: (data) => {
      setShortenedUrl(`https://mnil.ink/${data.slug}`);
      toast.success("Link encurtado com sucesso!");
      historyUtils.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao encurtar link");
    },
  });

  const historyUtils = trpc.useUtils().links;
  const { data: history } = trpc.links.getHistory.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.links.delete.useMutation({
    onSuccess: () => {
      toast.success("Link removido");
      historyUtils.invalidate();
    },
  });

  const handleShorten = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Insira uma URL");
      return;
    }
    createLinkMutation.mutate({
      url: url.trim(),
      customSlug: useCustomSlug ? customSlug.trim() : undefined,
    });
  }, [url, customSlug, useCustomSlug, createLinkMutation]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  }, []);

  // Reset shortened URL when URL changes
  useEffect(() => {
    setShortenedUrl(null);
  }, [url]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-card/50 sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">mnil.ink</span>
          </div>

          <div className="flex items-center gap-3">
            {authLoading ? null : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Olá, {user?.name || user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/login"}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container py-16 md:py-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Encurte seus links
            <span className="text-primary"> com elegância</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforme URLs longas em links curtos e memoráveis.
            Simples, rápido e bonito.
          </p>
        </motion.div>

        {/* Shortener Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-2xl mx-auto mb-12"
        >
          <Card className="border-border/60 shadow-lg shadow-primary/5">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleShorten} className="space-y-5">
                {/* URL Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    URL para encurtar
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://exemplo.com/sua-url-muito-longa-aqui"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-10 h-12 text-base"
                      required
                    />
                  </div>
                </div>

                {/* Custom Slug Toggle */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={useCustomSlug}
                      onCheckedChange={setUseCustomSlug}
                      id="custom-slug"
                    />
                    <Label htmlFor="custom-slug" className="text-sm cursor-pointer">
                      Slug personalizado
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Ex: mnil.ink/seulink
                  </span>
                </div>

                {/* Custom Slug Input (conditional) */}
                <AnimatePresence>
                  {useCustomSlug && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Slug personalizado
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-sm text-muted-foreground font-medium">
                            mnil.ink/
                          </span>
                          <Input
                            type="text"
                            placeholder="seulink"
                            value={customSlug}
                            onChange={(e) => setCustomSlug(e.target.value)}
                            className="pl-[88px] h-11 text-base font-mono"
                            maxLength={64}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base font-semibold"
                  disabled={createLinkMutation.isPending}
                >
                  {createLinkMutation.isPending ? "Encurtando..." : "Encurtar Link"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Result */}
          <AnimatePresence>
            {shortenedUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="mt-6"
              >
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-2">Seu link encurtado:</p>
                    <div className="flex items-center gap-3">
                      <a
                        href={shortenedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 font-mono text-lg font-semibold text-primary hover:underline truncate"
                      >
                        {shortenedUrl}
                      </a>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(shortenedUrl!)}
                        className="shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* History Section */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Seus links</h2>
              {history && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {history.length} {history.length === 1 ? "link" : "links"}
                </span>
              )}
            </div>

            {history === undefined ? (
              <Card className="border-border/40">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Carregando seus links...</p>
                </CardContent>
              </Card>
            ) : history.length === 0 ? (
              <Card className="border-border/40">
                <CardContent className="p-8 text-center">
                  <Link2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum link encurtado ainda.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Os links que você criar aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (

            <div className="space-y-3">
              {history.map((link, i) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-border/40 hover:border-primary/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <a
                              href={`https://mnil.ink/${link.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm font-semibold text-primary hover:underline"
                            >
                              mnil.ink/{link.slug}
                            </a>
                            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {link.url}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(new Date(link.createdAt), "dd MMM yyyy", { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MousePointerClick className="w-3 h-3" />
                              {link.clickCount} {link.clickCount === 1 ? "clique" : "cliques"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(`https://mnil.ink/${link.slug}`)}
                            className="h-8 w-8"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate({ id: link.id })}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <footer className="mt-24 text-center">
          <p className="text-sm text-muted-foreground">
            Feito com dedicação · mnil.ink
          </p>
        </footer>
      </main>
    </div>
  );
}
