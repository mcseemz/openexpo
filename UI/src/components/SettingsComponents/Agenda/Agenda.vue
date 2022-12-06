<template src="./Agenda.html"></template>
<script src="./Agenda.js"></script>
<style lang="scss" scoped>

.pricings {
  .parent_checkbox {
    display: block;
    .pr_checkboxes {
      display: inline-flex ;
    }
  }
}

.speaker_main_section {

  .form_input_qr {
    width: 176px;

    .ui-select__content {
      .ui-select__label-text {
        padding-top: 4px;
      }
      .ui-select__display {
        border: 1px solid #6E7C8D;
        height: 0px;
      }
    }

    .ui-select.ui-select-labelin .ui-select__display {
      height: 49px;
      padding-bottom: 8px;
    }

    .ui-select.ui-select-labelin.is-active .ui-select__display {
      height: 49px;
      padding-bottom: 8px;
    }

    .ui-select.ui-select-labelin .ui-select__label-text{
      padding-top: 5px;
    }

    .ui-select.ui-select-labelin.is-active .ui-select__label-text{
      padding-top: 5px;
    }
  }
  .form_input_hr {
    width: 190px;


    .ui-textbox.ui-search-input {
      // max-width: 300px;

      .ui-textbox__icon-wrapper {
        right: 20px;
        left: auto;
        margin-right: 0;
      }

      input {
        padding-top: 14px;
        padding-bottom: 14px;
        padding-left: 16px;
      }
    }

    .ui-textbox__input {
      font-size: 14px;
      box-shadow: 0px 1px 4px rgba(109, 109, 109, 0.5);
      border: transparent;

    }

  }

  .form_input_row {
    .left {
      justify-content: flex-start;

      & > * {
        margin-right: 16px;
      }
    }
    .icon_w_link {
      color: #E5853C!important;
      border: 1px solid #E5853C;
      border-radius: 50px;
      padding: 5px 20px;
      margin-top: 0px!important;
    }
  }


  .speaker_list {
    max-width: 730px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;

    .speaker_list_item {
      width: 32% !important;
      .elipsis {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .image_box {
        min-width: 45px;
        img {
          min-width: 45px;
        }
      }
      .flex_spc_between {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
      }
      .flex_right {
        display: flex;
        justify-content: right;
      }
      .max_lenght_txt {
        max-width: 116px;
      }
      .width_100 {
        width: 100%;
      }
      .ui-checkbox__checkmark-background {
        background: darken(#2196f3, 15%)
      }
      @media screen and (min-width: 800px) and (max-width: 1200px){
        width: 49% !important;
      }
      @media screen and (max-width: 799px) {
        width: 100% !important;
      }

    }

    .flex-speaker {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .speaker_list_item {
      width: 49%;
      background: #fff;
      box-shadow: 0px 1px 4px rgba(109, 109, 109, 0.5);
      border-radius: 3px;
      border: 0px;
      margin-top: 15px;
      padding: 10px;

      .image_box {
        margin-right: 8px;
        img {
          max-width: 100%;
          max-height: 100%;
          border-radius: 50%;
        }
      }
      .name {
        font-family: 'Lato';
        font-style: normal;
        font-weight: 400;
        font-size: 16px;
        line-height: 19px;
        text-align: justify;
      }
      .name img {
        width: 20px;
        height: 13.5px;
        margin-left: 8px;
      }
    }

    .flex-img {
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
    .user-role {
      font-size: 14px;
      line-height: 17px;
      color: #6E7C8D;
    }

    .text {
      margin-top: 10px;
      .user-role {
        margin-top: 8px;
      }
    }

    .mb_9 {
      margin-bottom: 9px;
    }

    .jst_between {
      justify-content: space-between;
    }

    .role-color {
      color: #254854;
    }
  }

  .managerequests_main_section {
    margin-top: 30px;
  }

}


     .text_eclips {
       overflow: hidden;
       text-overflow: ellipsis;
     }

     .bg_yellow {
       background-color: yellow !important;
     }
     .pd_30 {
       padding: 30px;
     }
     .tooltip_same_tr {
       display: flex;
       justify-content: end;
       margin-right: 5px;
       position: relative;
       top: -58px;
     }

    .mx_width_card_xl {
      @media screen and (min-width: 1200px) {
      max-width: 516px ;
      }
     }

    .mx_width_card_md {
      @media screen and (min-width: 1008px) and (max-width: 1200px){
      max-width: 492px !important;
    }
  }

  .mx_width_card_sm {
    @media screen and (max-width: 1008px) {
      max-width: 320px ;
    }
  }

</style>
<style lang="scss">

.btn_oval {
  background: #FFFFFF;
  border: 2px solid #E5853C;
  padding: 0px 8px;
  color: #E5853C;
}

.btn_action {
  cursor: pointer;
}

.btn_oval_text {
  font-family: 'Lato';
  font-size: 16px;
  line-height: 1.5em;
  color: #E5853C !important;
  font-weight: 500;
  margin-left: 8px;
}
</style>
