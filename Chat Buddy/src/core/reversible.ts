import type { Trace, TraceStep } from "./types";

export function createTrace(question: string, steps: TraceStep[], answer: string): Trace {
  return {
    id: crypto.randomUUID(),
    question,
    steps,
    cursor: steps.length - 1,
    answer,
  };
}

export function stepBack(trace: Trace): Trace {
  return { ...trace, cursor: Math.max(-1, trace.cursor - 1) };
}

export function stepForward(trace: Trace): Trace {
  return { ...trace, cursor: Math.min(trace.steps.length - 1, trace.cursor + 1) };
}

export function visibleAnswer(trace: Trace, rewindLabel: string): string {
  if (trace.cursor < 0) return rewindLabel;
  const speakAt = trace.steps.findIndex((step) => step.kind === "speak");
  if (speakAt === -1 || trace.cursor < speakAt) {
    return trace.steps
      .slice(0, trace.cursor + 1)
      .map((step) => step.detail)
      .join("\n");
  }
  return trace.answer;
}

export class ReversibleEngine {
  constructor(private trace: Trace) {}

  snapshot(): Trace {
    return this.trace;
  }

  back(): Trace {
    this.trace = stepBack(this.trace);
    return this.trace;
  }

  forward(): Trace {
    this.trace = stepForward(this.trace);
    return this.trace;
  }
}
