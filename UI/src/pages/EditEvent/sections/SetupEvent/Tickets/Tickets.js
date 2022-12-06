import config from '@/../configs';

import { mapActions, mapGetters } from 'vuex';

import {expirationOptions} from '@/store/modules/enum';

const currency = config.currency ? config.currency : 'EUR';

export default {
  name: 'Tickets',
  props: {
    eventObj: Object,
    tickets: Object,
  },
  data: function () {
    return {
      ticket_name: '',
      ticket_price: '',
      ticket_qty: '',
      ticket_descr: '',
      ticket_email_content: '',
      off_ticket_name: '',
      off_ticket_price: '',
      off_ticket_qty: '',
      off_ticket_descr: '',
      ticket_nameTouched: false,
      ticket_priceTouched: false,
      ticket_qtyTouched: false,
      ticket_descrTouched: false,
      ticket_email_contentTouched: false,
      ticket_expirationType: null,
      ticket_expirationDuration: 0,
      ticket_manualApproval: false,
      tags: [],
      tag: '',
      toggle: false,
      currentlyEditedPrice: null,
      newForm: false,
      expirationType_none: expirationOptions.NONE,
    }
  },
  mounted() {
    !this.tickets?.exist?.length ? this.newForm = true : this.newForm = false;
    if (!this.ticket_expirationType) {
      this.ticket_expirationType = this.expirationOptions[0];
    }
  },
  methods: {
    tagsChanged(newTags) {
      this.tags = newTags;
      this.tag = '';
    },
    addTicket() {
      this.ticket_nameTouched = this.ticket_priceTouched = this.ticket_qtyTouched = this.ticket_descrTouched = this.ticket_email_contentTouched = true;

      if (!this.ticket_manualApproval && +this.ticket_price !== 0) {
        this.$emit('show_ticket_message', this.tr('adev_ticket_free_price_msg'));
        return false;
      }
      if ( (this.ticket_qty.length > 5 || this.ticket_qty < 1) ||
            (this.ticket_price.length > 10 || this.ticket_price < 0) ||
            (!this.ticket_name || this.ticket_name.length > 100) || this.ticket_email_content.length > 3000 ||
            (!this.ticket_descr || this.ticket_descr.length > 120 || /[<>;{}$]/.test(this.ticket_descr) ) ) {
        return false;
      }

      if( this.ticket_expirationType === expirationOptions.NONE) {
        this.ticket_expirationDuration = 0;
      }

      this.tickets.list.push({
        event: this.eventObj.id,
        pricing_plan: 'split_ticket_price',
        name: this.ticket_name,
        access_price: this.ticket_price,
        access_currency: currency,
        quantity: this.ticket_qty,
        description_long: this.ticket_descr,
        tags: this.tags,
        email_content: this.ticket_email_content,
        expirationDuration: this.ticket_expirationDuration,
        expirationType: this.ticket_expirationType,
        manualApproval: this.ticket_manualApproval
      });
      this.ticket_name = this.ticket_price = this.ticket_qty = this.ticket_descr = this.tag = this.ticket_email_content = '';
      this.ticket_expirationType = this.expirationOptions[0];
      this.ticket_expirationDuration = 0;
      this.ticket_manualApproval = false;
      this.ticket_nameTouched = this.ticket_priceTouched = this.ticket_qtyTouched = this.ticket_descrTouched = this.ticket_email_contentTouched = false;
      this.tags = [];
    },
    updateTicket(index, edited) {
      if (edited && (!!this.tickets.list[index].isInvalidName || !!this.tickets.list[index].isInvalidPrice
        || !!this.tickets.list[index].isInvalidQuantity || !!this.tickets.list[index].isInvalidDescription)) {

        return;
      }

      const edit = !this.tickets.list[index].edit;

      if (!edited) {
        if (!!this.currentlyEditedPrice) {
          this.tickets.list[index] = Object.assign({}, this.currentlyEditedPrice);
          this.currentlyEditedPrice = null;
        } else {
          this.currentlyEditedPrice = Object.assign({}, this.tickets.list[index]);
        }
      } else {
        this.currentlyEditedPrice = null;
      }
      this.tickets.list[index].edit = edit;
      this.tickets.list[index].edited = edited;
      this.$forceUpdate();
    },
    deleteTicket(index) {
      this.tickets.list.splice(index, 1);
      this.$forceUpdate();
    },
    //new ticket
    updateNewTicketName(newName, index){
      if (!this.tickets.list[index].nameTouched) {
        this.updateNewTicketNameTouched(index);
      }
      this.tickets.list[index].name = newName;
      this.tickets.list[index].isInvalidName = this.tickets.list[index].nameTouched && (!this.tickets.list[index].name || this.tickets.list[index].name.length > 100);
      this.$forceUpdate();
    },
    updateNewTicketNameTouched(index){
      this.tickets.list[index].nameTouched = true;
      this.$forceUpdate();
    },
    updateNewTicketPrice(newPrice, index){
      if (!this.tickets.list[index].priceTouched) {
        this.updateNewTicketPriceTouched(index);
      }
      this.tickets.list[index].access_price = newPrice;
      this.tickets.list[index].isInvalidPrice = this.tickets.list[index].priceTouched && (newPrice.toString().length > 10 
        || newPrice < 0 || (!this.tickets.list[index].manualApproval && +newPrice !== 0));
      this.$forceUpdate();
    },
    updateNewTicketPriceTouched(index){
      this.tickets.list[index].priceTouched = true;
      this.$forceUpdate();
    },
    updateNewTicketQuantity(newQuantity, index){
      if (!this.tickets.list[index].isInvalidQuantity) {
        this.updateNewTicketQuantityTouched(index);
      }
      this.tickets.list[index].quantity = newQuantity;
      this.tickets.list[index].isInvalidQuantity =  this.tickets.list[index].quantityTouched && (!this.tickets.list[index].quantity || this.tickets.list[index].quantity.toString().length > 5 || this.tickets.list[index].quantity < 1) ;
      this.$forceUpdate();
    },
    updateNewTicketQuantityTouched(index){
      this.tickets.list[index].quantityTouched = true;
      this.$forceUpdate();
    },
    updateNewTicketDescription(newDescription, index){
      if (!this.tickets.list[index].descrTouched) {
        this.updateNewTicketDescriptionTouched(index);
      }
      this.tickets.list[index].description_long = newDescription;
      this.tickets.list[index].isInvalidDescription = this.tickets.list[index].descrTouched && (!this.tickets.list[index].description_long || this.tickets.list[index].description_long.length > 120 || /[<>;{}$]/.test(this.tickets.list[index].description_long));
      this.$forceUpdate();
    },
    updateNewTicketDescriptionTouched(index){
      this.tickets.list[index].descrTouched = true;
      this.$forceUpdate();
    },

    //exist ticket
    updateExistTicketStatus(index, edited) {
      if (edited && (!!this.tickets.exist[index].isInvalidName || !!this.tickets.exist[index].isInvalidPrice
          || !!this.tickets.exist[index].isInvalidQuantity ||  !!this.tickets.exist[index].isInvalidDescription)){

        return;
      }

      const edit = !this.tickets.exist[index].edit;

      if (!edited){
        if (!!this.currentlyEditedPrice){
          this.tickets.exist[index] = Object.assign({},  this.currentlyEditedPrice);
          this.currentlyEditedPrice = null;
        }else{
          this.currentlyEditedPrice = Object.assign({},  this.tickets.exist[index]);
        }
      }else{
        this.currentlyEditedPrice = null;
      }
      this.tickets.exist[index].edit  = edit;
      this.tickets.exist[index].edited = edited;
      this.$forceUpdate();
      let changedCount = 0;
      this.tickets.exist.forEach( session => session.edited ?  changedCount += 1 : '');
      this.$store.commit('setEditedticket',changedCount);
    },
    deleteExistTicket(index, ticket) {
      if (!this.tickets.exist[index].is_removable) {
        return;
      }
      this.tickets.toDelete.push(ticket);
      this.tickets.exist.splice(index, 1);
      this.$forceUpdate();
    },
    updateExistTicketEmailContent(newContent, index){
      this.tickets.exist[index].email_content = newContent;
      this.$forceUpdate();
    },
    updateExistTicketDescription(newDescription, index){
      if (!this.tickets.exist[index].descrTouched) {
        this.updateExistTicketDescriptionTouched(index);
      }
      this.tickets.exist[index].description_long = newDescription;
      this.tickets.exist[index].isInvalidDescription = this.tickets.exist[index].descrTouched && (!this.tickets.exist[index].description_long || this.tickets.exist[index].description_long.length > 120 || /[<>;{}$]/.test(this.tickets.exist[index].description_long));
      this.$forceUpdate();
    },
    updateExistTicketDescriptionTouched(index){
      this.tickets.exist[index].descrTouched = true;
      this.$forceUpdate();
    },
    updateExistTicketName(newName, index){
      if (!this.tickets.exist[index].nameTouched) {
        this.updateExistTicketNameTouched(index);
      }
      this.tickets.exist[index].name = newName;
      this.tickets.exist[index].isInvalidName = this.tickets.exist[index].nameTouched && (!this.tickets.exist[index].name || this.tickets.exist[index].name.length > 100);
      this.$forceUpdate();
    },
    updateExistTicketNameTouched(index){
      this.tickets.exist[index].nameTouched = true;
      this.$forceUpdate();
    },
    updateExistTicketPrice(newPrice, index){
      if (!this.tickets.exist[index].priceTouched) {
        this.updateExistTicketPriceTouched(index);
      }
      this.tickets.exist[index].access_price = newPrice;
      this.tickets.exist[index].isInvalidPrice = this.tickets.exist[index].priceTouched && (newPrice.toString().length > 10
        || newPrice < 0 || (!this.tickets.exist[index].manualApproval && +newPrice !== 0));
      this.$forceUpdate();
    },
    updateExistTicketPriceTouched(index){
      this.tickets.exist[index].priceTouched = true;
      this.$forceUpdate();
    },
    updateExistTicketQuantity(newQuantity, index){
      if (!this.tickets.exist[index].isInvalidQuantity) {
        this.updateExistTicketQuantityTouched(index);
      }
      this.tickets.exist[index].quantity = newQuantity;
      this.tickets.exist[index].isInvalidQuantity =  this.tickets.exist[index].quantityTouched && (!this.tickets.exist[index].quantity || this.tickets.exist[index].quantity.toString().length > 5 || this.tickets.exist[index].quantity < 1) ;
      this.$forceUpdate();
    },
    updateExistTicketQuantityTouched(index){
      this.tickets.exist[index].quantityTouched = true;
      this.$forceUpdate();
    },
    updateExistTicketShowHistory(index){
      this.tickets.exist[index].showHistory = !this.tickets.exist[index].showHistory;
      this.$forceUpdate();
    },
    updateExistTicketExpirationDuration(index) {
      if( this.tickets.exist[index].expirationType === expirationOptions.NONE) {
        this.tickets.exist[index].expirationDuration = '';
      }
      this.$forceUpdate();
    },  
    updateManualApproval(newVal, index, type) {
      this.$set(this.tickets[type][index], 'manualApproval', newVal);
      this.$set(this.tickets[type][index], 'access_price', '');
      this.$forceUpdate();
    }, 
  },
  computed: {
    ...mapGetters([
      'tr',
    ]),
    reversedTickets() {
      return this.tickets.exist ? this.tickets.exist.reverse() : [];
    },
    curSymbol() {
      return config.currencySign;
    },
    expirationOptions() {
      return Object.keys(expirationOptions).map(el=>({label:this.tr(`ticket_expiration_type_${el.toLowerCase()}`), value: expirationOptions[el]}));
    }
  }
}
