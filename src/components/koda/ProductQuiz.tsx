import { useMemo, useState } from "react";
import { ArrowRight, Check, Mic2, Monitor, RotateCcw, Sparkles, X } from "lucide-react";

const questions = [
  {
    title: "Como você prefere interagir?",
    options: [
      { label: "Quero ver e tocar na informação", i: 2, pro: 0 },
      { label: "Prefiro falar e ouvir respostas", i: 0, pro: 2 },
    ],
  },
  {
    title: "O que você quer deixar mais perto?",
    options: [
      { label: "Hora, tarefas, alertas e dados do ambiente", i: 2, pro: 0 },
      { label: "Perguntas, comandos e uma experiência por voz", i: 0, pro: 2 },
    ],
  },
  {
    title: "Você precisa usar longe da tomada?",
    options: [
      { label: "Não. Vai ficar na mesa", i: 1, pro: 0 },
      { label: "Sim. Quero bateria integrada", i: 0, pro: 2 },
    ],
  },
  {
    title: "Qual experiência parece mais natural para você?",
    options: [
      { label: "Consultar algo rapidamente com um olhar", i: 2, pro: 0 },
      { label: "Pedir algo sem precisar olhar para uma tela", i: 0, pro: 2 },
    ],
  },
];

export function ProductQuiz({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{ i: number; pro: number }[]>([]);

  const result = useMemo(() => {
    const total = answers.reduce(
      (acc, value) => ({ i: acc.i + value.i, pro: acc.pro + value.pro }),
      { i: 0, pro: 0 },
    );
    return total.pro > total.i ? "pro" : "i";
  }, [answers]);

  if (!open) return null;

  const finished = step >= questions.length;
  const question = questions[step];

  function choose(i: number, pro: number) {
    setAnswers((current) => [...current.slice(0, step), { i, pro }]);
    setStep((current) => current + 1);
  }

  function reset() {
    setStep(0);
    setAnswers([]);
  }

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-black/35 p-3 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Qual KodaBot combina com você?"
    >
      <button
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Fechar"
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-[#0071e3]" /> Ajude-me a escolher
          </div>
          <button onClick={onClose} className="rounded-full bg-[#f5f5f7] p-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 sm:p-10">
          {!finished ? (
            <>
              <div className="flex gap-1.5">
                {questions.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[#0071e3]" : "bg-[#e8e8ed]"}`}
                  />
                ))}
              </div>
              <p className="mt-8 text-sm text-[#86868b]">
                Pergunta {step + 1} de {questions.length}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {question?.title}
              </h2>
              <div className="mt-8 grid gap-3">
                {(question?.options ?? []).map((option) => (
                  <button
                    key={option.label}
                    onClick={() => choose(option.i, option.pro)}
                    className="group flex items-center justify-between rounded-2xl border border-black/10 px-5 py-5 text-left font-medium transition-all hover:border-[#0071e3] hover:bg-[#f5f9ff]"
                  >
                    {option.label}
                    <ArrowRight className="h-4 w-4 text-[#86868b] transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f2ff] text-[#0071e3]">
                {result === "i" ? <Monitor className="h-7 w-7" /> : <Mic2 className="h-7 w-7" />}
              </div>
              <p className="mt-6 text-sm font-semibold text-[#0071e3]">Nossa recomendação</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                {result === "i" ? "KodaBot" : "KodaBot Pro"}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[#6e6e73]">
                {result === "i"
                  ? "Pelas suas respostas, uma experiência visual e rápida parece combinar mais com o seu dia."
                  : "Pelas suas respostas, você parece aproveitar mais uma experiência baseada em voz e mobilidade."}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href={result === "i" ? "/kodabot" : "/kodabot-pro"}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white"
                >
                  Conhecer <Check className="h-4 w-4" />
                </a>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-full border border-black/15 px-6 py-3 text-sm font-semibold"
                >
                  Refazer <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
