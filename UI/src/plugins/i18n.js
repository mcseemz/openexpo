import Vue from 'vue'
import VueI18n from 'vue-i18n'

Vue.use(VueI18n)

export const i18n = new VueI18n({
	locale: 'en_US',
	fallbackLocale: 'en_US',
	messages: {
		en_US: {
			sign_in: 'Sign In',
		},
		de_DE: {
			sign_in: 'Sign In DE',
		},
		ru_RU: {
			sign_in: 'Войти',
		},
	}
})