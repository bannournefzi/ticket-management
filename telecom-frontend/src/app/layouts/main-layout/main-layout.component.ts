import { Component } from '@angular/core';
import { Router } from '@angular/router';


@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  constructor(private router: Router) {}

  isFullPage(): boolean {
    // Ajoute ici toutes les routes qui doivent être full-height sans padding
    return this.router.url.includes('/chat') 
        || this.router.url.includes('/messages');
  }
}