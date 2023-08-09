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

const { createApp, ref } = Vue;
const path = window.location.toString().replace(/(index\.html.*)$/, "");
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

createApp({
    data() {
        return {
            worker,
            active: false,
            statusRest: true,
            soundActive: false,
            series: 3,
            repetitions: 8,
            timings: {
                work: 20,
                rest: 10,
                tick: 1_000,
            },
            livedata: {
                counter: "",
                serie: "",
                repetition: "",
                status: "",
            },
        };
    },
    mounted() {
        this.worker.onmessage = (payload) => {
            const data = payload.data;
            switch (data.action) {
                case actions.START:
                    this.playSound(audioFiles.START);
                    this.active = true;
                    this.statusRest = true;
                    break;
                case actions.WORK:
                    this.playSound(audioFiles.WORK);
                    this.statusRest = false;
                    break;
                case actions.REST:
                    this.playSound(audioFiles.REST);
                    this.statusRest = true;
                    break;
                case actions.END:
                    this.active = false;
                    setTimeout(async () => {
                        await this.playSound(audioFiles.END);
                        this.playSound(audioFiles.STOP);
                    }, 1);
                    break;
                case actions.END_TO_NEXT:
                    setTimeout(async () => {
                        await this.playSound(audioFiles.END);
                        this.playSound(audioFiles.END_TO_NEXT);
                    }, 1);
                    break;
                case actions.TICK:
                    if ([1, 2, 3].includes(data.counter)) {
                        this.playSound(audioFiles[`COUNTDOWN_${data.counter}`]);
                    } else if (!this.statusRest) {
                        this.playSound(audioFiles.TICK);
                    }
                    break;
            }
            ["counter", "serie", "repetition", "status"].forEach((k) => {
                this.livedata[k] =
                    data[k] || data[k] === 0 ? data[k] : this.livedata[k];
            });
        };
    },
    methods: {
        onStart: function () {
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
                    <input id="series" type="number" class="col-12 col-md-3" v-model="series" min="1" step="1" />
                </div>
                <div class="p-1 col-12 col-md-6">
                    <label for="repetitions" class="pe-2 text-center text-md-end col-12 col-md-6">Repetitions :</label>
                    <input id="repetitions" type="number" class="col-12 col-md-3" v-model="repetitions" min="2" step="1" />
                </div>
            </div>
            <div class="flex-grow-0 row">
                <div class="p-1 col-12 col-md-6">
                    <label for="rest" class="pe-2 text-center text-md-end col-12 col-md-6">Rest time (sec) :</label>
                    <input id="rest" type="number" class="col-12 col-md-3" v-model="timings.rest" min="3" step="1" />
                </div>
                <div class="p-1 col-12 col-md-6">
                    <label for="work" class="pe-2 text-center text-md-end col-12 col-md-6">Work time (sec) :</label>
                    <input id="work" type="number" class="col-12 col-md-3" v-model="timings.work" min="3" step="1" />
                </div>
            </div>
            <div class="flex-grow-0 w-100 d-flex justify-content-evenly align-items-center flex-wrap py-2" :style="{
                borderBottomWidth: 'thin',
                borderBottomStyle: 'solid',
            }">
                <button class="btn m-1" :class="{
                    'btn-success': !active,
                    'btn-danger': active
                }" @click="active ? onStop() : onStart()">{{ active ? "Stop" : "Start" }}</button>
            </div>
            <div v-if="active" class="flex-grow-0 w-100 d-flex justify-content-evenly align-items-center pt-2">
                <h4>Serie {{livedata.serie + 1}}</h4>
                <h4>Repetition {{livedata.repetition + 1}}</h4>
            </div>
            <div v-if="active" class="flex-grow-1 w-100 d-flex justify-content-center align-items-center">
                <div class="d-flex flex-column align-items-center">
                    <h3>{{livedata.status}}</h3>
                    <h2>{{livedata.counter}}</h2>
                </div>
            </div>
        </div>
    `,
}).mount("#app");
