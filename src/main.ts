import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { createAppRouter } from './router'
import { updatePageSeo } from './seo'
import './style.css'

const router = createAppRouter()
router.afterEach((to) => updatePageSeo(to.name))

createApp(App).use(createPinia()).use(router).mount('#app')
