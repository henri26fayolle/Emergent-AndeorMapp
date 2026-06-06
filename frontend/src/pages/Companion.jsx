import { useEffect, useRef, useState } from "react";
import { api, formatErr } from "@/lib/api";
import RpgHud from "@/components/RpgHud";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Wind } from "lucide-react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "What should I do on a rainy day in Mauritius?",
  "Suggest a beginner-friendly hike near Black River.",
  "Teach me a Creole phrase to thank my guide.",
  "Best month to snorkel Blue Bay?",
];

export default function Companion() {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/chat/history").then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, busy]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    const ts = new Date().toISOString();
    setHistory((h) => [...h, { role: "user", content: message, ts }]);
    try {
      const { data } = await api.post("/chat", { message });
      setHistory((h) => [...h, { role: "assistant", content: data.reply, ts: new Date().toISOString() }]);
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-jungle-700">
      <div className="absolute inset-0 paper-bg" />
      <RpgHud />
      <main className="relative max-w-4xl mx-auto px-6 lg:px-10 py-10 pb-44 pr-20">
        <div className="mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-jungle-500 text-white flex items-center justify-center shadow-lift">
            <Wind className="w-7 h-7" />
          </div>
          <div>
            <span className="chip"><Sparkles className="w-3 h-3" /> Companion · Claude Sonnet 4.5</span>
            <h1 className="font-display text-3xl lg:text-4xl mt-2">Ti Dodo</h1>
            <p className="text-ink-700 text-sm">Your AI friend for Mauritius tips, Creole phrases & quest ideas.</p>
          </div>
        </div>

        <Card className="card-clay flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 480 }} data-testid="chat-card">
          <ScrollArea className="flex-1 p-6">
            {history.length === 0 && (
              <div className="text-center py-10">
                <div className="font-display text-2xl mb-3">Bonzour! Mo apel Ti Dodo 🌿</div>
                <p className="text-ink-700 mb-6 max-w-md mx-auto">Ask me anything about Mauritius — hidden beaches, dishes to try, when to hike, what to wear.</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {SUGGESTIONS.map((s, i) => (
                    <Button key={i} variant="outline" onClick={() => send(s)} data-testid={`chat-suggest-${i}`} className="rounded-full text-xs border-ink-900/20">
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {history.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${i}`}>
                  <div className={`max-w-[80%] rounded-3xl px-5 py-3 ${m.role === "user" ? "bg-jungle-500 text-white rounded-br-md" : "bg-sand-100 border border-sand-300 rounded-bl-md"}`}>
                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-sand-100 border border-sand-300 rounded-3xl px-5 py-3 text-ink-700">
                    <span className="inline-flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-jungle-500 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-jungle-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-2 h-2 rounded-full bg-jungle-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-4 border-t border-sand-300 flex items-center gap-3 bg-white"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Ti Dodo…"
              data-testid="chat-input"
              className="rounded-full border-ink-900/15"
            />
            <Button type="submit" disabled={busy || !input.trim()} data-testid="chat-send-btn" className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
