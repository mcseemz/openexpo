<template>
  <div class="not_permitted_wrapper">
    <div class="not_permitted_header">{{tr('notpermitted_header')}}</div>
    <div>{{tr('notpermitted_text')}}</div>
    <br/>
    <div :class="{green: isUserAuth}">{{tr('notpermitted_point1')}}</div>
    <div>{{tr('notpermitted_point2')}}</div>
    <div>{{tr('notpermitted_point3')}}</div>
    <br/>
    <div>{{tr('notpermitted_footer')}}</div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'NotPermitted',
  props: {
    isUserAuth: Boolean
  },
  computed: {
  	...mapGetters([
      'tr',
    ]),
  },
}
</script>

<style lang="scss" scoped>
.not_permitted_wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -70%);
  min-width: fit-content;

  .not_permitted_header {
    margin-bottom: 40px;
    font-weight: bold;
    font-size: 40px;
    line-height: 40px;
    text-align: center;
  }

  .green {
    color: #28a745;

    &::after {
      content:'\2713';
      display:inline-block;
      padding:0 6px;
    }
  }
}
</style>
