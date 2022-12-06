export default {
  methods: {
    ValidName (customName, value) {
      const reg = (value) ? /[^\d+$<>;{}$']/  : /[^\d+$<>;{}$]/;
      return !reg.test(customName)
    },
    filtered () {
      return /[':]/g
    }

  },
}
