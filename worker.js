const actionsNames = [
    "START",
    "TICK",
    "WORK",
    "REST",
    "END",
    "END_TO_NEXT",
    "STOP",
];
const actions = {};
actionsNames.forEach((k) => (actions[k] = k));

let proc = null;
const start = (series, repetitions, timings) => {
    const restMax = Math.floor(timings.rest / timings.tick),
        workMax = Math.floor(timings.work / timings.tick);
    let rest = 0,
        work = 0,
        rep = 0,
        serie = 0;
    if (!proc) {
        const fn = () => {
            if (rep == repetitions) {
                return;
            }

            if (rest < restMax) {
                // rest tick
                postMessage({
                    action: actions.TICK,
                    serie,
                    repetition: rep,
                    status: "REST",
                    counter: restMax - rest,
                });
                rest++;
            } else if (work == 0) {
                // rest end
                postMessage({
                    action: actions.WORK,
                    serie,
                    repetition: rep,
                    status: "WORK",
                    counter: workMax,
                });
                work++;
            } else if (work < workMax) {
                // work tick
                postMessage({
                    action: actions.TICK,
                    serie,
                    repetition: rep,
                    status: "WORK",
                    counter: workMax - work,
                });
                work++;
            } else if (rep + 1 < repetitions) {
                // work end + rep next
                postMessage({
                    action: actions.REST,
                    serie,
                    repetition: rep + 1,
                    status: "REST",
                    counter: restMax,
                });
                rest = 0;
                work = 0;
                rep++;
                rest++;
            } else if (rep + 1 == repetitions && serie + 1 < series) {
                // work end + rep end + serie next
                postMessage({
                    action: actions.END_TO_NEXT,
                    serie: serie + 1,
                    repetition: 0,
                    status: "REST",
                    counter: restMax,
                });
                rest = 0;
                work = 0;
                rep = 0;
                serie++;
                rest++;
            } else if (rep + 1 == repetitions && serie + 1 == series) {
                // work end + rep end + serie end
                postMessage({ action: actions.END, counter: "TABATA DONE" });
                stop();
            }
        };
        proc = setInterval(fn, timings.tick);
        postMessage({
            action: actions.START,
            serie,
            repetition: rep,
            status: "GET READY",
            counter: restMax - rest,
        });
        rest++;
    }
};
const stop = () => {
    if (proc) {
        clearInterval(proc);
        proc = null;
    }
};

onmessage = ({ data }) => {
  const { action, series, repetitions, timings } = data;
  
  if (action === actions.START) {
    start(series, repetitions, timings);
  } else if (action === actions.STOP) {
    stop();
    postMessage({ action: actions.END });
  }
};
