const CmpCircleProgress = {
    props: ["progress", "color"],
    setup() {
        return {};
    },
    computed: {
        offset: function () {
            return -51 - (51 / 100) * this.$props.progress;
        },
    },
    template: `
        <div class="position-relative">
            <svg class="progress-bar" viewBox="0 0 20 20">
                <circle class="bg" cx="10" cy="10" r="8"/>
                <circle class="progress" cx="10" cy="10" r="8" :data-percentage="$props.progress" :style="{
                    strokeDashoffset: offset,
                    stroke: $props.color,
                }"/>
                <text x="50%" y="55%" >
                </text>
            </svg>
            <div class="position-absolute top-0 bottom-0 start-0 end-0 d-flex justify-content-center align-items-center">
                <slot />
            </div>
        </div>
    `,
};
