import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebsocketService } from './services/WebsocketService';
import { AuthService } from './auth/service/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'telecom-frontend';

  constructor(
    private ws: WebsocketService,
    private authService: AuthService
  ) {}

  get showFirstLoginModal(): boolean {
    return this.authService.mustChangePassword();
  }

  ngOnInit(): void {
    this.ws.connect();
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }
}