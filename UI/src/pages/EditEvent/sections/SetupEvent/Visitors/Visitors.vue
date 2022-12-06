<template src="./Visitors.html"></template>
<script src="./Visitors.js"></script>

<style lang="scss">
.visitors {
    &--right {
        flex-direction: column;
        flex-wrap: nowrap;
        justify-content: space-between;
        gap: 10px;

        @media (max-width: 1200px) {
           margin-top: 20px; 
           flex-direction: row;
           gap: 20px;
        }        
    }

    &--import {
        position: relative;
        padding-top: 9px;

        @media (max-width: 1200px) {
            padding-top: unset;
        }

        &-button{
            width: 100%;
        }
        &-tooltip {
            margin-block: -15px;
            position: absolute;
            top: 8px;
            right: -11px;

            @media (max-width: 1200px) {
                margin-block: -15px;
                position: absolute;
                top: 1px;
                right: -15px;
            }
        }
    }

    &--unordered_list {
        width: 83%;
    }

    &--unordered_item {
        position: relative;
        list-style: none;
        text-align: left;
        padding-left: 50px;
        font-family: var(--lato);
        font-size: 1rem;
        line-height: 1.5;
        color: var(--second-accent);

        &_error::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background-image: url("../../../../../img/error.svg");
            background-size: 18px 18px;
            background-repeat: no-repeat;
        }
        &_warning::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background-image: url("../../../../../img/warning.svg");
            background-size: 18px 18px;
            background-repeat: no-repeat;
        }        
    }

    &--unordered_item:not(:last-child) {
        margin-bottom: 16px;
    }

    &--feature_title {
        font-weight: bold;
        font-size: 1rem;
        line-height: 1.5;
        color: var(--second-accent);
        margin: 15px 0;
    }
}
</style>