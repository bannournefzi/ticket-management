import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebsocketService } from './services/WebsocketService';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'telecom-frontend';

  constructor(private ws: WebsocketService) {}

  ngOnInit(): void {
    this.ws.connect();
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }
}