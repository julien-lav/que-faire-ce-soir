import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import ChooseView from '../views/ChooseView.vue'
import HomeView from '../views/HomeView.vue'
import SuggestionView from '../views/SuggestionView.vue'
import NotFoundView from '../views/NotFoundView.vue'

export const createAppRouter = (history: RouterHistory = createWebHistory()) => createRouter({
  history,
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/suggestion', name: 'suggestion', component: SuggestionView },
    { path: '/choix', name: 'choose', component: ChooseView },
    { path: '/favoris', name: 'favorites', component: () => import('../views/FavoritesView.vue') },
    { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFoundView },
  ],
})
