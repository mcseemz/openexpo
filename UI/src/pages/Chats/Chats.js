import { mapGetters, mapActions } from 'vuex';
import helper from '@/others/functions.js';

import Footer from '@/components/Footer/Footer.vue';

export default {
  name: 'Chats',
  components: {
    Footer
  },
  data: () => {
    return {
      searchInput: '',
      allActivities: [],
      loading: true,
    }
  },
  async created() {
    // get all user events and stands
    const eventsAndStands = await Promise.all([
      this.getUserEventsA({ type: 'organizer' }),
      this.getUserEventsA({ type: 'visitor' }),
      this.getUserStandsA()
    ]);

    const organizerEvents = eventsAndStands[0]?.data?.statusCode === 200 && eventsAndStands[0].data.body || [];
    const visitorEvents = eventsAndStands[1]?.data?.statusCode === 200 && eventsAndStands[1].data.body || [];
    const stands = eventsAndStands[2]?.data?.statusCode === 200 && eventsAndStands[2].data.body || [];

    const parsedOrganizerEvents = organizerEvents.map(event => {
      return {
        ...helper.parseEventData(event),
        role: this.tr('owner'),
        type: 'event'
      };
    });
    const parsedVisitorEvents = visitorEvents.map(event => {
      return {
        ...helper.parseEventData(event),
        role: this.tr('attendee'),
        type: 'event'
      };
    });

    const parsedStands = stands.map(stand => {
      const event = organizerEvents.find(item => item.id === stand.eventId);

      return {
        ...helper.parseStandData(stand),
        dateStart: event?.dateStart,
        dateEnd: event?.dateEnd,
        role: this.tr('owner'),
        type: 'stand'
      }
    });

    // combine all activities
    const allActivities = [...parsedOrganizerEvents, ...parsedVisitorEvents, ...parsedStands];

    // get all chat for activities
    const allChats = await Promise.all(allActivities.map(item => {
      return this.getChatsA({
        type: item.type,
        id: item.id,
        queryType: item.role === 'Owner' ? 'owner' : 'visitor'
      });
    }));

    // get only activities where chats are exist
    allChats.forEach(response => {
      if (response?.data?.statusCode === 200 && response.data.body?.length) {
        const chats = response.data.body;
        const actType = chats[0].eventId ? 'event' : 'stand';
        const actId = chats[0].eventId || chats[0].stand_to || chats[0].stands_from;
        const unreadCount = chats.reduce( (a, b) => {
          return b.unreadCount ? b.unreadCount + a : a;
        }, 0);

        const activity = allActivities.find(item => item.id === actId && item.type === actType);

        this.allActivities.push({
          ...activity,
          unreadCount
        });
      }
    });

    this.loading = false;
  },
  methods: {
    ...mapActions([
      'getUserEventsA',
      'getUserStandsA',
      'getChatsA',
    ]),
    eventImage(act) {
      return act.cover || act.logo;
    },
    goToChat(act) {
      const link = act.type === 'event'
        ? `/${this.routes.chat}/${this.routes.event}/${act.id}/${act.role.toLowerCase()}`
        : `/${this.routes.chat}/${this.routes.stand}/${act.id}/${act.role.toLowerCase()}`;

      this.$router.push(link);
    },
  },
  computed: {
    ...mapGetters([
      'tr',
      'routes'
    ]),
    currentActivities() {
      const today = new Date().toISOString();
      return this.allActivities.filter(act => today < act.dateEnd && act.title.toLowerCase().includes(this.searchInput.toLowerCase()));
    },
    oldActivities() {
      const today = new Date().toISOString();
      return this.allActivities.filter(act => today > act.dateEnd && act.title.toLowerCase().includes(this.searchInput.toLowerCase()));
    },
  },
}
