import { Routes } from '@angular/router';
import { DeliveryRunComponent } from './pages/delivery-run.component';
import { HomeComponent } from './pages/home.component';
import { RoutePlannerComponent } from './pages/route-planner.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Egg Delivery – Home' },
  { path: 'plan', redirectTo: '' },
  { path: 'plan/:routeDate', component: RoutePlannerComponent, title: 'Egg Delivery – Planner' },
  { path: 'run', redirectTo: '' },
  { path: 'run/:routeDate', component: DeliveryRunComponent, title: 'Egg Delivery – Run' },
  { path: '**', redirectTo: '' }
];
