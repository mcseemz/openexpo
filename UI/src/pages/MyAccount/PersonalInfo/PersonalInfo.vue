<template src="./PersonalInfo.html"></template>
<script src="./PersonalInfo.js"></script>
<style lang="scss" scoped>
::v-deep .myacc-contact-telegram-icon {
    margin: auto 0 0;

    &--svg {
        stroke: var(--grey-text);
        opacity: 0.7;
    }
}

.myacc-contact-telegram-btn--conn {
    color: var(--light-blue);
        ::v-deep .myacc-contact-telegram-icon {
        &--svg {
            stroke: var(--light-blue);
            fill: var(--light-blue);
            opacity: 1;
        }
    }

    &--pr{
        padding-right: 45px;
    }
}
</style>
