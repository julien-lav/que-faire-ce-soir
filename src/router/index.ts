import { createRouter, createWebHistory } from 'vue-router'
import ChooseView from '../views/ChooseView.vue'
import HomeView from '../views/HomeView.vue'
import SuggestionView from '../views/SuggestionView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/suggestion', name: 'suggestion', component: SuggestionView },
    { path: '/choix', name: 'choose', component: ChooseView },
  ],
})
