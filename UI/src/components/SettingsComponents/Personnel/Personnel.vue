<template src="./Personnel.html"></template>
<script src="./Personnel.js"></script>
<style lang="scss">
.ticket_personnel {
    &:focus-visible {
      border: none !important;
      outline: none !important;
    }
}
</style>
<style lang="scss" scoped>

.tooltip_ticket_tr {
  position: relative;
  top: -18px;
  left: 45px;
}

.disp_in_block {
  display: inline-block;
}

.manage_icon {
  width: 19px !important;
  height: 19px !important;
}

.visit_icon {
  width: 19px !important;
  height: 19px !important;
}

#modalKeeper {
  width: 308% !important;
  height: 100%;
  position: absolute;
  top: -50%;
  left: -100%;
}

.form_input_row {
  font-family: 'Lato', sans-serif;
  cursor: text;
}

.ticket_personnel {
  border-style: none;
  margin-bottom: 65px;
  justify-content: end;
  display: flex;
  img {
    cursor: pointer;
  }
}

.refresh_img_person {
  background: transparent;
  border: none;
}

.mx_274 {
  width: 100% !important;
}

.blink_me {
  position: relative; top: -25px;left: 65px
}

.js_btw_end {
  align-items: end;
  justify-content: space-between;
}

.text_overflow_ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.personnel_avatar {
  display: flex;
  flex-direction: row;
}

.personnel_image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 50% !important;
}

.personel_ava_icons {
  width: 100% !important;
  display: flex;

  .remove_icon {
    z-index: 999;
    margin-right: 8px;
  }

  span {
    margin-right: 8px;
    cursor: pointer;
  }
}

.upload-user-img {
  height: 110px;
}

.image_box {
  width: 64px;
  height: 64px;
  margin-right: 16px;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
}

.tag_style {
  font-size: 14px;
  line-height: 17px;
  padding-bottom: 5px;
  margin-top: 25px;
}

.filled_email {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding-top: 18px;
}

.d-flex {
  display: flex;
}

.ma-3 {
  margin: 30px 3px;
}

.btn_size {
  width: 195px !important;
  font-size: 13px;
}

</style>


