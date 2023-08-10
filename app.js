const actionsNames = [
    "START",
    "TICK",
    "WORK",
    "REST",
    "END_TO_NEXT",
    "END",
    "STOP",
];
const actions = {};
actionsNames.forEach((k) => (actions[k] = k));

const path = window.location.toString().replace(/((index\.html)|(\?)).*/, "");
const audioFiles = {
    START: "session_start",
    STOP: "session_end",
    END: "serie_end",
    END_TO_NEXT: "serie_end_to_next",
    WORK: "work",
    REST: "rest",
    COUNTDOWN_1: "1",
    COUNTDOWN_2: "2",
    COUNTDOWN_3: "3",
    TICK: "tick",
};
Object.keys(audioFiles).forEach(
    (k) =>
        (audioFiles[k] = new Audio(`${path}assets/sounds/${audioFiles[k]}.mp3`))
);
const worker = new Worker(`${path}worker.js`);

const getPathParams = () => {
    const params = {};
    window.location.search
        .slice(1)
        .split("&")
        .map((v) => v.split("="))
        .filter((v) => v[0].length)
        .map((v) => ({
            k: decodeURIComponent(v[0]),
            v: decodeURIComponent(v[1]),
        }))
        .forEach((v) => (params[v.k] = +v.v || v.v));
    return params;
};
const setPathParams = (params) => {
    window.history.replaceState(
        null,
        null,
        "?" +
            Object.keys(params)
                .map(
                    (k) =>
                        `${encodeURIComponent(k)}=${encodeURIComponent(
                            params[k]
                        )}`
                )
                .join("&")
    );
};

const { createApp, ref } = Vue;
createApp({
    components: {
        CmpCircleProgress: CmpCircleProgress,
    },
    data() {
        const params = getPathParams();
        return {
            worker,
            active: false,
            statusRest: true,
            soundActive: false,
            series: params.ser || 3,
            repetitions: params.rep || 8,
            timings: {
                work: params.wor || 20,
                rest: params.res || 10,
                tick: 1_000,
            },
            livedata: {
                counter: "",
                serie: "",
                repetition: "",
                status: "",
                progress: 0,
                progressColor: "#dc3545", //"#198754"
                progressProc: null,
                timeStart: null,
                timeEnd: null,
            },
        };
    },
    mounted() {
        this.worker.onmessage = (payload) => {
            const initProgressTimes = () => {
                this.livedata.timeStart = new Date().getTime();
                this.livedata.timeEnd =
                    this.livedata.timeStart +
                    (this.statusRest
                        ? this.timings.rest 
                        : this.timings.work)* this.timings.tick + 10;
            };
            const progressFn = () => {
                this.livedata.progress = (
                    ((new Date().getTime() - this.livedata.timeStart) /
                        (this.livedata.timeEnd - this.livedata.timeStart)) *
                    100
                ).toFixed(1);
            };
            const data = payload.data;
            switch (data.action) {
                case actions.START:
                    this.statusRest = true;
                    initProgressTimes();
                    this.livedata.progressColor = "#198754";
                    this.livedata.progressProc = setInterval(progressFn, 20);
                    this.playSound(audioFiles.START);
                    this.active = true;
                    break;
                case actions.REST:
                    this.playSound(audioFiles.REST);
                    this.statusRest = true;
                    initProgressTimes();
                    this.livedata.progressColor = "#198754";
                    break;
                case actions.WORK:
                    this.playSound(audioFiles.WORK);
                    this.statusRest = false;
                    initProgressTimes();
                    this.livedata.progressColor = "#dc3545";
                    break;
                case actions.END:
                    clearInterval(this.livedata.progressProc);
                    this.livedata.progressProc = null;
                    this.active = false;
                    this.livedata.timeStart = null;
                    this.livedata.timeEnd = null;
                    this.livedata.progressColor = "#198754";
                    setTimeout(async () => {
                        await this.playSound(audioFiles.END);
                        this.playSound(audioFiles.STOP);
                    }, 1);
                    break;
                case actions.END_TO_NEXT:
                    this.livedata.timeStart = null;
                    this.livedata.timeEnd = null;
                    this.livedata.progressColor = "#198754";
                    setTimeout(async () => {
                        await this.playSound(audioFiles.END);
                        this.playSound(audioFiles.END_TO_NEXT);
                    }, 1);
                    break;
                case actions.TICK:
                    if ([1, 2, 3].includes(data.counter)) {
                        this.playSound(audioFiles[`COUNTDOWN_${data.counter}`]);
                    } else {
                        this.playSound(audioFiles.TICK);
                    }
                    break;
            }
            ["counter", "serie", "repetition", "status"].forEach((k) => {
                this.livedata[k] =
                    data[k] || data[k] === 0 || data[k] === false
                        ? data[k]
                        : this.livedata[k];
            });
        };
    },
    watch: {
        series: function (to) {
            const params = getPathParams();
            params.ser = to;
            setPathParams(params);
        },
        repetitions: function (to) {
            const params = getPathParams();
            params.rep = to;
            setPathParams(params);
        },
        "timings.work": function (to) {
            const params = getPathParams();
            params.wor = to;
            setPathParams(params);
        },
        "timings.rest": function (to) {
            const params = getPathParams();
            params.res = to;
            setPathParams(params);
        },
    },
    methods: {
        resetParams: function () {
            const data = {
                series: 3,
                repetitions: 8,
                timings: {
                    rest: 10,
                    work: 20,
                    tick: 1_000,
                },
            };
            Object.assign(this, data);
            setTimeout(() => setPathParams({}), 1);
        },
        onStart: function () {
            Object.assign(this.livedata, {
                counter: "",
                serie: "",
                repetition: "",
                status: "",
                progress: 0,
                progressRest: true,
            });
            this.worker.postMessage({
                action: actions.START,
                series: this.series,
                repetitions: this.repetitions,
                timings: {
                    rest: this.timings.rest * 1000,
                    work: this.timings.work * 1000,
                    tick: this.timings.tick,
                },
            });
        },
        onStop: function () {
            this.worker.postMessage({ action: actions.STOP });
        },
        playSound: async function (audio) {
            if (this.soundActive) {
                return;
            }
            this.soundActive = true;
            audio.play();
            await new Promise((r) => {
                const res = () => {
                    audio.removeEventListener("ended", res);
                    this.soundActive = false;
                    r();
                };
                audio.addEventListener("ended", res);
            });
        },
    },
    template: `
        <div class="w-100 h-100 container d-flex flex-column">
            <div class="flex-grow-0 row">
                <div class="p-1 col-12">
                    <h1 class="text-center mb-1">TABATA TIMER</h1>
                </div>
            </div>
            <div class="flex-grow-0 row">
                <div class="p-1 col-12 col-md-6">
                    <label for="series" class="pe-2 text-center text-md-end col-12 col-md-6">Series :</label>
                    <input id="series" type="number" class="col-12 col-md-3" v-model="series" min="1" step="1" :disabled="active" />
                </div>
                <div class="p-1 col-12 col-md-6">
                    <label for="repetitions" class="pe-2 text-center text-md-end col-12 col-md-6">Repetitions :</label>
                    <input id="repetitions" type="number" class="col-12 col-md-3" v-model="repetitions" min="2" step="1" :disabled="active" />
                </div>
            </div>
            <div class="flex-grow-0 row">
                <div class="p-1 col-12 col-md-6">
                    <label for="rest" class="pe-2 text-center text-md-end col-12 col-md-6">Rest time (sec) :</label>
                    <input id="rest" type="number" class="col-12 col-md-3" v-model="timings.rest" min="3" step="1" :disabled="active" />
                </div>
                <div class="p-1 col-12 col-md-6">
                    <label for="work" class="pe-2 text-center text-md-end col-12 col-md-6">Work time (sec) :</label>
                    <input id="work" type="number" class="col-12 col-md-3" v-model="timings.work" min="3" step="1" :disabled="active" />
                </div>
            </div>
            <div class="flex-grow-0 w-100 d-flex justify-content-center align-items-center flex-wrap py-2" :style="{
                borderBottomWidth: 'thin',
                borderBottomStyle: 'solid',
            }">
                <button class="btn m-1 btn-warning" @click="resetParams()">Reset</button>
                <button class="btn m-1" :class="{
                    'btn-success': !active,
                    'btn-danger': active
                }" @click="active ? onStop() : onStart()">{{ active ? "Stop" : "Start" }}</button>
            </div>
            <div v-if="active" class="flex-grow-0 w-100 d-flex justify-content-evenly align-items-center pt-2">
                <h4>Serie {{livedata.serie + 1}}/series</h4>
                <h4>Repetition {{livedata.repetition + 1}}/repetitions</h4>
            </div>
            <div v-if="active"
                class="flex-grow-1 w-100 d-flex justify-content-center align-items-center">
                <CmpCircleProgress
                    :progress="livedata.progress"
                    :color="livedata.progressColor">
                    <div class="d-flex flex-column align-items-center">
                        <h3>{{livedata.status}}</h3>
                        <h2>{{livedata.counter}}</h2>
                    </div>
                </CmpCircleProgress>
            </div>
        </div>
    `,
}).mount("#app");
