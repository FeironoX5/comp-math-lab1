import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {provideZoneChangeDetection} from '@angular/core';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';

bootstrapApplication(
  AppComponent,
  {
    providers: [
      provideZoneChangeDetection({eventCoalescing: true}),
      provideAnimationsAsync()
    ]
  }
).catch((err) => console.error(err));
